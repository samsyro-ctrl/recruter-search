import pkg from 'pg';
const { Pool } = pkg;

export class Database {
  constructor(config = {}) {
    this.pool = new Pool({
      user: config.user || 'postgres',
      password: config.password || 'postgres123',
      host: config.host || 'localhost',
      port: config.port || 5432,
      database: config.database || 'recruter_db'
    });
    this.cautari = [];
    this.firme = [];
  }

  async init() {
    try {
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS cautari (
          id SERIAL PRIMARY KEY,
          intrebare TEXT,
          tip TEXT,
          stare TEXT DEFAULT 'in_progres',
          motiv TEXT,
          titlu TEXT,
          email TEXT,
          altele TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS firme (
          id SERIAL PRIMARY KEY,
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
      console.log('✓ Database tables initialized');
    } catch (err) {
      console.error('DB init error:', err);
    }
  }

  async inregistreazaCautare(c) {
    try {
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

      await this.pool.query(
        `INSERT INTO cautari (intrebare, tip, stare, email, altele) VALUES ($1, $2, $3, $4, $5)`,
        [c.intrebare, c.tip || 'oameni', c.stare || 'in_progres', c.email, c.altele]
      );

      return id;
    } catch (err) {
      console.error('Insert error:', err);
      return null;
    }
  }

  async inregistreazaEsec(c) {
    try {
      await this.pool.query(
        `INSERT INTO cautari (intrebare, stare, motiv) VALUES ($1, $2, $3)`,
        [c.intrebare, 'esuat', c.motiv || 'eroare necunoscuta']
      );
    } catch (err) {
      console.error('Error registration failed:', err);
    }
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

  async adaugaColoana(tabel, coloana, definitie) {
    try {
      await this.pool.query(`ALTER TABLE ${tabel} ADD COLUMN ${coloana} ${definitie}`);
    } catch (err) {
      // Ignore if column exists
    }
  }

  async close() {
    await this.pool.end();
  }
}
