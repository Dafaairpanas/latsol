import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { parseBombSoalText, exportPackToBombTxt } from '../src/utils/bombParser.ts';
import {
  buildActiveSession,
  extractDraftLayout,
  restoreSessionFromDraft,
} from '../src/utils/sessionBuilder.ts';
import { renderRichJapaneseText, stripFurigana } from '../src/utils/rubyText.tsx';

const bomb1Raw = fs.readFileSync(path.resolve(process.cwd(), 'bombsoal1.txt'), 'utf8');
const bomb2Raw = fs.readFileSync(path.resolve(process.cwd(), 'packs/bombsoal2.txt'), 'utf8');
const bomb3Raw = fs.readFileSync(path.resolve(process.cwd(), 'packs/bombsoal3.txt'), 'utf8');
const bomb4Raw = fs.readFileSync(path.resolve(process.cwd(), 'packs/bombsoal4.txt'), 'utf8');
const bomb5Raw = fs.readFileSync(path.resolve(process.cwd(), 'packs/bombsoal5.txt'), 'utf8');
const bomb6Raw = fs.readFileSync(path.resolve(process.cwd(), 'packs/bombsoal6.txt'), 'utf8');
const bomb7Raw = fs.readFileSync(path.resolve(process.cwd(), 'packs/bombsoal7.txt'), 'utf8');
const bomb8Raw = fs.readFileSync(path.resolve(process.cwd(), 'packs/bombsoal8.txt'), 'utf8');
const bomb9Raw = fs.readFileSync(path.resolve(process.cwd(), 'packs/bombsoal9.txt'), 'utf8');
const bomb10Raw = fs.readFileSync(path.resolve(process.cwd(), 'packs/bombsoal10.txt'), 'utf8');
const bomb11Raw = fs.readFileSync(path.resolve(process.cwd(), 'packs/bombsoal11.txt'), 'utf8');

const res1 = parseBombSoalText(bomb1Raw, {
  id: 'bombsoal-1',
  name: 'Bomb Soal 1: SSW Pengolahan Makanan',
  category: 'SSW',
  durationSec: 3600,
  passingPct: 65,
  source: 'builtin',
});

console.log('Part 1 stats:', res1.stats, 'warnings:', res1.warnings);
assert.equal(res1.warnings.length, 0, 'Expected zero warnings on bombsoal1.txt');
assert.equal(res1.stats.sections, 10, 'Expected 10 chapters/sections in bombsoal1.txt');
assert.equal(res1.stats.questions, 85, 'Expected 85 questions in bombsoal1.txt');
assert.equal(res1.stats.withExplanations, 85, 'Expected 85 explanations in bombsoal1.txt');
assert.ok(
  res1.pack.studyNotes?.includes('Peta Cepat Skor Evaluasi Mandiri'),
  'Expected study notes extracted in Part 1'
);

const res2 = parseBombSoalText(bomb2Raw, {
  id: 'bombsoal-2',
  name: 'Bomb Soal 2: SSW Pengolahan Makanan (Part 2)',
  category: 'SSW',
  durationSec: 2700,
  passingPct: 65,
  source: 'builtin',
});

console.log('Part 2 stats:', res2.stats, 'warnings:', res2.warnings);
assert.equal(res2.warnings.length, 0, 'Expected zero warnings on packs/bombsoal2.txt');
assert.equal(res2.stats.sections, 7, 'Expected 7 chapters/sections in bombsoal2.txt');
assert.equal(res2.stats.questions, 60, 'Expected 60 questions in bombsoal2.txt');
assert.equal(res2.stats.withExplanations, 60, 'Expected 60 explanations in bombsoal2.txt');
assert.ok(
  res2.pack.studyNotes?.includes('296 poin isi teks OTAFF'),
  'Expected closing summary extracted into studyNotes in Part 2'
);

