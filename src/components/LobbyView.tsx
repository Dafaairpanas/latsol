import React, { useMemo, useState } from 'react';
import {
  BookOpen,
  Clock,
  Copy,
  Download,
  Edit3,
  FileText,
  History,
  Play,
  Plus,
  RotateCcw,
  Shuffle,
  SlidersHorizontal,
  Sparkles,
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
  QuestionItem,
} from '../types/exam';
import { StudyNotesModal } from './StudyNotesModal';
import { exportPackToBombTxt } from '../utils/bombParser';

interface LobbyViewProps {
  packs: ExamPack[];
  settings: ExamSettings;
  history: AttemptRecord[];
  onUpdateSettings: (next: ExamSettings) => void;
  onStartSession: (pack: ExamPack, config: ExamSessionConfig) => void;
  onOpenStudioCreate: () => void;
  onOpenStudioImport: () => void;
  onEditCustomPack: (pack: ExamPack) => void;
  onDuplicatePackToCustom: (pack: ExamPack) => void;
  onDeleteCustomPack: (packId: string) => void;
  onClearHistory: () => void;
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

export const LobbyView: React.FC<LobbyViewProps> = ({
  packs,
  settings,
  history,
  onUpdateSettings,
  onStartSession,
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

  const totalQuestionsAllPacks = useMemo(
    () =>
      packs.reduce(
        (acc, p) => acc + p.sections.reduce((s, sec) => s + sec.questions.length, 0),
        0
      ),
    [packs]
  );

  const filteredPacks = useMemo(() => {
    if (categoryFilter === 'ALL') return packs;
    return packs.filter((p) => p.category === categoryFilter);
  }, [packs, categoryFilter]);

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
      sessionLabel: `Latih Soal Salah (${wrongQuestions.length} soal)`,
    });
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
            <BookOpen size={20} />
            <div>
              <strong>{packs.length} Paket Soal</strong>
              <span>Siap simulasi &amp; latihan</span>
            </div>
          </div>
          <div className="hero-strip__stat">
            <Sparkles size={20} />
            <div>
              <strong>{totalQuestionsAllPacks} Total Soal</strong>
              <span>Dengan Furigana &amp; Pembahasan</span>
            </div>
          </div>
          <div className="hero-strip__stat">
            <History size={20} />
            <div>
              <strong>{history.length} Riwayat Sesi</strong>
              <span>Tersimpan otomatis di browser</span>
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

        {/* Category Filter Tabs */}
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
        </div>

        {/* Packs Grid */}
        <section className="packs-grid">
          {filteredPacks.map((pack) => {
            const qCount = pack.sections.reduce(
              (sum, s) => sum + s.questions.length,
              0
            );
            const bestScore = getBestPackScore(pack.id);
            const latestRun = getLatestPackAttempt(pack.id);
            const hasWrong = latestRun && latestRun.wrongQuestionIds.length > 0;

            return (
              <article key={pack.id} className="pack-card">
                <div className="pack-card__head">
                  <div className="pack-badges">
                    <span className={`cat-badge cat-${pack.category.toLowerCase()}`}>
                      {pack.category}
                    </span>
                    <span className="source-badge">
                      {pack.source === 'builtin'
                        ? pack.sourceFile || 'Bawaan'
                        : 'Koleksi Saya'}
                    </span>
                  </div>
                  {bestScore !== null && (
                    <span className="best-badge">
                      <Trophy size={13} /> Terbaik: {bestScore}%
                    </span>
                  )}
                </div>

                <h2 className="pack-card__title">{pack.name}</h2>
                {pack.subtitle && (
                  <p className="pack-card__subtitle">{pack.subtitle}</p>
                )}

                <div className="pack-meta">
                  <span>{pack.sections.length} Bagian/Bab</span>
                  <span>•</span>
                  <span>{qCount} Soal</span>
                  <span>•</span>
                  <span>{Math.round(pack.durationSec / 60)} Menit</span>
                  <span>•</span>
                  <span>Lulus {pack.passingPct}%</span>
                </div>

                {/* Chapter preview pills */}
                <div className="pack-chapters">
                  {pack.sections.slice(0, 4).map((s) => (
                    <span key={s.id} className="chapter-mini">
                      {s.shortLabel}. {s.title} ({s.questions.length})
                    </span>
                  ))}
                  {pack.sections.length > 4 && (
                    <span className="chapter-mini is-more">
                      +{pack.sections.length - 4} bab lainnya
                    </span>
                  )}
                </div>

                <div className="pack-card__primary">
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
                </div>

                <div className="pack-card__secondary">
                  {hasWrong && (
                    <button
                      type="button"
                      className="mini-action is-warn"
                      onClick={() => handleLaunchWrongDrill(pack)}
                    >
                      <RotateCcw size={13} /> Ulangi Salah ({latestRun.wrongQuestionIds.length})
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
                      <Copy size={13} /> Duplikat &amp; Edit
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
                        if (window.confirm(`Hapus paket "${pack.name}" dari koleksi?`)) {
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
        </section>

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
