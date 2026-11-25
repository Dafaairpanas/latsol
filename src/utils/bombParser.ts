import {
  BombParseResult,
  ExamCategory,
  ExamPack,
  ExamSection,
  ParseWarning,
  QuestionItem,
} from '../types/exam';
import { hasFurigana } from './rubyText';

export interface ParseBombOptions {
  id?: string;
  name?: string;
  subtitle?: string;
  category?: ExamCategory;
  durationSec?: number;
  passingPct?: number;
  source?: 'builtin' | 'custom';
  sourceFile?: string;
}

const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

function slugify(str: string): string {
  return (
    str
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48) || 'exam-pack'
  );
}

function makeSectionShortLabel(title: string, idx: number): string {
  const clean = title.trim();
  if (/実技/.test(clean)) return '実技';
  if (/補足/.test(clean)) return '補足';
  if (/最終|横断/.test(clean)) return '総合';
  const chMatch = clean.match(/^第(\d+)章/);
  if (chMatch) return `${idx + 1}`;
  return String(idx + 1);
}

function inferTitleFromIntro(introLines: string[], fallback?: string): {
  name: string;
  subtitle?: string;
  category: ExamCategory;
} {
  const joined = introLines.join(' ').trim();
  const boldMatch = joined.match(/\*\*([^*]+)\*\*/);
  if (boldMatch) {
    const raw = boldMatch[1].trim();
    const cat: ExamCategory = /JFT/i.test(raw + joined)
      ? 'JFT'
      : /SSW|特定技能|飲食料|介護|外食|宿泊|農業|ビル/i.test(raw + joined)
        ? 'SSW'
        : 'Custom';
    return {
      name: raw,
      subtitle: joined.replace(/\*\*/g, '').slice(0, 160),
      category: cat,
    };
  }
  const name = fallback || 'Paket Latihan CBT';
  const cat: ExamCategory = /JFT/i.test(name + joined)
    ? 'JFT'
    : /SSW|特定技能|bombsoal/i.test(name + joined)
      ? 'SSW'
      : 'Custom';
  return { name, subtitle: joined || undefined, category: cat };
}

/**
 * Parses Bomb Soal markdown/text format (like `bombsoal1.txt`) or simple Q&A text
 * into a structured `ExamPack` with sections, questions, options, answers, explanations, and study notes.
 */
