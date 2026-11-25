import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Clock,
  Flag,
  RotateCcw,
  Search,
  Trophy,
  XCircle,
} from 'lucide-react';
import { ExamSettings, QuestionItem } from '../types/exam';
import { ActiveExamSession } from '../utils/sessionBuilder';
import { renderRichJapaneseText, stripFurigana } from '../utils/rubyText';
import { ExamCompletionPayload } from './CbtExamView';
import { StudyNotesModal } from './StudyNotesModal';

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

interface ResultViewProps {
  session: ActiveExamSession;
  result: ExamCompletionPayload;
  settings: ExamSettings;
  onToggleFurigana: () => void;
  onRetryAll: () => void;
  onRetryWrong: (wrongQuestions: QuestionItem[]) => void;
  onBackToLobby: () => void;
}

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}m ${s}d`;
}

export const ResultView: React.FC<ResultViewProps> = ({
  session,
  result,
  settings,
  onToggleFurigana,
  onRetryAll,
  onRetryWrong,
  onBackToLobby,
}) => {
  const [filter, setFilter] = useState<'all' | 'wrong' | 'correct' | 'flagged'>('all');
  const [search, setSearch] = useState('');
  const [showNotes, setShowNotes] = useState(false);

  const summary = useMemo(() => {
    let correct = 0;
    let answered = 0;
    let total = 0;
    const wrongQuestions: QuestionItem[] = [];

    const sectionStats = session.sections.map((sec) => {
      let secCorrect = 0;
      sec.questions.forEach((q) => {
        total++;
        const userAns = result.answers[q.id];
        if (userAns !== undefined) answered++;
        if (userAns === q.answer) {
          correct++;
          secCorrect++;
        } else {
          wrongQuestions.push(q);
        }
      });
      const secTotal = sec.questions.length;
      return {
        id: sec.id,
        shortLabel: sec.shortLabel,
        title: sec.title,
        correct: secCorrect,
        total: secTotal,
        pct: secTotal ? Math.round((secCorrect / secTotal) * 100) : 0,
      };
    });

    const pct = total ? Math.round((correct / total) * 100) : 0;
    const passed = pct >= session.config.passingPct;
    const otaff150 = total ? Math.round((correct / total) * 150) : 0;

    return {
      correct,
      answered,
      total,
      pct,
      passed,
      otaff150,
      wrongQuestions,
      sectionStats,
    };
  }, [session, result]);

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    const list: Array<{
      secTitle: string;
      q: QuestionItem;
      seq: number;
      userAns: number | undefined;
      isCorrect: boolean;
      isFlagged: boolean;
    }> = [];

    let seq = 0;
    session.sections.forEach((sec) => {
      sec.questions.forEach((q) => {
        seq++;
        const userAns = result.answers[q.id];
        const isCorrect = userAns === q.answer;
        const isFlagged = Boolean(result.flags[q.id]);

        if (filter === 'wrong' && isCorrect) return;
        if (filter === 'correct' && !isCorrect) return;
        if (filter === 'flagged' && !isFlagged) return;

        if (query) {
          const hay = [
            stripFurigana(q.text),
            q.text,
            q.tag || '',
            q.explanation || '',
            q.translation || '',
            ...q.options.map((o) => stripFurigana(o)),
          ]
            .join(' ')
            .toLowerCase();
          if (!hay.includes(query)) return;
        }

        list.push({
          secTitle: sec.title,
          q,
          seq,
          userAns,
          isCorrect,
          isFlagged,
        });
      });
    });
    return list;
  }, [session.sections, result.answers, result.flags, filter, search]);

  return (
    <div className="page-shell">
      <header className="studio-topbar">
        <div className="studio-topbar__inner">
          <button
            type="button"
            className="studio-btn studio-btn--ghost"
            onClick={onBackToLobby}
          >
            <ArrowLeft size={16} /> Kembali ke Beranda
          </button>
          <div className="studio-topbar__right">
            <button
              type="button"
              className="studio-btn studio-btn--ghost"
              onClick={onToggleFurigana}
            >
              Furigana: {settings.showFurigana ? 'ON' : 'OFF'}
            </button>
            {session.pack.studyNotes && (
              <button
                type="button"
                className="studio-btn studio-btn--ghost"
                onClick={() => setShowNotes(true)}
              >
                <BookOpen size={16} /> Peta Cepat
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="result-container">
        {/* Hero Score Banner */}
        <section className={`result-hero ${summary.passed ? 'is-pass' : 'is-fail'}`}>
          <div className="result-hero__badge">
            <Trophy size={20} />
            <span>
              {summary.passed
                ? `LULUS (≥ ${session.config.passingPct}%)`
                : `BELUM LULUS (Target ${session.config.passingPct}%)`}
            </span>
          </div>

          <h1 className="result-hero__title">{session.pack.name}</h1>
          <p className="result-hero__subtitle">
            Kandidat: <b>{settings.candidateName}</b> •{' '}
            {session.config.mode === 'exam' ? 'Simulasi CBT' : 'Mode Latihan'}
          </p>

          <div className="result-metrics">
            <div className="result-metric">
              <span>Skor Benar</span>
              <strong>
                {summary.correct} / {summary.total}
              </strong>
            </div>
            <div className="result-metric">
              <span>Persentase</span>
              <strong>{summary.pct}%</strong>
            </div>
            <div className="result-metric">
              <span>Konversi Skala 150</span>
              <strong>{summary.otaff150} / 150</strong>
            </div>
            <div className="result-metric">
              <span>Waktu Terpakai</span>
              <strong>
                <Clock size={16} /> {formatDuration(result.elapsedSec)}
              </strong>
            </div>
          </div>

          <div className="result-actions">
            {summary.wrongQuestions.length > 0 && (
              <button
                type="button"
                className="studio-btn studio-btn--accent"
                onClick={() => onRetryWrong(summary.wrongQuestions)}
              >
                <RotateCcw size={16} /> Ulangi Soal Salah ({summary.wrongQuestions.length})
              </button>
            )}
            <button
              type="button"
              className="studio-btn studio-btn--primary"
              onClick={onRetryAll}
            >
              <RotateCcw size={16} /> Ulangi Sesi Ini
            </button>
            <button
              type="button"
              className="studio-btn studio-btn--ghost"
              onClick={onBackToLobby}
            >
              Pilih Paket Lain
            </button>
          </div>
        </section>

        {/* Per-Chapter Breakdown */}
        <section className="panel-card">
          <div className="panel-card__head">
            <h2>Analisis Per Bab / Bagian</h2>
            <span>Identifikasi bab yang masih perlu diperdalam</span>
          </div>
          <div className="chapter-bars">
            {summary.sectionStats.map((st) => (
              <div key={st.id} className="chapter-bar-row">
                <div className="chapter-bar-row__label">
                  <span className="chapter-chip">{st.shortLabel}</span>
                  <span>{st.title}</span>
                </div>
                <div className="chapter-bar-row__track">
                  <div
                    className={`chapter-bar-row__fill ${
                      st.pct >= session.config.passingPct ? 'is-good' : 'is-weak'
                    }`}
                    style={{ width: `${st.pct}%` }}
                  />
                </div>
                <div className="chapter-bar-row__score">
                  {st.correct}/{st.total} ({st.pct}%)
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Detailed Question Review */}
        <section className="panel-card">
          <div className="review-toolbar">
            <h2>Pembahasan Detail ({filteredItems.length})</h2>
            <div className="review-toolbar__controls">
              <div className="search-box">
                <Search size={15} />
                <input
                  type="text"
                  placeholder="Cari soal, kata kunci, atau halaman..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="filter-group">
                {(
                  [
                    ['all', `Semua (${summary.total})`],
                    ['wrong', `Salah (${summary.wrongQuestions.length})`],
                    ['correct', `Benar (${summary.correct})`],
                    [
                      'flagged',
                      `Ditandai (${Object.values(result.flags).filter(Boolean).length})`,
                    ],
                  ] as const
                ).map(([k, label]) => (
                  <button
                    key={k}
                    type="button"
                    className={`filter-pill ${filter === k ? 'is-active' : ''}`}
                    onClick={() => setFilter(k)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="review-list">
            {filteredItems.length === 0 ? (
              <div className="empty-box">Tidak ada soal yang cocok dengan filter ini.</div>
            ) : (
              filteredItems.map(({ secTitle, q, seq, userAns, isCorrect, isFlagged }) => (
                <article
                  key={q.id}
                  className={`review-item ${isCorrect ? 'is-correct' : 'is-wrong'}`}
                >
                  <div className="review-item__top">
                    <div className="review-item__meta">
                      <span
                        className={`status-pill ${isCorrect ? 'is-correct' : 'is-wrong'}`}
                      >
                        {isCorrect ? (
                          <>
                            <CheckCircle2 size={14} /> Benar
                          </>
                        ) : userAns === undefined ? (
                          <>
                            <XCircle size={14} /> Kosong
                          </>
                        ) : (
                          <>
                            <XCircle size={14} /> Salah
                          </>
                        )}
                      </span>
                      <span className="review-qnum">
                        #{q.number ?? seq} {q.tag ? `[${q.tag}]` : ''}
                      </span>
                      <span className="review-sec">{secTitle}</span>
                    </div>
                    {isFlagged && (
                      <span className="flag-pill">
                        <Flag size={13} /> Ditandai
                      </span>
                    )}
                  </div>

                  <div className="review-item__question">
                    {renderRichJapaneseText(q.text, settings.showFurigana)}
                  </div>

                  {q.translation && (
                    <div className="review-item__translation">
                      <b>Terjemahan:</b>{' '}
                      {renderRichJapaneseText(q.translation, settings.showFurigana)}
                    </div>
                  )}

                  <div className="review-options">
                    {q.options.map((opt, oIdx) => {
                      const isKey = oIdx === q.answer;
                      const isUser = oIdx === userAns;
                      return (
                        <div
                          key={oIdx}
                          className={[
                            'review-opt',
                            isKey ? 'is-key' : '',
                            isUser && !isKey ? 'is-user-wrong' : '',
                          ]
                            .filter(Boolean)
                            .join(' ')}
                        >
                          <span className="review-opt__letter">{LETTERS[oIdx]}</span>
                          <span className="review-opt__text">
                            {renderRichJapaneseText(opt, settings.showFurigana)}
                          </span>
                          {isKey && <span className="opt-tag is-key">Kunci</span>}
                          {isUser && !isKey && (
                            <span className="opt-tag is-user-wrong">Jawabanmu</span>
                          )}
                          {isUser && isKey && (
                            <span className="opt-tag is-key">Jawabanmu ✓</span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {q.explanation && (
                    <div className="review-explanation">
                      <strong>Pembahasan:</strong>{' '}
                      {renderRichJapaneseText(q.explanation, settings.showFurigana)}
                    </div>
                  )}
                </article>
              ))
            )}
          </div>
        </section>
      </main>

      {showNotes && session.pack.studyNotes && (
        <StudyNotesModal
          title={session.pack.name}
          notes={session.pack.studyNotes}
          showFurigana={settings.showFurigana}
          onClose={() => setShowNotes(false)}
        />
      )}
    </div>
  );
};
