import Database from 'better-sqlite3';

export class Database {
  constructor(path = 'memorie.db') {
    this.db = new Database(path);
    this.db.pragma('journal_mode = WAL');
  }

  init() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS cautari (
        id INTEGER PRIMARY KEY,
        intrebare TEXT,
        tip TEXT,
        stare TEXT DEFAULT 'in_progres',
        motiv TEXT,
        titlu TEXT,
        email TEXT,
        altele TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS firme (
        id INTEGER PRIMARY KEY,
        cautare_id INTEGER,
        nume TEXT,
        descriere TEXT,
        tip TEXT,
        oras TEXT,
        judet TEXT,
        nivel_loc INTEGER,
        zona_fata_de TEXT,
        score REAL,
        FOREIGN KEY(cautare_id) REFERENCES cautari(id)
      );
    `);
  }

  inregistreazaCautare(c) {
    const stmt = this.db.prepare(`
      INSERT INTO cautari (intrebare, tip, stare, email, altele)
      VALUES (?, ?, ?, ?, ?)
    `);
    const result = stmt.run(c.intrebare, c.tip || 'oameni', c.stare || 'in_progres', c.email, c.altele);
    return result.lastInsertRowid;
  }

  inregistreazaEsec(c) {
    const stmt = this.db.prepare(`
      INSERT INTO cautari (intrebare, stare, motiv)
      VALUES (?, ?, ?)
    `);
    stmt.run(c.intrebare, 'esuat', c.motiv || 'eroare necunoscuta');
  }

  ultimeleCautari(limit = 10) {
    const stmt = this.db.prepare(`
      SELECT id, intrebare, tip, stare, created_at
      FROM cautari
      ORDER BY created_at DESC
      LIMIT ?
    `);
    return stmt.all(limit);
  }

  firmeFromSearch(q) {
    const stmt = this.db.prepare(`
      SELECT * FROM firme WHERE cautare_id = ?
      ORDER BY score DESC
    `);
    return stmt.all(parseInt(q) || 0);
  }

  dupaZona(firme, q) {
    // Sort by nivel_loc (0=exact, 1=city, 2=county, 3=neighboring), then score
    return firme.sort((a, b) => {
      if (a.nivel_loc !== b.nivel_loc) return a.nivel_loc - b.nivel_loc;
      return b.score - a.score;
    });
  }

  adaugaColoana(tabel, coloana, definitie) {
    try {
      this.db.exec(`ALTER TABLE ${tabel} ADD COLUMN ${coloana} ${definitie}`);
    } catch {
      // Coloana deja exista
    }
  }
}
