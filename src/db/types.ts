export type ExamType = 'voto' | 'tirocinio';
export type ModuloType = 'scritto' | 'orale' | 'progetto' | 'ore';

export interface Esame {
  id: number;
  nome: string;
  cfu: number;
  tipo: ExamType;
  voto_finale: number | null;
  ore_tirocinio_target: number | null;
  superato: 0 | 1;
  created_at: string;
}

export interface Modulo {
  id: number;
  esame_id: number;
  nome: string;
  tipo: ModuloType;
  completato: 0 | 1;
  ore_completate: number | null;
}

export interface SessioneStudio {
  id: number;
  esame_id: number;
  durata_minuti: number;
  data: string;
}
