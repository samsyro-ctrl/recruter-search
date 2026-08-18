import pkg from 'pg';
const { Pool } = pkg;

export class Database {
  constructor(connectionString) {
    this.pool = new Pool({
      connectionString: connectionString || process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
    this.firme = [];
  }

  async init() {
    try {
      const client = await this.pool.connect();

      // Create tables
      await client.query(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          username VARCHAR(100) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          email VARCHAR(255),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS cautari (
          id SERIAL PRIMARY KEY,
          intrebare TEXT NOT NULL,
          tip VARCHAR(50),
          email VARCHAR(255),
          altele TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS firme (
          id SERIAL PRIMARY KEY,
          cautare_id INTEGER REFERENCES cautari(id),
          nume VARCHAR(255),
          descriere TEXT,
          tip VARCHAR(50),
          oras VARCHAR(100),
          judet VARCHAR(100),
          nivel_loc INTEGER,
          zona_fata_de VARCHAR(50),
          score FLOAT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      client.release();
      console.log('✓ PostgreSQL ready');
    } catch (e) {
      console.error('DB init error:', e.message);
    }
  }

  async getUserByUsername(username) {
    try {
      const result = await this.pool.query(
        'SELECT id, username, password_hash, email FROM users WHERE username = $1',
        [username]
      );
      return result.rows[0] || null;
    } catch (e) {
      console.error('getUserByUsername error:', e.message);
      return null;
    }
  }

  async createUser(username, passwordHash, email) {
    try {
      const result = await this.pool.query(
        'INSERT INTO users (username, password_hash, email) VALUES ($1, $2, $3) RETURNING id',
        [username, passwordHash, email]
      );
      return result.rows[0]?.id || null;
    } catch (e) {
      console.error('createUser error:', e.message);
      return null;
    }
  }

  inregistreazaCautare(data) {
    return Math.random();
  }

  inregistreazaEsec(data) {
    console.log('Failed search:', data);
  }

  firmeFromSearch(query) {
    return this.firme;
  }

  dupaZona(firme, query) {
    return firme;
  }

  ultimeleCautari(limit) {
    return [];
  }

  async close() {
    await this.pool.end();
  }
}
