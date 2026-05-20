export type ExamType = 'voto' | 'tirocinio';
export type ModuloType = 'scritto' | 'orale' | 'progetto' | 'ore';

export interface Esame {
  id: number;
  nome: string;
  professore: string | null;
  cfu: number;
  tipo: ExamType;
  voto_finale: number | null;
  ore_tirocinio_target: number | null;
  superato: 0 | 1;
  created_at: string;
  data_esame: string | null; // 'YYYY-MM-DD'
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

export interface Lezione {
  id: number;
  esame_id: number;
  giorno: number; // 0=Lunedì … 4=Venerdì
  ora_inizio: string; // "09:00"
  ora_fine: string;   // "11:00"
  aula: string;
  colore: string;     // hex
}

export interface LezioneConEsame extends Lezione {
  nome_esame: string;
  professore: string | null;
}

export interface TaskStudio {
  id: number;
  esame_id: number;
  nome: string;
  difficolta: number; // 1-10
  ore_stimate: number;
  completato: 0 | 1;
}

export interface TaskConEsame extends TaskStudio {
  nome_esame: string;
  data_esame: string | null;
  cfu: number;
}

export interface BloccoOccupato {
  id: number;
  data: string;       // 'YYYY-MM-DD'
  ora_inizio: string; // 'HH:MM'
  ora_fine: string;
  etichetta: string | null;
}

export interface PianoSessione {
  id: number;
  task_id: number;
  data: string;
  ora_inizio: string;
  ora_fine: string;
  ore_pianificate: number;
}

export interface PianoSessioneConTask extends PianoSessione {
  nome_task: string;
  nome_esame: string;
  difficolta: number;
}
