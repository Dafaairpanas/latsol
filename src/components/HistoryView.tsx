import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  CheckCircle2,
  CheckSquare,
  ChevronDown,
  ChevronUp,
  Clock,
  Flag,
  Flame,
  History,
  Play,
  RotateCcw,
  Search,
  Square,
  Trash2,
  TrendingDown,
  TrendingUp,
  Trophy,
} from 'lucide-react';
import {
  AttemptRecord,
  ExamPack,
  ExamSettings,
  QuestionAttemptStat,
  QuestionItem,
  QuestionStudyState,
} from '../types/exam';
import { renderRichJapaneseText, stripFurigana } from '../utils/rubyText';
import { EMPTY_STUDY_STATE } from '../utils/storage';

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

export interface IndexedQuestionRef {
  question: QuestionItem;
  pack: ExamPack;
  sectionTitle: string;
  sectionShortLabel: string;
}

interface HistoryViewProps {
  packs: ExamPack[];
  settings: ExamSettings;
  history: AttemptRecord[];
  questionStats: Record<string, QuestionAttemptStat>;
  studyStates: Record<string, QuestionStudyState>;
  onBackToLobby: () => void;
  onToggleFurigana: () => void;
  onToggleQuestionFlag: (packId: string, qId: string) => void;
  onToggleQuestionMastered: (packId: string, qId: string) => void;
  onStartDrillQuestions: (
    pack: ExamPack | null,
    questions: QuestionItem[],
    label: string
  ) => void;
  onClearAttemptHistory: () => void;
  onClearQuestionStats: () => void;
}

type MistakeStatusFilter = 'all' | 'repeat' | 'still_wrong' | 'improved';
type MistakeSortMode = 'most_wrong' | 'highest_rate' | 'recent';

function formatDuration(sec: number): string {
  const hrs = Math.floor(sec / 3600);
  const mins = Math.floor((sec % 3600) / 60);
  const secs = sec % 60;
  if (hrs > 0) return `${hrs}j ${mins}m`;
  if (mins > 0) return `${mins}m ${secs}d`;
  return `${secs}d`;
}

