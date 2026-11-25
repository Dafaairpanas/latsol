import {
  AttemptRecord,
  ExamPack,
  ExamSettings,
  QuestionAttemptStat,
  QuestionStudyState,
  SavedExamDraft,
} from '../types/exam';

const KEYS = {
  CUSTOM_PACKS: 'ssw_jft_custom_packs_v1',
  SETTINGS: 'ssw_jft_settings_v1',
  HISTORY: 'ssw_jft_attempt_history_v1',
  QUESTION_STATS: 'ssw_jft_question_stats_v1',
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

export interface SessionQuestionOutcome {
  questionId: string;
  sourcePackId?: string;
  isCorrect: boolean;
  selectedOptionText?: string;
}

/**
 * Loads cumulative per-question attempt statistics.
 * Performs a one-time backfill from legacy AttemptRecord.wrongQuestionIds
 * only when the stats key has never been initialized (null in localStorage).
 */
export function loadQuestionStats(): Record<string, QuestionAttemptStat> {
  try {
    const raw = localStorage.getItem(KEYS.QUESTION_STATS);
    if (raw === null) {
      const legacyHistory = loadAttemptHistory();
      if (legacyHistory.length === 0) return {};
      const seeded: Record<string, QuestionAttemptStat> = {};
      const chronological = [...legacyHistory].reverse();
      for (const att of chronological) {
        for (const qId of att.wrongQuestionIds || []) {
          const prev = seeded[qId];
          seeded[qId] = {
            questionId: qId,
            packId: prev?.packId || att.packId,
            attempts: (prev?.attempts || 0) + 1,
            correctCount: prev?.correctCount || 0,
            wrongCount: (prev?.wrongCount || 0) + 1,
            consecutiveCorrect: 0,
            lastResult: 'wrong',
            lastAttemptAt: att.completedAt,
            lastWrongAt: att.completedAt,
            lastWrongAnswerText: prev?.lastWrongAnswerText,
          };
        }
      }
      safeWriteJson(KEYS.QUESTION_STATS, seeded);
      return seeded;
    }

    const parsed = JSON.parse(raw) as Record<string, Partial<QuestionAttemptStat>>;
    if (!parsed || typeof parsed !== 'object') return {};
    const clean: Record<string, QuestionAttemptStat> = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (!v || typeof v !== 'object') continue;
      clean[k] = {
        questionId: typeof v.questionId === 'string' ? v.questionId : k,
        packId: typeof v.packId === 'string' ? v.packId : '',
        attempts: typeof v.attempts === 'number' ? v.attempts : 0,
        correctCount: typeof v.correctCount === 'number' ? v.correctCount : 0,
        wrongCount: typeof v.wrongCount === 'number' ? v.wrongCount : 0,
        consecutiveCorrect:
          typeof v.consecutiveCorrect === 'number' ? v.consecutiveCorrect : 0,
        lastResult: v.lastResult === 'correct' ? 'correct' : 'wrong',
        lastAttemptAt: typeof v.lastAttemptAt === 'string' ? v.lastAttemptAt : '',
        lastWrongAt: typeof v.lastWrongAt === 'string' ? v.lastWrongAt : undefined,
        lastWrongAnswerText:
          typeof v.lastWrongAnswerText === 'string'
            ? v.lastWrongAnswerText
            : undefined,
      };
    }
    return clean;
  } catch {
    return {};
  }
}

export function recordSessionQuestionStats(
  packId: string,
  outcomes: SessionQuestionOutcome[],
  completedAt: string
): Record<string, QuestionAttemptStat> {
  const existing = loadQuestionStats();
  const next: Record<string, QuestionAttemptStat> = { ...existing };

  for (const item of outcomes) {
    const prev = next[item.questionId];
    const resolvedPackId = prev?.packId || item.sourcePackId || packId;
    if (item.isCorrect) {
      next[item.questionId] = {
        questionId: item.questionId,
        packId: resolvedPackId,
        attempts: (prev?.attempts || 0) + 1,
        correctCount: (prev?.correctCount || 0) + 1,
        wrongCount: prev?.wrongCount || 0,
        consecutiveCorrect: (prev?.consecutiveCorrect || 0) + 1,
        lastResult: 'correct',
        lastAttemptAt: completedAt,
        lastWrongAt: prev?.lastWrongAt,
        lastWrongAnswerText: prev?.lastWrongAnswerText,
      };
    } else {
      next[item.questionId] = {
        questionId: item.questionId,
        packId: resolvedPackId,
        attempts: (prev?.attempts || 0) + 1,
        correctCount: prev?.correctCount || 0,
        wrongCount: (prev?.wrongCount || 0) + 1,
        consecutiveCorrect: 0,
        lastResult: 'wrong',
        lastAttemptAt: completedAt,
        lastWrongAt: completedAt,
        lastWrongAnswerText: item.selectedOptionText ?? 'Tidak dijawab',
      };
    }
  }

  safeWriteJson(KEYS.QUESTION_STATS, next);
  return next;
}

export function clearQuestionStats(): Record<string, QuestionAttemptStat> {
  safeWriteJson(KEYS.QUESTION_STATS, {});
  return {};
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
