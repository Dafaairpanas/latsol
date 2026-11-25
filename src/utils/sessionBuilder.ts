import {
  ExamPack,
  ExamSection,
  ExamSessionConfig,
  QuestionItem,
} from '../types/exam';

function shuffleArray<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function shuffleQuestionOptions(q: QuestionItem): QuestionItem {
  if (q.options.length <= 1) return q;
  const indexed = q.options.map((text, idx) => ({
    text,
    isCorrect: idx === q.answer,
  }));
  const shuffled = shuffleArray(indexed);
  const newAnswer = shuffled.findIndex((item) => item.isCorrect);
  return {
    ...q,
    options: shuffled.map((item) => item.text),
    answer: newAnswer >= 0 ? newAnswer : 0,
  };
}

export interface ActiveExamSession {
  config: ExamSessionConfig;
  pack: ExamPack;
  sections: ExamSection[];
  totalQuestions: number;
}

export function buildActiveSession(
  pack: ExamPack,
  config: ExamSessionConfig
): ActiveExamSession {
  let targetSections = pack.sections;

  if (config.customQuestionsOnly && config.customQuestionsOnly.length > 0) {
    targetSections = [
      {
        id: 'retry-wrong',
        shortLabel: '復習',
        title: config.sessionLabel || 'Latihan Soal Salah',
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

  let sections: ExamSection[] = targetSections.map((sec, idx) => {
    let qs = sec.questions.map((q) =>
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

  // If shuffling questions across multiple selected chapters in a mixed drill, keep per-section clean
  sections = sections.filter((s) => s.questions.length > 0);

  const totalQuestions = sections.reduce((sum, s) => sum + s.questions.length, 0);

  return {
    config,
    pack,
    sections,
    totalQuestions,
  };
}
