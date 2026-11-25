import React, { useEffect, useMemo, useState } from 'react';
import { loadBuiltinPacks } from './data/packLoader';
import {
  AttemptRecord,
  ExamPack,
  ExamSessionConfig,
  ExamSettings,
  QuestionAttemptStat,
  QuestionItem,
  QuestionStudyState,
  SavedExamDraft,
} from './types/exam';
import {
  clearAttemptHistory,
  clearQuestionStats,
  deleteExamDraft,
  EMPTY_STUDY_STATE,
  loadActiveExamPackId,
  loadAttemptHistory,
  loadCustomPacks,
  loadExamDrafts,
  loadQuestionStats,
  loadSettings,
  loadStudyStates,
  recordSessionQuestionStats,
  saveActiveExamPackId,
  saveAttemptRecord,
  saveCustomPacks,
  saveExamDraft,
  saveSettings,
  saveStudyStates,
  SessionQuestionOutcome,
} from './utils/storage';
import {
  ActiveExamSession,
  buildActiveSession,
  restoreSessionFromDraft,
} from './utils/sessionBuilder';
import { LobbyView } from './components/LobbyView';
import { CbtExamView, ExamCompletionPayload } from './components/CbtExamView';
import { ResultView } from './components/ResultView';
import { QuestionStudioView, StudioTab } from './components/QuestionStudioView';
import { HistoryView } from './components/HistoryView';

type AppRoute =
  | { view: 'lobby' }
  | { view: 'history' }
  | { view: 'exam'; session: ActiveExamSession }
  | { view: 'result'; session: ActiveExamSession; result: ExamCompletionPayload }
  | { view: 'studio'; tab: StudioTab; editingPack: ExamPack | null };

