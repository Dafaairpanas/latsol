import { ExamPack } from '../types/exam';
import { parseBombSoalText } from '../utils/bombParser';

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

export function loadBuiltinPacks(): ExamPack[] {
  const packs: ExamPack[] = [];
  const txtEntries = { ...rootTxtModules, ...packsTxtModules };

  let bomb1Pack: ExamPack | null = null;
  let bomb2Pack: ExamPack | null = null;

  const sortedPaths = Object.keys(txtEntries).sort((a, b) => a.localeCompare(b));
  for (const path of sortedPaths) {
    const raw = txtEntries[path];
    if (!raw || !raw.trim()) continue;
    const fileName = path.split('/').pop() || path;
    const isBomb1 = /bombsoal1\.txt$/i.test(fileName);
    const isBomb2 = /bombsoal2\.txt$/i.test(fileName);
    const isBomb3 = /bombsoal3\.txt$/i.test(fileName);
    const isBomb4 = /bombsoal4\.txt$/i.test(fileName);
    const isBomb5 = /bombsoal5\.txt$/i.test(fileName);
    const isBomb6 = /bombsoal6\.txt$/i.test(fileName);
    const isBomb7 = /bombsoal7\.txt$/i.test(fileName);
    const isBomb8 = /bombsoal8\.txt$/i.test(fileName);
    const isBomb9 = /bombsoal9\.txt$/i.test(fileName);
    const isBomb10 = /bombsoal10\.txt$/i.test(fileName);
    const isBomb11 = /bombsoal11\.txt$/i.test(fileName);

    const { pack } = parseBombSoalText(raw, {
      id: filenameToId(path),
      name: isBomb1
        ? 'Bomb Soal 1: SSW Pengolahan Makanan (No. 1–85)'
        : isBomb2
          ? 'Bomb Soal 2: SSW Pengolahan Makanan 補完 (No. 86–145)'
          : isBomb3
            ? 'SSW Pengolahan Makanan — Latihan Recall CBT Set 1 (20 Soal)'
            : isBomb4
              ? 'SSW Pengolahan Makanan — Latihan Recall CBT Set 2 (20 Soal)'
              : isBomb5
                ? 'SSW Pengolahan Makanan — Latihan Recall CBT Set 3 (20 Soal)'
                : isBomb6
                  ? 'SSW Pengolahan Makanan — Latihan 3 (20 Soal)'
                  : isBomb7
                    ? 'SSW Pengolahan Makanan — Latihan 4 (20 Soal)'
                    : isBomb8
                      ? 'SSW Pengolahan Makanan — Latihan 5 (20 Soal)'
                      : isBomb9
                        ? 'SSW Pengolahan Makanan — Latihan 6 (20 Soal)'
                        : isBomb10
                          ? 'SSW Pengolahan Makanan — Latihan 7 (20 Soal)'
                          : isBomb11
                            ? 'SSW Pengolahan Makanan — Latihan 8 (40 Soal)'
                            : undefined,
      subtitle: isBomb1
        ? '85 soal jebakan CBT lengkap P.1–P.65 • 10 bagian (Bab 1–3, Hitungan, Rambu, & Campuran)'
        : isBomb2
          ? '60 soal pelengkap menutup seluruh poin OTAFF v5.1 P.1–P.69 • 7 bagian (Bab 1–3, Lampiran 1–2, & Hitungan)'
          : isBomb3
            ? '20 soal latihan CBT SSW Set 1 dengan terjemahan Your Language akurat & catatan koreksi naskah'
            : isBomb4
              ? '20 soal latihan CBT SSW Set 2 (opsi campuran A–C & A–D) lengkap dengan terjemahan & catatan'
              : isBomb5
                ? '20 soal latihan CBT SSW Set 3 (opsi A–D & A–C) lengkap dengan terjemahan Your Language & catatan materi'
                : isBomb6
                  ? '20 soal Latihan 3 SSW Pengolahan Makanan (5S, Heatstroke, APD, & Keracunan) + terjemahan Your Language'
                  : isBomb7
                    ? '20 soal Latihan 4 SSW Pengolahan Makanan (4 opsi A–D, HACCP, X-ray, Alergen) + terjemahan Your Language'
                    : isBomb8
                      ? '20 soal Latihan 5 SSW Pengolahan Makanan (5S & K3, Deterjen Alkali/Asam, Arsip HACCP) + Your Language'
                      : isBomb9
                        ? '20 soal Latihan 6 SSW Pengolahan Makanan (受入検査, 凍結, 期限表示, 保管サンプル, 薬剤管理)'
                        : isBomb10
                          ? '20 soal Latihan 7 SSW Pengolahan Makanan (Review Gabungan 3 Opsi + 事業者 & APD)'
                          : isBomb11
                            ? '40 soal Latihan 8 SSW Pengolahan Makanan (Review Lengkap + NaClO 100–200ppm, Lembar Inspeksi, & Tempat Sampah)'
                            : undefined,
      category:
        isBomb1 ||
        isBomb2 ||
        isBomb3 ||
        isBomb4 ||
        isBomb5 ||
        isBomb6 ||
        isBomb7 ||
        isBomb8 ||
        isBomb9 ||
        isBomb10 ||
        isBomb11
          ? 'SSW'
          : undefined,
      durationSec: isBomb1
        ? 60 * 60
        : isBomb2
          ? 45 * 60
          : isBomb11
            ? 40 * 60
            : isBomb3 ||
                isBomb4 ||
                isBomb5 ||
                isBomb6 ||
                isBomb7 ||
                isBomb8 ||
                isBomb9 ||
                isBomb10
              ? 20 * 60
              : undefined,
      passingPct:
        isBomb1 ||
        isBomb2 ||
        isBomb3 ||
        isBomb4 ||
        isBomb5 ||
        isBomb6 ||
        isBomb7 ||
        isBomb8 ||
        isBomb9 ||
        isBomb10 ||
        isBomb11
          ? 65
          : undefined,
      source: 'builtin',
      sourceFile: fileName,
    });
    if (pack.sections.length > 0) {
      if (isBomb1) bomb1Pack = pack;
      if (isBomb2) bomb2Pack = pack;
      packs.push(pack);
    }
  }

  // Synthesize full combined 145-question SSW v5.1 pack when both Part 1 & Part 2 exist
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

    packs.unshift({
      id: 'builtin-bombsoal-full-145',
      name: 'Paket Lengkap SSW Pengolahan Makanan v5.1 (No. 1–145)',
      subtitle:
        'Gabungan Bomb Soal Part 1 + Part 2 — 145 soal menyapu 100% poin OTAFF Edisi 5.1 (P.1–P.69)',
      category: 'SSW',
      durationSec: 90 * 60,
      passingPct: 65,
      source: 'builtin',
      sourceFile: 'Part 1 + Part 2',
      studyNotes: combinedNotes || undefined,
      sections: combinedSections,
    });
  }

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
