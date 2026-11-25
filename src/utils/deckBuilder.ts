import { ExamPack, ExamSection } from '../types/exam';

function cloneSectionsWithSequentialLabels(sections: ExamSection[]): ExamSection[] {
  return sections.map((sec, idx) => ({
    ...sec,
    shortLabel: String(idx + 1),
  }));
}

/**
 * Splits the 145 official OTAFF v5.1 questions (Bomb Soal 1 + Bomb Soal 2)
 * into 4 balanced 34–37 question CBT simulation decks without losing any question
 * or mutating original question IDs.
 */
export function buildOtaffSimulationDecks(
  bomb1Pack: ExamPack,
  bomb2Pack: ExamPack
): ExamPack[] {
  const b1 = bomb1Pack.sections;
  const b2 = bomb2Pack.sections;
  if (b1.length < 10 || b2.length < 7) return [];

  const combinedNotes = [bomb1Pack.studyNotes, bomb2Pack.studyNotes]
    .filter(Boolean)
    .join('\n\n---\n\n') || undefined;

  const specs: Array<{
    id: string;
    name: string;
    sourceFile: string;
    durationMin: number;
    sections: ExamSection[];
  }> = [
    {
      id: 'builtin-sim-otaff-1',
      name: 'Simulasi OTAFF v5.1 — Deck 1: Bab 1, Bahaya & HACCP Inti',
      sourceFile: 'v5.1 Deck 1',
      durationMin: 40,
      sections: [b1[0], b2[0], b1[1], b2[1], b1[4]], // 3+2+16+12+4 = 37
    },
    {
      id: 'builtin-sim-otaff-2',
      name: 'Simulasi OTAFF v5.1 — Deck 2: Higiene Umum, Pekerja & Proses',
      sourceFile: 'v5.1 Deck 2',
      durationMin: 40,
      sections: [b1[2], b1[3], b2[3], b1[5]], // 13+16+5+3 = 37
    },
    {
      id: 'builtin-sim-otaff-3',
      name: 'Simulasi OTAFF v5.1 — Deck 3: Higiene Pelengkap, Rambu & Jebakan',
      sourceFile: 'v5.1 Deck 3',
      durationMin: 40,
      sections: [b2[2], b2[6], b1[8], b2[5], b1[9]], // 19+3+4+4+7 = 37
    },
    {
      id: 'builtin-sim-otaff-4',
      name: 'Simulasi OTAFF v5.1 — Deck 4: Keselamatan Kerja K3 & KYT',
      sourceFile: 'v5.1 Deck 4',
      durationMin: 35,
      sections: [b1[6], b1[7], b2[4]], // 13+6+15 = 34
    },
  ];

  return specs.map((spec) => ({
    id: spec.id,
    name: spec.name,
    category: 'SSW',
    durationSec: spec.durationMin * 60,
    passingPct: 65,
    source: 'builtin',
    sourceFile: spec.sourceFile,
    studyNotes: combinedNotes,
    sections: cloneSectionsWithSequentialLabels(spec.sections),
  }));
}

/**
 * Consolidates 20-question Recall CBT sets (bombsoal3..10) into 40-question
 * Prometric-sized tryout decks alongside bombsoal11 (40 questions).
 */
export function buildRecallTryoutDecks(
  recallPacksByNum: Map<number, ExamPack>
): ExamPack[] {
  const pairSpecs: Array<{
    id: string;
    name: string;
    sourceFile: string;
    nums: [number, number];
    sectionNames: [string, string];
  }> = [
    {
      id: 'builtin-recall-tryout-1',
      name: 'Tryout Recall v5.1 — Paket A (Set 1 & Set 2)',
      sourceFile: 'Recall A',
      nums: [3, 4],
      sectionNames: ['Set 1 (20 Soal)', 'Set 2 (20 Soal)'],
    },
    {
      id: 'builtin-recall-tryout-2',
      name: 'Tryout Recall v5.1 — Paket B (Set 3 & Latihan 3)',
      sourceFile: 'Recall B',
      nums: [5, 6],
      sectionNames: ['Set 3 (20 Soal)', 'Latihan 3 (20 Soal)'],
    },
    {
      id: 'builtin-recall-tryout-3',
      name: 'Tryout Recall v5.1 — Paket C (Latihan 4 & Latihan 5)',
      sourceFile: 'Recall C',
      nums: [7, 8],
      sectionNames: ['Latihan 4 (20 Soal)', 'Latihan 5 (20 Soal)'],
    },
    {
      id: 'builtin-recall-tryout-4',
      name: 'Tryout Recall v5.1 — Paket D (Latihan 6 & Latihan 7)',
      sourceFile: 'Recall D',
      nums: [9, 10],
      sectionNames: ['Latihan 6 (20 Soal)', 'Latihan 7 (20 Soal)'],
    },
  ];

  const decks: ExamPack[] = [];

  for (const spec of pairSpecs) {
    const first = recallPacksByNum.get(spec.nums[0]);
    const second = recallPacksByNum.get(spec.nums[1]);
    const sections: ExamSection[] = [];
    if (first) {
      sections.push({
        id: `${spec.id}-sec-1`,
        shortLabel: '1',
        title: spec.sectionNames[0],
        questions: first.sections.flatMap((s) => s.questions),
      });
    }
    if (second) {
      sections.push({
        id: `${spec.id}-sec-${sections.length + 1}`,
        shortLabel: String(sections.length + 1),
        title: spec.sectionNames[1],
        questions: second.sections.flatMap((s) => s.questions),
      });
    }
    if (sections.length > 0) {
      decks.push({
        id: spec.id,
        name: spec.name,
        category: 'SSW',
        durationSec: 40 * 60,
        passingPct: 65,
        source: 'builtin',
        sourceFile: spec.sourceFile,
        sections,
      });
    }
  }

  const pack11 = recallPacksByNum.get(11);
  if (pack11) {
    decks.push({
      ...pack11,
      name: 'Tryout Recall v5.1 — Paket E (Latihan 8)',
      sourceFile: 'Recall E',
      durationSec: 40 * 60,
      passingPct: 65,
    });
  }

  return decks;
}
