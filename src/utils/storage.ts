import { AttemptRecord, ExamPack, ExamSettings } from '../types/exam';

const KEYS = {
  CUSTOM_PACKS: 'ssw_jft_custom_packs_v1',
  SETTINGS: 'ssw_jft_settings_v1',
  HISTORY: 'ssw_jft_attempt_history_v1',
} as const;

export const DEFAULT_SETTINGS: ExamSettings = {
  candidateName: 'PESERTA LATIHAN',
  showFurigana: true,
  showPageTag: true,
  fontSize: 'normal',
  autoNext: false,
  instantFeedbackInStudy: true,
  cbtTheme: 'classic',
};

function safeReadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function safeWriteJson<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage quota errors gracefully
  }
}

export function loadCustomPacks(): ExamPack[] {
  const list = safeReadJson<ExamPack[]>(KEYS.CUSTOM_PACKS, []);
  return Array.isArray(list) ? list : [];
}

export function saveCustomPacks(packs: ExamPack[]): void {
  safeWriteJson(KEYS.CUSTOM_PACKS, packs);
}

export function loadSettings(): ExamSettings {
  const saved = safeReadJson<Partial<ExamSettings>>(KEYS.SETTINGS, {});
  return { ...DEFAULT_SETTINGS, ...saved };
}

export function saveSettings(settings: ExamSettings): void {
  safeWriteJson(KEYS.SETTINGS, settings);
}

export function loadAttemptHistory(): AttemptRecord[] {
  const list = safeReadJson<AttemptRecord[]>(KEYS.HISTORY, []);
  return Array.isArray(list) ? list : [];
}

export function saveAttemptRecord(record: AttemptRecord): AttemptRecord[] {
  const existing = loadAttemptHistory();
  const next = [record, ...existing].slice(0, 100);
  safeWriteJson(KEYS.HISTORY, next);
  return next;
}

export function clearAttemptHistory(): void {
  safeWriteJson(KEYS.HISTORY, []);
}
