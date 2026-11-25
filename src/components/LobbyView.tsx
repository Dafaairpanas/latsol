import React, { useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  Check,
  CheckSquare,
  Clock,
  Copy,
  Download,
  Edit3,
  FileText,
  Flag,
  History,
  Play,
  Plus,
  RotateCcw,
  Shuffle,
  SlidersHorizontal,
  Square,
  Trash2,
  Trophy,
  X,
} from 'lucide-react';
import {
  AttemptRecord,
  ExamMode,
  ExamPack,
  ExamSessionConfig,
  ExamSettings,
  QuestionAttemptStat,
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
  questionStats: Record<string, QuestionAttemptStat>;
  studyStates: Record<string, QuestionStudyState>;
  drafts: Record<string, SavedExamDraft>;
  onUpdateSettings: (next: ExamSettings) => void;
  onStartSession: (pack: ExamPack, config: ExamSessionConfig) => void;
  onResumeDraft: (pack: ExamPack, draft: SavedExamDraft) => void;
  onDiscardDraft: (packId: string) => void;
  onTogglePackCompleted: (packId: string) => void;
  onOpenHistory: () => void;
  onOpenStudioCreate: () => void;
  onOpenStudioImport: () => void;
  onEditCustomPack: (pack: ExamPack) => void;
  onDuplicatePackToCustom: (pack: ExamPack) => void;
  onDeleteCustomPack: (packId: string) => void;
  onClearHistory: () => void;
}

type TierKey = 'custom' | 'otaff_sim' | 'recall_sim' | 'marathon' | 'language';

interface PackTierGroup {
  key: TierKey;
  indexLabel: string;
  tag: string;
  title: string;
  description: string;
  layout: 'featured' | 'compact' | 'ledger';
  packs: ExamPack[];
}