const res3 = parseBombSoalText(bomb3Raw, {
  id: 'bombsoal-3',
  category: 'SSW',
  source: 'builtin',
});
console.log('Set 3 (20 soal) stats:', res3.stats, 'warnings:', res3.warnings);
assert.equal(res3.warnings.length, 0, 'Expected zero warnings on packs/bombsoal3.txt');
assert.equal(res3.stats.sections, 1, 'Expected 1 section in bombsoal3.txt');
assert.equal(res3.stats.questions, 20, 'Expected 20 questions in bombsoal3.txt');
assert.equal(res3.stats.withExplanations, 20, 'Expected 20 explanations in bombsoal3.txt');
const expectedSet3Keys = 'BBBBA BCBBB CACBB BCABC'.replace(/\s+/g, '');
const p3Qs = res3.pack.sections.flatMap((s) => s.questions);
p3Qs.forEach((q, idx) => {
  const expectedIdx = 'ABC'.indexOf(expectedSet3Keys[idx]);
  assert.equal(q.answer, expectedIdx, `Set 3 answer mismatch at Q${idx + 1}`);
  assert.ok(q.translation && q.translation.length > 5, `Set 3 translation present at Q${idx + 1}`);
});

const res4 = parseBombSoalText(bomb4Raw, {
  id: 'bombsoal-4',
  category: 'SSW',
  source: 'builtin',
});
console.log('Set 4 (20 soal) stats:', res4.stats, 'warnings:', res4.warnings);
assert.equal(res4.warnings.length, 0, 'Expected zero warnings on packs/bombsoal4.txt');
assert.equal(res4.stats.sections, 1, 'Expected 1 section in bombsoal4.txt');
assert.equal(res4.stats.questions, 20, 'Expected 20 questions in bombsoal4.txt');
assert.equal(res4.stats.withExplanations, 20, 'Expected 20 explanations in bombsoal4.txt');
const expectedSet4Keys = 'CCBBB CADAB BACAB BCBB D'.replace(/\s+/g, '');
const p4Qs = res4.pack.sections.flatMap((s) => s.questions);
p4Qs.forEach((q, idx) => {
  const expectedIdx = 'ABCD'.indexOf(expectedSet4Keys[idx]);
  assert.equal(q.answer, expectedIdx, `Set 4 answer mismatch at Q${idx + 1}`);
  assert.ok(q.translation && q.translation.length > 5, `Set 4 translation present at Q${idx + 1}`);
});
assert.equal(p4Qs[2].options.length, 4); // Q3 has 4 options
assert.equal(p4Qs[19].options.length, 4); // Q20 has 4 options

const res5 = parseBombSoalText(bomb5Raw, {
  id: 'bombsoal-5',
  category: 'SSW',
  source: 'builtin',
});
console.log('Set 5 (20 soal) stats:', res5.stats, 'warnings:', res5.warnings);
assert.equal(res5.warnings.length, 0, 'Expected zero warnings on packs/bombsoal5.txt');
assert.equal(res5.stats.sections, 1, 'Expected 1 section in bombsoal5.txt');
assert.equal(res5.stats.questions, 20, 'Expected 20 questions in bombsoal5.txt');
assert.equal(res5.stats.withExplanations, 20, 'Expected 20 explanations in bombsoal5.txt');
const expectedSet5Keys = 'ABCBB CBDCA CAADC DBCBB'.replace(/\s+/g, '');
const p5Qs = res5.pack.sections.flatMap((s) => s.questions);
p5Qs.forEach((q, idx) => {
  const expectedIdx = 'ABCD'.indexOf(expectedSet5Keys[idx]);
  assert.equal(q.answer, expectedIdx, `Set 5 answer mismatch at Q${idx + 1}`);
  assert.ok(q.translation && q.translation.length > 5, `Set 5 translation present at Q${idx + 1}`);
});

const res6 = parseBombSoalText(bomb6Raw, {
  id: 'bombsoal-6',
  category: 'SSW',
  source: 'builtin',
});
console.log('Set 6 / Latihan 3 (20 soal) stats:', res6.stats, 'warnings:', res6.warnings);
assert.equal(res6.warnings.length, 0, 'Expected zero warnings on packs/bombsoal6.txt');
assert.equal(res6.stats.sections, 1, 'Expected 1 section in bombsoal6.txt');
assert.equal(res6.stats.questions, 20, 'Expected 20 questions in bombsoal6.txt');
assert.equal(res6.stats.withExplanations, 20, 'Expected 20 explanations in bombsoal6.txt');
const expectedSet6Keys = 'BBBCB BCABA ACBBA BBABC'.replace(/\s+/g, '');
const p6Qs = res6.pack.sections.flatMap((s) => s.questions);
p6Qs.forEach((q, idx) => {
  const expectedIdx = 'ABC'.indexOf(expectedSet6Keys[idx]);
  assert.equal(q.answer, expectedIdx, `Set 6 answer mismatch at Q${idx + 1}`);
  assert.ok(q.translation && q.translation.length > 5, `Set 6 translation present at Q${idx + 1}`);
});

