import {
  AttemptRecord,
  ExamPack,
  ExamSettings,
  QuestionStudyState,
  SavedExamDraft,
} from '../types/exam';

const KEYS = {
  CUSTOM_PACKS: 'ssw_jft_custom_packs_v1',
  SETTINGS: 'ssw_jft_settings_v1',
  HISTORY: 'ssw_jft_attempt_history_v1',
  STUDY_STATE: 'ssw_jft_study_state_v1',
  DRAFTS: 'ssw_jft_exam_drafts_v1',
  ACTIVE_PACK_ID: 'ssw_jft_active_exam_pack_v1',
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

export const EMPTY_STUDY_STATE: QuestionStudyState = {
  flaggedIds: [],
  masteredIds: [],
  completedPack: false,
  updatedAt: '',
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

export function loadStudyStates(): Record<string, QuestionStudyState> {
  const map = safeReadJson<Record<string, Partial<QuestionStudyState>>>(
    KEYS.STUDY_STATE,
    {}
  );
  if (!map || typeof map !== 'object') return {};
  const clean: Record<string, QuestionStudyState> = {};
  for (const [k, v] of Object.entries(map)) {
    clean[k] = {
      flaggedIds: Array.isArray(v?.flaggedIds) ? v.flaggedIds : [],
      masteredIds: Array.isArray(v?.masteredIds) ? v.masteredIds : [],
      completedPack: Boolean(v?.completedPack),
      updatedAt: typeof v?.updatedAt === 'string' ? v.updatedAt : '',
    };
  }
  return clean;
}

export function saveStudyStates(states: Record<string, QuestionStudyState>): void {
  safeWriteJson(KEYS.STUDY_STATE, states);
}

export function loadExamDrafts(): Record<string, SavedExamDraft> {
  const map = safeReadJson<Record<string, SavedExamDraft>>(KEYS.DRAFTS, {});
  return map && typeof map === 'object' ? map : {};
}

export function saveExamDraft(draft: SavedExamDraft): Record<string, SavedExamDraft> {
  const existing = loadExamDrafts();
  const next = { ...existing, [draft.packId]: draft };
  safeWriteJson(KEYS.DRAFTS, next);
  return next;
}

export function deleteExamDraft(packId: string): Record<string, SavedExamDraft> {
  const existing = loadExamDrafts();
  const next = { ...existing };
  delete next[packId];
  safeWriteJson(KEYS.DRAFTS, next);
  return next;
}

export function loadActiveExamPackId(): string | null {
  try {
    return localStorage.getItem(KEYS.ACTIVE_PACK_ID);
  } catch {
    return null;
  }
}

export function saveActiveExamPackId(packId: string | null): void {
  try {
    if (packId) {
      localStorage.setItem(KEYS.ACTIVE_PACK_ID, packId);
    } else {
      localStorage.removeItem(KEYS.ACTIVE_PACK_ID);
    }
  } catch {
    // Ignore storage errors
  }
}