interface ParsedPackTitle {
  series: string | null;
  title: string;
  fullTitle: string;
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

/** Normalize pack titles cleanly for Dashboard typography without em-dashes. */
function formatPackHeading(rawName: string): ParsedPackTitle {
  const cleanFull = rawName.replace(/\s*\u2014\s*/g, ': ').trim();
  const dashSplit = rawName.split(/\s+\u2014\s+/);
  if (dashSplit.length >= 2) {
    return {
      series: dashSplit[0].trim(),
      title: dashSplit.slice(1).join(': ').trim(),
      fullTitle: cleanFull,
    };
  }
  return {
    series: null,
    title: cleanFull,
    fullTitle: cleanFull,
  };
}

export const LobbyView: React.FC<LobbyViewProps> = ({
  packs,
  settings,
  history,
  questionStats,
  studyStates,
  drafts,
  onUpdateSettings,
  onStartSession,
  onResumeDraft,
  onDiscardDraft,
  onTogglePackCompleted,
  onOpenHistory,
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

  useEffect(() => {
    if (!configuringPack) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setConfiguringPack(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [configuringPack]);

  const totalQuestionsAllPacks = useMemo(
    () => packs.reduce((acc, p) => acc + getPackQuestionCount(p), 0),
    [packs]
  );

  const completedPacksCount = useMemo(
    () => packs.filter((p) => studyStates[p.id]?.completedPack).length,
    [packs, studyStates]
  );

  const completionPct = useMemo(
    () => (packs.length > 0 ? Math.round((completedPacksCount / packs.length) * 100) : 0),
    [packs.length, completedPacksCount]
  );

  const totalFlaggedCount = useMemo(
    () =>
      packs.reduce((sum, p) => sum + (studyStates[p.id]?.flaggedIds.length ?? 0), 0),
    [packs, studyStates]
  );

  const trackedMistakeCount = useMemo(
    () => Object.values(questionStats).filter((s) => s.wrongCount > 0).length,
    [questionStats]
  );

  const latestSavedDraftEntry = useMemo(() => {
    const entries = Object.values(drafts);
    if (entries.length === 0) return null;
    const sorted = [...entries].sort(
      (a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()
    );
    for (const draft of sorted) {
      const targetPack = packs.find((p) => p.id === draft.packId);
      if (targetPack) {
        return { pack: targetPack, draft };
      }
    }
    return null;
  }, [drafts, packs]);

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
    const otaffSimList: ExamPack[] = [];
    const recallSimList: ExamPack[] = [];
    const marathonList: ExamPack[] = [];
    const languageList: ExamPack[] = [];

    filteredPacks.forEach((p) => {
      const count = getPackQuestionCount(p);
      if (p.source === 'custom') {
        customList.push(p);
      } else if (p.category === 'JFT' || count < 15) {
        languageList.push(p);
      } else if (p.id.startsWith('builtin-sim-otaff-')) {
        otaffSimList.push(p);
      } else if (count >= 60) {
        marathonList.push(p);
      } else {
        recallSimList.push(p);
      }
    });

    otaffSimList.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
    recallSimList.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    marathonList.sort((a, b) => getPackQuestionCount(b) - getPackQuestionCount(a));

    const groups: PackTierGroup[] = [];
    if (customList.length > 0) {
      groups.push({
        key: 'custom',
        indexLabel: '00',
        tag: 'KOLEKSI MANDIRI',
        title: 'Paket Soal Custom & Impor',
        description: 'Paket buatan sendiri dari Editor Visual atau hasil impor berkas.',
        layout: 'compact',
        packs: customList,
      });
    }
    if (otaffSimList.length > 0) {
      groups.push({
        key: 'otaff_sim',
        indexLabel: '01',
        tag: 'PRIORITAS UTAMA',
        title: 'Simulasi Materi Resmi OTAFF Edisi 5.1',
        description:
          '145 soal resmi OTAFF v5.1 dibagi menjadi 4 deck tematik berdurasi setara ujian.',
        layout: 'featured',
        packs: otaffSimList,
      });
    }
    if (recallSimList.length > 0) {
      groups.push({
        key: 'recall_sim',
        indexLabel: '02',
        tag: 'TRYOUT RECALL CBT',
        title: 'Tryout Recall v5.1 (40 Soal per Deck)',
        description:
          'Latihan soal recall yang telah diselaraskan ke kunci OTAFF v5.1 untuk tempo cepat.',
        layout: 'compact',
        packs: recallSimList,
      });
    }
    if (marathonList.length > 0) {
      groups.push({
        key: 'marathon',
        indexLabel: '03',
        tag: 'ARSIP MARATHON',
        title: 'Bank Soal Gabungan Utuh (60 hingga 145 Soal)',
        description: 'Versi gabungan penuh Bomb Soal 1 dan 2 untuk latihan ketahanan.',
        layout: 'ledger',
        packs: marathonList,
      });
    }
    if (languageList.length > 0) {
      groups.push({
        key: 'language',
        indexLabel: '04',
        tag: 'JFT-BASIC & BAHASA',
        title: 'Latihan Bahasa Jepang / JFT-Basic',
        description: 'Paket soal pilihan ganda 4 opsi untuk dasar kosakata dan bacaan.',
        layout: 'ledger',
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
      sessionLabel: `Soal Ditandai (${flaggedQs.length} soal)`,
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

  const renderPackSecondaryActions = (pack: ExamPack, flaggedCount: number, masteredCount: number, unmasteredCount: number, hasWrong: boolean, latestRun: AttemptRecord | undefined) => (
    <div className="dash-card__tools">
      {flaggedCount > 0 && (
        <button
          type="button"
          className="dash-mini-btn is-accent"
          onClick={() => handleLaunchFlaggedDrill(pack)}
        >
          <Flag size={13} strokeWidth={1.8} aria-hidden="true" />
          <span>Ditandai ({flaggedCount})</span>
        </button>
      )}
      {masteredCount > 0 && unmasteredCount > 0 && (
        <button
          type="button"
          className="dash-mini-btn is-done"
          onClick={() => handleLaunchUnmasteredDrill(pack)}
        >
          <span>Belum Paham ({unmasteredCount})</span>
        </button>
      )}
      {hasWrong && latestRun && (
        <button
          type="button"
          className="dash-mini-btn is-accent"
          onClick={() => handleLaunchWrongDrill(pack)}
        >
          <RotateCcw size={13} strokeWidth={1.8} aria-hidden="true" />
          <span>Ulangi Salah ({latestRun.wrongQuestionIds.length})</span>
        </button>
      )}
      {pack.studyNotes && (
        <button
          type="button"
          className="dash-mini-btn"
          onClick={() => setNotesPack(pack)}
        >
          <FileText size={13} strokeWidth={1.8} aria-hidden="true" />
          <span>Peta Cepat</span>
        </button>
      )}
      {pack.source === 'custom' ? (
        <button
          type="button"
          className="dash-mini-btn"
          onClick={() => onEditCustomPack(pack)}
        >
          <Edit3 size={13} strokeWidth={1.8} aria-hidden="true" />
          <span>Edit</span>
        </button>
      ) : (
        <button
          type="button"
          className="dash-mini-btn"
          onClick={() => onDuplicatePackToCustom(pack)}
          title="Salin ke koleksi saya agar bisa diedit"
        >
          <Copy size={13} strokeWidth={1.8} aria-hidden="true" />
          <span>Duplikat</span>
        </button>
      )}
      <button
        type="button"
        className="dash-mini-btn"
        onClick={() =>
          downloadFile(
            `${pack.id}.txt`,
            exportPackToBombTxt(pack),
            'text/plain;charset=utf-8'
          )
        }
        title="Unduh sebagai berkas Bomb Soal (.txt)"
      >
        <Download size={13} strokeWidth={1.8} aria-hidden="true" />
        <span>.txt</span>
      </button>
      <button
        type="button"
        className="dash-mini-btn"
        onClick={() =>
          downloadFile(
            `${pack.id}.json`,
            JSON.stringify(pack, null, 2),
            'application/json'
          )
        }
        title="Unduh sebagai berkas .json"
      >
        <Download size={13} strokeWidth={1.8} aria-hidden="true" />
        <span>.json</span>
      </button>
      {pack.source === 'custom' && (
        <button
          type="button"
          className="dash-mini-btn is-danger"
          onClick={() => {
            if (window.confirm(`Hapus paket "${pack.name}" dari koleksi?`)) {
              onDeleteCustomPack(pack.id);
            }
          }}
        >
          <Trash2 size={13} strokeWidth={1.8} aria-hidden="true" />
          <span>Hapus</span>
        </button>
      )}
    </div>
  );

  return (
    <div className="dash-shell">
      <a href="#dash-decks" className="dash-skip-link">
        Langsung ke daftar paket soal
      </a>

      {/* Top Navigation Header */}
      <header className="dash-header">
        <div className="dash-header__inner">
          <div className="dash-brand">
            <div className="dash-brand__mark" aria-hidden="true">
              SSW
            </div>
            <div className="dash-brand__text">
              <strong className="dash-brand__name">SSW &amp; JFT Practice Studio</strong>
              <span className="dash-brand__sub">
                Simulator Prometric CBT dan Manajemen Bank Soal
              </span>
            </div>
          </div>

          <div className="dash-header__controls">
            <div className="dash-candidate-box">
              <label htmlFor="dash-candidate-input">Peserta</label>
              <input
                id="dash-candidate-input"
                type="text"
                value={settings.candidateName}
                onChange={(e) =>
                  onUpdateSettings({ ...settings, candidateName: e.target.value })
                }
                placeholder="Nama Peserta"
              />
            </div>

            <nav className="dash-header__nav" aria-label="Navigasi Utama Studio">
              <button
                type="button"
                className="dash-nav-btn"
                onClick={onOpenHistory}
              >
                <History size={15} strokeWidth={1.8} aria-hidden="true" />
                <span>Riwayat &amp; Analisa</span>
                {trackedMistakeCount > 0 && (
                  <span
                    className="dash-nav-count"
                    aria-label={`${trackedMistakeCount} soal perlu diulang`}
                  >
                    {trackedMistakeCount}
                  </span>
                )}
              </button>
              <button
                type="button"
                className="dash-nav-btn"
                onClick={onOpenStudioImport}
              >
                <FileText size={15} strokeWidth={1.8} aria-hidden="true" />
                <span>Impor (.txt)</span>
              </button>
              <button
                type="button"
                className="dash-nav-btn is-primary"
                onClick={onOpenStudioCreate}
              >
                <Plus size={15} strokeWidth={2} aria-hidden="true" />
                <span>Buat Paket</span>
              </button>
            </nav>
          </div>
        </div>
      </header>

      <main className="dash-main">
        {/* Asymmetric Study Workbench Band */}
        <section className="dash-workbench" aria-labelledby="dash-title">
          <div className="dash-focus-pane">
            <div className="dash-focus-pane__head">
              <h1 id="dash-title" className="dash-title">
                Pilih Deck Simulasi dan Pantau Kesiapan Ujian
              </h1>
              <p className="dash-subtitle">
                Setiap deck OTAFF Edisi 5.1 berisi 34 sampai 40 soal agar simulasi tetap ringkas.
                Penanda soal dan checklist tersimpan di peramban ini.
              </p>
            </div>

            <div className="dash-focus-actions">
              {latestSavedDraftEntry ? (
                <div className="dash-resume-callout">
                  <div className="dash-resume-callout__meta">
                    <span className="dash-callout-tag">Sesi Aktif Tersimpan</span>
                    <strong>{formatPackHeading(latestSavedDraftEntry.pack.name).fullTitle}</strong>
                    <span>
                      {Object.keys(latestSavedDraftEntry.draft.answers).length} /{' '}
                      {latestSavedDraftEntry.draft.sectionsLayout.reduce(
                        (s, sec) => s + sec.questions.length,
                        0
                      )}{' '}
                      soal terjawab · Disimpan{' '}
                      {formatSavedTime(latestSavedDraftEntry.draft.savedAt)}
                    </span>
                  </div>
                  <div className="dash-resume-callout__btns">
                    <button
                      type="button"
                      className="dash-btn dash-btn--primary"
                      onClick={() =>
                        onResumeDraft(latestSavedDraftEntry.pack, latestSavedDraftEntry.draft)
                      }
                    >
                      <Play size={15} strokeWidth={2} aria-hidden="true" />
                      <span>Lanjutkan Sesi</span>
                    </button>
                    <button
                      type="button"
                      className="dash-btn dash-btn--outline"
                      onClick={() => onDiscardDraft(latestSavedDraftEntry.pack.id)}
                    >
                      Reset
                    </button>
                  </div>
                </div>
              ) : (
                <div className="dash-callout-idle">
                  {history.length === 0 ? (
                    <p>
                      Belum ada riwayat simulasi. Mulai dari Deck 1 OTAFF v5.1 untuk mengukur
                      baseline nilai awal (target lulus 65%).
                    </p>
                  ) : (
                    <p>
                      Tercatat <strong>{history.length} sesi</strong> latihan dengan{' '}
                      <strong>{trackedMistakeCount} soal</strong> yang masih perlu diulang.
                    </p>
                  )}
                  <button
                    type="button"
                    className="dash-btn dash-btn--outline"
                    onClick={onOpenHistory}
                  >
                    <History size={15} strokeWidth={1.8} aria-hidden="true" />
                    <span>Buka Riwayat &amp; Analisa Salah</span>
                  </button>
                </div>
              )}

              <div className="dash-furigana-row">
                <label className="dash-toggle-label" htmlFor="dash-furigana-toggle">
                  <input
                    id="dash-furigana-toggle"
                    type="checkbox"
                    checked={settings.showFurigana}
                    onChange={(e) =>
                      onUpdateSettings({ ...settings, showFurigana: e.target.checked })
                    }
                  />
                  <span>Tampilkan Furigana (cara baca kanji) di soal dan pembahasan</span>
                </label>
              </div>
            </div>
          </div>

          <aside className="dash-readiness-pane" aria-label="Ringkasan Kesiapan Deck">
            <div className="dash-readiness__head">
              <h2>Progres Koleksi</h2>
              <span className="dash-mono-stat">
                {completedPacksCount}/{packs.length} deck ({completionPct}%)
              </span>
            </div>

            <div className="dash-meter" aria-hidden="true">
              <div className="dash-meter__fill" style={{ width: `${completionPct}%` }} />
            </div>

            <dl className="dash-stat-table">
              <div className="dash-stat-row">
                <dt>Total Bank Soal</dt>
                <dd className="dash-mono-stat">{totalQuestionsAllPacks} soal</dd>
              </div>
              <div className="dash-stat-row">
                <dt>Soal Ditandai</dt>
                <dd className="dash-mono-stat is-accent">{totalFlaggedCount} ditandai</dd>
              </div>
              <div className="dash-stat-row">
                <dt>Soal Sering Salah</dt>
                <dd className="dash-mono-stat is-accent">{trackedMistakeCount} butir</dd>
              </div>
              <div className="dash-stat-row">
                <dt>Total Riwayat Sesi</dt>
                <dd className="dash-mono-stat">{history.length} sesi</dd>
              </div>
            </dl>
          </aside>
        </section>

        {/* Category & Status Filter Bar */}
        <section id="dash-decks" className="dash-toolbar" aria-label="Filter Paket Soal">
          <div className="dash-filter-group" role="group" aria-label="Filter Kategori">
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
                aria-pressed={categoryFilter === cat}
                className={`dash-tab ${categoryFilter === cat ? 'is-active' : ''}`}
                onClick={() => setCategoryFilter(cat)}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="dash-filter-group" role="group" aria-label="Filter Status Pengerjaan">
            {(
              [
                ['all', 'Semua Status'],
                ['todo', 'Belum Selesai'],
                ['done', 'Selesai'],
                ['flagged', 'Ada Ditandai'],
                ['inprogress', 'Lanjut Sesi'],
              ] as const
            ).map(([st, label]) => (
              <button
                key={st}
                type="button"
                aria-pressed={statusFilter === st}
                className={`dash-tab is-subtle ${statusFilter === st ? 'is-active' : ''}`}
                onClick={() => setStatusFilter(st)}
              >
                {label}
              </button>
            ))}
          </div>
        </section>

        {/* Tiered Pack Sections */}
        {packs.length === 0 ? (
          <section className="dash-empty">
            <h2>Belum ada paket soal tersedia</h2>
            <p>Buat paket baru atau impor berkas Bomb Soal (.txt) dari tombol di kanan atas.</p>
          </section>
        ) : tierGroups.length === 0 ? (
          <section className="dash-empty">
            <h2>Tidak ada paket soal yang cocok dengan filter ini</h2>
            <p>Ubah kategori atau status filter untuk menampilkan kembali daftar deck.</p>
            <button
              type="button"
              className="dash-btn dash-btn--outline"
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
              <section key={tier.key} className={`dash-tier dash-tier--${tier.layout}`}>
                <header className="dash-tier__head">
                  <div className="dash-tier__title-wrap">
                    <span className="dash-tier__index">{tier.indexLabel}</span>
                    <div>
                      <div className="dash-tier__kicker-row">
                        <span className="dash-tier__tag">{tier.tag}</span>
                        <span className="dash-tier__summary">
                          {tier.packs.length} deck · {tierQuestions} soal
                        </span>
                      </div>
                      <h2 className="dash-tier__title">{tier.title}</h2>
                      <p className="dash-tier__desc">{tier.description}</p>
                    </div>
                  </div>
                  <div
                    className={`dash-tier__progress ${
                      tierDone === tier.packs.length ? 'is-complete' : ''
                    }`}
                  >
                    <Check size={14} strokeWidth={2.4} aria-hidden="true" />
                    <span>
                      {tierDone}/{tier.packs.length} selesai
                    </span>
                  </div>
                </header>

                {tier.layout === 'ledger' ? (
                  <div className="dash-ledger-list">
                    {tier.packs.map((pack) => {
                      const qCount = getPackQuestionCount(pack);
                      const bestScore = getBestPackScore(pack.id);
                      const latestRun = getLatestPackAttempt(pack.id);
                      const hasWrong = Boolean(
                        latestRun && latestRun.wrongQuestionIds.length > 0
                      );
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
                      const draftAnswered = draft ? Object.keys(draft.answers).length : 0;
                      const draftTotal = draft
                        ? draft.sectionsLayout.reduce(
                            (sum, s) => sum + s.questions.length,
                            0
                          )
                        : 0;
                      const parsedHeading = formatPackHeading(pack.name);

                      return (
                        <article
                          key={pack.id}
                          className={`dash-ledger-row ${st.completedPack ? 'is-completed' : ''}`}
                        >
                          <div className="dash-ledger-row__info">
                            <div className="dash-meta-line">
                              <span className="dash-cat-tag">{pack.category}</span>
                              <span className="dash-mono-meta">{qCount} soal</span>
                              <span>{pack.sections.length} bab</span>
                              <span>{Math.round(pack.durationSec / 60)} menit</span>
                              {bestScore !== null && (
                                <span className="dash-best-tag">
                                  <Trophy size={12} aria-hidden="true" /> {bestScore}%
                                </span>
                              )}
                              {draft && (
                                <span className="dash-draft-inline">
                                  Tersimpan {draftAnswered}/{draftTotal}
                                </span>
                              )}
                            </div>
                            <h3 className="dash-ledger-row__title">{parsedHeading.fullTitle}</h3>
                            {renderPackSecondaryActions(
                              pack,
                              flaggedCount,
                              masteredCount,
                              unmasteredCount,
                              hasWrong,
                              latestRun
                            )}
                          </div>

                          <div className="dash-ledger-row__actions">
                            <button
                              type="button"
                              aria-pressed={st.completedPack}
                              className={`dash-check-btn ${st.completedPack ? 'is-checked' : ''}`}
                              onClick={() => onTogglePackCompleted(pack.id)}
                            >
                              {st.completedPack ? (
                                <CheckSquare size={15} strokeWidth={2.2} aria-hidden="true" />
                              ) : (
                                <Square size={14} strokeWidth={1.8} aria-hidden="true" />
                              )}
                              <span>{st.completedPack ? 'Selesai' : 'Tandai Selesai'}</span>
                            </button>

                            <div className="dash-ledger-row__launch">
                              {draft ? (
                                <button
                                  type="button"
                                  className="dash-btn dash-btn--primary"
                                  onClick={() => onResumeDraft(pack, draft)}
                                >
                                  <Play size={14} strokeWidth={2} aria-hidden="true" />
                                  <span>Lanjut ({draftAnswered}/{draftTotal})</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  className="dash-btn dash-btn--primary"
                                  onClick={() => openConfigurator(pack, 'exam')}
                                >
                                  <Play size={14} strokeWidth={2} aria-hidden="true" />
                                  <span>Simulasi CBT</span>
                                </button>
                              )}
                              <button
                                type="button"
                                className="dash-btn dash-btn--outline"
                                onClick={() => openConfigurator(pack, 'study')}
                              >
                                <BookOpen size={14} strokeWidth={1.8} aria-hidden="true" />
                                <span>Latihan</span>
                              </button>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                ) : (
                  <div
                    className={
                      tier.layout === 'featured'
                        ? 'dash-grid dash-grid--featured'
                        : 'dash-grid dash-grid--compact'
                    }
                  >
                    {tier.packs.map((pack) => {
                      const qCount = getPackQuestionCount(pack);
                      const bestScore = getBestPackScore(pack.id);
                      const latestRun = getLatestPackAttempt(pack.id);
                      const hasWrong = Boolean(
                        latestRun && latestRun.wrongQuestionIds.length > 0
                      );
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
                      const parsedHeading = formatPackHeading(pack.name);

                      return (
                        <article
                          key={pack.id}
                          className={`dash-card ${st.completedPack ? 'is-completed' : ''} ${
                            tier.layout === 'featured' ? 'is-featured' : 'is-compact'
                          }`}
                        >
                          <div className="dash-card__top">
                            <div className="dash-meta-line">
                              <span className="dash-cat-tag">{pack.category}</span>
                              {parsedHeading.series && (
                                <span className="dash-series-tag">{parsedHeading.series}</span>
                              )}
                              <span className="dash-mono-meta">{qCount} soal</span>
                            </div>

                            <button
                              type="button"
                              aria-pressed={st.completedPack}
                              className={`dash-check-btn ${
                                st.completedPack ? 'is-checked' : ''
                              }`}
                              onClick={() => onTogglePackCompleted(pack.id)}
                              title="Tandai paket ini sudah selesai dipelajari"
                            >
                              {st.completedPack ? (
                                <CheckSquare size={15} strokeWidth={2.2} aria-hidden="true" />
                              ) : (
                                <Square size={14} strokeWidth={1.8} aria-hidden="true" />
                              )}
                              <span>{st.completedPack ? 'Selesai' : 'Checklist'}</span>
                            </button>
                          </div>

                          <h3 className="dash-card__title">{parsedHeading.title}</h3>

                          <div className="dash-card__facts">
                            <span>{pack.sections.length} bab</span>
                            <span aria-hidden="true">·</span>
                            <span>{Math.round(pack.durationSec / 60)} menit</span>
                            <span aria-hidden="true">·</span>
                            <span>Lulus {pack.passingPct}%</span>
                            {bestScore !== null && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span className="dash-best-tag">
                                  <Trophy size={12} aria-hidden="true" /> Terbaik {bestScore}%
                                </span>
                              </>
                            )}
                          </div>

                          {(masteredCount > 0 || flaggedCount > 0 || draft) && (
                            <div className="dash-study-box">
                              <div className="dash-study-box__row">
                                <span>
                                  Paham: <strong>{masteredCount}/{qCount}</strong> ({masteredPct}%)
                                </span>
                                <span className={flaggedCount > 0 ? 'is-accent-text' : ''}>
                                  Ditandai: <strong>{flaggedCount}</strong>
                                </span>
                              </div>
                              {masteredCount > 0 && (
                                <div className="dash-study-meter" aria-hidden="true">
                                  <div style={{ width: `${masteredPct}%` }} />
                                </div>
                              )}
                              {draft && (
                                <div className="dash-draft-row">
                                  <span>
                                    Sesi tersimpan ({draftAnswered}/{draftTotal} ·{' '}
                                    {formatSavedTime(draft.savedAt)})
                                  </span>
                                  <button
                                    type="button"
                                    className="dash-draft-reset"
                                    onClick={() => onDiscardDraft(pack.id)}
                                  >
                                    Reset
                                  </button>
                                </div>
                              )}
                            </div>
                          )}

                          <div className="dash-card__primary">
                            {draft ? (
                              <>
                                <button
                                  type="button"
                                  className="dash-btn dash-btn--primary"
                                  onClick={() => onResumeDraft(pack, draft)}
                                >
                                  <Play size={15} strokeWidth={2} aria-hidden="true" />
                                  <span>Lanjutkan ({draftAnswered}/{draftTotal})</span>
                                </button>
                                <button
                                  type="button"
                                  className="dash-btn dash-btn--outline"
                                  onClick={() => openConfigurator(pack, 'study')}
                                >
                                  <BookOpen size={15} strokeWidth={1.8} aria-hidden="true" />
                                  <span>Sesi Baru</span>
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  className="dash-btn dash-btn--primary"
                                  onClick={() => openConfigurator(pack, 'exam')}
                                >
                                  <Play size={15} strokeWidth={2} aria-hidden="true" />
                                  <span>Simulasi CBT</span>
                                </button>
                                <button
                                  type="button"
                                  className="dash-btn dash-btn--outline"
                                  onClick={() => openConfigurator(pack, 'study')}
                                >
                                  <BookOpen size={15} strokeWidth={1.8} aria-hidden="true" />
                                  <span>Mode Latihan</span>
                                </button>
                              </>
                            )}
                          </div>

                          {renderPackSecondaryActions(
                            pack,
                            flaggedCount,
                            masteredCount,
                            unmasteredCount,
                            hasWrong,
                            latestRun
                          )}
                        </article>
                      );
                    })}
                  </div>
                )}
              </section>
            );
          })
        )}

        {/* Attempt History Ledger */}
        {history.length > 0 && (
          <section className="dash-history" aria-labelledby="dash-history-title">
            <div className="dash-history__head">
              <div>
                <h2 id="dash-history-title">Riwayat Latihan dan Simulasi Terakhir</h2>
                <p>Catatan skor percobaan yang selesai pada perangkat ini.</p>
              </div>
              <div className="dash-history__actions">
                <button
                  type="button"
                  className="dash-btn dash-btn--outline"
                  onClick={onOpenHistory}
                >
                  <History size={15} strokeWidth={1.8} aria-hidden="true" />
                  <span>Analisa Progres &amp; Soal Salah</span>
                </button>
                <button
                  type="button"
                  className="dash-btn dash-btn--danger-outline"
                  onClick={() => {
                    if (window.confirm('Bersihkan semua riwayat skor?')) {
                      onClearHistory();
                    }
                  }}
                >
                  Bersihkan Riwayat
                </button>
              </div>
            </div>

            <div className="history-table-wrap">
              <table className="history-table dash-table">
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
                      <td className="dash-mono-cell">
                        {new Date(item.completedAt).toLocaleString('id-ID', {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })}
                      </td>
                      <td>{formatPackHeading(item.packName).fullTitle}</td>
                      <td>
                        <span className={`mode-tag is-${item.mode}`}>
                          {item.mode === 'exam' ? 'Simulasi CBT' : 'Latihan'}
                        </span>
                      </td>
                      <td className="dash-mono-cell">
                        <strong>
                          {item.correct}/{item.total}
                        </strong>{' '}
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
          aria-labelledby="config-modal-title"
        >
          <div
            className="modal-panel modal-panel--wide"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div className="modal-title-row">
                <SlidersHorizontal size={18} aria-hidden="true" />
                <h3 id="config-modal-title">
                  Konfigurasi Sesi: {formatPackHeading(configuringPack.name).fullTitle}
                </h3>
              </div>
              <button
                type="button"
                className="modal-close"
                onClick={() => setConfiguringPack(null)}
                aria-label="Tutup"
              >
                <X size={20} aria-hidden="true" />
              </button>
            </div>

            <div className="modal-body config-body">
              <div className="config-mode-grid">
                <button
                  type="button"
                  aria-pressed={mode === 'exam'}
                  className={`mode-card ${mode === 'exam' ? 'is-active' : ''}`}
                  onClick={() => {
                    setMode('exam');
                    setDurationMin(Math.round(configuringPack.durationSec / 60));
                  }}
                >
                  <strong>Simulasi Ujian CBT</strong>
                  <small>
                    Tampilan Prometric dengan timer mundur. Kunci dan pembahasan dibuka setelah
                    klik Finish.
                  </small>
                </button>
                <button
                  type="button"
                  aria-pressed={mode === 'study'}
                  className={`mode-card ${mode === 'study' ? 'is-active' : ''}`}
                  onClick={() => {
                    setMode('study');
                    setDurationMin(0);
                  }}
                >
                  <strong>Mode Latihan / Belajar</strong>
                  <small>
                    Pembahasan langsung tampil setelah memilih jawaban, tanpa timer atau dengan
                    target waktu opsional.
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
                      <Shuffle size={14} aria-hidden="true" /> Acak Urutan Soal
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
                      <Shuffle size={14} aria-hidden="true" /> Acak Posisi Opsi (A/B/C/D)
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
                    <Clock size={14} aria-hidden="true" /> Batas Waktu (menit, 0 = tanpa timer)
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
                className="dash-btn dash-btn--outline"
                onClick={() => setConfiguringPack(null)}
              >
                Batal
              </button>
              <button
                type="button"
                className="dash-btn dash-btn--primary"
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
                <Play size={16} strokeWidth={2} aria-hidden="true" />
                <span>Mulai Sekarang ({selectedQuestionCount} Soal)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {notesPack && notesPack.studyNotes && (
        <StudyNotesModal
          title={formatPackHeading(notesPack.name).fullTitle}
          notes={notesPack.studyNotes}
          showFurigana={settings.showFurigana}
          onClose={() => setNotesPack(null)}
        />
      )}
    </div>
  );
};