const res7 = parseBombSoalText(bomb7Raw, {
  id: 'bombsoal-7',
  category: 'SSW',
  source: 'builtin',
});
console.log('Set 7 / Latihan 4 (20 soal) stats:', res7.stats, 'warnings:', res7.warnings);
assert.equal(res7.warnings.length, 0, 'Expected zero warnings on packs/bombsoal7.txt');
assert.equal(res7.stats.sections, 1, 'Expected 1 section in bombsoal7.txt');
assert.equal(res7.stats.questions, 20, 'Expected 20 questions in bombsoal7.txt');
assert.equal(res7.stats.withExplanations, 20, 'Expected 20 explanations in bombsoal7.txt');
const expectedSet7Keys = 'CCDCA BDBAD DCBCB CBCDC'.replace(/\s+/g, '');
const p7Qs = res7.pack.sections.flatMap((s) => s.questions);
p7Qs.forEach((q, idx) => {
  const expectedIdx = 'ABCD'.indexOf(expectedSet7Keys[idx]);
  assert.equal(q.answer, expectedIdx, `Set 7 answer mismatch at Q${idx + 1}`);
  assert.equal(q.options.length, 4, `Set 7 Q${idx + 1} has 4 options`);
  assert.ok(q.translation && q.translation.length > 5, `Set 7 translation present at Q${idx + 1}`);
});
assert.ok(p7Qs[18].text.includes('4. HACCP'), 'Q19 numbered sub-list preserved inside question stem');

const res8 = parseBombSoalText(bomb8Raw, {
  id: 'bombsoal-8',
  category: 'SSW',
  source: 'builtin',
});
console.log('Set 8 / Latihan 5 (20 soal) stats:', res8.stats, 'warnings:', res8.warnings);
assert.equal(res8.warnings.length, 0, 'Expected zero warnings on packs/bombsoal8.txt');
assert.equal(res8.stats.sections, 1, 'Expected 1 section in bombsoal8.txt');
assert.equal(res8.stats.questions, 20, 'Expected 20 questions in bombsoal8.txt');
assert.equal(res8.stats.withExplanations, 20, 'Expected 20 explanations in bombsoal8.txt');
const expectedSet8Keys = 'CCACA BBBAC BBCBC BCACB'.replace(/\s+/g, '');
const p8Qs = res8.pack.sections.flatMap((s) => s.questions);
p8Qs.forEach((q, idx) => {
  const expectedIdx = 'ABCD'.indexOf(expectedSet8Keys[idx]);
  assert.equal(q.answer, expectedIdx, `Set 8 answer mismatch at Q${idx + 1}`);
  assert.ok(q.translation && q.translation.length > 5, `Set 8 translation present at Q${idx + 1}`);
});
assert.ok(p8Qs[5].text.includes('4. 保管場所'), 'Latihan 5 Q6 numbered sub-list preserved inside stem');

const res9 = parseBombSoalText(bomb9Raw, {
  id: 'bombsoal-9',
  category: 'SSW',
  source: 'builtin',
});
console.log('Set 9 / Latihan 6 (20 soal) stats:', res9.stats, 'warnings:', res9.warnings);
assert.equal(res9.warnings.length, 0, 'Expected zero warnings on packs/bombsoal9.txt');
assert.equal(res9.stats.sections, 1, 'Expected 1 section in bombsoal9.txt');
assert.equal(res9.stats.questions, 20, 'Expected 20 questions in bombsoal9.txt');
assert.equal(res9.stats.withExplanations, 20, 'Expected 20 explanations in bombsoal9.txt');
const expectedSet9Keys = 'BCAAA AACAB ABCBB BCACB'.replace(/\s+/g, '');
const p9Qs = res9.pack.sections.flatMap((s) => s.questions);
p9Qs.forEach((q, idx) => {
  const expectedIdx = 'ABCD'.indexOf(expectedSet9Keys[idx]);
  assert.equal(q.answer, expectedIdx, `Set 9 answer mismatch at Q${idx + 1}`);
  assert.ok(q.translation && q.translation.length > 5, `Set 9 translation present at Q${idx + 1}`);
});

