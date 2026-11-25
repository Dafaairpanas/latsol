export type ExamCategory = 'SSW' | 'JFT' | 'Custom';
export type ExamMode = 'exam' | 'study';

export interface QuestionItem {
  id: string;
  number?: number;
  tag?: string;
  text: string;
  translation?: string;
  options: string[];
  answer: number;
  explanation?: string;
  imageUrl?: string;
}

export interface ExamSection {
  id: string;
  shortLabel: string;
  title: string;
  questions: QuestionItem[];
}

export interface ExamPack {
  id: string;
  name: string;
  subtitle?: string;
  category: ExamCategory;
  durationSec: number;
  passingPct: number;
  source: 'builtin' | 'custom';
  sourceFile?: string;
  intro?: string;
  studyNotes?: string;
  sections: ExamSection[];
  createdAt?: string;
  updatedAt?: string;
}

export interface ExamSettings {
  candidateName: string;
  showFurigana: boolean;
  showPageTag: boolean;
  fontSize: 'normal' | 'large' | 'xlarge';
  autoNext: boolean;
  instantFeedbackInStudy: boolean;
  cbtTheme: 'classic' | 'contrast';
}

export interface ExamSessionConfig {
  packId: string;
  mode: ExamMode;
  sectionIds: string[];
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  durationSec: number; // 0 = no timer
  passingPct: number;
  onlyWrongFromHistory?: boolean;
  customQuestionsOnly?: QuestionItem[];
  sessionLabel?: string;
}

export interface AttemptRecord {
  id: string;
  packId: string;
  packName: string;
  mode: ExamMode;
  correct: number;
  total: number;
  pct: number;
  passed: boolean;
  elapsedSec: number;
  wrongQuestionIds: string[];
  correctQuestionIds?: string[];
  answeredCount?: number;
  completedAt: string;
}

export interface QuestionAttemptStat {
  questionId: string;
  packId: string;
  attempts: number;
  correctCount: number;
  wrongCount: number;
  consecutiveCorrect: number;
  lastResult: 'correct' | 'wrong';
  lastAttemptAt: string;
  lastWrongAt?: string;
  lastWrongAnswerText?: string;
}

export interface QuestionStudyState {
  flaggedIds: string[];
  masteredIds: string[];
  completedPack: boolean;
  updatedAt: string;
}

export interface DraftSectionLayout {
  id: string;
  shortLabel: string;
  title: string;
  questions: Array<{
    id: string;
    optionOrder?: number[];
  }>;
}

export interface SavedExamDraft {
  packId: string;
  config: ExamSessionConfig;
  sectionsLayout: DraftSectionLayout[];
  sectionIdx: number;
  questionIdx: number;
  answers: Record<string, number>;
  flags: Record<string, boolean>;
  revealedMap: Record<string, boolean>;
  remainingSec: number;
  elapsedSec: number;
  savedAt: string;
}

export interface ParseWarning {
  line: number;
  message: string;
}

export interface BombParseResult {
  pack: ExamPack;
  warnings: ParseWarning[];
  stats: {
    sections: number;
    questions: number;
    withExplanations: number;
    withFurigana: number;
  };
}