function formatDateTime(iso: string): string {
  if (!iso) return '-';
  try {
    return new Date(iso).toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  packs,
  settings,
  history,
  questionStats,
  studyStates,
  onBackToLobby,
  onToggleFurigana,
  onToggleQuestionFlag,
  onToggleQuestionMastered,
  onStartDrillQuestions,
  onClearAttemptHistory,
  onClearQuestionStats,
}) => {
  const [mistakeFilter, setMistakeFilter] = useState<MistakeStatusFilter>('all');
  const [packFilter, setPackFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<MistakeSortMode>('most_wrong');
  const [search, setSearch] = useState('');
  const [expandedOptionsMap, setExpandedOptionsMap] = useState<Record<string, boolean>>({});
  const [sessionModeFilter, setSessionModeFilter] = useState<'all' | 'exam' | 'study'>(
    'all'
  );

  // Build quick lookup of every active question across all packs
  const { packById, questionRefById } = useMemo(() => {
    const pMap = new Map<string, ExamPack>();
    const qMap = new Map<string, IndexedQuestionRef>();
    for (const p of packs) {
      pMap.set(p.id, p);
      for (const sec of p.sections) {
        for (const q of sec.questions) {
          if (!qMap.has(q.id)) {
            qMap.set(q.id, {
              question: q,
              pack: p,
              sectionTitle: sec.title,
              sectionShortLabel: sec.shortLabel,
            });
          }
        }
      }
    }
    return { packById: pMap, questionRefById: qMap };
  }, [packs]);

  // Overall KPI metrics computed from AttemptRecord + QuestionAttemptStat
  const overview = useMemo(() => {
    const totalSessions = history.length;
    const examSessions = history.filter((h) => h.mode === 'exam').length;
    const studySessions = totalSessions - examSessions;
    const passedSessions = history.filter((h) => h.passed).length;

    const avgPct = totalSessions
      ? Math.round(history.reduce((sum, h) => sum + h.pct, 0) / totalSessions)
      : 0;
    const bestPct = totalSessions ? Math.max(...history.map((h) => h.pct)) : 0;
    const latestPct = totalSessions ? history[0].pct : null;
    const prevPct = history.length >= 2 ? history[1].pct : null;
    const latestDelta =
      latestPct !== null && prevPct !== null ? latestPct - prevPct : null;

    const totalCorrect = history.reduce((sum, h) => sum + h.correct, 0);
    const totalQuestionsAnswered = history.reduce((sum, h) => sum + h.total, 0);
    const cumulativeAccuracy = totalQuestionsAnswered
      ? Math.round((totalCorrect / totalQuestionsAnswered) * 100)
      : 0;
    const totalElapsedSec = history.reduce((sum, h) => sum + (h.elapsedSec || 0), 0);

    const allStats = Object.values(questionStats);
    const wrongStats = allStats.filter((s) => s.wrongCount > 0);
    const repeatWrongCount = wrongStats.filter((s) => s.wrongCount >= 2).length;
    const stillWrongCount = wrongStats.filter((s) => s.lastResult === 'wrong').length;
    const improvedCount = wrongStats.filter((s) => s.lastResult === 'correct').length;

    return {
      totalSessions,
      examSessions,
      studySessions,
      passedSessions,
      avgPct,
      bestPct,
      latestPct,
      latestDelta,
      totalCorrect,
      totalQuestionsAnswered,
      cumulativeAccuracy,
      totalElapsedSec,
      wrongTotalUnique: wrongStats.length,
      repeatWrongCount,
      stillWrongCount,
      improvedCount,
    };
  }, [history, questionStats]);

  // Enrich every question that has ever been wrong with its metadata & study flags
  const mistakeEntries = useMemo(() => {
    const list: Array<{
      stat: QuestionAttemptStat;
      errPct: number;
      ref?: IndexedQuestionRef;
      packName: string;
      resolvedPackId: string;
    }> = [];

    for (const stat of Object.values(questionStats)) {
      if (stat.wrongCount <= 0) continue;
      const ref = questionRefById.get(stat.questionId);
      const packObj = ref?.pack || packById.get(stat.packId);
      const errPct = stat.attempts
        ? Math.round((stat.wrongCount / stat.attempts) * 100)
        : 100;
      list.push({
        stat,
        errPct,
        ref,
        packName:
          packObj?.name ||
          (stat.packId === 'drill-wrong-all' ? 'Latihan Gabungan' : 'Paket Custom/Lama'),
        resolvedPackId: ref?.pack.id || stat.packId,
      });
    }
    return list;
  }, [questionStats, questionRefById, packById]);

  const packsWithMistakes = useMemo(() => {
    const map = new Map<string, { id: string; name: string; count: number }>();
    for (const item of mistakeEntries) {
      const key = item.resolvedPackId || 'other';
      const existing = map.get(key);
      if (existing) {
        existing.count++;
      } else {
        map.set(key, { id: key, name: item.packName, count: 1 });
      }
    }
    return [...map.values()].sort((a, b) => b.count - a.count);
  }, [mistakeEntries]);

  const filteredMistakes = useMemo(() => {
    const qLower = search.trim().toLowerCase();
    const list = mistakeEntries.filter((entry) => {
      const { stat, ref, resolvedPackId, packName } = entry;
      if (mistakeFilter === 'repeat' && stat.wrongCount < 2) return false;
      if (mistakeFilter === 'still_wrong' && stat.lastResult !== 'wrong') return false;
      if (mistakeFilter === 'improved' && stat.lastResult !== 'correct') return false;
      if (packFilter !== 'ALL' && resolvedPackId !== packFilter) return false;

      if (qLower) {
        const q = ref?.question;
        const hay = [
          packName,
          ref?.sectionTitle || '',
          q ? stripFurigana(q.text) : '',
          q?.text || '',
          q?.tag || '',
          q?.translation || '',
          q?.explanation || '',
          stat.lastWrongAnswerText || '',
          ...(q?.options.map((o) => stripFurigana(o)) || []),
        ]
          .join(' ')
          .toLowerCase();
        if (!hay.includes(qLower)) return false;
      }
      return true;
    });

    list.sort((a, b) => {
      if (sortBy === 'highest_rate') {
        if (b.errPct !== a.errPct) return b.errPct - a.errPct;
        if (b.stat.wrongCount !== a.stat.wrongCount) {
          return b.stat.wrongCount - a.stat.wrongCount;
        }
      } else if (sortBy === 'recent') {
        const tA = a.stat.lastWrongAt || a.stat.lastAttemptAt || '';
        const tB = b.stat.lastWrongAt || b.stat.lastAttemptAt || '';
        if (tB !== tA) return tB.localeCompare(tA);
      } else {
        // Default: most_wrong -> highest errPct -> recent
        if (b.stat.wrongCount !== a.stat.wrongCount) {
          return b.stat.wrongCount - a.stat.wrongCount;
        }
        if (b.errPct !== a.errPct) return b.errPct - a.errPct;
      }
      const fallbackA = a.stat.lastWrongAt || a.stat.lastAttemptAt || '';
      const fallbackB = b.stat.lastWrongAt || b.stat.lastAttemptAt || '';
      return fallbackB.localeCompare(fallbackA);
    });

    return list;
  }, [mistakeEntries, mistakeFilter, packFilter, sortBy, search]);

  const allDrillableWrongQuestions = useMemo(
    () =>
      mistakeEntries
        .filter((e) => Boolean(e.ref))
        .sort((a, b) => b.stat.wrongCount - a.stat.wrongCount)
        .map((e) => e.ref!.question),
    [mistakeEntries]
  );

  const drillableFilteredQuestions = useMemo(
    () =>
      filteredMistakes
        .filter((e) => Boolean(e.ref))
        .map((e) => e.ref!.question),
    [filteredMistakes]
  );

  // Pack-by-pack score trajectory
  const packProgressCards = useMemo(() => {
    const grouped = new Map<string, AttemptRecord[]>();
    for (const att of history) {
      if (att.packId === 'drill-wrong-all') continue;
      const arr = grouped.get(att.packId) || [];
      arr.push(att);
      grouped.set(att.packId, arr);
    }

    const cards: Array<{
      packId: string;
      packName: string;
      packObj?: ExamPack;
      attemptsChronological: AttemptRecord[];
      firstPct: number;
      latestPct: number;
      bestPct: number;
      deltaPct: number | null;
      wrongQuestions: QuestionItem[];
    }> = [];

    for (const [packId, runsNewestFirst] of grouped.entries()) {
      const packObj = packById.get(packId);
      const chronological = [...runsNewestFirst].reverse();
      const firstPct = chronological[0].pct;
      const latestPct = chronological[chronological.length - 1].pct;
      const bestPct = Math.max(...chronological.map((r) => r.pct));
      const deltaPct = chronological.length >= 2 ? latestPct - firstPct : null;

      const wrongQsForPack = mistakeEntries
        .filter((m) => m.resolvedPackId === packId && m.ref)
        .map((m) => m.ref!.question);

      cards.push({
        packId,
        packName: packObj?.name || runsNewestFirst[0].packName,
        packObj,
        attemptsChronological: chronological,
        firstPct,
        latestPct,
        bestPct,
        deltaPct,
        wrongQuestions: wrongQsForPack,
      });
    }

    cards.sort((a, b) => {
      const aLast =
        a.attemptsChronological[a.attemptsChronological.length - 1].completedAt;
      const bLast =
        b.attemptsChronological[b.attemptsChronological.length - 1].completedAt;
      return bLast.localeCompare(aLast);
    });
    return cards;
  }, [history, packById, mistakeEntries]);

  const filteredSessions = useMemo(() => {
    if (sessionModeFilter === 'all') return history;
    return history.filter((h) => h.mode === sessionModeFilter);
  }, [history, sessionModeFilter]);

  const handleLaunchFilteredDrill = () => {
    if (drillableFilteredQuestions.length === 0) return;
    const singlePack =
      packFilter !== 'ALL' ? packById.get(packFilter) || null : null;
    const filterTitle =
      mistakeFilter === 'repeat'
        ? 'Sering Salah'
        : mistakeFilter === 'still_wrong'
          ? 'Masih Salah'
          : mistakeFilter === 'improved'
            ? 'Review Membaik'
            : 'Latihan Soal Salah';
    onStartDrillQuestions(
      singlePack,
      drillableFilteredQuestions,
      `${filterTitle} (${drillableFilteredQuestions.length} soal)`
    );
  };

  return (
    <div className="page-shell">
      <header className="studio-topbar">
        <div className="studio-topbar__inner">
          <div className="btn-row">
            <button
              type="button"
              className="studio-btn studio-btn--ghost"
              onClick={onBackToLobby}
            >
              <ArrowLeft size={16} /> Kembali ke Beranda
            </button>
            <div className="history-topbar-title">
              <BarChart3 size={18} />
              <span>Riwayat &amp; Pelacakan Progres</span>
            </div>
          </div>

          <div className="studio-topbar__right">
            <button
              type="button"
              className="studio-btn studio-btn--ghost"
              onClick={onToggleFurigana}
            >
              Furigana: {settings.showFurigana ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>
      </header>

      <main className="history-container">
        {/* Hero Overview */}
        <section className="panel-card history-hero">
          <div className="panel-card__head">
            <div>
              <h1>Tracking Progres &amp; Analisa Soal Sering Salah</h1>
              <span>
                Kandidat: <b>{settings.candidateName}</b> • Data tersimpan permanen di
                browser walau reload atau dibuka besok
              </span>
            </div>
            {allDrillableWrongQuestions.length > 0 && (
              <button
                type="button"
                className="studio-btn studio-btn--accent"
                onClick={() =>
                  onStartDrillQuestions(
                    null,
                    allDrillableWrongQuestions,
                    `Latih Semua Soal Pernah Salah (${allDrillableWrongQuestions.length} soal)`
                  )
                }
              >
                <Play size={15} /> Latih Semua Soal Salah (
                {allDrillableWrongQuestions.length})
              </button>
            )}
          </div>

          <div className="result-metrics history-kpi-grid">
            <div className="result-metric">
              <span>Total Sesi Selesai</span>
              <strong>
                <History size={18} /> {overview.totalSessions} Sesi
              </strong>
              <small className="metric-sub">
                CBT: {overview.examSessions} • Latihan: {overview.studySessions} • Lulus:{' '}
                {overview.passedSessions}
              </small>
            </div>

            <div className="result-metric">
              <span>Rata-rata &amp; Terbaik</span>
              <strong>
                <Trophy size={18} /> {overview.avgPct}%
              </strong>
              <small className="metric-sub">
                Terbaik: <b>{overview.bestPct}%</b>
                {overview.latestDelta !== null && (
                  <>
                    {' '}
                    • Tren terakhir:{' '}
                    <b
                      className={
                        overview.latestDelta >= 0 ? 'text-good' : 'text-danger'
                      }
                    >
                      {overview.latestDelta >= 0 ? '+' : ''}
                      {overview.latestDelta}%
                    </b>
                  </>
                )}
              </small>
            </div>

            <div className="result-metric">
              <span>Akurasi Soal &amp; Waktu</span>
              <strong>
                <Clock size={18} /> {overview.cumulativeAccuracy}%
              </strong>
              <small className="metric-sub">
                {overview.totalCorrect}/{overview.totalQuestionsAnswered} benar • Total{' '}
                {formatDuration(overview.totalElapsedSec)}
              </small>
            </div>

            <div className="result-metric">
              <span>Soal Pernah / Sering Salah</span>
              <strong>
                <AlertTriangle size={18} /> {overview.wrongTotalUnique} Soal
              </strong>
              <small className="metric-sub">
                Berulang (≥2x): <b>{overview.repeatWrongCount}</b> • Membaik:{' '}
                <b>{overview.improvedCount}</b>
              </small>
            </div>
          </div>
        </section>

        {/* Empty State */}
        {history.length === 0 && overview.wrongTotalUnique === 0 ? (
          <section className="panel-card empty-box">
            <h3>Belum Ada Riwayat Latihan atau Simulasi</h3>
            <p>
              Mulai kerjakan salah satu paket Simulasi CBT atau Mode Latihan dari Beranda.
              Setelah selesai, skormu dan daftar soal yang sering salah akan langsung
              tercatat di halaman ini.
            </p>
            <button
              type="button"
              className="studio-btn studio-btn--primary"
              onClick={onBackToLobby}
            >
              <Play size={15} /> Pilih Paket &amp; Mulai Latihan
            </button>
          </section>
        ) : (
          <>
            {/* Per-Pack Progress & Score Trend */}
            {packProgressCards.length > 0 && (
              <section className="panel-card">
                <div className="panel-card__head">
                  <div>
                    <h2>Progres Skor Per Paket Soal</h2>
                    <span>
                      Bandingkan skor awal hingga percobaan terakhir untuk melihat
                      peningkatanmu
                    </span>
                  </div>
                </div>

                <div className="pack-progress-grid">
                  {packProgressCards.map((card) => {
                    const recentRuns = card.attemptsChronological.slice(-8);
                    const passingPct = card.packObj?.passingPct ?? 65;

                    return (
                      <article key={card.packId} className="pack-progress-card">
                        <div className="pack-progress-card__top">
                          <div>
                            <h3>{card.packName}</h3>
                            <span className="pack-progress-sub">
                              Dicoba {card.attemptsChronological.length}x • Awal{' '}
                              <b>{card.firstPct}%</b> → Terakhir <b>{card.latestPct}%</b>{' '}
                              • Terbaik <b>{card.bestPct}%</b>
                            </span>
                          </div>
                          {card.deltaPct !== null ? (
                            <span
                              className={`trend-badge ${
                                card.deltaPct > 0
                                  ? 'is-up'
                                  : card.deltaPct < 0
                                    ? 'is-down'
                                    : 'is-flat'
                              }`}
                            >
                              {card.deltaPct > 0 ? (
                                <TrendingUp size={13} />
                              ) : card.deltaPct < 0 ? (
                                <TrendingDown size={13} />
                              ) : null}
                              {card.deltaPct > 0
                                ? `Naik +${card.deltaPct}%`
                                : card.deltaPct < 0
                                  ? `Turun ${card.deltaPct}%`
                                  : 'Stabil 0%'}
                            </span>
                          ) : (
                            <span className="trend-badge is-flat">1x Percobaan</span>
                          )}
                        </div>

                        {/* Score History Spark Bars (Oldest -> Latest) */}
                        <div
                          className="score-spark"
                          aria-label={`Grafik skor ${card.packName}`}
                        >
                          {recentRuns.map((run) => (
                            <div
                              key={run.id}
                              className="score-spark__col"
                              title={`${formatDateTime(run.completedAt)} — ${run.packName}: ${run.correct}/${run.total} (${run.pct}%)`}
                            >
                              <span className="score-spark__val">{run.pct}%</span>
                              <div className="score-spark__track">
                                <div
                                  className={`score-spark__fill ${
                                    run.pct >= passingPct ? 'is-pass' : 'is-fail'
                                  }`}
                                  style={{ height: `${Math.max(8, run.pct)}%` }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="pack-progress-card__foot">
                          <span>
                            {card.wrongQuestions.length > 0
                              ? `${card.wrongQuestions.length} soal tercatat pernah salah`
                              : 'Belum ada catatan soal salah di paket ini ✓'}
                          </span>
                          {card.wrongQuestions.length > 0 && card.packObj && (
                            <button
                              type="button"
                              className="mini-action is-warn"
                              onClick={() =>
                                onStartDrillQuestions(
                                  card.packObj!,
                                  card.wrongQuestions,
                                  `Ulangi Soal Salah (${card.wrongQuestions.length} soal)`
                                )
                              }
                            >
                              <RotateCcw size={13} /> Latih Salah (
                              {card.wrongQuestions.length})
                            </button>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Frequently Missed Questions Tracker */}
            <section className="panel-card">
              <div className="review-toolbar">
                <div>
                  <h2>Pelacak Soal yang Sering Salah ({filteredMistakes.length})</h2>
                  <span className="toolbar-sub">
                    Diurutkan dari soal yang paling sering salah — klik Latih untuk
                    mengulang khusus soal-soal ini
                  </span>
                </div>

                <div className="btn-row">
                  {drillableFilteredQuestions.length > 0 && (
                    <button
                      type="button"
                      className="studio-btn studio-btn--primary"
                      onClick={handleLaunchFilteredDrill}
                    >
                      <Play size={15} /> Latih Soal Terfilter (
                      {drillableFilteredQuestions.length})
                    </button>
                  )}
                  {overview.wrongTotalUnique > 0 && (
                    <button
                      type="button"
                      className="studio-btn studio-btn--ghost"
                      onClick={() => {
                        if (
                          window.confirm(
                            'Reset seluruh statistik soal yang pernah salah? Riwayat skor sesi tetap ada.'
                          )
                        ) {
                          onClearQuestionStats();
                        }
                      }}
                    >
                      <Trash2 size={14} /> Reset Pelacak Salah
                    </button>
                  )}
                </div>
              </div>

              <div className="mistake-controls">
                <div className="filter-group">
                  {(
                    [
                      ['all', `Semua Salah (${overview.wrongTotalUnique})`],
                      ['repeat', `Sering Salah ≥2x (${overview.repeatWrongCount})`],
                      ['still_wrong', `Masih Salah Terakhir (${overview.stillWrongCount})`],
                      ['improved', `Sudah Membaik ✓ (${overview.improvedCount})`],
                    ] as const
                  ).map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      className={`filter-pill ${mistakeFilter === key ? 'is-active' : ''}`}
                      onClick={() => setMistakeFilter(key)}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <div className="mistake-controls__right">
                  <select
                    className="compact-select"
                    value={packFilter}
                    onChange={(e) => setPackFilter(e.target.value)}
                    aria-label="Filter berdasarkan paket"
                  >
                    <option value="ALL">
                      Semua Paket ({overview.wrongTotalUnique})
                    </option>
                    {packsWithMistakes.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.count})
                      </option>
                    ))}
                  </select>

                  <select
                    className="compact-select"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as MistakeSortMode)}
                    aria-label="Urutkan soal salah"
                  >
                    <option value="most_wrong">Urut: Paling Sering Salah</option>
                    <option value="highest_rate">Urut: Persentase Salah Tertinggi</option>
                    <option value="recent">Urut: Terbaru Salah</option>
                  </select>

                  <div className="search-box">
                    <Search size={15} />
                    <input
                      type="text"
                      placeholder="Cari soal, kanji, atau tag..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {filteredMistakes.length === 0 ? (
                <div className="empty-box">
                  {overview.wrongTotalUnique === 0
                    ? 'Keren! Belum ada catatan soal yang salah.'
                    : 'Tidak ada soal salah yang cocok dengan filter pencarian ini.'}
                </div>
              ) : (
                <div className="review-list">
                  {filteredMistakes.map(({ stat, errPct, ref, packName, resolvedPackId }) => {
                    const st = studyStates[resolvedPackId] || EMPTY_STUDY_STATE;
                    const isFlagged = st.flaggedIds.includes(stat.questionId);
                    const isMastered = st.masteredIds.includes(stat.questionId);
                    const isExpanded = Boolean(expandedOptionsMap[stat.questionId]);
                    const q = ref?.question;

                    return (
                      <article
                        key={stat.questionId}
                        className={`review-item ${
                          stat.lastResult === 'wrong' ? 'is-wrong' : ''
                        }`}
                      >
                        <div className="review-item__top">
                          <div className="review-item__meta">
                            <span
                              className={`status-pill ${
                                stat.lastResult === 'wrong' ? 'is-wrong' : 'is-correct'
                              }`}
                            >
                              {stat.lastResult === 'wrong' ? (
                                <>
                                  <Flame size={13} /> Salah {stat.wrongCount}/
                                  {stat.attempts}x ({errPct}%)
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 size={13} /> Membaik • Salah{' '}
                                  {stat.wrongCount}/{stat.attempts}x ({errPct}%)
                                </>
                              )}
                            </span>
                            {q && (
                              <span className="review-qnum">
                                #{q.number ?? '?'} {q.tag ? `[${q.tag}]` : ''}
                              </span>
                            )}
                            <span className="review-sec">
                              {packName}
                              {ref ? ` • ${ref.sectionTitle}` : ''}
                            </span>
                          </div>

                          <div className="review-item__actions">
                            {stat.lastWrongAt && (
                              <span className="last-wrong-time">
                                Salah terakhir: {formatDateTime(stat.lastWrongAt)}
                              </span>
                            )}
                            {ref && (
                              <>
                                <button
                                  type="button"
                                  className={`mini-action ${isFlagged ? 'is-warn' : ''}`}
                                  onClick={() =>
                                    onToggleQuestionFlag(resolvedPackId, stat.questionId)
                                  }
                                >
                                  <Flag size={13} />{' '}
                                  {isFlagged ? 'Ditandai ⚑' : 'Tandai'}
                                </button>
                                <button
                                  type="button"
                                  className={`mini-action ${
                                    isMastered ? 'is-checked-action' : ''
                                  }`}
                                  onClick={() =>
                                    onToggleQuestionMastered(
                                      resolvedPackId,
                                      stat.questionId
                                    )
                                  }
                                >
                                  {isMastered ? (
                                    <CheckSquare size={13} />
                                  ) : (
                                    <Square size={13} />
                                  )}
                                  {isMastered ? 'Sudah Paham' : 'Checklist'}
                                </button>
                              </>
                            )}
                          </div>
                        </div>

                        {q ? (
                          <>
                            <div className="review-item__question">
                              {renderRichJapaneseText(q.text, settings.showFurigana)}
                            </div>

                            {q.translation && (
                              <div className="review-item__translation">
                                <b>Terjemahan:</b>{' '}
                                {renderRichJapaneseText(
                                  q.translation,
                                  settings.showFurigana
                                )}
                              </div>
                            )}

                            <div className="mistake-answer-compare">
                              {stat.lastWrongAnswerText && (
                                <div className="review-opt is-user-wrong">
                                  <span className="opt-tag is-user-wrong">
                                    Salah Terakhir
                                  </span>
                                  <span className="review-opt__text">
                                    {renderRichJapaneseText(
                                      stat.lastWrongAnswerText,
                                      settings.showFurigana
                                    )}
                                  </span>
                                </div>
                              )}
                              <div className="review-opt is-key">
                                <span className="opt-tag is-key">
                                  Kunci {LETTERS[q.answer] || ''}
                                </span>
                                <span className="review-opt__text">
                                  {renderRichJapaneseText(
                                    q.options[q.answer] || '',
                                    settings.showFurigana
                                  )}
                                </span>
                              </div>
                            </div>

                            {(q.options.length > 0 || q.explanation) && (
                              <div className="mistake-expand-row">
                                <button
                                  type="button"
                                  className="mini-action"
                                  onClick={() =>
                                    setExpandedOptionsMap((prev) => ({
                                      ...prev,
                                      [stat.questionId]: !prev[stat.questionId],
                                    }))
                                  }
                                >
                                  {isExpanded ? (
                                    <>
                                      <ChevronUp size={13} /> Tutup Semua Opsi &amp;
                                      Pembahasan
                                    </>
                                  ) : (
                                    <>
                                      <ChevronDown size={13} /> Lihat Semua Opsi &amp;
                                      Pembahasan
                                    </>
                                  )}
                                </button>
                              </div>
                            )}

                            {isExpanded && (
                              <>
                                <div className="review-options">
                                  {q.options.map((opt, idx) => (
                                    <div
                                      key={idx}
                                      className={`review-opt ${
                                        idx === q.answer ? 'is-key' : ''
                                      }`}
                                    >
                                      <span className="review-opt__letter">
                                        {LETTERS[idx]}
                                      </span>
                                      <span className="review-opt__text">
                                        {renderRichJapaneseText(
                                          opt,
                                          settings.showFurigana
                                        )}
                                      </span>
                                      {idx === q.answer && (
                                        <span className="opt-tag is-key">Kunci</span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                                {q.explanation && (
                                  <div className="review-explanation">
                                    <strong>Pembahasan:</strong>{' '}
                                    {renderRichJapaneseText(
                                      q.explanation,
                                      settings.showFurigana
                                    )}
                                  </div>
                                )}
                              </>
                            )}
                          </>
                        ) : (
                          <p className="review-sec">
                            Soal ID <code>{stat.questionId}</code> berasal dari paket
                            custom yang sudah dihapus/diedit ({stat.wrongCount}x salah).
                          </p>
                        )}
                      </article>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Complete Session Attempt Log */}
            <section className="panel-card history-panel">
              <div className="panel-card__head">
                <div>
                  <h2>Riwayat Lengkap Semua Sesi ({filteredSessions.length})</h2>
                  <span>
                    Catatan lengkap seluruh simulasi CBT maupun mode latihan yang pernah
                    diselesaikan
                  </span>
                </div>

                <div className="btn-row">
                  <div className="filter-group">
                    {(
                      [
                        ['all', 'Semua Mode'],
                        ['exam', 'Simulasi CBT'],
                        ['study', 'Mode Latihan'],
                      ] as const
                    ).map(([m, label]) => (
                      <button
                        key={m}
                        type="button"
                        className={`filter-pill filter-pill--subtle ${
                          sessionModeFilter === m ? 'is-active' : ''
                        }`}
                        onClick={() => setSessionModeFilter(m)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  {history.length > 0 && (
                    <button
                      type="button"
                      className="studio-btn studio-btn--ghost"
                      onClick={() => {
                        if (
                          window.confirm(
                            'Bersihkan riwayat skor sesi? Statistik soal sering salah tetap tersimpan kecuali kamu reset juga.'
                          )
                        ) {
                          onClearAttemptHistory();
                        }
                      }}
                    >
                      <Trash2 size={14} /> Hapus Riwayat Sesi
                    </button>
                  )}
                </div>
              </div>

              {filteredSessions.length === 0 ? (
                <div className="empty-box">Tidak ada riwayat sesi pada filter ini.</div>
              ) : (
                <div className="history-table-wrap">
                  <table className="history-table">
                    <thead>
                      <tr>
                        <th>Tanggal</th>
                        <th>Paket Soal</th>
                        <th>Mode</th>
                        <th>Durasi</th>
                        <th>Skor</th>
                        <th>Salah</th>
                        <th>Status</th>
                        <th>Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSessions.map((item) => {
                        const packObj = packById.get(item.packId) || null;
                        const wrongQs = item.wrongQuestionIds
                          .map((id) => questionRefById.get(id)?.question)
                          .filter((q): q is QuestionItem => Boolean(q));

                        return (
                          <tr key={item.id}>
                            <td>{formatDateTime(item.completedAt)}</td>
                            <td>{item.packName}</td>
                            <td>
                              <span className={`mode-tag is-${item.mode}`}>
                                {item.mode === 'exam' ? 'Simulasi CBT' : 'Latihan'}
                              </span>
                            </td>
                            <td>{formatDuration(item.elapsedSec || 0)}</td>
                            <td>
                              <b>
                                {item.correct}/{item.total}
                              </b>{' '}
                              ({item.pct}%)
                            </td>
                            <td>{item.wrongQuestionIds.length} soal</td>
                            <td>
                              <span
                                className={`status-pill ${
                                  item.passed ? 'is-correct' : 'is-wrong'
                                }`}
                              >
                                {item.passed ? 'Lulus' : 'Belum Lulus'}
                              </span>
                            </td>
                            <td>
                              {wrongQs.length > 0 ? (
                                <button
                                  type="button"
                                  className="mini-action is-warn"
                                  onClick={() =>
                                    onStartDrillQuestions(
                                      packObj,
                                      wrongQs,
                                      `Ulangi Salah (${wrongQs.length} soal)`
                                    )
                                  }
                                >
                                  <RotateCcw size={12} /> Latih Salah ({wrongQs.length})
                                </button>
                              ) : (
                                <span className="review-sec">Sempurna</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
};
