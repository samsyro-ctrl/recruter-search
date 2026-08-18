import express from 'express';
import session from 'express-session';
import bcrypt from 'bcrypt';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { spawn } from 'child_process';
import { readFileSync } from 'fs';
import { Database } from './db.js';
// import { cheama } from './ai.js';
import { genereazaPagina } from './pagina.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const db = new Database({
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS || 'postgres123',
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'recruter_db'
});
const port = process.env.PORT || 3000;

await db.init();

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
app.use(session({
  secret: process.env.SESSION_SECRET || 'recruter-secret-key-change-in-prod',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, maxAge: 86400000 } // 24h
}));
app.use((req, res, next) => {
  req.body = '';
  if (req.method !== 'POST' && req.method !== 'PUT') return next();

  req.on('data', chunk => {
    req.body += chunk.toString();
  });

  req.on('end', next);
});

// ========== AUTH MIDDLEWARE ==========

function requireAuth(req, res, next) {
  if (req.session.userId) return next();
  res.status(401).json({ eroare: 'Trebuie să te autentifici.' });
}

// ========== ROUTES ==========

app.post('/register', async (req, res) => {
  try {
    const d = obiect(req.body);
    if (!d) return res.status(400).json({ eroare: 'JSON invalid.' });

    const username = text(d.username, 100);
    const password = text(d.password, 200);
    const email = text(d.email, 200);

    if (!username || !password) {
      return res.status(400).json({ eroare: 'Username și password sunt obligatorii.' });
    }

    const hash = await bcrypt.hash(password, 10);
    const id = await db.createUser(username, hash, email || null);

    if (!id) {
      return res.status(400).json({ eroare: 'Username deja folosit.' });
    }

    req.session.userId = id;
    req.session.username = username;
    res.json({ success: true, message: 'Binevenit!' });
  } catch (e) {
    console.error('Register error:', e.message);
    res.status(500).json({ eroare: 'Eroare la înregistrare.' });
  }
});

app.post('/login', async (req, res) => {
  try {
    const d = obiect(req.body);
    if (!d) return res.status(400).json({ eroare: 'JSON invalid.' });

    const username = text(d.username, 100);
    const password = text(d.password, 200);

    if (!username || !password) {
      return res.status(400).json({ eroare: 'Username și password sunt obligatorii.' });
    }

    const user = await db.getUserByUsername(username);
    if (!user) {
      return res.status(401).json({ eroare: 'Username sau password incorect.' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ eroare: 'Username sau password incorect.' });
    }

    req.session.userId = user.id;
    req.session.username = user.username;
    res.json({ success: true, message: 'Binevenit!' });
  } catch (e) {
    console.error('Login error:', e.message);
    res.status(500).json({ eroare: 'Eroare la autentificare.' });
  }
});

app.post('/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

app.get('/', (req, res) => {
  res.send(genereazaPagina());
});

app.post('/cauta', requireAuth, async (req, res) => {
  try {
    const ip = req.ip || '0.0.0.0';

    // TEST 1 & 3: Rate limit + input validation
    if (!checkRateLimit(ip, 5)) {
      return res.status(429).json({ eroare: 'Prea multe cereri. Așteaptă 60 de secunde.' });
    }

    const d = obiect(req.body);
    if (!d) return res.status(400).json({ eroare: 'JSON invalid.' });

    // TEST 1: Sanitize + validate input
    const intrebare = text(d.intrebare, 1500);
    const email = text(d.email, 200);

    // Normalize altele: puede ser array o string
    let altele = [];
    if (Array.isArray(d.altele)) {
      altele = d.altele.map(a => text(a, 100)).filter(Boolean).slice(0, 3);
    } else if (typeof d.altele === 'string' && d.altele.trim()) {
      altele = d.altele.split(/[\s,;]+/).map(a => a.trim()).filter(Boolean).slice(0, 3);
    }

    if (esteSuspect(intrebare)) {
      await db.inregistreazaEsec({ intrebare, motiv: 'intrare suspecta' });
      return res.status(400).json({ eroare: 'Textul conține caractere interzise.' });
    }

    if (!intrebare) {
      return res.status(400).json({ eroare: 'Cererea e goală.' });
    }

    // TEST 3: Email validation - max 3, domain check, header injection prevention
    if (email && !eAdresa(email)) {
      return res.status(400).json({ eroare: 'Email principal invalid.' });
    }

    if (email && altele.length > 0) {
      const mainDomain = email.split('@')[1];
      for (const a of altele) {
        if (!eAdresa(a)) {
          return res.status(400).json({ eroare: `Email invalid: ${a}` });
        }
        // Previne abuse: nu trimite pe colegii din același domeniu fără validare
        const domain = a.split('@')[1];
        if (domain === mainDomain) {
          return res.status(400).json({ eroare: 'Nu poți trimite la aceeași companie fără consimțământ.' });
        }
      }
    }

    // TEST 3: Header injection prevention - reject \n, \r in email
    if (email && (email.includes('\n') || email.includes('\r'))) {
      return res.status(400).json({ eroare: 'Email conține caractere invalide.' });
    }

    // For testing: simple mock response
    const raspuns = { tip: 'oameni', mesaj: 'OK' };

    // In production: Call AI to parse + clarify
    // const clientAI = new (await import('@anthropic-ai/sdk')).default();
    // const raspuns = await cheama(clientAI, { intrebare }, '/cauta');

    // Register search
    const id = await db.inregistreazaCautare({
      intrebare,
      tip: raspuns.tip,
      email: email || null,
      altele: altele.join(',') || null
    });

    // For testing: mock results
    setTimeout(() => {
      db.firme.push({
        id: Math.random(),
        cautare_id: id,
        nume: 'Electrician Pro SRL',
        descriere: 'Instalații electrice rezidențiale și comerciale',
        tip: 'electrician',
        oras: 'Buzau',
        judet: 'Buzau',
        nivel_loc: 0,
        zona_fata_de: 'exact',
        score: 0.95
      });
    }, 500);

    res.json({ id, status: 'in_progress' });

  } catch (e) {
    console.error('POST /cauta:', e.message);
    res.status(500).json({ eroare: 'Ceva n-a mers la noi.' });
  }
});

app.get('/rezultate', (req, res) => {
  try {
    const q = text(req.query.q, 500);
    const doarLocal = req.query.doarLocal === 'true';

    if (!q) return res.json({ rezultate: [] });

    const firme = db.firmeFromSearch(q);
    const ordonat = db.dupaZona(firme, q);

    // Filter by nivel if doar local
    const filtrate = doarLocal ? ordonat.filter(f => f.nivel_loc === 0) : ordonat;

    res.json({ rezultate: filtrate });
  } catch (e) {
    res.status(500).json({ eroare: 'Eroare la preluare rezultate.' });
  }
});

app.get('/historia', (req, res) => {
  try {
    const cautari = db.ultimeleCautari(10);
    res.json(cautari);
  } catch (e) {
    res.status(500).json({ eroare: 'Eroare la preluare istoric.' });
  }
});

app.listen(port, () => {
  console.log(`🚀 Server pe http://localhost:${port}`);
});
