import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { spawn } from 'child_process';
import { readFileSync } from 'fs';
import { Database } from './db.js';
import { cheama } from './ai.js';
import { genereazaPagina } from './pagina.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const db = new Database(':memory:');
const port = process.env.PORT || 3000;

db.init();

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
app.use((req, res, next) => {
  req.body = '';
  if (req.method !== 'POST' && req.method !== 'PUT') return next();

  req.on('data', chunk => {
    req.body += chunk.toString();
  });

  req.on('end', next);
});

// ========== ROUTES ==========

app.get('/', (req, res) => {
  res.send(genereazaPagina());
});

app.post('/cauta', async (req, res) => {
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
    const altele = (d.altele || '').split(/[\s,;]+/).filter(Boolean).slice(0, 3);

    if (esteSuspect(intrebare)) {
      db.inregistreazaEsec({ intrebare, motiv: 'intrare suspecta' });
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

    // Call AI to parse + clarify
    const clientAI = new (await import('@anthropic-ai/sdk')).default();
    const raspuns = await cheama(clientAI, { intrebare }, '/cauta');

    if (!raspuns || raspuns.tip === 'neclar') {
      const c = { intrebare, stare: 'clarificare_ceruta', motiv: raspuns?.clarificare?.intrebare };
      db.inregistreazaCautare(c);
      return res.json({
        clarificare: raspuns?.clarificare,
        id: c.id
      });
    }

    // Launch search
    const child = spawn('node', ['src/index.js'], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    const id = db.inregistreazaCautare({
      intrebare,
      tip: raspuns.tip,
      email: email || null,
      altele: altele.join(',') || null
    });

    child.stdin.write(JSON.stringify({ intrebare, id, email, altele }));
    child.stdin.end();

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', chunk => {
      stdout += chunk.toString();
    });

    child.stderr.on('data', chunk => {
      stderr += chunk.toString();
    });

    child.on('close', code => {
      if (code !== 0) {
        db.inregistreazaEsec({ intrebare, motiv: stderr.slice(0, 500) });
      }
    });

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
