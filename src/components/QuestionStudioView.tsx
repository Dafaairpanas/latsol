import React, { useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Check,
  Copy,
  Download,
  FileText,
  Image as ImageIcon,
  Plus,
  Rocket,
  Save,
  Trash2,
  Upload,
} from 'lucide-react';
import { ExamCategory, ExamPack, ExamSection, QuestionItem } from '../types/exam';
import {
  BOMB_SOAL_TEMPLATE,
  exportPackToBombTxt,
  parseBombSoalText,
} from '../utils/bombParser';
import { renderRichJapaneseText } from '../utils/rubyText';

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

export type StudioTab = 'import' | 'editor' | 'deploy';

interface QuestionStudioViewProps {
  initialTab: StudioTab;
  editingPack: ExamPack | null;
  customPacks: ExamPack[];
  onSavePack: (pack: ExamPack) => void;
  onSelectPackForEdit: (pack: ExamPack) => void;
  onBackToLobby: () => void;
}

function createBlankPack(): ExamPack {
  const id = `custom-${Date.now().toString(36)}`;
  return {
    id,
    name: 'Paket Latihan Versiku',
    subtitle: 'Dibuat lewat Studio Soal',
    category: 'SSW',
    durationSec: 45 * 60,
    passingPct: 65,
    source: 'custom',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    sections: [
      {
        id: 'sec-1',
        shortLabel: '1',
        title: '第1章 Bagian Pertama',
        questions: [
          {
            id: `${id}-q-1`,
            number: 1,
            tag: 'P.1',
            text: '食品工場(しょくひんこうじょう)で大切(たいせつ)な「5S」とは何(なに)ですか。',
            translation: 'Apa yang dimaksud dengan "5S" yang penting di pabrik makanan?',
            options: [
              '整理(せいり)・整頓(せいとん)・清掃(せいそう)・清潔(せいけつ)・躾(しつけ)',
              '安全(あんぜん)・速度(そくど)・節約(せつやく)・清涼(せいりょう)・生産(せいさん)',
              '洗浄(せんじょう)・殺菌(さっきん)・冷却(れいきゃく)・冷凍(れいとう)・出荷(しゅっか)',
            ],
            answer: 0,
            explanation: '5S terdiri dari Seiri, Seiton, Seisou, Seiketsu, dan Shitsuke.',
          },
        ],
      },
    ],
  };
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

async function resizeImageToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Gagal membaca gambar'));
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const maxW = 900;
        const scale = img.width > maxW ? maxW / img.width : 1;
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(String(reader.result));
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/webp', 0.85));
      };
      img.onerror = () => resolve(String(reader.result));
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

