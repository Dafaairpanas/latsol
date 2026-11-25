import { ExamPack } from '../types/exam';
import { parseBombSoalText } from '../utils/bombParser';
import {
  buildOtaffSimulationDecks,
  buildRecallTryoutDecks,
} from '../utils/deckBuilder';

// Auto-discover any bombsoal*.txt in project root and any .txt / .json files in /packs/
const rootTxtModules = import.meta.glob('/bombsoal*.txt', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const packsTxtModules = import.meta.glob('/packs/*.txt', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const packsJsonModules = import.meta.glob('/packs/*.json', {
  import: 'default',
  eager: true,
}) as Record<string, unknown>;

const JFT_STARTER_PACK: ExamPack = {
  id: 'builtin-jft-starter',
  name: 'JFT-Basic A2 — Starter Template (Contoh Soal & Terjemahan)',
  subtitle:
    'Template latihan 4 pilihan (A/B/C/D) dengan fitur terjemahan Your Language, diolah dari template awalmu.',
  category: 'JFT',
  durationSec: 60 * 60,
  passingPct: 80,
  source: 'builtin',
  sourceFile: 'builtin-jft-starter',
  studyNotes: `### Info Simulasi JFT-Basic A2

* **Struktur Ujian Resmi:** 4 Bagian — 文字と語彙 (Huruf & Kosakata), 会話と表現 (Percakapan & Ekspresi), 聴解 (Mendengarkan), 読解 (Membaca).
* **Skor Lulus Resmi:** 200 / 250 poin (80%).
* **Tips:** Gunakan tombol **🌐 Your Language** saat belajar untuk mengecek arti kalimat, atau matikan **Furigana** di menu **⚙ Pengaturan** untuk melatih membaca Kanji.`,
  sections: [
    {
      id: 'jft-sec-1',
      shortLabel: '1',
      title: '文字と語彙（Huruf & Kosakata）',
      questions: [
        {
          id: 'jft-q-1',
          number: 1,
          tag: '文字・語彙',
          text: '「たべる」の ていねいな いいかたは どれですか。',
          translation: 'Manakah bentuk sopan dari kata 「たべる」 (makan)?',
          options: ['たべます', 'たべた', 'たべて', 'たべない'],
          answer: 0,
          explanation:
            'Bentuk sopan (丁寧語 / -masu form) dari kata kerja grup 2 「たべる」 adalah 「たべます」. Pilihan lain: たべた (lampau biasa), たべて (bentuk -te), たべない (negatif biasa).',
        },
        {
          id: 'jft-q-2',
          number: 2,
          tag: '文法・助詞',
          text: 'これは ＿＿＿ の ほんです。',
          translation: 'Ini adalah buku milik ＿＿＿.',
          options: ['わたし', 'わたしを', 'わたしに', 'わたしで'],
          answer: 0,
          explanation:
            'Partikel 「の」 langsung menempel pada kata benda/kata ganti tanpa partikel lain sebelumnya, sehingga bentuk yang benar adalah 「わたしの ほん」.',
        },
        {
          id: 'jft-q-3',
          number: 3,
          tag: '漢字の読み',
          text: 'あした ともだちと えいがを みに行(い)きます。',
          translation: 'Besok saya pergi menonton film bersama teman.',
          options: ['ともだちと えいが', 'としょかんと えき', 'かぞくと おんがく', 'せんせいと ほん'],
          answer: 0,
          explanation:
            'Soal latihan dasar mencocokkan makna kalimat hiragana: 「ともだち」 = teman, 「えいが」 = film.',
        },
      ],
    },
    {
      id: 'jft-sec-2',
      shortLabel: '2',
      title: '会話と表現（Percakapan & Ekspresi）',
      questions: [
        {
          id: 'jft-q-4',
          number: 4,
          tag: '職場会話',
          text: 'A：すみません、この にもつを はこぶのを てつだって くれませんか。\nB：＿＿＿。',
          translation:
            'A: Permisi, maukah Anda membantu saya membawa barang ini?\nB: ＿＿＿.',
          options: [
            'ええ、いいですよ。',
            'はい、どういたしまして。',
            'すみません、おねがいします。',
            'いいえ、だいじょうぶですか。',
          ],
          answer: 0,
          explanation:
            'Untuk menerima permintaan tolong (〜てくれませんか), respons yang natural dan sopan adalah 「ええ、いいですよ。」 (Ya, tentu / boleh).',
        },
        {
          id: 'jft-q-5',
          number: 5,
          tag: '日常会話',
          text: 'A：ちょっと といれに 行(い)って きても いいですか。\nB：はい、＿＿＿。',
          translation:
            'A: Bolehkah saya izin ke toilet sebentar?\nB: Ya, ＿＿＿.',
          options: [
            'どうぞ、行って きて ください。',
            'はい、いただきます。',
            'いいえ、かまいませんよ。',
            'もうすぐ おわりますか。',
          ],
          answer: 0,
          explanation:
            'Saat memberi izin seseorang pergi sebentar dan kembali lagi, gunakan 「どうぞ、行ってきてください。」',
        },
      ],
    },
    {
      id: 'jft-sec-3',
      shortLabel: '3',
      title: '読解（Membaca Pengumuman）',
      questions: [
        {
          id: 'jft-q-6',
          number: 6,
          tag: '掲示板',
          text: '【工場(こうじょう)のお知らせ】\n今週(こんしゅう)の 金曜日(きんようび)は 機械(きかい)の 点検(てんけん)を します。そのため、午後(ごご) 3時(じ)で 仕事(しごと)が おわります。\n\n質問(しつもん)：今週(こんしゅう)の 金曜日(きんようび)は どうなりますか。',
          translation:
            '[Pengumuman Pabrik] Hari Jumat minggu ini akan ada pemeriksaan mesin. Karena itu, pekerjaan selesai pada pukul 3 sore.\nPertanyaan: Bagaimana kondisi hari Jumat minggu ini?',
          options: [
            '午後 3時(じ)に 仕事(しごと)が おわります。',
            '一日中(いちにちじゅう) 工場(こうじょう)が 休(やす)みです。',
            '午後 3時(じ)から 点検(てんけん)を 始(はじ)めます。',
            'いつもより おそくまで 働(はたら)きます。',
          ],
          answer: 0,
          explanation:
            'Pengumuman jelas menyatakan 「午後3時で仕事がおわります」 (pekerjaan selesai jam 3 sore), bukan libur seharian.',
        },
      ],
    },
  ],
};

function filenameToId(path: string): string {
  const base = path.split('/').pop()?.replace(/\.[^.]+$/, '') || 'pack';
  return `builtin-${base.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
}

function extractTrailingNumber(path: string): number {
  const match = path.match(/(\d+)\.[^.]+$/);
  return match ? Number(match[1]) : 9999;
}

export function loadBuiltinPacks(): ExamPack[] {
  const txtEntries = { ...rootTxtModules, ...packsTxtModules };

  let bomb1Pack: ExamPack | null = null;
  let bomb2Pack: ExamPack | null = null;
  const recallPacksByNum = new Map<number, ExamPack>();
  const otherTxtPacks: ExamPack[] = [];

  const sortedPaths = Object.keys(txtEntries).sort((a, b) => {
    const na = extractTrailingNumber(a);
    const nb = extractTrailingNumber(b);
    if (na !== nb) return na - nb;
    return a.localeCompare(b);
  });

  for (const path of sortedPaths) {
    const raw = txtEntries[path];
    if (!raw || !raw.trim()) continue;
    const fileName = path.split('/').pop() || path;
    const isBomb1 = /bombsoal1\.txt$/i.test(fileName);
    const isBomb2 = /bombsoal2\.txt$/i.test(fileName);
    const recallMatch = fileName.match(/^bombsoal(3|4|5|6|7|8|9|10|11)\.txt$/i);
    const recallNum = recallMatch ? Number(recallMatch[1]) : null;
    const isRecallPack = recallNum !== null;

    const { pack } = parseBombSoalText(raw, {
      id: filenameToId(path),
      name: isBomb1
        ? 'Bomb Soal 1: Materi Lengkap P.1–P.65 (Marathon)'
        : isBomb2
          ? 'Bomb Soal 2: Pelengkap P.1–P.69 (Marathon)'
          : undefined,
      category: isBomb1 || isBomb2 || isRecallPack ? 'SSW' : undefined,
      durationSec: isBomb1 ? 60 * 60 : isBomb2 ? 45 * 60 : undefined,
      passingPct: isBomb1 || isBomb2 || isRecallPack ? 65 : undefined,
      source: 'builtin',
      sourceFile: fileName,
    });

    if (pack.sections.length === 0) continue;
    if (isBomb1) {
      bomb1Pack = pack;
    } else if (isBomb2) {
      bomb2Pack = pack;
    } else if (recallNum !== null) {
      recallPacksByNum.set(recallNum, pack);
    } else {
      otherTxtPacks.push(pack);
    }
  }

  const packs: ExamPack[] = [];

  // 1) Split 145 official OTAFF v5.1 questions into 4 decks (34–37 questions each)
  if (bomb1Pack && bomb2Pack) {
    packs.push(...buildOtaffSimulationDecks(bomb1Pack, bomb2Pack));
  }

  // 2) Consolidate Recall CBT sets (bombsoal3..11) into 5 decks (40 questions each)
  packs.push(...buildRecallTryoutDecks(recallPacksByNum));

  // 3) Keep full 60–145 question marathon packs in archive tier
  if (bomb1Pack && bomb2Pack) {
    const combinedSections = [...bomb1Pack.sections, ...bomb2Pack.sections].map(
      (sec, idx) => ({
        ...sec,
        id: `full-sec-${idx + 1}`,
        shortLabel: String(idx + 1),
        questions: sec.questions.map((q) => ({
          ...q,
          id: `full-${q.id}`,
        })),
      })
    );
    const combinedNotes = [bomb1Pack.studyNotes, bomb2Pack.studyNotes]
      .filter(Boolean)
      .join('\n\n---\n\n');

    packs.push({
      id: 'builtin-bombsoal-full-145',
      name: 'Paket Lengkap OTAFF v5.1 (No. 1–145)',
      category: 'SSW',
      durationSec: 90 * 60,
      passingPct: 65,
      source: 'builtin',
      sourceFile: 'Part 1 + 2',
      studyNotes: combinedNotes || undefined,
      sections: combinedSections,
    });
  }
  if (bomb1Pack) packs.push(bomb1Pack);
  if (bomb2Pack) packs.push(bomb2Pack);
  packs.push(...otherTxtPacks);

  for (const path of Object.keys(packsJsonModules).sort()) {
    const data = packsJsonModules[path] as Partial<ExamPack> | undefined;
    if (data && Array.isArray(data.sections) && data.sections.length > 0) {
      const fileName = path.split('/').pop() || path;
      packs.push({
        id: data.id || filenameToId(path),
        name: data.name || fileName,
        subtitle: data.subtitle,
        category: data.category || 'Custom',
        durationSec: data.durationSec ?? 45 * 60,
        passingPct: data.passingPct ?? 65,
        source: 'builtin',
        sourceFile: fileName,
        intro: data.intro,
        studyNotes: data.studyNotes,
        sections: data.sections,
      });
    }
  }

  packs.push(JFT_STARTER_PACK);
  return packs;
}
