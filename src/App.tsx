import React, { useEffect, useMemo, useState } from 'react';
import { loadBuiltinPacks } from './data/packLoader';
import {
  AttemptRecord,
  ExamPack,
  ExamSessionConfig,
  ExamSettings,
  QuestionItem,
} from './types/exam';
import {
  clearAttemptHistory,
  loadAttemptHistory,
  loadCustomPacks,
  loadSettings,
  saveAttemptRecord,
  saveCustomPacks,
  saveSettings,
} from './utils/storage';
import { ActiveExamSession, buildActiveSession } from './utils/sessionBuilder';
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
  const [route, setRoute] = useState<AppRoute>({ view: 'lobby' });

  const allPacks = useMemo(
    () => [...customPacks, ...builtinPacks],
    [customPacks, builtinPacks]
  );

  useEffect(() => {
    saveCustomPacks(customPacks);
  }, [customPacks]);

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  const handleStartSession = (pack: ExamPack, config: ExamSessionConfig) => {
    const session = buildActiveSession(pack, config);
    if (session.totalQuestions === 0) return;
    setRoute({ view: 'exam', session });
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
  };

  if (route.view === 'exam') {
    return (
      <CbtExamView
        session={route.session}
        settings={settings}
        onUpdateSettings={setSettings}
        onComplete={(payload) => handleExamComplete(route.session, payload)}
        onExitToLobby={() => setRoute({ view: 'lobby' })}
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
      onUpdateSettings={setSettings}
      onStartSession={handleStartSession}
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
