import React from 'react';

const FURIGANA_REGEX = /([\u4e00-\u9faf\u3400-\u4dbf々〆ヵヶ]+)\(([ぁ-んァ-ヶー]+)\)/g;

/**
 * Normalizes simple inline LaTeX math snippets (e.g., from Bomb Soal calculations)
 * into clean human-readable Unicode text.
 */
function normalizeInlineMath(raw: string): string {
  return raw
    .replace(/^\$|\$$/g, '')
    .replace(/\\text\{([^}]*)\}/g, '$1')
    .replace(/\\frac\{([^}]*)\}\{([^}]*)\}/g, '($1 / $2)')
    .replace(/\\times/g, '×')
    .replace(/\\div/g, '÷')
    .replace(/\\le/g, '≤')
    .replace(/\\ge/g, '≥')
    .replace(/\^\\circ/g, '°')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Renders plain text containing `漢字(かな)` furigana annotations.
 */
export function renderRubySegment(
  text: string,
  showFurigana: boolean,
  keyPrefix = 'r'
): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  const regex = new RegExp(FURIGANA_REGEX.source, 'g');
  let count = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }
    const [, kanji, kana] = match;
    if (showFurigana) {
      nodes.push(
        <ruby key={`${keyPrefix}-${count++}`} className="jp-ruby">
          {kanji}
          <rp>(</rp>
          <rt>{kana}</rt>
          <rp>)</rp>
        </ruby>
      );
    } else {
      nodes.push(kanji);
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes;
}

/**
 * Safely renders rich inline markdown (`**bold**`, `` `code` ``, `$math$`)
 * combined with Japanese `漢字(かな)` furigana.
 */
export function renderRichJapaneseText(
  input: string,
  showFurigana: boolean
): React.ReactNode {
  if (!input) return null;

  const lines = input.split('\n');
  const tokenRegex = /(\*\*[^*]+\*\*|`[^`]+`|\$[^$]+\$)/g;

  return lines.map((rawLine, lineIdx) => {
    const line = rawLine.replace(/^\*\s+/, '• ');
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    const regex = new RegExp(tokenRegex.source, 'g');
    let tokenCount = 0;

    while ((match = regex.exec(line)) !== null) {
      if (match.index > lastIndex) {
        parts.push(
          ...renderRubySegment(
            line.slice(lastIndex, match.index),
            showFurigana,
            `l${lineIdx}-t${tokenCount++}`
          )
        );
      }

      const token = match[0];
      if (token.startsWith('**') && token.endsWith('**')) {
        const inner = token.slice(2, -2);
        parts.push(
          <strong key={`l${lineIdx}-b${tokenCount++}`}>
            {renderRubySegment(inner, showFurigana, `l${lineIdx}-bi${tokenCount}`)}
          </strong>
        );
      } else if (token.startsWith('`') && token.endsWith('`')) {
        const inner = token.slice(1, -1);
        parts.push(
          <code key={`l${lineIdx}-c${tokenCount++}`} className="inline-code">
            {renderRubySegment(inner, showFurigana, `l${lineIdx}-ci${tokenCount}`)}
          </code>
        );
      } else if (token.startsWith('$') && token.endsWith('$')) {
        parts.push(
          <span key={`l${lineIdx}-m${tokenCount++}`} className="inline-math">
            {normalizeInlineMath(token)}
          </span>
        );
      }

      lastIndex = regex.lastIndex;
    }

    if (lastIndex < line.length) {
      parts.push(
        ...renderRubySegment(
          line.slice(lastIndex),
          showFurigana,
          `l${lineIdx}-e${tokenCount++}`
        )
      );
    }

    return (
      <React.Fragment key={`line-${lineIdx}`}>
        {parts}
        {lineIdx < lines.length - 1 && <br />}
      </React.Fragment>
    );
  });
}

/**
 * Strips `(かな)` furigana markers into plain kanji text (useful for searching).
 */
export function stripFurigana(text: string): string {
  return text.replace(FURIGANA_REGEX, '$1');
}

export function hasFurigana(text: string): boolean {
  return new RegExp(FURIGANA_REGEX.source).test(text);
}
