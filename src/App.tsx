import React, { useEffect, useMemo, useState } from 'react';
import { loadBuiltinPacks } from './data/packLoader';
import {
  AttemptRecord,
  ExamPack,
  ExamSessionConfig,
  ExamSettings,
  QuestionItem,
  QuestionStudyState,
  SavedExamDraft,
} from './types/exam';
import {
  clearAttemptHistory,
  deleteExamDraft,
  EMPTY_STUDY_STATE,
  loadActiveExamPackId,
  loadAttemptHistory,
  loadCustomPacks,
  loadExamDrafts,
  loadSettings,
  loadStudyStates,
  saveActiveExamPackId,
  saveAttemptRecord,
  saveCustomPacks,
  saveExamDraft,
  saveSettings,
  saveStudyStates,
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

type AppRoute =
  | { view: 'lobby' }
  | { view: 'exam'; session: ActiveExamSession }
  | { view: 'result'; session: ActiveExamSession; result: ExamCompletionPayload }
  | { view: 'studio'; tab: StudioTab; editingPack: ExamPack | null };

export const App: React.FC = () => {
  const builtinPacks = useMemo(() => loadBuiltinPacks(), []);
  const [customPacks, setCustomPacks] = useState<ExamPack[]>(() => loadCustomPacks());
  const [settings, setSettings] = useState<ExamSettings>(() => loadSettings());
  const [history, setHistory] = useState<AttemptRecord[]>(() => loadAttemptHistory());
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

  // Restore active exam immediately if the user reloaded the page mid-session
  const [route, setRoute] = useState<AppRoute>(() => {
    const activePackId = loadActiveExamPackId();
    if (!activePackId) return { view: 'lobby' };
    const savedDrafts = loadExamDrafts();
    const draft = savedDrafts[activePackId];
    if (!draft) return { view: 'lobby' };
    const packsNow = [...loadCustomPacks(), ...loadBuiltinPacks()];
    const targetPack = packsNow.find((p) => p.id === activePackId);
    if (!targetPack) return { view: 'lobby' };
    const restored = restoreSessionFromDraft(targetPack, draft);
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
    const restored = restoreSessionFromDraft(pack, draft);
    if (!restored) return;
    saveActiveExamPackId(pack.id);
    setRoute({ view: 'exam', session: restored });
  };

  const handleExamComplete = (
    session: ActiveExamSession,
    payload: ExamCompletionPayload
  ) => {
    let correct = 0;
    let total = 0;
    const wrongIds: string[] = [];

    session.sections.forEach((sec) => {
      sec.questions.forEach((q) => {
        total++;
        if (payload.answers[q.id] === q.answer) {
          correct++;
        } else {
          wrongIds.push(q.id);
        }
      });
    });

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
      completedAt: new Date().toISOString(),
    };

    const nextHistory = saveAttemptRecord(record);
    setHistory(nextHistory);
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
        onBackToLobby={() => setRoute({ view: 'lobby' })}
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
      studyStates={studyStates}
      drafts={drafts}
      onUpdateSettings={setSettings}
      onStartSession={handleStartSession}
      onResumeDraft={handleResumeDraft}
      onDiscardDraft={handleDiscardDraft}
      onTogglePackCompleted={handleTogglePackCompleted}
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
