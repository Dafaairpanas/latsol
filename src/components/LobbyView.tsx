import React, { useMemo, useState } from 'react';
import {
  BookOpen,
  CheckSquare,
  Clock,
  Copy,
  Download,
  Edit3,
  FileText,
  Flag,
  Flame,
  History,
  Layers,
  Play,
  Plus,
  RotateCcw,
  Shuffle,
  SlidersHorizontal,
  Square,
  Trash2,
  Trophy,
  X,
  Zap,
} from 'lucide-react';
import {
  AttemptRecord,
  ExamMode,
  ExamPack,
  ExamSessionConfig,
  ExamSettings,
  QuestionItem,
  QuestionStudyState,
  SavedExamDraft,
} from '../types/exam';
import { StudyNotesModal } from './StudyNotesModal';
import { exportPackToBombTxt } from '../utils/bombParser';
import { EMPTY_STUDY_STATE } from '../utils/storage';

interface LobbyViewProps {
  packs: ExamPack[];
  settings: ExamSettings;
  history: AttemptRecord[];
  studyStates: Record<string, QuestionStudyState>;
  drafts: Record<string, SavedExamDraft>;
  onUpdateSettings: (next: ExamSettings) => void;
  onStartSession: (pack: ExamPack, config: ExamSessionConfig) => void;
  onResumeDraft: (pack: ExamPack, draft: SavedExamDraft) => void;
  onDiscardDraft: (packId: string) => void;
  onTogglePackCompleted: (packId: string) => void;
  onOpenStudioCreate: () => void;
  onOpenStudioImport: () => void;
  onEditCustomPack: (pack: ExamPack) => void;
  onDuplicatePackToCustom: (pack: ExamPack) => void;
  onDeleteCustomPack: (packId: string) => void;
  onClearHistory: () => void;
}

type TierKey = 'custom' | 'primary' | 'sprint' | 'language';

interface PackTierGroup {
  key: TierKey;
  badge: string;
  title: string;
  description: string;
  packs: ExamPack[];
}

function downloadFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function getPackQuestionCount(pack: ExamPack): number {
  return pack.sections.reduce((sum, s) => sum + s.questions.length, 0);
}

function formatSavedTime(iso: string): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

