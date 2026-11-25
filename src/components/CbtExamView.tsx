import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ExamSettings,
  QuestionStudyState,
  SavedExamDraft,
} from '../types/exam';
import {
  ActiveExamSession,
  extractDraftLayout,
} from '../utils/sessionBuilder';
import { renderRichJapaneseText } from '../utils/rubyText';
import { StudyNotesModal } from './StudyNotesModal';

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

export interface ExamCompletionPayload {
  answers: Record<string, number>;
  flags: Record<string, boolean>;
  elapsedSec: number;
}

interface CbtExamViewProps {
  session: ActiveExamSession;
  settings: ExamSettings;
  studyState: QuestionStudyState;
  onUpdateSettings: (next: ExamSettings) => void;
  onToggleQuestionFlag: (packId: string, qId: string) => void;
  onToggleQuestionMastered: (packId: string, qId: string) => void;
  onSaveDraft: (draft: SavedExamDraft) => void;
  onDiscardDraftAndExit: (packId: string) => void;
  onComplete: (payload: ExamCompletionPayload) => void;
  onExitToLobby: () => void;
}

function formatClock(sec: number): string {
  const safe = Math.max(0, Math.floor(sec));
  const h = String(Math.floor(safe / 3600)).padStart(2, '0');
  const m = String(Math.floor((safe % 3600) / 60)).padStart(2, '0');
  const s = String(safe % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

export const CbtExamView: React.FC<CbtExamViewProps> = ({
  session,
  settings,
  studyState,
  onUpdateSettings,
  onToggleQuestionFlag,
  onToggleQuestionMastered,
  onSaveDraft,
  onDiscardDraftAndExit,
  onComplete,
  onExitToLobby,
}) => {
  const isTimed = session.config.durationSec > 0;
  const isStudyMode = session.config.mode === 'study';
  const draft = session.initialDraft;

  const [sectionIdx, setSectionIdx] = useState(draft?.sectionIdx ?? 0);
  const [questionIdx, setQuestionIdx] = useState(draft?.questionIdx ?? 0);
  const [answers, setAnswers] = useState<Record<string, number>>(draft?.answers ?? {});
  const [flags, setFlags] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    studyState.flaggedIds.forEach((id) => {
      initial[id] = true;
    });
    if (draft?.flags) {
      Object.entries(draft.flags).forEach(([k, v]) => {
        if (v) initial[k] = true;
      });
    }
    return initial;
  });
  const [revealedMap, setRevealedMap] = useState<Record<string, boolean>>(
    draft?.revealedMap ?? {}
  );
  const [showLangBox, setShowLangBox] = useState(false);

  const [remainingSec, setRemainingSec] = useState(
    draft ? draft.remainingSec : session.config.durationSec
  );
  const [elapsedSec, setElapsedSec] = useState(draft?.elapsedSec ?? 0);

  const [activeModal, setActiveModal] = useState<
    null | 'settings' | 'grid' | 'help' | 'finish' | 'notes' | 'exit'
  >(null);
  const [gridFilter, setGridFilter] = useState<
    'all' | 'unanswered' | 'flagged' | 'unmastered' | 'mastered'
  >('all');

  const masteredSet = useMemo(
    () => new Set(studyState.masteredIds),
    [studyState.masteredIds]
  );

  const completedRef = useRef(false);
  const goNextRef = useRef<() => void>(() => {});
  const sectionsLayout = useMemo(() => extractDraftLayout(session), [session]);
  const latestStateRef = useRef({
    sectionIdx,
    questionIdx,
    answers,
    flags,
    revealedMap,
    remainingSec,
    elapsedSec,
  });
  latestStateRef.current = {
    sectionIdx,
    questionIdx,
    answers,
    flags,
    revealedMap,
    remainingSec,
    elapsedSec,
  };

  const persistCurrentDraft = () => {
    if (completedRef.current) return;
    const snap = latestStateRef.current;
    onSaveDraft({
      packId: session.pack.id,
      config: session.config,
      sectionsLayout,
      sectionIdx: snap.sectionIdx,
      questionIdx: snap.questionIdx,
      answers: snap.answers,
      flags: snap.flags,
      revealedMap: snap.revealedMap,
      remainingSec: snap.remainingSec,
      elapsedSec: snap.elapsedSec,
      savedAt: new Date().toISOString(),
    });
  };

  const currentSection = session.sections[sectionIdx];
  const currentQuestion = currentSection?.questions[questionIdx];

  // Global 1-based page number across the whole session (and per-section)
  const { globalIndex, answeredCount, flaggedCount } = useMemo(() => {
    let gIdx = 0;
    let ans = 0;
    let flg = 0;
    session.sections.forEach((sec, sI) => {
      sec.questions.forEach((q, qI) => {
        if (sI < sectionIdx || (sI === sectionIdx && qI <= questionIdx)) {
          gIdx++;
        }
        if (q.id in answers) ans++;
        if (flags[q.id]) flg++;
      });
    });
    return { globalIndex: gIdx, answeredCount: ans, flaggedCount: flg };
  }, [session.sections, sectionIdx, questionIdx, answers, flags]);

  // Auto-save draft whenever progress changes, and before page unload
  useEffect(() => {
    persistCurrentDraft();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectionIdx, questionIdx, answers, flags, revealedMap]);

  useEffect(() => {
    const onSaveBeforeLeave = () => persistCurrentDraft();
    window.addEventListener('beforeunload', onSaveBeforeLeave);
    window.addEventListener('pagehide', onSaveBeforeLeave);
    return () => {
      window.removeEventListener('beforeunload', onSaveBeforeLeave);
      window.removeEventListener('pagehide', onSaveBeforeLeave);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Timer tick
  useEffect(() => {
    let ticks = 0;
    const id = window.setInterval(() => {
      ticks++;
      setElapsedSec((prev) => prev + 1);
      if (ticks % 5 === 0) {
        persistCurrentDraft();
      }
      if (isTimed) {
        setRemainingSec((prev) => {
          if (prev <= 1) {
            window.clearInterval(id);
            if (!completedRef.current) {
              completedRef.current = true;
              const snap = latestStateRef.current;
              onComplete({
                answers: snap.answers,
                flags: snap.flags,
                elapsedSec: snap.elapsedSec + 1,
              });
            }
            return 0;
          }
          return prev - 1;
        });
      }
    }, 1000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTimed, onComplete]);

  // Reset language box when changing question
  useEffect(() => {
    setShowLangBox(false);
  }, [currentQuestion?.id]);

  const goSection = (idx: number) => {
    if (idx < 0 || idx >= session.sections.length) return;
    setSectionIdx(idx);
    setQuestionIdx(0);
  };

  const goQuestion = (sIdx: number, qIdx: number) => {
    setSectionIdx(sIdx);
    setQuestionIdx(qIdx);
  };

  const goNext = () => {
    if (!currentSection) return;
    if (questionIdx < currentSection.questions.length - 1) {
      setQuestionIdx((i) => i + 1);
    } else if (sectionIdx < session.sections.length - 1) {
      setSectionIdx((s) => s + 1);
      setQuestionIdx(0);
    }
  };
  goNextRef.current = goNext;

  const goBack = () => {
    if (questionIdx > 0) {
      setQuestionIdx((i) => i - 1);
    } else if (sectionIdx > 0) {
      const prevSecIdx = sectionIdx - 1;
      const prevSec = session.sections[prevSecIdx];
      setSectionIdx(prevSecIdx);
      setQuestionIdx(Math.max(0, prevSec.questions.length - 1));
    }
  };

  const handleSelectOption = (qid: string, optIdx: number) => {
    setAnswers((prev) => ({ ...prev, [qid]: optIdx }));
    if (isStudyMode && settings.instantFeedbackInStudy) {
      setRevealedMap((prev) => ({ ...prev, [qid]: true }));
    }
    if (settings.autoNext && !isStudyMode) {
      window.setTimeout(() => {
        goNextRef.current();
      }, 180);
    }
  };

  const handleToggleFlag = () => {
    if (!currentQuestion) return;
    const qid = currentQuestion.id;
    setFlags((prev) => ({ ...prev, [qid]: !prev[qid] }));
    onToggleQuestionFlag(session.pack.id, qid);
  };

  const handleFinishConfirmed = () => {
    if (completedRef.current) return;
    completedRef.current = true;
    onComplete({ answers, flags, elapsedSec });
  };

  // Keyboard shortcuts (ignored when modal open or typing in an input)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (activeModal) {
        if (e.key === 'Escape') setActiveModal(null);
        return;
      }
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (e.key === 'ArrowRight') {
        e.preventDefault();
        goNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goBack();
      } else if (e.key.toLowerCase() === 'f') {
        e.preventDefault();
        handleToggleFlag();
      } else if (e.key.toLowerCase() === 'g') {
        e.preventDefault();
        setActiveModal('grid');
      } else if (e.key.toLowerCase() === 'l') {
        e.preventDefault();
        setShowLangBox((v) => !v);
      } else if (currentQuestion) {
        const lower = e.key.toLowerCase();
        const letterIdx = LETTERS.map((l) => l.toLowerCase()).indexOf(lower);
        const numIdx = ['1', '2', '3', '4', '5', '6'].indexOf(e.key);
        const pick = letterIdx >= 0 ? letterIdx : numIdx;
        if (pick >= 0 && pick < currentQuestion.options.length) {
          handleSelectOption(currentQuestion.id, pick);
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  if (!currentSection || !currentQuestion) {
    return (
      <div className="empty-exam-fallback">
        <p>Tidak ada soal dalam sesi ini.</p>
        <button className="studio-btn studio-btn--primary" onClick={onExitToLobby}>
          Kembali ke Beranda
        </button>
      </div>
    );
  }

  const qid = currentQuestion.id;
  const selectedOpt = answers[qid];
  const isAnswered = qid in answers;
  const isRevealed = isStudyMode && (revealedMap[qid] || (settings.instantFeedbackInStudy && isAnswered));
  const isLastOverall =
    sectionIdx === session.sections.length - 1 &&
    questionIdx === currentSection.questions.length - 1;
  const isLowTime = isTimed && remainingSec <= 300;

  return (
    <div
      className={`cbt-exam font-scale-${settings.fontSize} ${
        settings.cbtTheme === 'contrast' ? 'cbt-theme-contrast' : ''
      }`}
    >
      {/* Top Black Bar (Prometric style) */}
      <header className="cbt-topbar">
        <div className="cbt-topbar__info">
          <div>
            Page: <span>{globalIndex}</span> / {session.totalQuestions}
          </div>
          <div>
            Section: <span>{sectionIdx + 1}</span> ({questionIdx + 1}/
            {currentSection.questions.length})
          </div>
        </div>

        <div className={`cbt-topbar__timer ${isLowTime ? 'is-low' : ''}`}>
          <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
            <circle
              cx="12"
              cy="12"
              r="9.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            />
            <path
              d="M12 6.5v5.8l4 2.2"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
          <div>
            <div className="cbt-timer__label">
              {isTimed ? 'Total Test Time Remaining' : 'Study Mode Elapsed Time'}
            </div>
            <div className="cbt-timer__value">
              {isTimed ? formatClock(remainingSec) : formatClock(elapsedSec)}
            </div>
          </div>
        </div>

        <div className="cbt-topbar__actions">
          <button
            type="button"
            className="cbt-btn-ruby-quick"
            onClick={() =>
              onUpdateSettings({ ...settings, showFurigana: !settings.showFurigana })
            }
            title="Tampilkan / Sembunyikan Furigana"
          >
            あ {settings.showFurigana ? 'ON' : 'OFF'}
          </button>
          <button
            type="button"
            className="cbt-btn-finish"
            onClick={() => setActiveModal('finish')}
          >
            {isStudyMode ? 'Selesai & Skor' : 'Finish Section'}
          </button>
        </div>
      </header>

      {/* Prometric Green Info Bar */}
      <div className="cbt-infobar">
        <div className="cbt-infobar__left">
          <span>
            <b>Test:</b> {session.pack.name}
          </span>
          <span className={`cbt-mode-pill ${isStudyMode ? 'is-study' : 'is-exam'}`}>
            {isStudyMode ? 'Mode Latihan' : 'Simulasi CBT'}
          </span>
          <span className="cbt-saved-pill" title="Jawaban, tanda soal & checklist tersimpan otomatis di browser">
            💾 Tersimpan otomatis
          </span>
        </div>
        <div className="cbt-infobar__right">
          <span>
            <b>Chapter:</b> {currentSection.title}
          </span>
          <span>
            <b>Candidate:</b> {settings.candidateName || 'PESERTA'}
          </span>
        </div>
      </div>

      {/* Main Body */}
      <div className="cbt-body">
        {/* Dual Left Sidebar */}
        <aside className="cbt-sidebar">
          <nav className="cbt-sections" aria-label="Bagian Soal">
            {session.sections.map((sec, i) => {
              const total = sec.questions.length;
              const done = sec.questions.filter((q) => q.id in answers).length;
              const pct = total ? (done / total) * 100 : 0;
              return (
                <button
                  key={sec.id}
                  type="button"
                  title={sec.title}
                  className={`cbt-section-tab ${i === sectionIdx ? 'is-active' : ''}`}
                  onClick={() => goSection(i)}
                >
                  <span className="cbt-section-tab__num">{sec.shortLabel}</span>
                  <span className="cbt-section-tab__bar">
                    <i style={{ height: `${pct}%` }} />
                    <em className="cbt-section-tab__dot" />
                  </span>
                </button>
              );
            })}
          </nav>

          <nav className="cbt-qnav" aria-label="Nomor Soal">
            {currentSection.questions.map((q, i) => {
              const answered = q.id in answers;
              const flagged = Boolean(flags[q.id]);
              const isCurr = i === questionIdx;
              const studyCorrect =
                isStudyMode &&
                (revealedMap[q.id] || (settings.instantFeedbackInStudy && answered)) &&
                answers[q.id] === q.answer;
              const studyWrong =
                isStudyMode &&
                (revealedMap[q.id] || (settings.instantFeedbackInStudy && answered)) &&
                answered &&
                answers[q.id] !== q.answer;

              return (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => setQuestionIdx(i)}
                  className={[
                    'cbt-qbtn',
                    isCurr ? 'is-current' : '',
                    answered ? 'is-answered' : 'is-unanswered',
                    flagged ? 'is-flagged' : '',
                    studyCorrect ? 'is-study-correct' : '',
                    studyWrong ? 'is-study-wrong' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  <span>{i + 1}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Question Card Stage */}
        <main className="cbt-stage">
          <section className="cbt-card">
            {/* Prompt Box */}
            <div className="cbt-prompt">
              <div className="cbt-prompt__meta">
                <span className="cbt-prompt__num">
                  Soal {currentQuestion.number ?? globalIndex}
                </span>
                {settings.showPageTag && currentQuestion.tag && (
                  <span className="cbt-prompt__tag">
                    [{renderRichJapaneseText(currentQuestion.tag, settings.showFurigana)}]
                  </span>
                )}
              </div>
              <div className="cbt-prompt__text">
                {renderRichJapaneseText(currentQuestion.text, settings.showFurigana)}
              </div>
              {currentQuestion.imageUrl && (
                <div className="cbt-prompt__image">
                  <img
                    src={currentQuestion.imageUrl}
                    alt={`Ilustrasi soal ${currentQuestion.number ?? globalIndex}`}
                  />
                </div>
              )}
            </div>

            {/* Your Language + Study Action Toolbar */}
            <div className="cbt-lang-bar">
              <button
                type="button"
                className={`cbt-btn-lang ${showLangBox ? 'is-open' : ''}`}
                onClick={() => setShowLangBox((v) => !v)}
              >
                🌐 Your Language
              </button>

              {isStudyMode && !isRevealed && (
                <button
                  type="button"
                  className="cbt-btn-check"
                  onClick={() =>
                    setRevealedMap((prev) => ({ ...prev, [qid]: true }))
                  }
                >
                  ✓ Cek Jawaban &amp; Pembahasan
                </button>
              )}

              {session.pack.studyNotes && (
                <button
                  type="button"
                  className="cbt-btn-notes"
                  onClick={() => setActiveModal('notes')}
                >
                  📖 Peta Cepat
                </button>
              )}

              <button
                type="button"
                className={`cbt-btn-checklist ${masteredSet.has(qid) ? 'is-checked' : ''}`}
                onClick={() => onToggleQuestionMastered(session.pack.id, qid)}
                title="Checklist soal ini jika sudah paham (tersimpan permanen walau halaman di-reload)"
              >
                {masteredSet.has(qid) ? '☑ Sudah Paham' : '☐ Tandai Paham'}
              </button>
            </div>

            {/* Your Language Drawer */}
            {showLangBox && (
              <div className="cbt-translation-box">
                {currentQuestion.translation ? (
                  <div>
                    <div className="cbt-translation-box__title">
                      Terjemahan / Your Language
                    </div>
                    <div className="cbt-translation-box__body">
                      {renderRichJapaneseText(
                        currentQuestion.translation,
                        settings.showFurigana
                      )}
                    </div>
                  </div>
                ) : isStudyMode || isRevealed ? (
                  <div>
                    <div className="cbt-translation-box__title">
                      Catatan &amp; Pembahasan (Bahasa Indonesia)
                    </div>
                    <div className="cbt-translation-box__body">
                      {currentQuestion.explanation
                        ? renderRichJapaneseText(
                            currentQuestion.explanation,
                            settings.showFurigana
                          )
                        : 'Tidak ada terjemahan tambahan untuk soal ini. Kamu bisa menambahkannya lewat Studio Soal.'}
                    </div>
                  </div>
                ) : (
                  <div className="cbt-translation-box__body">
                    Terjemahan bahasa Indonesia belum diisi untuk soal ini (kunci pembahasan
                    disembunyikan selama Simulasi CBT agar tidak membocorkan jawaban).
                  </div>
                )}
              </div>
            )}

            {/* Options */}
            <div className="cbt-options" role="radiogroup" aria-label="Pilihan Jawaban">
              {currentQuestion.options.map((opt, idx) => {
                const isSelected = selectedOpt === idx;
                const isCorrectOpt = currentQuestion.answer === idx;
                const showCorrectHighlight = isRevealed && isCorrectOpt;
                const showWrongHighlight = isRevealed && isSelected && !isCorrectOpt;

                return (
                  <div
                    key={idx}
                    className={[
                      'cbt-option',
                      isSelected ? 'is-selected' : '',
                      showCorrectHighlight ? 'is-correct' : '',
                      showWrongHighlight ? 'is-wrong' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    <span className="cbt-option__letter">{LETTERS[idx]}</span>
                    <button
                      type="button"
                      className="cbt-option__box"
                      role="radio"
                      aria-checked={isSelected}
                      onClick={() => handleSelectOption(qid, idx)}
                    >
                      <span className="cbt-option__text">
                        {renderRichJapaneseText(opt, settings.showFurigana)}
                      </span>
                      {showCorrectHighlight && (
                        <span className="cbt-option__badge is-correct">✓ Benar</span>
                      )}
                      {showWrongHighlight && (
                        <span className="cbt-option__badge is-wrong">✗ Pilihanmu</span>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Study Mode Explanation Card */}
            {isRevealed && (
              <div
                className={`cbt-explanation ${
                  selectedOpt === currentQuestion.answer
                    ? 'is-right'
                    : isAnswered
                      ? 'is-wrong'
                      : 'is-neutral'
                }`}
              >
                <div className="cbt-explanation__header">
                  <strong>
                    {selectedOpt === currentQuestion.answer
                      ? '✓ Jawaban Benar!'
                      : isAnswered
                        ? `✗ Kurang Tepat — Kunci: ${LETTERS[currentQuestion.answer]}`
                        : `Kunci Jawaban: ${LETTERS[currentQuestion.answer]}`}
                  </strong>
                </div>
                {currentQuestion.explanation && (
                  <div className="cbt-explanation__body">
                    {renderRichJapaneseText(
                      currentQuestion.explanation,
                      settings.showFurigana
                    )}
                  </div>
                )}
              </div>
            )}
          </section>
        </main>
      </div>

      {/* Prometric Black Bottom Bar */}
      <footer className="cbt-bottombar">
        <div className="cbt-bottombar__tools">
          <button
            type="button"
            className="cbt-icon-btn"
            aria-label="Pengaturan"
            title="Pengaturan (Furigana, Ukuran Teks, Nama)"
            onClick={() => setActiveModal('settings')}
          >
            ⚙
          </button>
          <button
            type="button"
            className="cbt-icon-btn"
            aria-label="Daftar semua soal"
            title="Daftar Soal (G)"
            onClick={() => setActiveModal('grid')}
          >
            ▦
          </button>
          <button
            type="button"
            className="cbt-icon-btn"
            aria-label="Bantuan & Pintasan"
            title="Bantuan & Pintasan Keyboard"
            onClick={() => setActiveModal('help')}
          >
            ?
          </button>
          <button
            type="button"
            className="cbt-btn-exit"
            onClick={() => setActiveModal('exit')}
          >
            ⌂ Beranda
          </button>
        </div>

        <div className="cbt-bottombar__nav">
          <button
            type="button"
            className={`cbt-btn-flag ${flags[qid] ? 'is-on' : ''}`}
            onClick={handleToggleFlag}
            aria-label="Tandai soal"
            title="Tandai soal untuk ditinjau ulang (F)"
          >
            ⚑
          </button>
          <button
            type="button"
            className="cbt-btn-nav"
            onClick={goBack}
            disabled={sectionIdx === 0 && questionIdx === 0}
          >
            ‹ Back
          </button>
          {isLastOverall ? (
            <button
              type="button"
              className="cbt-btn-nav cbt-btn-nav--submit"
              onClick={() => setActiveModal('finish')}
            >
              Finish ✓
            </button>
          ) : (
            <button type="button" className="cbt-btn-nav" onClick={goNext}>
              Next ›
            </button>
          )}
        </div>
      </footer>

      {/* ========== MODALS ========== */}
      {activeModal === 'settings' && (
        <div
          className="modal-backdrop"
          onClick={() => setActiveModal(null)}
          role="dialog"
          aria-modal="true"
        >
          <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>⚙ Pengaturan Tampilan CBT</h3>
              <button
                className="modal-close"
                onClick={() => setActiveModal(null)}
                aria-label="Tutup"
              >
                ✕
              </button>
            </div>
            <div className="modal-body settings-list">
              <label className="setting-field">
                <span>Nama Peserta (Candidate)</span>
                <input
                  type="text"
                  value={settings.candidateName}
                  onChange={(e) =>
                    onUpdateSettings({ ...settings, candidateName: e.target.value })
                  }
                  placeholder="PESERTA LATIHAN"
                />
              </label>

              <label className="setting-toggle">
                <div>
                  <strong>Tampilkan Furigana (漢字 → かな)</strong>
                  <small>Matikan untuk melatih membaca Kanji murni seperti ujian asli</small>
                </div>
                <input
                  type="checkbox"
                  checked={settings.showFurigana}
                  onChange={(e) =>
                    onUpdateSettings({ ...settings, showFurigana: e.target.checked })
                  }
                />
              </label>

              <label className="setting-toggle">
                <div>
                  <strong>Tampilkan Tag Halaman [P.x]</strong>
                  <small>Sembunyikan agar tidak ada petunjuk bab/halaman</small>
                </div>
                <input
                  type="checkbox"
                  checked={settings.showPageTag}
                  onChange={(e) =>
                    onUpdateSettings({ ...settings, showPageTag: e.target.checked })
                  }
                />
              </label>

              {isStudyMode ? (
                <label className="setting-toggle">
                  <div>
                    <strong>Langsung Buka Pembahasan Setelah Memilih</strong>
                    <small>Otomatis cek benar/salah saat klik opsi di Mode Latihan</small>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.instantFeedbackInStudy}
                    onChange={(e) =>
                      onUpdateSettings({
                        ...settings,
                        instantFeedbackInStudy: e.target.checked,
                      })
                    }
                  />
                </label>
              ) : (
                <label className="setting-toggle">
                  <div>
                    <strong>Otomatis Lanjut Soal (Auto-Next)</strong>
                    <small>Pindah ke soal berikutnya setelah memilih jawaban</small>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.autoNext}
                    onChange={(e) =>
                      onUpdateSettings({ ...settings, autoNext: e.target.checked })
                    }
                  />
                </label>
              )}

              <div className="setting-field">
                <span>Ukuran Teks Soal</span>
                <div className="segmented">
                  {(['normal', 'large', 'xlarge'] as const).map((sz) => (
                    <button
                      key={sz}
                      type="button"
                      className={settings.fontSize === sz ? 'is-active' : ''}
                      onClick={() => onUpdateSettings({ ...settings, fontSize: sz })}
                    >
                      {sz === 'normal' ? 'Normal' : sz === 'large' ? 'Besar' : 'Ekstra'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="setting-field">
                <span>Tema Layar CBT</span>
                <div className="segmented">
                  <button
                    type="button"
                    className={settings.cbtTheme === 'classic' ? 'is-active' : ''}
                    onClick={() => onUpdateSettings({ ...settings, cbtTheme: 'classic' })}
                  >
                    Prometric Klasik
                  </button>
                  <button
                    type="button"
                    className={settings.cbtTheme === 'contrast' ? 'is-active' : ''}
                    onClick={() => onUpdateSettings({ ...settings, cbtTheme: 'contrast' })}
                  >
                    Soft Paper
                  </button>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="studio-btn studio-btn--primary"
                onClick={() => setActiveModal(null)}
              >
                Simpan &amp; Lanjut
              </button>
            </div>
          </div>
        </div>
      )}

      {activeModal === 'grid' && (
        <div
          className="modal-backdrop"
          onClick={() => setActiveModal(null)}
          role="dialog"
          aria-modal="true"
        >
          <div className="modal-panel modal-panel--wide" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>▦ Peta &amp; Status Semua Soal</h3>
              <button
                className="modal-close"
                onClick={() => setActiveModal(null)}
                aria-label="Tutup"
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div className="grid-summary-bar">
                <span>
                  Terjawab: <b>{answeredCount}</b> / {session.totalQuestions}
                </span>
                <span>
                  Belum: <b>{session.totalQuestions - answeredCount}</b>
                </span>
                <span>
                  Ditandai (⚑): <b>{flaggedCount}</b>
                </span>
              </div>

              <div className="grid-filters">
                {(
                  [
                    ['all', 'Semua'],
                    ['unanswered', 'Belum Dijawab'],
                    ['flagged', 'Ditandai ⚑'],
                    ['unmastered', 'Belum Paham ☐'],
                    ['mastered', 'Sudah Paham ☑'],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    className={`filter-pill ${gridFilter === key ? 'is-active' : ''}`}
                    onClick={() => setGridFilter(key)}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="overview-sections">
                {session.sections.map((sec, sIdx) => {
                  const visibleQs = sec.questions
                    .map((q, qIdx) => ({ q, qIdx }))
                    .filter(({ q }) => {
                      if (gridFilter === 'unanswered') return !(q.id in answers);
                      if (gridFilter === 'flagged') return Boolean(flags[q.id]);
                      if (gridFilter === 'unmastered') return !masteredSet.has(q.id);
                      if (gridFilter === 'mastered') return masteredSet.has(q.id);
                      return true;
                    });
                  if (visibleQs.length === 0) return null;

                  return (
                    <div key={sec.id} className="overview-section-block">
                      <div className="overview-section-title">
                        <span>{sec.shortLabel}</span>
                        <strong>{sec.title}</strong>
                      </div>
                      <div className="overview-grid">
                        {visibleQs.map(({ q, qIdx }) => {
                          const answered = q.id in answers;
                          const flagged = Boolean(flags[q.id]);
                          const mastered = masteredSet.has(q.id);
                          const curr = sIdx === sectionIdx && qIdx === questionIdx;
                          return (
                            <button
                              key={q.id}
                              type="button"
                              className={[
                                'overview-cell',
                                answered ? 'is-answered' : 'is-unanswered',
                                flagged ? 'is-flagged' : '',
                                mastered ? 'is-mastered' : '',
                                curr ? 'is-current' : '',
                              ]
                                .filter(Boolean)
                                .join(' ')}
                              onClick={() => {
                                goQuestion(sIdx, qIdx);
                                setActiveModal(null);
                              }}
                            >
                              <span>{qIdx + 1}</span>
                              {flagged && <small>⚑</small>}
                              {mastered && <em className="overview-cell__check">✓</em>}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeModal === 'help' && (
        <div
          className="modal-backdrop"
          onClick={() => setActiveModal(null)}
          role="dialog"
          aria-modal="true"
        >
          <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>? Panduan &amp; Pintasan Keyboard</h3>
              <button
                className="modal-close"
                onClick={() => setActiveModal(null)}
                aria-label="Tutup"
              >
                ✕
              </button>
            </div>
            <div className="modal-body help-body">
              <div className="help-legend">
                <div>
                  <span className="legend-chip is-current">1</span> Soal yang sedang aktif
                </div>
                <div>
                  <span className="legend-chip is-answered">2</span> Sudah dijawab
                </div>
                <div>
                  <span className="legend-chip is-unanswered">3</span> Belum dijawab
                </div>
                <div>
                  <span className="legend-chip is-flagged">⚑</span> Ditandai untuk dicek ulang
                </div>
              </div>
              <h4>Pintasan Keyboard</h4>
              <ul className="shortcut-list">
                <li>
                  <kbd>A</kbd> / <kbd>B</kbd> / <kbd>C</kbd> / <kbd>D</kbd> atau{' '}
                  <kbd>1</kbd>–<kbd>4</kbd> — Pilih jawaban
                </li>
                <li>
                  <kbd>←</kbd> / <kbd>→</kbd> — Soal sebelumnya / berikutnya
                </li>
                <li>
                  <kbd>F</kbd> — Tandai / lepas tanda bendera (⚑)
                </li>
                <li>
                  <kbd>G</kbd> — Buka peta semua soal (▦)
                </li>
                <li>
                  <kbd>L</kbd> — Buka / tutup panel Your Language
                </li>
              </ul>
            </div>
            <div className="modal-footer">
              <button
                className="studio-btn studio-btn--primary"
                onClick={() => setActiveModal(null)}
              >
                Mengerti
              </button>
            </div>
          </div>
        </div>
      )}

      {activeModal === 'finish' && (
        <div
          className="modal-backdrop"
          onClick={() => setActiveModal(null)}
          role="dialog"
          aria-modal="true"
        >
          <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Selesaikan Ujian &amp; Hitung Skor?</h3>
              <button
                className="modal-close"
                onClick={() => setActiveModal(null)}
                aria-label="Tutup"
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div className="finish-summary-cards">
                <div className="finish-stat">
                  <span>Terjawab</span>
                  <strong>
                    {answeredCount} / {session.totalQuestions}
                  </strong>
                </div>
                <div className="finish-stat">
                  <span>Belum Dijawab</span>
                  <strong>{session.totalQuestions - answeredCount}</strong>
                </div>
                <div className="finish-stat">
                  <span>Ditandai ⚑</span>
                  <strong>{flaggedCount}</strong>
                </div>
              </div>
              {session.totalQuestions - answeredCount > 0 && (
                <p className="warning-note">
                  Masih ada {session.totalQuestions - answeredCount} soal yang belum
                  dijawab. Kamu bisa kembali memeriksa lewat peta soal (▦) atau langsung
                  kumpulkan sekarang.
                </p>
              )}
            </div>
            <div className="modal-footer">
              <button
                className="studio-btn studio-btn--ghost"
                onClick={() => setActiveModal(null)}
              >
                Kembali Mengerjakan
              </button>
              <button
                className="studio-btn studio-btn--primary"
                onClick={handleFinishConfirmed}
              >
                Ya, Lihat Hasil &amp; Pembahasan
              </button>
            </div>
          </div>
        </div>
      )}

      {activeModal === 'exit' && (
        <div
          className="modal-backdrop"
          onClick={() => setActiveModal(null)}
          role="dialog"
          aria-modal="true"
        >
          <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Kembali ke Beranda?</h3>
              <button
                className="modal-close"
                onClick={() => setActiveModal(null)}
                aria-label="Tutup"
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <p>
                Progres jawaban, tanda soal (<b>⚑</b>), dan checklist paham (<b>☑</b>)
                otomatis tersimpan di browsermu. Pilih apakah ingin menyimpan sesi aktif
                untuk dilanjutkan nanti atau mereset sesi ini:
              </p>
            </div>
            <div className="modal-footer">
              <button
                className="studio-btn studio-btn--ghost"
                onClick={() => setActiveModal(null)}
              >
                Batal
              </button>
              <button
                className="studio-btn studio-btn--danger"
                onClick={() => onDiscardDraftAndExit(session.pack.id)}
              >
                Reset Sesi &amp; Keluar
              </button>
              <button
                className="studio-btn studio-btn--primary"
                onClick={() => {
                  persistCurrentDraft();
                  onExitToLobby();
                }}
              >
                Simpan Progres &amp; Beranda
              </button>
            </div>
          </div>
        </div>
      )}

      {activeModal === 'notes' && session.pack.studyNotes && (
        <StudyNotesModal
          title={session.pack.name}
          notes={session.pack.studyNotes}
          showFurigana={settings.showFurigana}
          onClose={() => setActiveModal(null)}
        />
      )}
    </div>
  );
};
