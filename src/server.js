import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import * as utilizatori from './utilizatori.js';
import { genereazaPagina } from './pagina.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

// ========== INIT CONTURI =========
// Crea conturi dacă nu exista (local + Vercel)
const CONTURI_DEFAULT = [
  { utilizator: 'teodora', nume: 'Teodora Deaconu', email: 'teodora.deacon@redpowercons.com', rol: 'manager' },
  { utilizator: 'bogdan', nume: 'Bogdan Ciobotaru', email: 'bogdan.ciobotaru@redpowercons.com', rol: 'manager' },
  { utilizator: 'matyas', nume: 'Matyas Sebestien', email: 'matyes.sebestien@redpowercons.com', rol: 'manager' },
  { utilizator: 'cristian', nume: 'Cristian Samson', email: 'cristian.samson@redpowercons.com', rol: 'manager' },
  { utilizator: 'daniel', nume: 'Daniel', email: 'daniel@buildandfix.ai', rol: 'manager' },
];

function initConturi() {
  const existente = new Set(utilizatori.listeaza().map(u => u.utilizator));
  for (const cont of CONTURI_DEFAULT) {
    if (!existente.has(cont.utilizator)) {
      try {
        utilizatori.adauga(cont);
      } catch (e) {
        console.log(`  ! ${cont.utilizator}: ${e.message}`);
      }
    }
  }
}

// ========== HELPERS ==========

function text(v, max = 2000) {
  if (v === null || v === undefined) return '';
  return String(v).trim().slice(0, max);
}

function obiect(brut) {
  try {
    return JSON.parse(brut);
  } catch {
    return null;
  }
}

function corpJson(req, json) {
  let body = '';
  return new Promise((ok, fail) => {
    req.on('data', chunk => {
      body += chunk.toString();
      if (body.length > 1_000_000) {
        fail({ status: 413, mesaj: 'Cererea e prea mare.' });
      }
    });
    req.on('end', () => {
      try {
        const d = json ? obiect(body) : body;
        ok(d);
      } catch (e) {
        fail({ status: 400, mesaj: 'JSON invalid.' });
      }
    });
    req.on('error', () => fail({ status: 400, mesaj: 'Eroare la citire.' }));
  });
}

function eAdresa(a) {
  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return EMAIL_REGEX.test(a);
}

const BLACKLIST = ['DROP', 'DELETE', 'INSERT', 'UPDATE', 'javascript:', 'onerror', 'onclick', 'onload'];

function esteSuspect(text) {
  const upper = text.toUpperCase();
  return BLACKLIST.some(cuvant => upper.includes(cuvant));
}

// Rate limiting: IP -> {count, resetAt}
const rateLimitPerIP = new Map();

function checkRateLimit(ip, maxPerMinute = 5) {
  const now = Date.now();
  const data = rateLimitPerIP.get(ip) || { count: 0, resetAt: now + 60000 };

  if (now > data.resetAt) {
    data.count = 0;
    data.resetAt = now + 60000;
  }

  data.count++;
  rateLimitPerIP.set(ip, data);

  return data.count <= maxPerMinute;
}

// ========== MIDDLEWARE ==========

app.use(express.static('public'));

// Custom body parser
app.use((req, res, next) => {
  req.body = '';
  if (req.method !== 'POST' && req.method !== 'PUT') return next();

  req.on('data', chunk => {
    req.body += chunk.toString();
  });

  req.on('end', next);
});

// Helper: set-cookie with secure flags
function setCookie(res, token, maxAgeSec) {
  const peHttps = (process.env.COOKIE_SECURE === '1');
  const cookie = `sesiune=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAgeSec}${peHttps ? '; Secure' : ''}`;
  res.setHeader('Set-Cookie', cookie);
}

// Helper: JSON response
function json(res, data, status = 200) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

// ========== ROUTES ==========

// Public routes
const PUBLICE = new Set(['/api/login', '/api/stare-acces']);

app.post('/api/login', async (req, res) => {
  try {
    const d = obiect(req.body);
    if (!d) return json(res, { eroare: 'JSON invalid.' }, 400);

    const { utilizator, parola } = d;
    const r = utilizatori.autentifica(utilizator, parola);

    if (!r) return json(res, { eroare: 'Utilizator sau parolă greșită' }, 401);

    setCookie(res, r.token, utilizatori.DURATA_SESIUNE_MS / 1000);
    return json(res, { ok: true, utilizator: r.utilizator, nume: r.nume, trebuieSchimbata: r.trebuieSchimbata });
  } catch (e) {
    console.error('POST /api/login:', e.message);
    return json(res, { eroare: 'Eroare la autentificare.' }, 500);
  }
});