export const LobbyView: React.FC<LobbyViewProps> = ({
  packs,
  settings,
  history,
  studyStates,
  drafts,
  onUpdateSettings,
  onStartSession,
  onResumeDraft,
  onDiscardDraft,
  onTogglePackCompleted,
  onOpenStudioCreate,
  onOpenStudioImport,
  onEditCustomPack,
  onDuplicatePackToCustom,
  onDeleteCustomPack,
  onClearHistory,
}) => {
  const [configuringPack, setConfiguringPack] = useState<ExamPack | null>(null);
  const [mode, setMode] = useState<ExamMode>('exam');
  const [selectedSectionIds, setSelectedSectionIds] = useState<string[]>([]);
  const [shuffleQuestions, setShuffleQuestions] = useState(false);
  const [shuffleOptions, setShuffleOptions] = useState(false);
  const [durationMin, setDurationMin] = useState<number>(60);
  const [passingPct, setPassingPct] = useState<number>(65);
  const [notesPack, setNotesPack] = useState<ExamPack | null>(null);

  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'SSW' | 'JFT' | 'Custom'>(
    'ALL'
  );
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'todo' | 'done' | 'flagged' | 'inprogress'
  >('all');

  const totalQuestionsAllPacks = useMemo(
    () => packs.reduce((acc, p) => acc + getPackQuestionCount(p), 0),
    [packs]
  );

  const completedPacksCount = useMemo(
    () => packs.filter((p) => studyStates[p.id]?.completedPack).length,
    [packs, studyStates]
  );

  const totalFlaggedCount = useMemo(
    () =>
      packs.reduce((sum, p) => sum + (studyStates[p.id]?.flaggedIds.length ?? 0), 0),
    [packs, studyStates]
  );

  const filteredPacks = useMemo(() => {
    return packs.filter((p) => {
      if (categoryFilter !== 'ALL' && p.category !== categoryFilter) return false;
      const st = studyStates[p.id] || EMPTY_STUDY_STATE;
      const hasDraft = Boolean(drafts[p.id]);
      if (statusFilter === 'done' && !st.completedPack) return false;
      if (statusFilter === 'todo' && st.completedPack) return false;
      if (statusFilter === 'flagged' && st.flaggedIds.length === 0) return false;
      if (statusFilter === 'inprogress' && !hasDraft) return false;
      return true;
    });
  }, [packs, categoryFilter, statusFilter, studyStates, drafts]);

  const tierGroups = useMemo<PackTierGroup[]>(() => {
    const customList: ExamPack[] = [];
    const primaryList: ExamPack[] = [];
    const sprintList: ExamPack[] = [];
    const languageList: ExamPack[] = [];

    filteredPacks.forEach((p) => {
      const count = getPackQuestionCount(p);
      if (p.source === 'custom') {
        customList.push(p);
      } else if (p.category === 'JFT' || count < 15) {
        languageList.push(p);
      } else if (count >= 60) {
        primaryList.push(p);
      } else {
        sprintList.push(p);
      }
    });

    // Sort primary tier: 145 -> 85 -> 60
    primaryList.sort((a, b) => getPackQuestionCount(b) - getPackQuestionCount(a));

    // Sort sprint tier: 40-soal simulation first, then 20-soal sets cleanly in natural order
    sprintList.sort((a, b) => {
      const diff = getPackQuestionCount(b) - getPackQuestionCount(a);
      if (diff !== 0) return diff;
      return a.name.localeCompare(b.name, undefined, { numeric: true });
    });

    const groups: PackTierGroup[] = [];
    if (customList.length > 0) {
      groups.push({
        key: 'custom',
        badge: 'KOLEKSI SAYA',
        title: 'Paket Soal Custom & Impor Mandiri',
        description:
          'Paket yang kamu buat lewat Editor Visual atau impor dari file Bomb Soal.',
        packs: customList,
      });
    }
    if (primaryList.length > 0) {
      groups.push({
        key: 'primary',
        badge: 'TIER UTAMA • 60–145 SOAL',
        title: 'Bank Soal Utama OTAFF Edisi 5.1 (Materi Lengkap)',
        description:
          'Menyapu 100% poin teks resmi OTAFF v5.1 (P.1–P.69) + hitungan & rambu keselamatan.',
        packs: primaryList,
      });
    }
    if (sprintList.length > 0) {
      groups.push({
        key: 'sprint',
        badge: 'TRYOUT & DRILL • 20–40 SOAL',
        title: 'Tryout Setara Ujian Asli & Latihan Cepat',
        description:
          'Set 40 soal setara jumlah soal ujian asli & paket sprint 20 soal untuk pengulangan cepat.',
        packs: sprintList,
      });
    }
    if (languageList.length > 0) {
      groups.push({
        key: 'language',
        badge: 'BAHASA & JFT-BASIC',
        title: 'Latihan Bahasa Jepang / JFT-Basic & Pemanasan',
        description:
          'Paket 4 pilihan (A–D) dengan terjemahan Your Language untuk latihan bahasa.',
        packs: languageList,
      });
    }
    return groups;
  }, [filteredPacks]);

  const openConfigurator = (pack: ExamPack, defaultMode: ExamMode) => {
    setConfiguringPack(pack);
    setMode(defaultMode);
    setSelectedSectionIds(pack.sections.map((s) => s.id));
    setShuffleQuestions(false);
    setShuffleOptions(false);
    setDurationMin(defaultMode === 'study' ? 0 : Math.round(pack.durationSec / 60));
    setPassingPct(pack.passingPct);
  };

  const selectedQuestionCount = useMemo(() => {
    if (!configuringPack) return 0;
    const set = new Set(selectedSectionIds);
    return configuringPack.sections
      .filter((s) => set.has(s.id))
      .reduce((sum, s) => sum + s.questions.length, 0);
  }, [configuringPack, selectedSectionIds]);

  const getLatestPackAttempt = (packId: string) =>
    history.find((h) => h.packId === packId);

  const getBestPackScore = (packId: string) => {
    const runs = history.filter((h) => h.packId === packId);
    if (runs.length === 0) return null;
    return Math.max(...runs.map((r) => r.pct));
  };

  const handleLaunchWrongDrill = (pack: ExamPack) => {
    const latestWithWrong = history.find(
      (h) => h.packId === pack.id && h.wrongQuestionIds.length > 0
    );
    if (!latestWithWrong) return;
    const wrongIdSet = new Set(latestWithWrong.wrongQuestionIds);
    const wrongQuestions: QuestionItem[] = pack.sections
      .flatMap((s) => s.questions)
      .filter((q) => wrongIdSet.has(q.id));
    if (wrongQuestions.length === 0) return;

    onStartSession(pack, {
      packId: pack.id,
      mode: 'study',
      sectionIds: [],
      shuffleQuestions: false,
      shuffleOptions: false,
      durationSec: 0,
      passingPct: pack.passingPct,
      onlyWrongFromHistory: true,
      customQuestionsOnly: wrongQuestions,
      sessionLabel: `Ulangi Salah (${wrongQuestions.length} soal)`,
    });
  };

  const handleLaunchFlaggedDrill = (pack: ExamPack) => {
    const st = studyStates[pack.id];
    if (!st || st.flaggedIds.length === 0) return;
    const flagSet = new Set(st.flaggedIds);
    const flaggedQs = pack.sections
      .flatMap((s) => s.questions)
      .filter((q) => flagSet.has(q.id));
    if (flaggedQs.length === 0) return;

    onStartSession(pack, {
      packId: pack.id,
      mode: 'study',
      sectionIds: [],
      shuffleQuestions: false,
      shuffleOptions: false,
      durationSec: 0,
      passingPct: pack.passingPct,
      customQuestionsOnly: flaggedQs,
      sessionLabel: `Soal Ditandai ⚑ (${flaggedQs.length} soal)`,
    });
  };

  const handleLaunchUnmasteredDrill = (pack: ExamPack) => {
    const st = studyStates[pack.id];
    const masteredSet = new Set(st?.masteredIds || []);
    const unmasteredQs = pack.sections
      .flatMap((s) => s.questions)
      .filter((q) => !masteredSet.has(q.id));
    if (unmasteredQs.length === 0) return;

    onStartSession(pack, {
      packId: pack.id,
      mode: 'study',
      sectionIds: [],
      shuffleQuestions: false,
      shuffleOptions: false,
      durationSec: 0,
      passingPct: pack.passingPct,
      customQuestionsOnly: unmasteredQs,
      sessionLabel: `Belum Paham (${unmasteredQs.length} soal)`,
    });
  };

  const renderTierIcon = (key: TierKey) => {
    if (key === 'primary') return <Flame size={18} />;
    if (key === 'sprint') return <Zap size={18} />;
    if (key === 'custom') return <Edit3 size={18} />;
    return <Layers size={18} />;
  };

  return (
    <div className="page-shell">
      {/* Top Navigation */}
      <header className="lobby-header">
        <div className="lobby-header__inner">
          <div className="brand">
            <div className="brand__badge">CBT</div>
            <div>
              <h1>SSW &amp; JFT Practice Studio</h1>
              <p>Simulator Prometric CBT + Pembuat Bank Soal Mandiri</p>
            </div>
          </div>

          <div className="lobby-header__actions">
            <label className="candidate-chip">
              <span>Peserta:</span>
              <input
                type="text"
                value={settings.candidateName}
                onChange={(e) =>
                  onUpdateSettings({ ...settings, candidateName: e.target.value })
                }
                placeholder="Nama Peserta"
              />
            </label>
            <button
              type="button"
              className="studio-btn studio-btn--ghost"
              onClick={onOpenStudioImport}
            >
              <FileText size={16} /> Impor Bomb Soal (.txt)
            </button>
            <button
              type="button"
              className="studio-btn studio-btn--primary"
              onClick={onOpenStudioCreate}
            >
              <Plus size={16} /> Buat Paket Soal Baru
            </button>
          </div>
        </div>
      </header>

      <main className="lobby-main">
        {/* Overview Hero Strip */}
        <section className="hero-strip">
          <div className="hero-strip__stat">
            <CheckSquare size={20} />
            <div>
              <strong>
                Checklist: {completedPacksCount} / {packs.length} Paket
              </strong>
              <span>{totalQuestionsAllPacks} total soal tersimpan permanen</span>
            </div>
          </div>
          <div className="hero-strip__stat">
            <Flag size={20} />
            <div>
              <strong>{totalFlaggedCount} Soal Ditandai ⚑</strong>
              <span>Aman walau reload atau dibuka besok</span>
            </div>
          </div>
          <div className="hero-strip__stat">
            <History size={20} />
            <div>
              <strong>{history.length} Riwayat Sesi</strong>
              <span>Skor &amp; progres tersimpan otomatis</span>
            </div>
          </div>
          <div className="hero-strip__furigana">
            <label>
              <input
                type="checkbox"
                checked={settings.showFurigana}
                onChange={(e) =>
                  onUpdateSettings({ ...settings, showFurigana: e.target.checked })
                }
              />
              <span>Tampilkan Furigana (あ)</span>
            </label>
          </div>
        </section>

        {/* Category & Checklist Status Filter Bar */}
        <div className="lobby-toolbar">
          <div className="filter-group">
            {(
              [
                ['ALL', 'Semua Paket'],
                ['SSW', 'SSW / Tokutei Ginou'],
                ['JFT', 'JFT-Basic'],
                ['Custom', 'Paket Custom'],
              ] as const
            ).map(([cat, label]) => (
              <button
                key={cat}
                type="button"
                className={`filter-pill ${categoryFilter === cat ? 'is-active' : ''}`}
                onClick={() => setCategoryFilter(cat)}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="filter-group">
            {(
              [
                ['all', 'Semua Status'],
                ['todo', 'Belum Selesai'],
                ['done', 'Selesai ☑'],
                ['flagged', 'Ada Ditandai ⚑'],
                ['inprogress', 'Lanjut Sesi ▶'],
              ] as const
            ).map(([st, label]) => (
              <button
                key={st}
                type="button"
                className={`filter-pill filter-pill--subtle ${
                  statusFilter === st ? 'is-active' : ''
                }`}
                onClick={() => setStatusFilter(st)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Tiered Pack Sections */}
        {tierGroups.length === 0 ? (
          <section className="panel-card empty-box">
            <p>Tidak ada paket soal yang cocok dengan filter status/kategori ini.</p>
            <button
              type="button"
              className="studio-btn studio-btn--ghost"
              onClick={() => {
                setCategoryFilter('ALL');
                setStatusFilter('all');
              }}
            >
              Reset Filter
            </button>
          </section>
        ) : (
          tierGroups.map((tier) => {
            const tierDone = tier.packs.filter(
              (p) => studyStates[p.id]?.completedPack
            ).length;
            const tierQuestions = tier.packs.reduce(
              (sum, p) => sum + getPackQuestionCount(p),
              0
            );

            return (
              <section key={tier.key} className={`tier-section tier-${tier.key}`}>
                <div className="tier-divider">
                  <div className="tier-divider__left">
                    <span className="tier-icon">{renderTierIcon(tier.key)}</span>
                    <div>
                      <div className="tier-divider__badges">
                        <span className="tier-badge">{tier.badge}</span>
                        <span className="tier-meta-pill">
                          {tier.packs.length} Paket • {tierQuestions} Soal
                        </span>
                        <span
                          className={`tier-progress-pill ${
                            tierDone === tier.packs.length ? 'is-complete' : ''
                          }`}
                        >
                          ☑ {tierDone}/{tier.packs.length} Selesai
                        </span>
                      </div>
                      <h2 className="tier-divider__title">{tier.title}</h2>
                      <p className="tier-divider__desc">{tier.description}</p>
                    </div>
                  </div>
                </div>

                <div className="packs-grid">
                  {tier.packs.map((pack) => {
                    const qCount = getPackQuestionCount(pack);
                    const bestScore = getBestPackScore(pack.id);
                    const latestRun = getLatestPackAttempt(pack.id);
                    const hasWrong = latestRun && latestRun.wrongQuestionIds.length > 0;
                    const st = studyStates[pack.id] || EMPTY_STUDY_STATE;
                    const draft = drafts[pack.id];

                    const validQIds = new Set(
                      pack.sections.flatMap((s) => s.questions.map((q) => q.id))
                    );
                    const flaggedCount = st.flaggedIds.filter((id) =>
                      validQIds.has(id)
                    ).length;
                    const masteredCount = st.masteredIds.filter((id) =>
                      validQIds.has(id)
                    ).length;
                    const unmasteredCount = Math.max(0, qCount - masteredCount);
                    const masteredPct = qCount
                      ? Math.round((masteredCount / qCount) * 100)
                      : 0;
                    const draftAnswered = draft ? Object.keys(draft.answers).length : 0;
                    const draftTotal = draft
                      ? draft.sectionsLayout.reduce(
                          (sum, s) => sum + s.questions.length,
                          0
                        )
                      : 0;

                    return (
                      <article
                        key={pack.id}
                        className={`pack-card ${st.completedPack ? 'is-completed' : ''} ${
                          qCount >= 60 ? 'is-major-pack' : ''
                        }`}
                      >
                        <div className="pack-card__head">
                          <div className="pack-badges">
                            <span
                              className={`cat-badge cat-${pack.category.toLowerCase()}`}
                            >
                              {pack.category}
                            </span>
                            <span
                              className={`size-badge ${
                                qCount >= 60
                                  ? 'is-large'
                                  : qCount >= 35
                                    ? 'is-medium'
                                    : 'is-small'
                              }`}
                            >
                              {qCount} Soal
                            </span>
                            <span className="source-badge">
                              {pack.source === 'builtin'
                                ? pack.sourceFile || 'Bawaan'
                                : 'Koleksi Saya'}
                            </span>
                          </div>

                          <button
                            type="button"
                            className={`pack-check-btn ${
                              st.completedPack ? 'is-checked' : ''
                            }`}
                            onClick={() => onTogglePackCompleted(pack.id)}
                            title="Tandai paket ini sudah selesai dipelajari (tersimpan permanen)"
                          >
                            {st.completedPack ? (
                              <CheckSquare size={15} />
                            ) : (
                              <Square size={15} />
                            )}
                            <span>{st.completedPack ? 'Selesai' : 'Checklist'}</span>
                          </button>
                        </div>

                        <h3 className="pack-card__title">{pack.name}</h3>
                        {pack.subtitle && (
                          <p className="pack-card__subtitle">{pack.subtitle}</p>
                        )}

                        <div className="pack-meta">
                          <span>{pack.sections.length} Bagian</span>
                          <span>•</span>
                          <span>{Math.round(pack.durationSec / 60)} Menit</span>
                          <span>•</span>
                          <span>Lulus {pack.passingPct}%</span>
                          {bestScore !== null && (
                            <>
                              <span>•</span>
                              <span className="best-inline">
                                <Trophy size={12} /> Terbaik {bestScore}%
                              </span>
                            </>
                          )}
                        </div>

                        {/* Persistent Study Progress & Bookmarks */}
                        {(masteredCount > 0 || flaggedCount > 0 || draft) && (
                          <div className="pack-study-strip">
                            <div className="pack-study-strip__row">
                              <span>
                                ☑ Paham: <b>{masteredCount}</b>/{qCount} ({masteredPct}%)
                              </span>
                              <span>
                                ⚑ Ditandai: <b>{flaggedCount}</b>
                              </span>
                            </div>
                            {masteredCount > 0 && (
                              <div className="pack-study-bar">
                                <div style={{ width: `${masteredPct}%` }} />
                              </div>
                            )}
                            {draft && (
                              <div className="pack-draft-banner">
                                <span>
                                  💾 Sesi tersimpan ({draftAnswered}/{draftTotal} dijawab •{' '}
                                  {formatSavedTime(draft.savedAt)})
                                </span>
                                <button
                                  type="button"
                                  className="pack-draft-clear"
                                  onClick={() => onDiscardDraft(pack.id)}
                                  title="Hapus sesi tersimpan"
                                >
                                  Reset
                                </button>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Chapter preview pills */}
                        <div className="pack-chapters">
                          {pack.sections.slice(0, 3).map((s) => (
                            <span key={s.id} className="chapter-mini">
                              {s.shortLabel}. {s.title} ({s.questions.length})
                            </span>
                          ))}
                          {pack.sections.length > 3 && (
                            <span className="chapter-mini is-more">
                              +{pack.sections.length - 3} bab lainnya
                            </span>
                          )}
                        </div>

                        <div className="pack-card__primary">
                          {draft ? (
                            <>
                              <button
                                type="button"
                                className="studio-btn studio-btn--primary"
                                onClick={() => onResumeDraft(pack, draft)}
                              >
                                <Play size={15} /> Lanjutkan ({draftAnswered}/{draftTotal})
                              </button>
                              <button
                                type="button"
                                className="studio-btn studio-btn--accent"
                                onClick={() => openConfigurator(pack, 'study')}
                              >
                                <BookOpen size={15} /> Sesi Baru
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                className="studio-btn studio-btn--primary"
                                onClick={() => openConfigurator(pack, 'exam')}
                              >
                                <Play size={15} /> Simulasi CBT
                              </button>
                              <button
                                type="button"
                                className="studio-btn studio-btn--accent"
                                onClick={() => openConfigurator(pack, 'study')}
                              >
                                <BookOpen size={15} /> Mode Latihan
                              </button>
                            </>
                          )}
                        </div>

                        <div className="pack-card__secondary">
                          {flaggedCount > 0 && (
                            <button
                              type="button"
                              className="mini-action is-warn"
                              onClick={() => handleLaunchFlaggedDrill(pack)}
                            >
                              <Flag size={13} /> Latih Ditandai ({flaggedCount})
                            </button>
                          )}
                          {masteredCount > 0 && unmasteredCount > 0 && (
                            <button
                              type="button"
                              className="mini-action is-checked-action"
                              onClick={() => handleLaunchUnmasteredDrill(pack)}
                            >
                              <Square size={13} /> Belum Paham ({unmasteredCount})
                            </button>
                          )}
                          {hasWrong && (
                            <button
                              type="button"
                              className="mini-action is-warn"
                              onClick={() => handleLaunchWrongDrill(pack)}
                            >
                              <RotateCcw size={13} /> Ulangi Salah (
                              {latestRun.wrongQuestionIds.length})
                            </button>
                          )}
                          {pack.studyNotes && (
                            <button
                              type="button"
                              className="mini-action"
                              onClick={() => setNotesPack(pack)}
                            >
                              <FileText size={13} /> Peta Cepat
                            </button>
                          )}
                          {pack.source === 'custom' ? (
                            <button
                              type="button"
                              className="mini-action"
                              onClick={() => onEditCustomPack(pack)}
                            >
                              <Edit3 size={13} /> Edit
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="mini-action"
                              onClick={() => onDuplicatePackToCustom(pack)}
                              title="Salin ke koleksi saya agar bisa diedit bebas"
                            >
                              <Copy size={13} /> Duplikat
                            </button>
                          )}
                          <button
                            type="button"
                            className="mini-action"
                            onClick={() =>
                              downloadFile(
                                `${pack.id}.txt`,
                                exportPackToBombTxt(pack),
                                'text/plain;charset=utf-8'
                              )
                            }
                            title="Unduh sebagai file Bomb Soal (.txt)"
                          >
                            <Download size={13} /> .txt
                          </button>
                          <button
                            type="button"
                            className="mini-action"
                            onClick={() =>
                              downloadFile(
                                `${pack.id}.json`,
                                JSON.stringify(pack, null, 2),
                                'application/json'
                              )
                            }
                            title="Unduh sebagai .json untuk folder packs/"
                          >
                            <Download size={13} /> .json
                          </button>
                          {pack.source === 'custom' && (
                            <button
                              type="button"
                              className="mini-action is-danger"
                              onClick={() => {
                                if (
                                  window.confirm(
                                    `Hapus paket "${pack.name}" dari koleksi?`
                                  )
                                ) {
                                  onDeleteCustomPack(pack.id);
                                }
                              }}
                            >
                              <Trash2 size={13} /> Hapus
                            </button>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            );
          })
        )}

        {/* Attempt History */}
        {history.length > 0 && (
          <section className="panel-card history-panel">
            <div className="panel-card__head">
              <div>
                <h2>Riwayat Latihan &amp; Simulasi Terakhir</h2>
                <span>Pantau perkembangan skormu di tiap percobaan</span>
              </div>
              <button
                type="button"
                className="studio-btn studio-btn--ghost"
                onClick={() => {
                  if (window.confirm('Bersihkan semua riwayat skor?')) {
                    onClearHistory();
                  }
                }}
              >
                Bersihkan Riwayat
              </button>
            </div>
            <div className="history-table-wrap">
              <table className="history-table">
                <thead>
                  <tr>
                    <th>Tanggal</th>
                    <th>Paket Soal</th>
                    <th>Mode</th>
                    <th>Skor</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {history.slice(0, 12).map((item) => (
                    <tr key={item.id}>
                      <td>
                        {new Date(item.completedAt).toLocaleString('id-ID', {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })}
                      </td>
                      <td>{item.packName}</td>
                      <td>
                        <span className={`mode-tag is-${item.mode}`}>
                          {item.mode === 'exam' ? 'Simulasi CBT' : 'Latihan'}
                        </span>
                      </td>
                      <td>
                        <b>
                          {item.correct}/{item.total}
                        </b>{' '}
                        ({item.pct}%)
                      </td>
                      <td>
                        <span
                          className={`status-pill ${item.passed ? 'is-correct' : 'is-wrong'}`}
                        >
                          {item.passed ? 'Lulus' : 'Belum Lulus'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>

      {/* Session Configurator Modal */}
      {configuringPack && (
        <div
          className="modal-backdrop"
          onClick={() => setConfiguringPack(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="modal-panel modal-panel--wide"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div className="modal-title-row">
                <SlidersHorizontal size={18} />
                <h3>Konfigurasi Sesi — {configuringPack.name}</h3>
              </div>
              <button
                className="modal-close"
                onClick={() => setConfiguringPack(null)}
                aria-label="Tutup"
              >
                <X size={20} />
              </button>
            </div>

            <div className="modal-body config-body">
              <div className="config-mode-grid">
                <button
                  type="button"
                  className={`mode-card ${mode === 'exam' ? 'is-active' : ''}`}
                  onClick={() => {
                    setMode('exam');
                    setDurationMin(Math.round(configuringPack.durationSec / 60));
                  }}
                >
                  <strong>Simulasi Ujian CBT</strong>
                  <small>
                    Tampilan Prometric asli dengan timer mundur. Kunci &amp; pembahasan
                    dibuka setelah klik Finish.
                  </small>
                </button>
                <button
                  type="button"
                  className={`mode-card ${mode === 'study' ? 'is-active' : ''}`}
                  onClick={() => {
                    setMode('study');
                    setDurationMin(0);
                  }}
                >
                  <strong>Mode Latihan / Belajar</strong>
                  <small>
                    Pembahasan langsung tampil setelah memilih jawaban, bebas waktu atau
                    pakai target waktu.
                  </small>
                </button>
              </div>

              <div className="config-section">
                <div className="config-section__head">
                  <strong>
                    Pilih Bagian / Bab ({selectedQuestionCount} soal dipilih)
                  </strong>
                  <div className="config-section__links">
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedSectionIds(
                          configuringPack.sections.map((s) => s.id)
                        )
                      }
                    >
                      Pilih Semua
                    </button>
                    <button type="button" onClick={() => setSelectedSectionIds([])}>
                      Kosongkan
                    </button>
                  </div>
                </div>
                <div className="chapter-checklist">
                  {configuringPack.sections.map((sec) => {
                    const checked = selectedSectionIds.includes(sec.id);
                    return (
                      <label
                        key={sec.id}
                        className={`chapter-check ${checked ? 'is-checked' : ''}`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedSectionIds((prev) => [...prev, sec.id]);
                            } else {
                              setSelectedSectionIds((prev) =>
                                prev.filter((id) => id !== sec.id)
                              );
                            }
                          }}
                        />
                        <span className="chapter-chip">{sec.shortLabel}</span>
                        <span className="chapter-check__title">{sec.title}</span>
                        <span className="chapter-check__count">
                          {sec.questions.length} soal
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="config-options-row">
                <label className="setting-toggle">
                  <div>
                    <strong>
                      <Shuffle size={14} /> Acak Urutan Soal
                    </strong>
                    <small>Mengacak urutan soal di dalam setiap bab</small>
                  </div>
                  <input
                    type="checkbox"
                    checked={shuffleQuestions}
                    onChange={(e) => setShuffleQuestions(e.target.checked)}
                  />
                </label>

                <label className="setting-toggle">
                  <div>
                    <strong>
                      <Shuffle size={14} /> Acak Posisi Opsi (A/B/C/D)
                    </strong>
                    <small>Agar tidak menghafal posisi huruf jawaban</small>
                  </div>
                  <input
                    type="checkbox"
                    checked={shuffleOptions}
                    onChange={(e) => setShuffleOptions(e.target.checked)}
                  />
                </label>
              </div>

              <div className="config-numbers-row">
                <label className="setting-field">
                  <span>
                    <Clock size={14} /> Batas Waktu (menit, 0 = tanpa timer)
                  </span>
                  <input
                    type="number"
                    min={0}
                    max={240}
                    value={durationMin}
                    onChange={(e) =>
                      setDurationMin(Math.max(0, Number(e.target.value) || 0))
                    }
                  />
                </label>

                <label className="setting-field">
                  <span>Target Lulus (%)</span>
                  <input
                    type="number"
                    min={10}
                    max={100}
                    value={passingPct}
                    onChange={(e) =>
                      setPassingPct(
                        Math.min(100, Math.max(10, Number(e.target.value) || 65))
                      )
                    }
                  />
                </label>
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="studio-btn studio-btn--ghost"
                onClick={() => setConfiguringPack(null)}
              >
                Batal
              </button>
              <button
                type="button"
                className="studio-btn studio-btn--primary"
                disabled={selectedQuestionCount === 0}
                onClick={() => {
                  const chosen = configuringPack;
                  setConfiguringPack(null);
                  onStartSession(chosen, {
                    packId: chosen.id,
                    mode,
                    sectionIds: selectedSectionIds,
                    shuffleQuestions,
                    shuffleOptions,
                    durationSec: durationMin * 60,
                    passingPct,
                  });
                }}
              >
                <Play size={16} /> Mulai Sekarang ({selectedQuestionCount} Soal)
              </button>
            </div>
          </div>
        </div>
      )}

      {notesPack && notesPack.studyNotes && (
        <StudyNotesModal
          title={notesPack.name}
          notes={notesPack.studyNotes}
          showFurigana={settings.showFurigana}
          onClose={() => setNotesPack(null)}
        />
      )}
    </div>
  );
};
