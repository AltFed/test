import * as SQLite from 'expo-sqlite';
import type {
  Esame, Modulo, SessioneStudio, Lezione, LezioneConEsame,
  TaskStudio, TaskConEsame, BloccoOccupato, PianoSessione, PianoSessioneConTask,
  Flashcard,
} from './types';

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

    CREATE TABLE IF NOT EXISTS lezioni (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      esame_id INTEGER NOT NULL,
      giorno INTEGER NOT NULL,
      ora_inizio TEXT NOT NULL,
      ora_fine TEXT NOT NULL,
      aula TEXT NOT NULL,
      colore TEXT NOT NULL DEFAULT '#7C4DFF',
      FOREIGN KEY (esame_id) REFERENCES esami(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS task_studio (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      esame_id INTEGER NOT NULL,
      nome TEXT NOT NULL,
      difficolta INTEGER NOT NULL DEFAULT 5,
      ore_stimate REAL NOT NULL DEFAULT 2.0,
      completato INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (esame_id) REFERENCES esami(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS blocchi_occupati (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      data TEXT NOT NULL,
      ora_inizio TEXT NOT NULL,
      ora_fine TEXT NOT NULL,
      etichetta TEXT
    );

    CREATE TABLE IF NOT EXISTS flashcard (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      esame_id INTEGER NOT NULL,
      domanda TEXT NOT NULL,
      risposta TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (esame_id) REFERENCES esami(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS piano_studio (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL,
      data TEXT NOT NULL,
      ora_inizio TEXT NOT NULL,
      ora_fine TEXT NOT NULL,
      ore_pianificate REAL NOT NULL,
      FOREIGN KEY (task_id) REFERENCES task_studio(id) ON DELETE CASCADE
    );
  `);

  // Migrazioni
  try { db().runSync('ALTER TABLE esami ADD COLUMN professore TEXT;'); } catch {}
  try { db().runSync('ALTER TABLE esami ADD COLUMN data_esame TEXT;'); } catch {}
  try { db().runSync('ALTER TABLE lezioni ADD COLUMN esame_id INTEGER NOT NULL DEFAULT 0;'); } catch {}
  try { db().runSync('ALTER TABLE lezioni DROP COLUMN nome;'); } catch {}
  try { db().runSync('ALTER TABLE lezioni DROP COLUMN professore;'); } catch {}
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
  professore?: string,
  ore_tirocinio_target?: number
): number {
  const result = db().runSync(
    'INSERT INTO esami (nome, cfu, tipo, professore, ore_tirocinio_target, superato, created_at) VALUES (?, ?, ?, ?, ?, 0, ?)',
    nome, cfu, tipo, professore ?? null, ore_tirocinio_target ?? null, new Date().toISOString()
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

export function getMinutiStudioOggi(fromTs: string): number {
  return db().getFirstSync<{ tot: number }>(
    'SELECT COALESCE(SUM(durata_minuti), 0) as tot FROM sessioni_studio WHERE data >= ?',
    fromTs
  )?.tot ?? 0;
}

// --- Lezioni ---

export function getAllLezioniConEsame(): LezioneConEsame[] {
  return db().getAllSync<LezioneConEsame>(`
    SELECT l.*, e.nome AS nome_esame, e.professore
    FROM lezioni l
    JOIN esami e ON e.id = l.esame_id
    ORDER BY l.giorno ASC, l.ora_inizio ASC
  `);
}

export function getLezioniByEsame(esameId: number): Lezione[] {
  return db().getAllSync<Lezione>(
    'SELECT * FROM lezioni WHERE esame_id = ? ORDER BY giorno ASC, ora_inizio ASC',
    esameId
  );
}

export function insertLezione(
  esameId: number,
  giorno: number,
  ora_inizio: string,
  ora_fine: string,
  aula: string,
  colore: string
): void {
  db().runSync(
    'INSERT INTO lezioni (esame_id, giorno, ora_inizio, ora_fine, aula, colore) VALUES (?, ?, ?, ?, ?, ?)',
    esameId, giorno, ora_inizio, ora_fine, aula, colore
  );
}

export function deleteLezione(id: number): void {
  db().runSync('DELETE FROM lezioni WHERE id = ?', id);
}

// --- Stats globali ---

export function getMediaPonderata(extraVoti?: { voto: number; cfu: number }[]): number {
  const esami = db().getAllSync<{ voto: number; cfu: number }>(
    'SELECT voto_finale as voto, cfu FROM esami WHERE superato = 1 AND tipo = "voto" AND voto_finale IS NOT NULL'
  );
  const all = [...esami, ...(extraVoti ?? [])];
  if (all.length === 0) return 0;
  const sumCfu = all.reduce((s, e) => s + e.cfu, 0);
  const sumPeso = all.reduce((s, e) => s + (e.voto === 33 ? 30 : e.voto) * e.cfu, 0);
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

export function updateEsameDataEsame(id: number, dataEsame: string | null): void {
  db().runSync('UPDATE esami SET data_esame = ? WHERE id = ?', dataEsame, id);
}

// --- Task studio ---

export function getTaskStudio(esameId: number): TaskStudio[] {
  return db().getAllSync<TaskStudio>(
    'SELECT * FROM task_studio WHERE esame_id = ? ORDER BY completato ASC, id ASC',
    esameId
  );
}

export function insertTaskStudio(
  esameId: number,
  nome: string,
  difficolta: number,
  ore_stimate: number
): void {
  db().runSync(
    'INSERT INTO task_studio (esame_id, nome, difficolta, ore_stimate, completato) VALUES (?, ?, ?, ?, 0)',
    esameId, nome, difficolta, ore_stimate
  );
}

export function toggleTaskStudio(id: number, completato: 0 | 1): void {
  db().runSync('UPDATE task_studio SET completato = ? WHERE id = ?', completato, id);
}

export function deleteTaskStudio(id: number): void {
  db().runSync('DELETE FROM task_studio WHERE id = ?', id);
}

// --- Blocchi occupati ---

export function getBlocchiOccupati(): BloccoOccupato[] {
  return db().getAllSync<BloccoOccupato>(
    'SELECT * FROM blocchi_occupati ORDER BY data ASC, ora_inizio ASC'
  );
}

export function insertBlocco(
  data: string,
  ora_inizio: string,
  ora_fine: string,
  etichetta?: string
): void {
  db().runSync(
    'INSERT INTO blocchi_occupati (data, ora_inizio, ora_fine, etichetta) VALUES (?, ?, ?, ?)',
    data, ora_inizio, ora_fine, etichetta ?? null
  );
}

export function deleteBlocco(id: number): void {
  db().runSync('DELETE FROM blocchi_occupati WHERE id = ?', id);
}

// --- Piano studio ---

export function getPianoSessioni(): PianoSessioneConTask[] {
  const today = new Date().toISOString().slice(0, 10);
  return db().getAllSync<PianoSessioneConTask>(`
    SELECT p.*, t.nome AS nome_task, t.difficolta, e.nome AS nome_esame
    FROM piano_studio p
    JOIN task_studio t ON t.id = p.task_id
    JOIN esami e ON e.id = t.esame_id
    WHERE p.data >= ?
    ORDER BY p.data ASC, p.ora_inizio ASC
  `, today);
}

// --- Helpers algoritmo ---

function _timeToMins(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function _minsToTime(m: number): string {
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

function _getFreeSlots(
  date: Date,
  blocchi: BloccoOccupato[],
  lezioni: Lezione[],
  dayStart: number,
  dayEnd: number
): Array<{ start: number; end: number }> {
  const dateStr = date.toISOString().slice(0, 10);
  const dbGiorno = (date.getDay() + 6) % 7; // JS 0=Sun → DB 0=Mon

  const occupied = [
    ...lezioni
      .filter((l) => l.giorno === dbGiorno)
      .map((l) => ({ start: _timeToMins(l.ora_inizio), end: _timeToMins(l.ora_fine) })),
    ...blocchi
      .filter((b) => b.data === dateStr)
      .map((b) => ({ start: _timeToMins(b.ora_inizio), end: _timeToMins(b.ora_fine) })),
  ].sort((a, b) => a.start - b.start);

  const merged: Array<{ start: number; end: number }> = [];
  for (const s of occupied) {
    if (merged.length > 0 && s.start <= merged[merged.length - 1].end) {
      merged[merged.length - 1].end = Math.max(merged[merged.length - 1].end, s.end);
    } else {
      merged.push({ ...s });
    }
  }

  const free: Array<{ start: number; end: number }> = [];
  let cur = dayStart;
  for (const occ of merged) {
    if (occ.start > cur) free.push({ start: cur, end: Math.min(occ.start, dayEnd) });
    cur = Math.max(cur, occ.end);
    if (cur >= dayEnd) break;
  }
  if (cur < dayEnd) free.push({ start: cur, end: dayEnd });
  return free;
}

function _placeSession(
  free: Array<{ start: number; end: number }>,
  prevEnd: number,
  minRimanenti: number,
  budget: number
): { start: number; end: number } | null {
  const toSchedule = Math.min(minRimanenti, budget);
  for (const slot of free) {
    const start = Math.max(slot.start, prevEnd);
    if (start >= slot.end) continue;
    const dur = Math.min(toSchedule, slot.end - start);
    if (dur <= 0) continue;
    return { start, end: start + dur };
  }
  return null;
}

// --- Flashcard ---

export function getFlashcard(esameId: number): Flashcard[] {
  return db().getAllSync<Flashcard>(
    'SELECT * FROM flashcard WHERE esame_id = ? ORDER BY created_at ASC',
    esameId
  );
}

export function countFlashcard(esameId: number): number {
  return db().getFirstSync<{ n: number }>(
    'SELECT COUNT(*) as n FROM flashcard WHERE esame_id = ?',
    esameId
  )?.n ?? 0;
}

export function insertFlashcard(esameId: number, domanda: string, risposta: string): void {
  db().runSync(
    'INSERT INTO flashcard (esame_id, domanda, risposta, created_at) VALUES (?, ?, ?, ?)',
    esameId, domanda, risposta, new Date().toISOString()
  );
}

export function deleteFlashcard(id: number): void {
  db().runSync('DELETE FROM flashcard WHERE id = ?', id);
}

// --- Algoritmo piano studio ---

export function generatePiano(): void {
  db().runSync('DELETE FROM piano_studio');

  const tasks = db().getAllSync<TaskConEsame>(`
    SELECT t.*, e.nome AS nome_esame, e.data_esame, e.cfu
    FROM task_studio t
    JOIN esami e ON e.id = t.esame_id
    WHERE t.completato = 0
    ORDER BY COALESCE(e.data_esame, '9999-12-31') ASC, t.difficolta DESC
  `);

  if (tasks.length === 0) return;

  const allBlocchi = db().getAllSync<BloccoOccupato>('SELECT * FROM blocchi_occupati');
  const allLezioni = db().getAllSync<Lezione>('SELECT * FROM lezioni');

  const DEEP_WORK_MAX = 240; // minuti
  const DAY_START = 8 * 60;
  const DAY_END = 22 * 60;

  const minPerGiorno: Record<string, number> = {};
  const lastEndPerGiorno: Record<string, number> = {};

  for (const task of tasks) {
    let minRimanenti = Math.round(task.ore_stimate * 60);
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    let safety = 0;

    while (minRimanenti > 0 && safety < 120) {
      safety++;
      const dateStr = d.toISOString().slice(0, 10);
      if (task.data_esame && dateStr > task.data_esame) break;

      const budget = DEEP_WORK_MAX - (minPerGiorno[dateStr] ?? 0);
      if (budget > 0) {
        const free = _getFreeSlots(d, allBlocchi, allLezioni, DAY_START, DAY_END);
        const prevEnd = lastEndPerGiorno[dateStr] ?? DAY_START;
        const sess = _placeSession(free, prevEnd, minRimanenti, budget);

        if (sess) {
          const dur = sess.end - sess.start;
          db().runSync(
            'INSERT INTO piano_studio (task_id, data, ora_inizio, ora_fine, ore_pianificate) VALUES (?, ?, ?, ?, ?)',
            task.id, dateStr, _minsToTime(sess.start), _minsToTime(sess.end), dur / 60
          );
          minPerGiorno[dateStr] = (minPerGiorno[dateStr] ?? 0) + dur;
          lastEndPerGiorno[dateStr] = sess.end;
          minRimanenti -= dur;
        }
      }

      d.setDate(d.getDate() + 1);
    }
  }
}