export const QuestionStudioView: React.FC<QuestionStudioViewProps> = ({
  initialTab,
  editingPack,
  customPacks,
  onSavePack,
  onSelectPackForEdit,
  onBackToLobby,
}) => {
  const [tab, setTab] = useState<StudioTab>(initialTab);
  const [toast, setToast] = useState<string | null>(null);

  // ===== Tab 1: Import Bomb Soal state =====
  const [rawBombText, setRawBombText] = useState<string>(BOMB_SOAL_TEMPLATE);
  const [importName, setImportName] = useState<string>('');
  const [importCat, setImportCat] = useState<ExamCategory | ''>('');
  const [importDurationMin, setImportDurationMin] = useState<string>('');
  const [importPassingPct, setImportPassingPct] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const parsedImport = useMemo(() => {
    return parseBombSoalText(rawBombText, {
      name: importName.trim() || undefined,
      category: importCat || undefined,
      durationSec:
        importDurationMin.trim() !== ''
          ? Math.max(0, Number(importDurationMin)) * 60
          : undefined,
      passingPct:
        importPassingPct.trim() !== ''
          ? Math.min(100, Math.max(10, Number(importPassingPct)))
          : undefined,
      source: 'custom',
    });
  }, [rawBombText, importName, importCat, importDurationMin, importPassingPct]);

  // ===== Tab 2: Visual Editor state =====
  const [draftPack, setDraftPack] = useState<ExamPack>(
    () => editingPack || customPacks[0] || createBlankPack()
  );
  const [activeSecIdx, setActiveSecIdx] = useState(0);
  const [activeQIdx, setActiveQIdx] = useState(0);

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 3000);
  };

  const handleUploadImportFile = async (file: File) => {
    const content = await file.text();
    if (file.name.toLowerCase().endsWith('.json')) {
      try {
        const json = JSON.parse(content) as Partial<ExamPack>;
        if (json && Array.isArray(json.sections)) {
          const imported: ExamPack = {
            id: `custom-${Date.now().toString(36)}`,
            name: json.name || file.name.replace(/\.json$/i, ''),
            subtitle: json.subtitle,
            category: json.category || 'Custom',
            durationSec: json.durationSec ?? 45 * 60,
            passingPct: json.passingPct ?? 65,
            source: 'custom',
            studyNotes: json.studyNotes,
            sections: json.sections,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          onSavePack(imported);
          setDraftPack(imported);
          setTab('editor');
          showToast(`Berhasil mengimpor "${imported.name}" dari JSON!`);
          return;
        }
      } catch {
        showToast('File JSON tidak valid.');
        return;
      }
    }
    setRawBombText(content);
    if (!importName) {
      setImportName(file.name.replace(/\.(txt|md)$/i, ''));
    }
    showToast(`File "${file.name}" dimuat ke pratinjau parser.`);
  };

  const handleSaveImportedPack = () => {
    if (parsedImport.stats.questions === 0) {
      showToast('Tidak ada soal valid untuk disimpan.');
      return;
    }
    const finalPack: ExamPack = {
      ...parsedImport.pack,
      id: `custom-${Date.now().toString(36)}`,
      source: 'custom',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    onSavePack(finalPack);
    setDraftPack(finalPack);
    setActiveSecIdx(0);
    setActiveQIdx(0);
    showToast(`Paket "${finalPack.name}" (${parsedImport.stats.questions} soal) disimpan!`);
  };

  // Visual editor helpers
  const activeSec = draftPack.sections[activeSecIdx];
  const activeQ = activeSec?.questions[activeQIdx];

  const updateDraft = (updater: (prev: ExamPack) => ExamPack) => {
    setDraftPack((prev) => ({
      ...updater(prev),
      updatedAt: new Date().toISOString(),
    }));
  };

  const updateActiveQuestion = (updater: (q: QuestionItem) => QuestionItem) => {
    if (!activeSec || !activeQ) return;
    updateDraft((prev) => ({
      ...prev,
      sections: prev.sections.map((s, sI) =>
        sI !== activeSecIdx
          ? s
          : {
              ...s,
              questions: s.questions.map((q, qI) =>
                qI !== activeQIdx ? q : updater(q)
              ),
            }
      ),
    }));
  };

  const handleAddSection = () => {
    const nextIdx = draftPack.sections.length + 1;
    const newSec: ExamSection = {
      id: `sec-${Date.now().toString(36)}`,
      shortLabel: String(nextIdx),
      title: `第${nextIdx}章 Bagian ${nextIdx}`,
      questions: [],
    };
    updateDraft((prev) => ({ ...prev, sections: [...prev.sections, newSec] }));
    setActiveSecIdx(draftPack.sections.length);
    setActiveQIdx(0);
  };

  const handleDeleteSection = (sIdx: number) => {
    if (draftPack.sections.length <= 1) {
      showToast('Minimal harus ada 1 bagian/bab.');
      return;
    }
    updateDraft((prev) => ({
      ...prev,
      sections: prev.sections
        .filter((_, idx) => idx !== sIdx)
        .map((s, idx) => ({ ...s, shortLabel: String(idx + 1) })),
    }));
    setActiveSecIdx(0);
    setActiveQIdx(0);
  };

  const handleAddQuestion = () => {
    if (!activeSec) return;
    const totalCount = draftPack.sections.reduce((s, sec) => s + sec.questions.length, 0);
    const newQ: QuestionItem = {
      id: `${draftPack.id}-q-${Date.now().toString(36)}`,
      number: totalCount + 1,
      tag: '',
      text: '質問(しつもん)を入力(にゅうりょく)してください。',
      options: ['Pilihan A', 'Pilihan B', 'Pilihan C'],
      answer: 0,
      explanation: '',
    };
    updateDraft((prev) => ({
      ...prev,
      sections: prev.sections.map((s, idx) =>
        idx === activeSecIdx ? { ...s, questions: [...s.questions, newQ] } : s
      ),
    }));
    setActiveQIdx(activeSec.questions.length);
  };

  const handleDeleteQuestion = (qIdx: number) => {
    if (!activeSec) return;
    updateDraft((prev) => ({
      ...prev,
      sections: prev.sections.map((s, idx) =>
        idx === activeSecIdx
          ? { ...s, questions: s.questions.filter((_, i) => i !== qIdx) }
          : s
      ),
    }));
    setActiveQIdx(Math.max(0, qIdx - 1));
  };

  const handleMoveQuestion = (qIdx: number, dir: -1 | 1) => {
    if (!activeSec) return;
    const target = qIdx + dir;
    if (target < 0 || target >= activeSec.questions.length) return;
    updateDraft((prev) => ({
      ...prev,
      sections: prev.sections.map((s, idx) => {
        if (idx !== activeSecIdx) return s;
        const arr = [...s.questions];
        [arr[qIdx], arr[target]] = [arr[target], arr[qIdx]];
        return { ...s, questions: arr };
      }),
    }));
    setActiveQIdx(target);
  };

  const handleSaveVisualPack = () => {
    if (!draftPack.name.trim()) {
      showToast('Judul paket soal tidak boleh kosong.');
      return;
    }
    const cleanPack: ExamPack = {
      ...draftPack,
      source: 'custom',
      updatedAt: new Date().toISOString(),
    };
    onSavePack(cleanPack);
    showToast(`Paket "${cleanPack.name}" berhasil disimpan ke koleksi!`);
  };

  return (
    <div className="page-shell">
      <header className="studio-topbar">
        <div className="studio-topbar__inner">
          <div className="studio-topbar__left">
            <button
              type="button"
              className="studio-btn studio-btn--ghost"
              onClick={onBackToLobby}
            >
              <ArrowLeft size={16} /> Kembali ke Beranda
            </button>
            <h1 className="studio-title">Studio Soal &amp; Impor Bomb Soal</h1>
          </div>

          <div className="studio-tabs">
            <button
              type="button"
              className={tab === 'import' ? 'is-active' : ''}
              onClick={() => setTab('import')}
            >
              <Upload size={15} /> Impor Bomb Soal (.txt)
            </button>
            <button
              type="button"
              className={tab === 'editor' ? 'is-active' : ''}
              onClick={() => setTab('editor')}
            >
              <FileText size={15} /> Editor Soal Visual
            </button>
            <button
              type="button"
              className={tab === 'deploy' ? 'is-active' : ''}
              onClick={() => setTab('deploy')}
            >
              <Rocket size={15} /> Panduan Deploy Netlify / Vercel
            </button>
          </div>
        </div>
      </header>

      {toast && (
        <div className="studio-toast">
          <Check size={16} /> {toast}
        </div>
      )}

      <main className="studio-main">
        {/* ================= TAB 1: IMPOR BOMB SOAL ================= */}
        {tab === 'import' && (
          <div className="import-layout">
            <section className="panel-card">
              <div className="panel-card__head">
                <div>
                  <h2>Tempel atau Unggah File Bomb Soal</h2>
                  <span>
                    Mendukung format seperti <code>bombsoal1.txt</code> (otomatis baca
                    bab <code>##</code>, furigana <code>漢字(かな)</code>, opsi A–F, dan{' '}
                    <code>Jawaban:</code>)
                  </span>
                </div>
                <div className="btn-row">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".txt,.md,.json"
                    hidden
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void handleUploadImportFile(f);
                    }}
                  />
                  <button
                    type="button"
                    className="studio-btn studio-btn--ghost"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload size={15} /> Pilih File (.txt / .json)
                  </button>
                  <button
                    type="button"
                    className="studio-btn studio-btn--ghost"
                    onClick={() => setRawBombText(BOMB_SOAL_TEMPLATE)}
                  >
                    Muat Template Contoh
                  </button>
                </div>
              </div>

              <div className="import-meta-grid">
                <label className="setting-field">
                  <span>Nama Paket (opsional, otomatis dari teks jika kosong)</span>
                  <input
                    type="text"
                    value={importName}
                    onChange={(e) => setImportName(e.target.value)}
                    placeholder="Contoh: Bomb Soal 2 — SSW Makanan Bab 3"
                  />
                </label>
                <label className="setting-field">
                  <span>Kategori</span>
                  <select
                    value={importCat}
                    onChange={(e) => setImportCat(e.target.value as ExamCategory | '')}
                  >
                    <option value="">Otomatis</option>
                    <option value="SSW">SSW</option>
                    <option value="JFT">JFT</option>
                    <option value="Custom">Custom</option>
                  </select>
                </label>
                <label className="setting-field">
                  <span>Durasi (menit)</span>
                  <input
                    type="number"
                    min={0}
                    value={importDurationMin}
                    onChange={(e) => setImportDurationMin(e.target.value)}
                    placeholder="Otomatis"
                  />
                </label>
                <label className="setting-field">
                  <span>Target Lulus (%)</span>
                  <input
                    type="number"
                    min={10}
                    max={100}
                    value={importPassingPct}
                    onChange={(e) => setImportPassingPct(e.target.value)}
                    placeholder="65"
                  />
                </label>
              </div>

              <textarea
                className="bomb-textarea"
                rows={18}
                value={rawBombText}
                onChange={(e) => setRawBombText(e.target.value)}
                placeholder="Tempel teks Bomb Soal di sini..."
              />

              <div className="import-actions">
                <button
                  type="button"
                  className="studio-btn studio-btn--primary"
                  disabled={parsedImport.stats.questions === 0}
                  onClick={handleSaveImportedPack}
                >
                  <Save size={16} /> Simpan ke Koleksi Saya ({parsedImport.stats.questions}{' '}
                  Soal)
                </button>
                <button
                  type="button"
                  className="studio-btn studio-btn--ghost"
                  disabled={parsedImport.stats.questions === 0}
                  onClick={() =>
                    downloadFile(
                      `${parsedImport.pack.id}.json`,
                      JSON.stringify(parsedImport.pack, null, 2),
                      'application/json'
                    )
                  }
                >
                  <Download size={15} /> Ekspor .json
                </button>
                <button
                  type="button"
                  className="studio-btn studio-btn--ghost"
                  onClick={() => {
                    void navigator.clipboard.writeText(BOMB_SOAL_TEMPLATE);
                    showToast('Template format Bomb Soal disalin ke clipboard!');
                  }}
                >
                  <Copy size={15} /> Salin Template Format
                </button>
              </div>
            </section>

            {/* Right Column: Live Parse Preview */}
            <aside className="panel-card">
              <div className="panel-card__head">
                <h2>Pratinjau Hasil Parsing</h2>
              </div>

              <div className="parse-stats-grid">
                <div className="parse-stat">
                  <span>Bagian / Bab</span>
                  <strong>{parsedImport.stats.sections}</strong>
                </div>
                <div className="parse-stat">
                  <span>Total Soal</span>
                  <strong>{parsedImport.stats.questions}</strong>
                </div>
                <div className="parse-stat">
                  <span>Pembahasan</span>
                  <strong>{parsedImport.stats.withExplanations}</strong>
                </div>
                <div className="parse-stat">
                  <span>Pakai Furigana</span>
                  <strong>{parsedImport.stats.withFurigana}</strong>
                </div>
              </div>

              {parsedImport.warnings.length > 0 && (
                <div className="parse-warnings">
                  <strong>
                    <AlertTriangle size={15} /> Peringatan Format (
                    {parsedImport.warnings.length})
                  </strong>
                  <ul>
                    {parsedImport.warnings.slice(0, 8).map((w, i) => (
                      <li key={i}>
                        Baris {w.line}: {w.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="parse-preview-list">
                {parsedImport.pack.sections.slice(0, 3).map((sec) => (
                  <div key={sec.id} className="parse-preview-sec">
                    <div className="parse-preview-sec__title">{sec.title}</div>
                    {sec.questions.slice(0, 3).map((q) => (
                      <div key={q.id} className="parse-preview-q">
                        <div className="parse-preview-q__text">
                          <b>#{q.number}</b> {q.tag ? `[${q.tag}] ` : ''}
                          {renderRichJapaneseText(q.text, true)}
                        </div>
                        <div className="parse-preview-q__meta">
                          {q.options.length} opsi • Kunci: <b>{LETTERS[q.answer]}</b>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </aside>
          </div>
        )}

        {/* ================= TAB 2: VISUAL EDITOR ================= */}
        {tab === 'editor' && (
          <div className="editor-workspace">
            {/* Pack Picker & Actions Bar */}
            <section className="panel-card editor-pack-bar">
              <div className="editor-pack-bar__top">
                <label className="setting-field">
                  <span>Pilih Paket Custom untuk Diedit</span>
                  <select
                    value={
                      customPacks.some((p) => p.id === draftPack.id)
                        ? draftPack.id
                        : '__draft__'
                    }
                    onChange={(e) => {
                      const val = e.target.value;
                      const found = customPacks.find((p) => p.id === val);
                      if (found) {
                        setDraftPack(found);
                        onSelectPackForEdit(found);
                        setActiveSecIdx(0);
                        setActiveQIdx(0);
                      }
                    }}
                  >
                    {!customPacks.some((p) => p.id === draftPack.id) && (
                      <option value="__draft__">{draftPack.name} (Draft Baru)</option>
                    )}
                    {customPacks.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="btn-row">
                  <button
                    type="button"
                    className="studio-btn studio-btn--ghost"
                    onClick={() => {
                      const fresh = createBlankPack();
                      setDraftPack(fresh);
                      setActiveSecIdx(0);
                      setActiveQIdx(0);
                    }}
                  >
                    <Plus size={15} /> Draft Paket Baru
                  </button>
                  <button
                    type="button"
                    className="studio-btn studio-btn--ghost"
                    onClick={() =>
                      downloadFile(
                        `${draftPack.id}.txt`,
                        exportPackToBombTxt(draftPack),
                        'text/plain;charset=utf-8'
                      )
                    }
                  >
                    <Download size={15} /> Ekspor .txt
                  </button>
                  <button
                    type="button"
                    className="studio-btn studio-btn--ghost"
                    onClick={() =>
                      downloadFile(
                        `${draftPack.id}.json`,
                        JSON.stringify(draftPack, null, 2),
                        'application/json'
                      )
                    }
                  >
                    <Download size={15} /> Ekspor .json
                  </button>
                  <button
                    type="button"
                    className="studio-btn studio-btn--primary"
                    onClick={handleSaveVisualPack}
                  >
                    <Save size={15} /> Simpan Paket
                  </button>
                </div>
              </div>

              <div className="editor-meta-grid">
                <label className="setting-field">
                  <span>Judul Paket Soal</span>
                  <input
                    type="text"
                    value={draftPack.name}
                    onChange={(e) =>
                      updateDraft((p) => ({ ...p, name: e.target.value }))
                    }
                  />
                </label>
                <label className="setting-field">
                  <span>Subjudul / Deskripsi Singkat</span>
                  <input
                    type="text"
                    value={draftPack.subtitle || ''}
                    onChange={(e) =>
                      updateDraft((p) => ({ ...p, subtitle: e.target.value }))
                    }
                    placeholder="Contoh: Latihan Kanji & Bunpou JFT A2"
                  />
                </label>
                <label className="setting-field">
                  <span>Kategori</span>
                  <select
                    value={draftPack.category}
                    onChange={(e) =>
                      updateDraft((p) => ({
                        ...p,
                        category: e.target.value as ExamCategory,
                      }))
                    }
                  >
                    <option value="SSW">SSW</option>
                    <option value="JFT">JFT</option>
                    <option value="Custom">Custom</option>
                  </select>
                </label>
                <label className="setting-field">
                  <span>Durasi (menit)</span>
                  <input
                    type="number"
                    min={0}
                    max={240}
                    value={Math.round(draftPack.durationSec / 60)}
                    onChange={(e) =>
                      updateDraft((p) => ({
                        ...p,
                        durationSec: Math.max(0, Number(e.target.value) || 0) * 60,
                      }))
                    }
                  />
                </label>
                <label className="setting-field">
                  <span>Target Lulus (%)</span>
                  <input
                    type="number"
                    min={10}
                    max={100}
                    value={draftPack.passingPct}
                    onChange={(e) =>
                      updateDraft((p) => ({
                        ...p,
                        passingPct: Math.min(
                          100,
                          Math.max(10, Number(e.target.value) || 65)
                        ),
                      }))
                    }
                  />
                </label>
              </div>
            </section>

            {/* Split Master-Detail Section & Question Editor */}
            <div className="editor-split">
              {/* Left Sidebar: Sections & Questions */}
              <aside className="panel-card editor-sidebar">
                <div className="editor-sidebar__head">
                  <strong>Bagian / Bab ({draftPack.sections.length})</strong>
                  <button
                    type="button"
                    className="mini-action"
                    onClick={handleAddSection}
                  >
                    <Plus size={13} /> Bab
                  </button>
                </div>

                <div className="editor-section-list">
                  {draftPack.sections.map((sec, idx) => (
                    <div
                      key={sec.id}
                      className={`editor-sec-pill ${
                        idx === activeSecIdx ? 'is-active' : ''
                      }`}
                    >
                      <button
                        type="button"
                        className="editor-sec-pill__btn"
                        onClick={() => {
                          setActiveSecIdx(idx);
                          setActiveQIdx(0);
                        }}
                      >
                        <span className="chapter-chip">{sec.shortLabel}</span>
                        <span>{sec.title}</span>
                        <small>{sec.questions.length}</small>
                      </button>
                      {draftPack.sections.length > 1 && (
                        <button
                          type="button"
                          className="icon-tiny-del"
                          onClick={() => handleDeleteSection(idx)}
                          title="Hapus bagian ini"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {activeSec && (
                  <>
                    <label className="setting-field editor-sec-rename">
                      <span>Judul Bab Aktif</span>
                      <input
                        type="text"
                        value={activeSec.title}
                        onChange={(e) =>
                          updateDraft((prev) => ({
                            ...prev,
                            sections: prev.sections.map((s, idx) =>
                              idx === activeSecIdx ? { ...s, title: e.target.value } : s
                            ),
                          }))
                        }
                      />
                    </label>

                    <div className="editor-sidebar__head">
                      <strong>Daftar Soal ({activeSec.questions.length})</strong>
                      <button
                        type="button"
                        className="mini-action"
                        onClick={handleAddQuestion}
                      >
                        <Plus size={13} /> Soal
                      </button>
                    </div>

                    <div className="editor-q-list">
                      {activeSec.questions.map((q, qIdx) => (
                        <button
                          key={q.id}
                          type="button"
                          className={`editor-q-item ${
                            qIdx === activeQIdx ? 'is-active' : ''
                          }`}
                          onClick={() => setActiveQIdx(qIdx)}
                        >
                          <span className="editor-q-item__num">#{qIdx + 1}</span>
                          <span className="editor-q-item__text">
                            {q.text.slice(0, 42) || '(Kosong)'}
                          </span>
                          <span className="editor-q-item__key">{LETTERS[q.answer]}</span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </aside>

              {/* Right Panel: Question Form */}
              <section className="panel-card editor-form">
                {!activeQ ? (
                  <div className="empty-box">
                    <p>Belum ada soal di bagian ini.</p>
                    <button
                      type="button"
                      className="studio-btn studio-btn--primary"
                      onClick={handleAddQuestion}
                    >
                      <Plus size={16} /> Tambah Soal Pertama
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="editor-form__head">
                      <h3>
                        Edit Soal #{activeQIdx + 1}{' '}
                        {activeSec ? `(${activeSec.title})` : ''}
                      </h3>
                      <div className="btn-row">
                        <button
                          type="button"
                          className="mini-action"
                          disabled={activeQIdx === 0}
                          onClick={() => handleMoveQuestion(activeQIdx, -1)}
                          title="Geser ke atas"
                        >
                          <ArrowUp size={13} />
                        </button>
                        <button
                          type="button"
                          className="mini-action"
                          disabled={
                            !activeSec || activeQIdx >= activeSec.questions.length - 1
                          }
                          onClick={() => handleMoveQuestion(activeQIdx, 1)}
                          title="Geser ke bawah"
                        >
                          <ArrowDown size={13} />
                        </button>
                        <button
                          type="button"
                          className="mini-action is-danger"
                          onClick={() => handleDeleteQuestion(activeQIdx)}
                        >
                          <Trash2 size={13} /> Hapus Soal
                        </button>
                      </div>
                    </div>

                    <div className="editor-q-top-fields">
                      <label className="setting-field">
                        <span>Nomor Tampil</span>
                        <input
                          type="number"
                          min={1}
                          value={activeQ.number ?? activeQIdx + 1}
                          onChange={(e) =>
                            updateActiveQuestion((q) => ({
                              ...q,
                              number: Number(e.target.value) || activeQIdx + 1,
                            }))
                          }
                        />
                      </label>
                      <label className="setting-field">
                        <span>Tag Halaman / Topik (opsional)</span>
                        <input
                          type="text"
                          value={activeQ.tag || ''}
                          onChange={(e) =>
                            updateActiveQuestion((q) => ({ ...q, tag: e.target.value }))
                          }
                          placeholder="Contoh: P.12 atau 文字・語彙"
                        />
                      </label>
                    </div>

                    <label className="setting-field">
                      <span>
                        Teks Pertanyaan (gunakan <code>漢字(かな)</code> untuk Furigana,{' '}
                        <code>**teks**</code> untuk tebal)
                      </span>
                      <textarea
                        rows={3}
                        value={activeQ.text}
                        onChange={(e) =>
                          updateActiveQuestion((q) => ({ ...q, text: e.target.value }))
                        }
                      />
                    </label>

                    <div className="ruby-live-preview">
                      <span>Pratinjau Furigana:</span>
                      <div className="ruby-live-preview__box">
                        {renderRichJapaneseText(activeQ.text, true)}
                      </div>
                    </div>

                    <label className="setting-field">
                      <span>
                        Terjemahan Bahasa Indonesia / Your Language (opsional — tampil
                        saat klik tombol 🌐 Your Language)
                      </span>
                      <textarea
                        rows={2}
                        value={activeQ.translation || ''}
                        onChange={(e) =>
                          updateActiveQuestion((q) => ({
                            ...q,
                            translation: e.target.value,
                          }))
                        }
                        placeholder="Contoh: Arti pertanyaan dalam bahasa Indonesia..."
                      />
                    </label>

                    {/* Optional Image */}
                    <div className="editor-image-row">
                      <label className="setting-field">
                        <span>URL Gambar Ilustrasi (opsional)</span>
                        <input
                          type="text"
                          value={activeQ.imageUrl || ''}
                          onChange={(e) =>
                            updateActiveQuestion((q) => ({
                              ...q,
                              imageUrl: e.target.value,
                            }))
                          }
                          placeholder="https://... atau unggah file gambar"
                        />
                      </label>
                      <label className="studio-btn studio-btn--ghost upload-img-btn">
                        <ImageIcon size={15} /> Unggah Gambar
                        <input
                          type="file"
                          accept="image/*"
                          hidden
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const url = await resizeImageToDataUrl(file);
                            updateActiveQuestion((q) => ({ ...q, imageUrl: url }));
                          }}
                        />
                      </label>
                    </div>

                    {activeQ.imageUrl && (
                      <div className="editor-img-preview">
                        <img src={activeQ.imageUrl} alt="Preview ilustrasi" />
                        <button
                          type="button"
                          className="mini-action is-danger"
                          onClick={() =>
                            updateActiveQuestion((q) => ({ ...q, imageUrl: '' }))
                          }
                        >
                          Hapus Gambar
                        </button>
                      </div>
                    )}

                    {/* Options Editor */}
                    <div className="editor-options-block">
                      <div className="editor-options-block__head">
                        <span>Pilihan Jawaban (centang bulatan untuk kunci benar)</span>
                        {activeQ.options.length < 6 && (
                          <button
                            type="button"
                            className="mini-action"
                            onClick={() =>
                              updateActiveQuestion((q) => ({
                                ...q,
                                options: [
                                  ...q.options,
                                  `Pilihan ${LETTERS[q.options.length]}`,
                                ],
                              }))
                            }
                          >
                            <Plus size={13} /> Tambah Opsi
                          </button>
                        )}
                      </div>

                      {activeQ.options.map((opt, oIdx) => (
                        <div key={oIdx} className="editor-option-row">
                          <input
                            type="radio"
                            name="correctOption"
                            checked={activeQ.answer === oIdx}
                            onChange={() =>
                              updateActiveQuestion((q) => ({ ...q, answer: oIdx }))
                            }
                            title={`Jadikan ${LETTERS[oIdx]} sebagai jawaban benar`}
                          />
                          <span className="editor-option-row__letter">
                            {LETTERS[oIdx]}
                          </span>
                          <input
                            type="text"
                            value={opt}
                            onChange={(e) =>
                              updateActiveQuestion((q) => ({
                                ...q,
                                options: q.options.map((item, i) =>
                                  i === oIdx ? e.target.value : item
                                ),
                              }))
                            }
                          />
                          {activeQ.options.length > 2 && (
                            <button
                              type="button"
                              className="icon-tiny-del"
                              onClick={() =>
                                updateActiveQuestion((q) => {
                                  const nextOpts = q.options.filter((_, i) => i !== oIdx);
                                  let nextAns = q.answer;
                                  if (nextAns === oIdx) nextAns = 0;
                                  else if (nextAns > oIdx) nextAns--;
                                  return {
                                    ...q,
                                    options: nextOpts,
                                    answer: Math.min(nextAns, nextOpts.length - 1),
                                  };
                                })
                              }
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>

                    <label className="setting-field">
                      <span>Pembahasan / Penjelasan Kunci Jawaban</span>
                      <textarea
                        rows={3}
                        value={activeQ.explanation || ''}
                        onChange={(e) =>
                          updateActiveQuestion((q) => ({
                            ...q,
                            explanation: e.target.value,
                          }))
                        }
                        placeholder="Jelaskan kenapa kunci benar dan apa jebakannya..."
                      />
                    </label>
                  </>
                )}
              </section>
            </div>
          </div>
        )}

        {/* ================= TAB 3: DEPLOY & WORKFLOW GUIDE ================= */}
        {tab === 'deploy' && (
          <div className="deploy-guide-grid">
            <section className="panel-card">
              <h2>Cara Menambah Soal Permanen ke Website (Netlify / Vercel)</h2>
              <ol className="guide-steps">
                <li>
                  <strong>Buat atau Impor Soal:</strong> Kamu bisa menulis file{' '}
                  <code>.txt</code> berformat Bomb Soal (seperti <code>bombsoal1.txt</code>
                  ), atau buat lewat <b>Editor Soal Visual</b> lalu klik{' '}
                  <b>Ekspor .txt</b> / <b>Ekspor .json</b>.
                </li>
                <li>
                  <strong>Taruh di Folder <code>packs/</code>:</strong> Letakkan file{' '}
                  <code>bombsoal2.txt</code>, <code>jft-latihan.txt</code>, atau{' '}
                  <code>paket-saya.json</code> ke dalam folder <code>packs/</code> di
                  proyek ini.
                </li>
                <li>
                  <strong>Push ke GitHub:</strong> Proyek ini menggunakan Vite auto-loader (
                  <code>import.meta.glob</code>), jadi setiap file baru di{' '}
                  <code>packs/</code> otomatis muncul di halaman utama tanpa ubah kode!
                </li>
                <li>
                  <strong>Deploy ke Netlify atau Vercel:</strong> File{' '}
                  <code>netlify.toml</code> dan <code>vercel.json</code> sudah disiapkan.
                  Cukup hubungkan repo ke Netlify atau Vercel (Build Command:{' '}
                  <code>npm run build</code>, Output: <code>dist</code>).
                </li>
              </ol>
            </section>

            <section className="panel-card">
              <h2>Referensi Format Bomb Soal (.txt)</h2>
              <p className="guide-note">
                Gunakan sintaks berikut saat membuat file soal baru atau meminta bantuan AI
                menyusun paket soal:
              </p>
              <pre className="template-pre">{BOMB_SOAL_TEMPLATE}</pre>
              <button
                type="button"
                className="studio-btn studio-btn--primary"
                onClick={() => {
                  void navigator.clipboard.writeText(BOMB_SOAL_TEMPLATE);
                  showToast('Template format disalin!');
                }}
              >
                <Copy size={15} /> Salin Template Format
              </button>
            </section>
          </div>
        )}
      </main>
    </div>
  );
};