const res10 = parseBombSoalText(bomb10Raw, {
  id: 'bombsoal-10',
  category: 'SSW',
  source: 'builtin',
});
console.log('Set 10 / Latihan 7 (20 soal) stats:', res10.stats, 'warnings:', res10.warnings);
assert.equal(res10.warnings.length, 0, 'Expected zero warnings on packs/bombsoal10.txt');
assert.equal(res10.stats.sections, 1, 'Expected 1 section in bombsoal10.txt');
assert.equal(res10.stats.questions, 20, 'Expected 20 questions in bombsoal10.txt');
assert.equal(res10.stats.withExplanations, 20, 'Expected 20 explanations in bombsoal10.txt');
const expectedSet10Keys = 'AAAAA CACAB ABCBB BCACB'.replace(/\s+/g, '');
const p10Qs = res10.pack.sections.flatMap((s) => s.questions);
p10Qs.forEach((q, idx) => {
  const expectedIdx = 'ABC'.indexOf(expectedSet10Keys[idx]);
  assert.equal(q.answer, expectedIdx, `Set 10 answer mismatch at Q${idx + 1}`);
  assert.ok(q.translation && q.translation.length > 5, `Set 10 translation present at Q${idx + 1}`);
});
assert.ok(p10Qs[17].text.includes('4. HACCP'), 'Latihan 7 Q18 numbered sub-list preserved inside stem');

const res11 = parseBombSoalText(bomb11Raw, {
  id: 'bombsoal-11',
  category: 'SSW',
  source: 'builtin',
});
console.log('Set 11 / Latihan 8 (40 soal) stats:', res11.stats, 'warnings:', res11.warnings);
assert.equal(res11.warnings.length, 0, 'Expected zero warnings on packs/bombsoal11.txt');
assert.equal(res11.stats.sections, 2, 'Expected 2 sections in bombsoal11.txt');
assert.equal(res11.stats.questions, 40, 'Expected 40 questions in bombsoal11.txt');
assert.equal(res11.stats.withExplanations, 40, 'Expected 40 explanations in bombsoal11.txt');
const expectedSet11Keys = 'BBBBA BCBBB CACBB BCABC CBBBB AABBB BBBAB CAABA'.replace(
  /\s+/g,
  ''
);
const p11Qs = res11.pack.sections.flatMap((s) => s.questions);
p11Qs.forEach((q, idx) => {
  const expectedIdx = 'ABC'.indexOf(expectedSet11Keys[idx]);
  assert.equal(q.answer, expectedIdx, `Set 11 answer mismatch at Q${idx + 1}`);
  assert.ok(q.translation && q.translation.length > 5, `Set 11 translation present at Q${idx + 1}`);
});
assert.ok(p11Qs[25].text.includes('4. HACCP'), 'Latihan 8 Q26 numbered sub-list preserved inside stem');

// Verify combined count = 145 questions
const p1Qs = res1.pack.sections.flatMap((s) => s.questions);
const p2Qs = res2.pack.sections.flatMap((s) => s.questions);
assert.equal(p1Qs.length + p2Qs.length, 145, 'Expected 145 total questions across Part 1 + Part 2');

// Verify specific questions across Part 1 & Part 2
assert.equal(p1Qs[0].answer, 0); // Q1: A
assert.equal(p1Qs[84].number, 85);
assert.equal(p1Qs[84].answer, 1); // Q85: B

assert.equal(p2Qs[0].number, 86);
assert.equal(p2Qs[0].answer, 0); // Q86: A
assert.equal(p2Qs[58].number, 144);
assert.ok(p2Qs[58].text.includes('原材料A'), 'Q144 bullet list preserved inside question stem');
assert.equal(p2Qs[58].answer, 1); // Q144: B
assert.equal(p2Qs[59].number, 145);
assert.equal(p2Qs[59].answer, 0); // Q145: A

