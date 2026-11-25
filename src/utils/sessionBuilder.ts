import {
  DraftSectionLayout,
  ExamPack,
  ExamSection,
  ExamSessionConfig,
  QuestionItem,
  SavedExamDraft,
} from '../types/exam';

function shuffleArray<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function shuffleQuestionOptions(q: QuestionItem): QuestionItem & { optionOrder?: number[] } {
  if (q.options.length <= 1) return q;
  const indexed = q.options.map((text, idx) => ({
    text,
    origIdx: idx,
    isCorrect: idx === q.answer,
  }));
  const shuffled = shuffleArray(indexed);
  const newAnswer = shuffled.findIndex((item) => item.isCorrect);
  return {
    ...q,
    options: shuffled.map((item) => item.text),
    answer: newAnswer >= 0 ? newAnswer : 0,
    optionOrder: shuffled.map((item) => item.origIdx),
  };
}

export interface SessionQuestionItem extends QuestionItem {
  optionOrder?: number[];
}

export interface ActiveExamSession {
  config: ExamSessionConfig;
  pack: ExamPack;
  sections: Array<Omit<ExamSection, 'questions'> & { questions: SessionQuestionItem[] }>;
  totalQuestions: number;
  initialDraft?: SavedExamDraft;
}

export function buildActiveSession(
  pack: ExamPack,
  config: ExamSessionConfig
): ActiveExamSession {
  let targetSections = pack.sections;

  if (config.customQuestionsOnly && config.customQuestionsOnly.length > 0) {
    targetSections = [
      {
        id: 'custom-drill',
        shortLabel: '復習',
        title: config.sessionLabel || 'Latihan Pilihan',
        questions: config.customQuestionsOnly,
      },
    ];
  } else if (config.sectionIds.length > 0) {
    const selectedSet = new Set(config.sectionIds);
    const filtered = pack.sections.filter((s) => selectedSet.has(s.id));
    if (filtered.length > 0) {
      targetSections = filtered;
    }
  }

  let sections = targetSections.map((sec, idx) => {
    let qs: SessionQuestionItem[] = sec.questions.map((q) =>
      config.shuffleOptions ? shuffleQuestionOptions(q) : { ...q }
    );
    if (config.shuffleQuestions) {
      qs = shuffleArray(qs);
    }
    return {
      ...sec,
      shortLabel: sec.shortLabel || String(idx + 1),
      questions: qs,
    };
  });

  sections = sections.filter((s) => s.questions.length > 0);
  const totalQuestions = sections.reduce((sum, s) => sum + s.questions.length, 0);

  return {
    config,
    pack,
    sections,
    totalQuestions,
  };
}

export function extractDraftLayout(session: ActiveExamSession): DraftSectionLayout[] {
  return session.sections.map((sec) => ({
    id: sec.id,
    shortLabel: sec.shortLabel,
    title: sec.title,
    questions: sec.questions.map((q) => ({
      id: q.id,
      optionOrder: q.optionOrder,
    })),
  }));
}

export function restoreSessionFromDraft(
  pack: ExamPack,
  draft: SavedExamDraft
): ActiveExamSession | null {
  const questionById = new Map<string, QuestionItem>();
  pack.sections.forEach((sec) => {
    sec.questions.forEach((q) => questionById.set(q.id, q));
  });

  const sections = draft.sectionsLayout
    .map((layoutSec) => {
      const questions: SessionQuestionItem[] = [];
      for (const qEntry of layoutSec.questions) {
        const orig = questionById.get(qEntry.id);
        if (!orig) continue;
        if (qEntry.optionOrder && qEntry.optionOrder.length === orig.options.length) {
          const reorderedOptions = qEntry.optionOrder.map((i) => orig.options[i]);
          const newAns = qEntry.optionOrder.indexOf(orig.answer);
          questions.push({
            ...orig,
            options: reorderedOptions,
            answer: newAns >= 0 ? newAns : orig.answer,
            optionOrder: qEntry.optionOrder,
          });
        } else {
          questions.push({ ...orig });
        }
      }
      return {
        id: layoutSec.id,
        shortLabel: layoutSec.shortLabel,
        title: layoutSec.title,
        questions,
      };
    })
    .filter((s) => s.questions.length > 0);

  const totalQuestions = sections.reduce((sum, s) => sum + s.questions.length, 0);
  if (totalQuestions === 0) return null;

  return {
    config: draft.config,
    pack,
    sections,
    totalQuestions,
    initialDraft: draft,
  };
}