app.post('/api/logout', (req, res) => {
  const m = (req.headers.cookie || '').match(/(?:^|;\s*)sesiune=([a-f0-9]+)/);
  if (m) utilizatori.iesi(m[1]);
  setCookie(res, '', 0);
  return json(res, { ok: true });
});

app.post('/api/schimba-parola', (req, res) => {
  try {
    const sesiune = utilizatori.dinCerere({ headers: { cookie: req.headers.cookie || '' } });
    if (!sesiune) return json(res, { eroare: 'neautentificat' }, 401);

    const d = obiect(req.body);
    if (!d) return json(res, { eroare: 'JSON invalid.' }, 400);

    const { parolaVeche, parolaNoua } = d;
    utilizatori.schimbaParola(sesiune.utilizator, parolaVeche, parolaNoua);
    return json(res, { ok: true });
  } catch (e) {
    console.error('POST /api/schimba-parola:', e.message);
    return json(res, { eroare: e.message }, 400);
  }
});

app.get('/api/stare-acces', (req, res) => {
  const sesiune = utilizatori.dinCerere({ headers: { cookie: req.headers.cookie || '' } });
  const areConturi = utilizatori.exista();
  return json(res, {
    areConturi,
    autentificat: !!sesiune,
    utilizator: sesiune ? { utilizator: sesiune.utilizator, nume: sesiune.nume, rol: sesiune.rol || 'membru' } : null,
    esteManager: !areConturi || (sesiune && sesiune.rol === 'manager'),
  });
});

app.get('/', (req, res) => {
  res.send(genereazaPagina());
});

app.post('/api/cauta', (req, res) => {
  try {
    const sesiune = utilizatori.dinCerere({ headers: { cookie: req.headers.cookie || '' } });
    const areConturi = utilizatori.exista();

    if (areConturi && !sesiune) {
      return json(res, { eroare: 'neautentificat' }, 401);
    }

    const ip = req.ip || '0.0.0.0';

    if (!checkRateLimit(ip, 5)) {
      return json(res, { eroare: 'Prea multe cereri. Așteaptă 60 de secunde.' }, 429);
    }

    const d = obiect(req.body);
    if (!d) return json(res, { eroare: 'JSON invalid.' }, 400);

    const intrebare = text(d.intrebare, 1500);
    const email = text(d.email, 200);

    let altele = [];
    if (Array.isArray(d.altele)) {
      altele = d.altele.map(a => text(a, 100)).filter(Boolean).slice(0, 3);
    } else if (typeof d.altele === 'string' && d.altele.trim()) {
      altele = d.altele.split(/[\s,;]+/).map(a => a.trim()).filter(Boolean).slice(0, 3);
    }

    if (esteSuspect(intrebare)) {
      return json(res, { eroare: 'Textul conține caractere interzise.' }, 400);
    }

    if (!intrebare) {
      return json(res, { eroare: 'Cererea e goală.' }, 400);
    }

    if (email && !eAdresa(email)) {
      return json(res, { eroare: 'Email principal invalid.' }, 400);
    }

    if (email && altele.length > 0) {
      const mainDomain = email.split('@')[1];
      for (const a of altele) {
        if (!eAdresa(a)) {
          return json(res, { eroare: `Email invalid: ${a}` }, 400);
        }
        const domain = a.split('@')[1];
        if (domain === mainDomain) {
          return json(res, { eroare: 'Nu poți trimite la aceeași companie fără consimțământ.' }, 400);
        }
      }
    }

    if (email && (email.includes('\n') || email.includes('\r'))) {
      return json(res, { eroare: 'Email conține caractere invalide.' }, 400);
    }

    return json(res, { id: Math.random(), status: 'in_progress' });
  } catch (e) {
    console.error('POST /api/cauta:', e.message);
    return json(res, { eroare: 'Ceva n-a mers la noi.' }, 500);
  }
});

app.get('/api/rezultate', (req, res) => {
  return json(res, { rezultate: [] });
});

app.get('/api/historia', (req, res) => {
  return json(res, []);
});

app.listen(port, () => {
  initConturi();
  console.log(`🚀 Server pe http://localhost:${port}`);
});