// Round-trip test: export -> re-parse preserves all questions and answers
for (const [label, res] of [
  ['Part 1', res1],
  ['Part 2', res2],
] as const) {
  const origQs = res.pack.sections.flatMap((s) => s.questions);
  const exported = exportPackToBombTxt(res.pack);
  const reparsed = parseBombSoalText(exported);
  assert.equal(reparsed.warnings.length, 0, `${label}: zero warnings after round-trip`);
  assert.equal(reparsed.stats.questions, origQs.length, `${label}: question count preserved`);
  const reparsedQs = reparsed.pack.sections.flatMap((s) => s.questions);
  origQs.forEach((q, idx) => {
    assert.equal(reparsedQs[idx].answer, q.answer, `${label} answer mismatch at #${q.number}`);
    assert.deepEqual(reparsedQs[idx].options, q.options, `${label} options mismatch at #${q.number}`);
  });
}

// Verify furigana + math rendering
const htmlRubyOn = renderToStaticMarkup(
  renderRichJapaneseText('日本(にほん)の**食品衛生** ($\\le 5^\\circ\\text{C}$)', true)
);
assert.ok(htmlRubyOn.includes('<ruby class="jp-ruby">日本<rp>(</rp><rt>にほん</rt><rp>)</rp></ruby>'));
assert.ok(htmlRubyOn.includes('<strong>食品衛生</strong>'));
assert.ok(htmlRubyOn.includes('≤ 5°C'));

const htmlRubyOff = renderToStaticMarkup(
  renderRichJapaneseText('日本(にほん)の食品衛生', false)
);
assert.equal(htmlRubyOff, '日本の食品衛生');
assert.equal(stripFurigana('食品衛生(しょくひんえいせい)'), '食品衛生');

// Verify sessionBuilder preserves correct answer text after option shuffling
const shuffledSession = buildActiveSession(res2.pack, {
  packId: res2.pack.id,
  mode: 'exam',
  sectionIds: [res2.pack.sections[0].id, res2.pack.sections[6].id],
  shuffleQuestions: true,
  shuffleOptions: true,
  durationSec: 1800,
  passingPct: 65,
});
assert.equal(shuffledSession.sections.length, 2);
assert.equal(shuffledSession.totalQuestions, 5);
shuffledSession.sections.forEach((sec) => {
  sec.questions.forEach((sq) => {
    const orig = p2Qs.find((o) => o.id === sq.id);
    assert.ok(orig, 'Original question found');
    assert.equal(
      sq.options[sq.answer],
      orig.options[orig.answer],
      'Correct option text preserved after shuffling'
    );
  });
});

// Verify draft snapshot + restore preserves exact shuffled order, answers, flags & timer
const draftLayout = extractDraftLayout(shuffledSession);
const firstQ = shuffledSession.sections[0].questions[0];
const restored = restoreSessionFromDraft(res2.pack, {
  packId: res2.pack.id,
  config: shuffledSession.config,
  sectionsLayout: draftLayout,
  sectionIdx: 1,
  questionIdx: 0,
  answers: { [firstQ.id]: firstQ.answer },
  flags: { [firstQ.id]: true },
  revealedMap: { [firstQ.id]: true },
  remainingSec: 1234,
  elapsedSec: 566,
  savedAt: new Date().toISOString(),
});
assert.ok(restored, 'Draft restored cleanly');
assert.equal(restored.totalQuestions, shuffledSession.totalQuestions);
assert.deepEqual(
  restored.sections[0].questions[0].options,
  firstQ.options,
  'Restored shuffled options match original session'
);
assert.equal(restored.sections[0].questions[0].answer, firstQ.answer);
assert.equal(restored.initialDraft?.flags[firstQ.id], true);
assert.equal(restored.initialDraft?.remainingSec, 1234);

console.log('ALL PART 1 (85) + PART 2 (60) = 145 QUESTIONS, MATH, RUBY & ROUND-TRIP CHECKS PASSED.');
