import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const FISIER = process.env.UTILIZATORI_FILE
  || path.resolve(__dirname, '..', 'utilizatori.json');

const DURATA_SESIUNE_MS = 12 * 60 * 60 * 1000; // 12 ore
const N = 16384; // cost scrypt

// ─── Parole ──────────────────────────────────────────────────────────────────

function amprenta(parola, sare) {
  return crypto.scryptSync(String(parola), sare, 64, { N }).toString('hex');
}

function faceAmprenta(parola) {
  const sare = crypto.randomBytes(16).toString('hex');
  return { sare, hash: amprenta(parola, sare) };
}

/** Comparatie in timp constant. */
function potrivesc(a, b) {
  const ba = Buffer.from(String(a), 'hex');
  const bb = Buffer.from(String(b), 'hex');
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

/** Parola temporara, usor de citit la telefon: 3 grupuri de 4. */
function parolaTemporara() {
  const alfabet = 'abcdefghjkmnpqrstuvwxyz23456789'; // fara l/1/o/0, se confunda
  const grup = () => Array.from({ length: 4 }, () =>
    alfabet[crypto.randomInt(alfabet.length)]).join('');
  return `${grup()}-${grup()}-${grup()}`;
}

// ─── Persistenta ─────────────────────────────────────────────────────────────

function incarca() {
  if (!fs.existsSync(FISIER)) return { versiune: 1, utilizatori: [] };
  try {
    const j = JSON.parse(fs.readFileSync(FISIER, 'utf8'));
    if (!Array.isArray(j.utilizatori)) throw new Error('lipseste lista "utilizatori"');
    return j;
  } catch (err) {
    throw new Error(`Fisierul de utilizatori e corupt (${FISIER}): ${err.message}`);
  }
}

function salveaza(db) {
  const tmp = `${FISIER}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify({ ...db, actualizat: new Date().toISOString() }, null, 2), 'utf8');
  fs.renameSync(tmp, FISIER);
  try { fs.chmodSync(FISIER, 0o600); } catch (_) { /* pe Windows nu conteaza */ }
}

// ─── Conturi ─────────────────────────────────────────────────────────────────

/**
 * Adauga un cont si intoarce parola temporara — SINGURA data cand e vizibila.
 * O dai omului pe alt canal; la prima autentificare si-o schimba.
 */
function adauga({ utilizator, nume, email, rol }) {
  const u = String(utilizator || '').trim().toLowerCase();
  if (!u) throw new Error('Contul are nevoie de un nume de utilizator');

  const db = incarca();
  if (db.utilizatori.some((x) => x.utilizator === u)) throw new Error(`Contul "${u}" exista deja`);

  const parola = parolaTemporara();
  const { sare, hash } = faceAmprenta(parola);
  db.utilizatori.push({
    id: crypto.randomUUID(),
    utilizator: u,
    nume: String(nume || u).trim(),
    email: String(email || '').trim() || null,
    rol: rol === 'manager' ? 'manager' : 'membru',
    sare,
    hash,
    trebuieSchimbata: true,
    creat_la: new Date().toISOString(),
    ultima_intrare: null,
  });
  salveaza(db);
  return { utilizator: u, parolaTemporara: parola };
}

function sterge(utilizator) {
  const db = incarca();
  const u = String(utilizator).trim().toLowerCase();
  const inainte = db.utilizatori.length;
  db.utilizatori = db.utilizatori.filter((x) => x.utilizator !== u);
  if (db.utilizatori.length === inainte) throw new Error(`Nu gasesc contul "${u}"`);
  if (!db.utilizatori.length) throw new Error('Nu pot sterge ultimul cont — ai ramane pe dinafara');
  salveaza(db);
}

function listeaza() {
  return incarca().utilizatori.map((x) => ({
    utilizator: x.utilizator,
    nume: x.nume,
    email: x.email,
    rol: x.rol || 'membru',
    trebuieSchimbata: x.trebuieSchimbata,
    ultima_intrare: x.ultima_intrare,
  }));
}

function exista() {
  return incarca().utilizatori.length > 0;
}

function schimbaParola(utilizator, parolaVeche, parolaNoua) {
  if (String(parolaNoua || '').length < 8) throw new Error('Parola noua trebuie sa aiba minim 8 caractere');
  const db = incarca();
  const u = db.utilizatori.find((x) => x.utilizator === String(utilizator).toLowerCase());
  if (!u) throw new Error('Cont inexistent');
  if (!potrivesc(amprenta(parolaVeche, u.sare), u.hash)) throw new Error('Parola actuala e gresita');

  const { sare, hash } = faceAmprenta(parolaNoua);
  u.sare = sare; u.hash = hash; u.trebuieSchimbata = false;
  salveaza(db);
}

// ─── Sesiuni ─────────────────────────────────────────────────────────────────
// In memorie: la repornirea serverului toata lumea se reautentifica. E acceptabil
// pentru 4 oameni si evita inca un fisier cu date sensibile pe disc.

const sesiuni = new Map();

function autentifica(utilizator, parola) {
  const db = incarca();
  // Omul scrie ce stie despre el. Panoul il numeste "Teodora Deaconu" peste tot,
  // deci e firesc sa incerce asta si la intrare — nu are de unde sti ca vrem "teodora".
  // Primim ambele: numele de cont sau numele complet. Diacriticele se ignora, ca
  // "Teodora" si "TEODORA" sa mearga la fel.
  const curata = (s) => String(s || '').trim().toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ');
  const cheie = curata(utilizator);
  const potriviti = db.utilizatori.filter((x) => curata(x.utilizator) === cheie || curata(x.nume) === cheie);
  // Daca doua persoane au acelasi nume complet, numele nu mai identifica pe nimeni.
  // Atunci cerem numele de cont — nu ghicim pe care dintre ele o vrea.
  const u = potriviti.length === 1 ? potriviti[0]
    : db.utilizatori.find((x) => curata(x.utilizator) === cheie) || null;

  // Chiar daca nu exista contul, calculam o amprenta: altfel raspunsul ar veni
  // mai repede pentru utilizatori inexistenti si s-ar putea afla care conturi exista.
  const sare = u ? u.sare : 'sare-inexistenta';
  const calc = amprenta(parola, sare);
  if (!u || !potrivesc(calc, u.hash)) return null;

  const token = crypto.randomBytes(32).toString('hex');
  sesiuni.set(token, { id: u.id, utilizator: u.utilizator, nume: u.nume,
    rol: u.rol || 'membru', expira: Date.now() + DURATA_SESIUNE_MS });

  u.ultima_intrare = new Date().toISOString();
  salveaza(db);

  return { token, utilizator: u.utilizator, nume: u.nume, rol: u.rol || 'membru', trebuieSchimbata: u.trebuieSchimbata };
}

function sesiune(token) {
  if (!token) return null;
  const s = sesiuni.get(token);
  if (!s) return null;
  if (s.expira < Date.now()) { sesiuni.delete(token); return null; }
  return s;
}

function iesi(token) {
  sesiuni.delete(token);
}

/** Sesiunea din cookie-ul cererii, sau null. */
function dinCerere(req) {
  const brut = req.headers.cookie || '';
  const m = brut.match(/(?:^|;\s*)sesiune=([a-f0-9]+)/);
  return m ? sesiune(m[1]) : null;
}

export {
  FISIER, DURATA_SESIUNE_MS,
  adauga, sterge, listeaza, exista, schimbaParola,
  autentifica, sesiune, iesi, dinCerere, parolaTemporara,
};