export const App: React.FC = () => {
  const builtinPacks = useMemo(() => loadBuiltinPacks(), []);
  const [customPacks, setCustomPacks] = useState<ExamPack[]>(() => loadCustomPacks());
  const [settings, setSettings] = useState<ExamSettings>(() => loadSettings());
  const [history, setHistory] = useState<AttemptRecord[]>(() => loadAttemptHistory());
  const [questionStats, setQuestionStats] = useState<Record<string, QuestionAttemptStat>>(
    () => loadQuestionStats()
  );
  const [studyStates, setStudyStates] = useState<Record<string, QuestionStudyState>>(() =>
    loadStudyStates()
  );
  const [drafts, setDrafts] = useState<Record<string, SavedExamDraft>>(() =>
    loadExamDrafts()
  );

  const allPacks = useMemo(
    () => [...customPacks, ...builtinPacks],
    [customPacks, builtinPacks]
  );

  const questionOriginPackId = useMemo(() => {
    const map = new Map<string, string>();
    allPacks.forEach((p) => {
      p.sections.forEach((sec) => {
        sec.questions.forEach((q) => {
          if (!map.has(q.id)) map.set(q.id, p.id);
        });
      });
    });
    return map;
  }, [allPacks]);

  // Restore active exam immediately if the user reloaded the page mid-session
  const [route, setRoute] = useState<AppRoute>(() => {
    const activePackId = loadActiveExamPackId();
    if (!activePackId) return { view: 'lobby' };
    const savedDrafts = loadExamDrafts();
    const draft = savedDrafts[activePackId];
    if (!draft) return { view: 'lobby' };
    const packsNow = [...loadCustomPacks(), ...loadBuiltinPacks()];
    const targetPack: ExamPack | undefined =
      packsNow.find((p) => p.id === activePackId) ||
      (activePackId === 'drill-wrong-all'
        ? {
            id: 'drill-wrong-all',
            name: draft.config.sessionLabel || 'Latihan Soal Sering Salah',
            category: 'SSW',
            durationSec: draft.config.durationSec,
            passingPct: draft.config.passingPct,
            source: 'custom',
            sections: [],
          }
        : undefined);
    if (!targetPack) return { view: 'lobby' };
    const restored = restoreSessionFromDraft(targetPack, draft, packsNow);
    return restored ? { view: 'exam', session: restored } : { view: 'lobby' };
  });

  useEffect(() => {
    saveCustomPacks(customPacks);
  }, [customPacks]);

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  useEffect(() => {
    saveStudyStates(studyStates);
  }, [studyStates]);

  const getStudyState = (packId: string): QuestionStudyState =>
    studyStates[packId] || EMPTY_STUDY_STATE;

  const handleTogglePackCompleted = (packId: string) => {
    setStudyStates((prev) => {
      const cur = prev[packId] || EMPTY_STUDY_STATE;
      return {
        ...prev,
        [packId]: {
          ...cur,
          completedPack: !cur.completedPack,
          updatedAt: new Date().toISOString(),
        },
      };
    });
  };

  const handleToggleQuestionFlag = (packId: string, qId: string) => {
    setStudyStates((prev) => {
      const cur = prev[packId] || EMPTY_STUDY_STATE;
      const exists = cur.flaggedIds.includes(qId);
      const nextFlags = exists
        ? cur.flaggedIds.filter((id) => id !== qId)
        : [...cur.flaggedIds, qId];
      return {
        ...prev,
        [packId]: {
          ...cur,
          flaggedIds: nextFlags,
          updatedAt: new Date().toISOString(),
        },
      };
    });
  };

  const handleToggleQuestionMastered = (packId: string, qId: string) => {
    setStudyStates((prev) => {
      const cur = prev[packId] || EMPTY_STUDY_STATE;
      const exists = cur.masteredIds.includes(qId);
      const nextMastered = exists
        ? cur.masteredIds.filter((id) => id !== qId)
        : [...cur.masteredIds, qId];
      return {
        ...prev,
        [packId]: {
          ...cur,
          masteredIds: nextMastered,
          updatedAt: new Date().toISOString(),
        },
      };
    });
  };

  const handleSaveDraft = (draft: SavedExamDraft) => {
    const next = saveExamDraft(draft);
    setDrafts(next);
  };

  const handleDiscardDraft = (packId: string) => {
    const next = deleteExamDraft(packId);
    setDrafts(next);
  };

  const handleStartSession = (pack: ExamPack, config: ExamSessionConfig) => {
    const session = buildActiveSession(pack, config);
    if (session.totalQuestions === 0) return;
    saveActiveExamPackId(pack.id);
    setRoute({ view: 'exam', session });
  };

  const handleResumeDraft = (pack: ExamPack, draft: SavedExamDraft) => {
    const restored = restoreSessionFromDraft(pack, draft, allPacks);
    if (!restored) return;
    saveActiveExamPackId(pack.id);
    setRoute({ view: 'exam', session: restored });
  };

  const handleStartDrillQuestions = (
    targetPack: ExamPack | null,
    questions: QuestionItem[],
    label: string
  ) => {
    if (questions.length === 0) return;
    const resolvedPack: ExamPack =
      targetPack || {
        id: 'drill-wrong-all',
        name: 'Latihan Gabungan Soal Salah',
        category: 'SSW',
        durationSec: 0,
        passingPct: 65,
        source: 'custom',
        sections: [
          {
            id: 'drill-sec-1',
            shortLabel: '復習',
            title: label,
            questions,
          },
        ],
      };

    handleStartSession(resolvedPack, {
      packId: resolvedPack.id,
      mode: 'study',
      sectionIds: [],
      shuffleQuestions: false,
      shuffleOptions: false,
      durationSec: 0,
      passingPct: resolvedPack.passingPct,
      onlyWrongFromHistory: true,
      customQuestionsOnly: questions,
      sessionLabel: label,
    });
  };

  const handleExamComplete = (
    session: ActiveExamSession,
    payload: ExamCompletionPayload
  ) => {
    let correct = 0;
    let answeredCount = 0;
    let total = 0;
    const wrongIds: string[] = [];
    const correctIds: string[] = [];
    const outcomes: SessionQuestionOutcome[] = [];

    session.sections.forEach((sec) => {
      sec.questions.forEach((q) => {
        total++;
        const userAnsIdx = payload.answers[q.id];
        if (userAnsIdx !== undefined) answeredCount++;
        const isCorrect = userAnsIdx === q.answer;
        if (isCorrect) {
          correct++;
          correctIds.push(q.id);
        } else {
          wrongIds.push(q.id);
        }
        outcomes.push({
          questionId: q.id,
          sourcePackId: questionOriginPackId.get(q.id),
          isCorrect,
          selectedOptionText:
            userAnsIdx !== undefined ? q.options[userAnsIdx] : 'Tidak dijawab',
        });
      });
    });

    const completedAt = new Date().toISOString();
    const pct = total ? Math.round((correct / total) * 100) : 0;
    const record: AttemptRecord = {
      id: `att-${Date.now().toString(36)}`,
      packId: session.pack.id,
      packName: session.config.sessionLabel
        ? `${session.pack.name} — ${session.config.sessionLabel}`
        : session.pack.name,
      mode: session.config.mode,
      correct,
      total,
      pct,
      passed: pct >= session.config.passingPct,
      elapsedSec: payload.elapsedSec,
      wrongQuestionIds: wrongIds,
      correctQuestionIds: correctIds,
      answeredCount,
      completedAt,
    };

    const nextHistory = saveAttemptRecord(record);
    setHistory(nextHistory);
    const nextStats = recordSessionQuestionStats(session.pack.id, outcomes, completedAt);
    setQuestionStats(nextStats);
    // Clear active in-progress draft when test finishes (while keeping persistent flags & mastered checklist!)
    handleDiscardDraft(session.pack.id);
    saveActiveExamPackId(null);
    setRoute({ view: 'result', session, result: payload });
  };

  const handleSaveCustomPack = (pack: ExamPack) => {
    setCustomPacks((prev) => {
      const exists = prev.some((p) => p.id === pack.id);
      if (exists) {
        return prev.map((p) => (p.id === pack.id ? pack : p));
      }
      return [pack, ...prev];
    });
  };

  const handleDuplicatePackToCustom = (pack: ExamPack) => {
    const clone: ExamPack = {
      ...pack,
      id: `custom-${Date.now().toString(36)}`,
      name: `${pack.name} (Salinan)`,
      source: 'custom',
      sourceFile: undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    handleSaveCustomPack(clone);
    setRoute({ view: 'studio', tab: 'editor', editingPack: clone });
  };

  const handleDeleteCustomPack = (packId: string) => {
    setCustomPacks((prev) => prev.filter((p) => p.id !== packId));
    handleDiscardDraft(packId);
  };

  if (route.view === 'exam') {
    const currentSession = route.session;
    return (
      <CbtExamView
        session={currentSession}
        settings={settings}
        studyState={getStudyState(currentSession.pack.id)}
        onUpdateSettings={setSettings}
        onToggleQuestionFlag={handleToggleQuestionFlag}
        onToggleQuestionMastered={handleToggleQuestionMastered}
        onSaveDraft={handleSaveDraft}
        onDiscardDraftAndExit={(packId) => {
          handleDiscardDraft(packId);
          saveActiveExamPackId(null);
          setRoute({ view: 'lobby' });
        }}
        onComplete={(payload) => handleExamComplete(currentSession, payload)}
        onExitToLobby={() => {
          saveActiveExamPackId(null);
          setRoute({ view: 'lobby' });
        }}
      />
    );
  }

  if (route.view === 'result') {
    const currentResult = route.result;
    const currentSession = route.session;
    return (
      <ResultView
        session={currentSession}
        result={currentResult}
        settings={settings}
        studyState={getStudyState(currentSession.pack.id)}
        onToggleQuestionFlag={handleToggleQuestionFlag}
        onToggleQuestionMastered={handleToggleQuestionMastered}
        onToggleFurigana={() =>
          setSettings((s) => ({ ...s, showFurigana: !s.showFurigana }))
        }
        onRetryAll={() =>
          handleStartSession(currentSession.pack, currentSession.config)
        }
        onRetryWrong={(wrongQs: QuestionItem[]) =>
          handleStartSession(currentSession.pack, {
            ...currentSession.config,
            mode: 'study',
            durationSec: 0,
            customQuestionsOnly: wrongQs,
            sessionLabel: `Ulangi Salah (${wrongQs.length} soal)`,
          })
        }
        onOpenHistory={() => setRoute({ view: 'history' })}
        onBackToLobby={() => setRoute({ view: 'lobby' })}
      />
    );
  }

  if (route.view === 'history') {
    return (
      <HistoryView
        packs={allPacks}
        settings={settings}
        history={history}
        questionStats={questionStats}
        studyStates={studyStates}
        onBackToLobby={() => setRoute({ view: 'lobby' })}
        onToggleFurigana={() =>
          setSettings((s) => ({ ...s, showFurigana: !s.showFurigana }))
        }
        onToggleQuestionFlag={handleToggleQuestionFlag}
        onToggleQuestionMastered={handleToggleQuestionMastered}
        onStartDrillQuestions={handleStartDrillQuestions}
        onClearAttemptHistory={() => {
          clearAttemptHistory();
          setHistory([]);
        }}
        onClearQuestionStats={() => {
          const empty = clearQuestionStats();
          setQuestionStats(empty);
        }}
      />
    );
  }

  if (route.view === 'studio') {
    return (
      <QuestionStudioView
        initialTab={route.tab}
        editingPack={route.editingPack}
        customPacks={customPacks}
        onSavePack={handleSaveCustomPack}
        onSelectPackForEdit={(p) =>
          setRoute({ view: 'studio', tab: 'editor', editingPack: p })
        }
        onBackToLobby={() => setRoute({ view: 'lobby' })}
      />
    );
  }

  return (
    <LobbyView
      packs={allPacks}
      settings={settings}
      history={history}
      questionStats={questionStats}
      studyStates={studyStates}
      drafts={drafts}
      onUpdateSettings={setSettings}
      onStartSession={handleStartSession}
      onResumeDraft={handleResumeDraft}
      onDiscardDraft={handleDiscardDraft}
      onTogglePackCompleted={handleTogglePackCompleted}
      onOpenHistory={() => setRoute({ view: 'history' })}
      onOpenStudioCreate={() =>
        setRoute({ view: 'studio', tab: 'editor', editingPack: null })
      }
      onOpenStudioImport={() =>
        setRoute({ view: 'studio', tab: 'import', editingPack: null })
      }
      onEditCustomPack={(pack) =>
        setRoute({ view: 'studio', tab: 'editor', editingPack: pack })
      }
      onDuplicatePackToCustom={handleDuplicatePackToCustom}
      onDeleteCustomPack={handleDeleteCustomPack}
      onClearHistory={() => {
        clearAttemptHistory();
        setHistory([]);
      }}
    />
  );
};

export default App;
