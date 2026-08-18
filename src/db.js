import sqlite3 from 'sqlite3';

export class Database {
  constructor(path = ':memory:') {
    this.db = new sqlite3.Database(path, err => {
      if (err) console.error('DB init error:', err);
    });
    this.db.configure('busyTimeout', 5000);
    this.cautari = [];
    this.firme = [];
  }

  init() {
    this.db.run(`
      CREATE TABLE IF NOT EXISTS cautari (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        intrebare TEXT,
        tip TEXT,
        stare TEXT DEFAULT 'in_progres',
        motiv TEXT,
        titlu TEXT,
        email TEXT,
        altele TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    this.db.run(`
      CREATE TABLE IF NOT EXISTS firme (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cautare_id INTEGER,
        nume TEXT,
        descriere TEXT,
        tip TEXT,
        oras TEXT,
        judet TEXT,
        nivel_loc INTEGER DEFAULT 0,
        zona_fata_de TEXT,
        score REAL,
        FOREIGN KEY(cautare_id) REFERENCES cautari(id)
      );
    `);

    this.db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        email TEXT UNIQUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✓ Database tables initialized');
  }

  inregistreazaCautare(c) {
    const id = Math.floor(Math.random() * 1000000);
    this.cautari.push({
      id,
      intrebare: c.intrebare,
      tip: c.tip || 'oameni',
      stare: c.stare || 'in_progres',
      email: c.email || null,
      altele: c.altele || null,
      created_at: new Date().toISOString()
    });

    this.db.run(
      `INSERT INTO cautari (intrebare, tip, stare, email, altele) VALUES (?, ?, ?, ?, ?)`,
      [c.intrebare, c.tip || 'oameni', c.stare || 'in_progres', c.email, c.altele],
      function(err) {
        if (!err) this.lastID = id;
      }
    );

    return id;
  }

  inregistreazaEsec(c) {
    this.db.run(
      `INSERT INTO cautari (intrebare, stare, motiv) VALUES (?, ?, ?)`,
      [c.intrebare, 'esuat', c.motiv || 'eroare necunoscuta']
    );
  }

  ultimeleCautari(limit = 10) {
    return this.cautari.slice(-limit).reverse();
  }

  firmeFromSearch(q) {
    const qid = parseInt(q) || 0;
    return this.firme.filter(f => f.cautare_id === qid).sort((a, b) => b.score - a.score);
  }

  dupaZona(firme, q) {
    return firme.sort((a, b) => {
      if (a.nivel_loc !== b.nivel_loc) return a.nivel_loc - b.nivel_loc;
      return b.score - a.score;
    });
  }

  adaugaColoana(tabel, coloana, definitie) {
    this.db.run(`ALTER TABLE ${tabel} ADD COLUMN ${coloana} ${definitie}`, err => {
      // Ignore if column exists
    });
  }

  getUserByUsername(username) {
    return new Promise((resolve) => {
      this.db.get(
        `SELECT id, username, password_hash, email FROM users WHERE username = ?`,
        [username],
        (err, row) => {
          resolve(row || null);
        }
      );
    });
  }

  createUser(username, passwordHash, email) {
    return new Promise((resolve) => {
      this.db.run(
        `INSERT INTO users (username, password_hash, email) VALUES (?, ?, ?)`,
        [username, passwordHash, email],
        function(err) {
          if (err) resolve(null);
          else resolve(this.lastID);
        }
      );
    });
  }
}
