import * as SQLite from 'expo-sqlite';
import type { Esame, Modulo, SessioneStudio } from './types';

let _db: SQLite.SQLiteDatabase | null = null;

function db(): SQLite.SQLiteDatabase {
  if (!_db) _db = SQLite.openDatabaseSync('universal.db');
  return _db;
}

export function initDatabase(): void {
  db().execSync('PRAGMA foreign_keys = ON;');
  db().execSync(`
    CREATE TABLE IF NOT EXISTS impostazioni (
      chiave TEXT PRIMARY KEY,
      valore TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS esami (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      cfu INTEGER NOT NULL,
      tipo TEXT NOT NULL DEFAULT 'voto',
      voto_finale INTEGER,
      ore_tirocinio_target INTEGER,
      superato INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS moduli (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      esame_id INTEGER NOT NULL,
      nome TEXT NOT NULL,
      tipo TEXT NOT NULL DEFAULT 'scritto',
      completato INTEGER NOT NULL DEFAULT 0,
      ore_completate INTEGER,
      FOREIGN KEY (esame_id) REFERENCES esami(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS sessioni_studio (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      esame_id INTEGER NOT NULL,
      durata_minuti INTEGER NOT NULL,
      data TEXT NOT NULL,
      FOREIGN KEY (esame_id) REFERENCES esami(id) ON DELETE CASCADE
    );
  `);
}

// --- Impostazioni ---

export function getSetting(key: string): string | null {
  return db().getFirstSync<{ valore: string }>(
    'SELECT valore FROM impostazioni WHERE chiave = ?',
    key
  )?.valore ?? null;
}

export function setSetting(key: string, value: string): void {
  db().runSync(
    'INSERT OR REPLACE INTO impostazioni (chiave, valore) VALUES (?, ?)',
    key, value
  );
}

// --- Esami ---

export function getAllEsami(): Esame[] {
  return db().getAllSync<Esame>(
    'SELECT * FROM esami ORDER BY superato ASC, created_at DESC'
  );
}

export function getEsame(id: number): Esame | null {
  return db().getFirstSync<Esame>('SELECT * FROM esami WHERE id = ?', id);
}

export function insertEsame(
  nome: string,
  cfu: number,
  tipo: 'voto' | 'tirocinio',
  ore_tirocinio_target?: number
): number {
  const result = db().runSync(
    'INSERT INTO esami (nome, cfu, tipo, ore_tirocinio_target, superato, created_at) VALUES (?, ?, ?, ?, 0, ?)',
    nome, cfu, tipo, ore_tirocinio_target ?? null, new Date().toISOString()
  );
  return result.lastInsertRowId;
}

export function updateEsameVoto(id: number, voto: number): void {
  db().runSync(
    'UPDATE esami SET voto_finale = ?, superato = 1 WHERE id = ?',
    voto, id
  );
}

export function deleteEsame(id: number): void {
  db().runSync('DELETE FROM esami WHERE id = ?', id);
}

// --- Moduli ---

export function getModuli(esameId: number): Modulo[] {
  return db().getAllSync<Modulo>(
    'SELECT * FROM moduli WHERE esame_id = ? ORDER BY id ASC',
    esameId
  );
}

export function insertModulo(
  esameId: number,
  nome: string,
  tipo: 'scritto' | 'orale' | 'progetto' | 'ore'
): void {
  db().runSync(
    'INSERT INTO moduli (esame_id, nome, tipo, completato) VALUES (?, ?, ?, 0)',
    esameId, nome, tipo
  );
}

export function toggleModulo(id: number, completato: 0 | 1): void {
  db().runSync('UPDATE moduli SET completato = ? WHERE id = ?', completato, id);
}

export function deleteModulo(id: number): void {
  db().runSync('DELETE FROM moduli WHERE id = ?', id);
}

// --- Sessioni studio ---

export function insertSessione(esameId: number, durataMinuti: number): void {
  db().runSync(
    'INSERT INTO sessioni_studio (esame_id, durata_minuti, data) VALUES (?, ?, ?)',
    esameId, durataMinuti, new Date().toISOString()
  );
}

export function getOreStudiate(esameId: number): number {
  const row = db().getFirstSync<{ tot: number }>(
    'SELECT COALESCE(SUM(durata_minuti), 0) as tot FROM sessioni_studio WHERE esame_id = ?',
    esameId
  );
  return Math.round(((row?.tot ?? 0) / 60) * 10) / 10;
}

export function getSessioniRecenti(esameId: number): SessioneStudio[] {
  return db().getAllSync<SessioneStudio>(
    'SELECT * FROM sessioni_studio WHERE esame_id = ? ORDER BY data DESC LIMIT 10',
    esameId
  );
}

// --- Stats globali ---

export function getMediaPonderata(extraVoti?: { voto: number; cfu: number }[]): number {
  const esami = db().getAllSync<{ voto: number; cfu: number }>(
    'SELECT voto_finale as voto, cfu FROM esami WHERE superato = 1 AND tipo = "voto" AND voto_finale IS NOT NULL'
  );
  const all = [...esami, ...(extraVoti ?? [])];
  if (all.length === 0) return 0;
  const sumCfu = all.reduce((s, e) => s + e.cfu, 0);
  const sumPeso = all.reduce((s, e) => s + e.voto * e.cfu, 0);
  return Math.round((sumPeso / sumCfu) * 100) / 100;
}

export function getCfuAcquisiti(): number {
  return db().getFirstSync<{ tot: number }>(
    'SELECT COALESCE(SUM(cfu), 0) as tot FROM esami WHERE superato = 1'
  )?.tot ?? 0;
}

export function getEsamiSuperati(): Esame[] {
  return db().getAllSync<Esame>(
    'SELECT * FROM esami WHERE superato = 1 ORDER BY created_at DESC'
  );
}