export function parseBombSoalText(
  rawText: string,
  options: ParseBombOptions = {}
): BombParseResult {
  const lines = rawText.replace(/\r\n/g, '\n').split('\n');
  const warnings: ParseWarning[] = [];

  let customTitle = options.name?.trim() || '';
  let customSubtitle = options.subtitle?.trim() || '';
  let customCategory: ExamCategory | undefined = options.category;
  let customDurationSec = options.durationSec;
  let customPassingPct = options.passingPct;

  const introLines: string[] = [];
  const sections: ExamSection[] = [];
  const studyNoteLines: string[] = [];

  type DraftQuestion = Partial<QuestionItem> & {
    options: string[];
    answerChar?: string;
    rawAnswerLine?: number;
  };

  let currentSection: ExamSection | null = null;
  let currentQuestion: DraftQuestion | null = null;
  const getCurrentQuestion = (): DraftQuestion | null => currentQuestion;
  let lastOptionIdx = -1;
  let inExplanation = false;
  let inStudyNotes = false;

  const ensureSection = (title?: string) => {
    if (!currentSection) {
      const idx = sections.length;
      const sectionTitle = title || `Bagian ${idx + 1}`;
      currentSection = {
        id: `sec-${idx + 1}`,
        shortLabel: makeSectionShortLabel(sectionTitle, idx),
        title: sectionTitle,
        questions: [],
      };
      sections.push(currentSection);
    }
  };

  const finalizeQuestion = () => {
    if (!currentQuestion) return;
    ensureSection();

    const qNum = currentQuestion.number ?? currentSection!.questions.length + 1;
    const qId = `${options.id || 'pack'}-q-${sections.length}-${currentSection!.questions.length + 1}-${qNum}`;

    if (currentQuestion.options.length < 2) {
      warnings.push({
        line: currentQuestion.rawAnswerLine || 1,
        message: `Soal #${qNum} memiliki kurang dari 2 pilihan jawaban.`,
      });
    }

    let answerIdx = 0;
    if (currentQuestion.answerChar) {
      const idx = OPTION_LETTERS.indexOf(currentQuestion.answerChar.toUpperCase());
      if (idx >= 0 && idx < currentQuestion.options.length) {
        answerIdx = idx;
      } else {
        warnings.push({
          line: currentQuestion.rawAnswerLine || 1,
          message: `Soal #${qNum}: kunci jawaban "${currentQuestion.answerChar}" tidak cocok dengan jumlah opsi (${currentQuestion.options.length}).`,
        });
      }
    } else {
      warnings.push({
        line: currentQuestion.rawAnswerLine || 1,
        message: `Soal #${qNum} belum memiliki baris "Jawaban: ...". Default ke A.`,
      });
    }

    currentSection!.questions.push({
      id: qId,
      number: qNum,
      tag: currentQuestion.tag?.trim() || undefined,
      text: (currentQuestion.text || '').trim(),
      translation: currentQuestion.translation?.trim() || undefined,
      options: currentQuestion.options.map((o) => o.trim()),
      answer: answerIdx,
      explanation: currentQuestion.explanation?.trim() || undefined,
      imageUrl: currentQuestion.imageUrl?.trim() || undefined,
    });

    currentQuestion = null;
    lastOptionIdx = -1;
    inExplanation = false;
  };

  const qHeaderRegex = /^\*\*(\d+)\.\s*(?:\[([^\]]+)\])?\*\*\s*(.*)$/;
  const plainQHeaderRegex = /^(\d+)\.\s*(?:\[([^\]]+)\])?\s+(.+)$/;
  const optionRegex = /^(?:-\s*)?([A-Fa-f])[.)]\s+(.+)$/;
  const answerRegex =
    /^(?:\*\*)?(?:Jawaban|Kunci|Answer)\s*:\s*([A-Fa-f])(?:\*\*)?\s*(?:[—\-–:]\s*(.*))?$/i;
  const translationRegex =
    /^(?:\*\*)?(?:Terjemahan|Translation|Arti|Your Language)\s*:\s*(?:\*\*)?\s*(.+)$/i;
  const imageRegex = /^(?:!\[[^\]]*\]\(([^)]+)\)|Image\s*:\s*(.+))$/i;

  for (let i = 0; i < lines.length; i++) {
    const lineNum = i + 1;
    const rawLine = lines[i];
    const line = rawLine.trim();

    if (!line) {
      if (inStudyNotes) studyNoteLines.push('');
      continue;
    }

    if (line === '---') {
      finalizeQuestion();
      continue;
    }

    // Top-level H1 title
    if (/^#\s+/.test(line) && !/^##/.test(line)) {
      if (!customTitle) {
        customTitle = line.replace(/^#\s+/, '').trim();
      }
      continue;
    }

    // Optional metadata blockquote: > Kategori: SSW | Durasi: 60 | Lulus: 65
    if (line.startsWith('>') && sections.length === 0 && !currentQuestion) {
      const metaText = line.slice(1).trim();
      const catMatch = metaText.match(/Kategori\s*:\s*(SSW|JFT|Custom)/i);
      if (catMatch && !customCategory) {
        const c = catMatch[1].toUpperCase();
        customCategory = c === 'SSW' ? 'SSW' : c === 'JFT' ? 'JFT' : 'Custom';
      }
      const durMatch = metaText.match(/Durasi\s*:\s*(\d+)/i);
      if (durMatch && customDurationSec === undefined) {
        customDurationSec = Number(durMatch[1]) * 60;
      }
      const passMatch = metaText.match(/Lulus\s*:\s*(\d+)/i);
      if (passMatch && customPassingPct === undefined) {
        customPassingPct = Number(passMatch[1]);
      }
      const subMatch = metaText.match(/Subjudul\s*:\s*([^|]+)/i);
      if (subMatch && !customSubtitle) {
        customSubtitle = subMatch[1].trim();
      }
      continue;
    }

    // Study notes / Peta Cepat heading (H3 or summary H2)
    if (
      /^###\s+/.test(line) ||
      (/^##\s+/.test(line) &&
        /(Peta Cepat|Rangkuman|Ringkasan|Catatan|Cheat Sheet)/i.test(line))
    ) {
      finalizeQuestion();
      inStudyNotes = true;
      studyNoteLines.push(line);
      continue;
    }

    if (inStudyNotes && !/^##\s+/.test(line)) {
      studyNoteLines.push(rawLine);
      continue;
    }

    // Section heading (H2)
    if (/^##\s+/.test(line)) {
      finalizeQuestion();
      inStudyNotes = false;
      const sectionTitle = line.replace(/^##\s+/, '').trim();
      const idx = sections.length;
      currentSection = {
        id: `sec-${idx + 1}`,
        shortLabel: makeSectionShortLabel(sectionTitle, idx),
        title: sectionTitle,
        questions: [],
      };
      sections.push(currentSection);
      continue;
    }

    // Question header (**1. [P.2]** ... always starts a new question; plain "1. ..." starts a new question unless it's a sub-item inside an explanation or unfinished stem)
    const boldQm: RegExpMatchArray | null = line.match(qHeaderRegex);
    const plainQm: RegExpMatchArray | null = !boldQm ? line.match(plainQHeaderRegex) : null;
    const activeQ = getCurrentQuestion();
    const prevQNum: number | undefined = activeQ?.number;
    const insideUnfinishedStem = Boolean(activeQ && !inExplanation && activeQ.options.length === 0);
    const isSequentialPlainQ: boolean = Boolean(
      plainQm &&
        ((!inExplanation && !insideUnfinishedStem) ||
          (prevQNum !== undefined && Number(plainQm[1]) === prevQNum + 1))
    );
    const qm: RegExpMatchArray | null = boldQm || (isSequentialPlainQ ? plainQm : null);
    if (qm) {
      finalizeQuestion();
      ensureSection();
      currentQuestion = {
        number: Number(qm[1]),
        tag: qm[2]?.trim(),
        text: qm[3].trim(),
        options: [],
        rawAnswerLine: lineNum,
      };
      lastOptionIdx = -1;
      continue;
    }

    if (!currentQuestion) {
      // Collect intro text before first section/question, or trailing closing notes after the last section
      if (sections.length === 0) {
        introLines.push(line);
      } else {
        studyNoteLines.push(rawLine);
      }
      continue;
    }

    // Answer line
    const am = line.match(answerRegex);
    if (am) {
      currentQuestion.answerChar = am[1].toUpperCase();
      currentQuestion.explanation = (am[2] || '').trim();
      currentQuestion.rawAnswerLine = lineNum;
      inExplanation = true;
      lastOptionIdx = -1;
      continue;
    }

    // Translation line
    const tm = line.match(translationRegex);
    if (tm && !inExplanation && currentQuestion.options.length === 0) {
      currentQuestion.translation = tm[1].trim();
      continue;
    }

    // Image attachment
    const im = line.match(imageRegex);
    if (im && !inExplanation) {
      currentQuestion.imageUrl = (im[1] || im[2] || '').trim();
      continue;
    }

    // Option line
    const om = line.match(optionRegex);
    if (om && !inExplanation) {
      const optText = om[2].trim();
      currentQuestion.options.push(optText);
      lastOptionIdx = currentQuestion.options.length - 1;
      continue;
    }

    // Continuation lines
    if (inExplanation) {
      currentQuestion.explanation = currentQuestion.explanation
        ? `${currentQuestion.explanation}\n${line}`
        : line;
    } else if (lastOptionIdx >= 0) {
      currentQuestion.options[lastOptionIdx] += `\n${line}`;
    } else {
      currentQuestion.text = currentQuestion.text
        ? `${currentQuestion.text}\n${line}`
        : line;
    }
  }

  finalizeQuestion();

  // Filter out completely empty sections (e.g. if a trailing heading had no questions)
  const nonEmptySections = sections.filter((s) => s.questions.length > 0);
  nonEmptySections.forEach((s, idx) => {
    s.shortLabel = makeSectionShortLabel(s.title, idx);
  });

  const inferred = inferTitleFromIntro(introLines, options.sourceFile);
  const finalName = customTitle || inferred.name;
  const finalSubtitle = customSubtitle || inferred.subtitle;
  const finalCategory = customCategory || inferred.category;
  const totalQuestions = nonEmptySections.reduce((sum, s) => sum + s.questions.length, 0);

  if (totalQuestions === 0) {
    warnings.push({
      line: 1,
      message:
        'Tidak ditemukan soal valid. Pastikan format menggunakan "**1.** Pertanyaan", opsi "A. / B. / C.", dan "**Jawaban: A** — penjelasan".',
    });
  }

  const withExplanations = nonEmptySections.reduce(
    (sum, s) => sum + s.questions.filter((q) => Boolean(q.explanation)).length,
    0
  );
  const withFurigana = nonEmptySections.reduce(
    (sum, s) =>
      sum +
      s.questions.filter(
        (q) => hasFurigana(q.text) || q.options.some((opt) => hasFurigana(opt))
      ).length,
    0
  );

  const defaultDuration =
    customDurationSec !== undefined
      ? customDurationSec
      : Math.max(15, Math.min(90, Math.ceil(totalQuestions * 0.7))) * 60;

  const pack: ExamPack = {
    id: options.id || `${slugify(finalName)}-${Date.now().toString(36)}`,
    name: finalName,
    subtitle: finalSubtitle,
    category: finalCategory,
    durationSec: defaultDuration,
    passingPct: customPassingPct ?? 65,
    source: options.source || 'custom',
    sourceFile: options.sourceFile,
    intro: introLines.join('\n').trim() || undefined,
    studyNotes: studyNoteLines.join('\n').trim() || undefined,
    sections: nonEmptySections,
  };

  return {
    pack,
    warnings,
    stats: {
      sections: nonEmptySections.length,
      questions: totalQuestions,
      withExplanations,
      withFurigana,
    },
  };
}

/**
 * Serializes any `ExamPack` back into clean Bomb Soal `.txt` markdown format.
 */
export function exportPackToBombTxt(pack: ExamPack): string {
  const lines: string[] = [];
  lines.push(`# ${pack.name}`);
  lines.push(
    `> Kategori: ${pack.category} | Durasi: ${Math.round(pack.durationSec / 60)} | Lulus: ${pack.passingPct}${
      pack.subtitle ? ` | Subjudul: ${pack.subtitle}` : ''
    }`
  );
  lines.push('');

  let globalNum = 1;
  pack.sections.forEach((sec, sIdx) => {
    if (sIdx > 0) lines.push('---', '');
    lines.push(`## ${sec.title}`, '');

    sec.questions.forEach((q) => {
      const qNo = q.number ?? globalNum;
      const tagPart = q.tag ? ` [${q.tag}]` : '';
      lines.push(`**${qNo}.${tagPart}** ${q.text}`);
      if (q.translation) {
        lines.push(`Terjemahan: ${q.translation}`);
      }
      if (q.imageUrl) {
        lines.push(`Image: ${q.imageUrl}`);
      }
      q.options.forEach((opt, oIdx) => {
        const letter = OPTION_LETTERS[oIdx] || String(oIdx + 1);
        lines.push(`${letter}. ${opt}`);
      });
      const ansLetter = OPTION_LETTERS[q.answer] || 'A';
      if (q.explanation) {
        lines.push(`**Jawaban: ${ansLetter}** — ${q.explanation}`);
      } else {
        lines.push(`**Jawaban: ${ansLetter}**`);
      }
      lines.push('');
      globalNum++;
    });
  });

  if (pack.studyNotes) {
    lines.push('---', '', pack.studyNotes.trim(), '');
  }

  return lines.join('\n');
}

export const BOMB_SOAL_TEMPLATE = `# Latihan SSW / JFT Versiku
> Kategori: SSW | Durasi: 45 | Lulus: 65 | Subjudul: Paket latihan custom format Bomb Soal

## 第1章 Contoh Bab Pertama（P.1〜P.10）

**1. [P.2]** 食品工場(しょくひんこうじょう)で大切(たいせつ)な「5S」に含(ふく)まれないものはどれか。
Terjemahan: Manakah yang TIDAK termasuk dalam 5S yang penting di pabrik makanan?
A. 整理(せいり)・整頓(せいとん)
B. 清掃(せいそう)・清潔(せいけつ)
C. 節約(せつやく)・スピード
**Jawaban: C** — 5S terdiri dari 整理 (Seiri), 整頓 (Seiton), 清掃 (Seisou), 清潔 (Seiketsu), dan 躾 (Shitsuke).

**2. [P.5]** 冷蔵庫(れいぞうこ)の温度基準(おんどきじゅん)（食品衛生法）として正(ただ)しいものはどれか。
A. 10℃以下(いか)
B. 20℃以下(いか)
C. -5℃以下(いか)
**Jawaban: A** — Standar lemari pendingin menurut 食品衛生法 adalah 10℃以下, sedangkan freezer adalah -15℃以下.

---

### Peta Cepat Catatan Penting

* **5S:** 整理・整頓・清掃・清潔・躾
* **Suhu Kulkas / Freezer:** 10℃以下 / -15℃以下
`;
