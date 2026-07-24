import React from 'react';

// Inline formatting within a single line: **bold**, *italic*, `code`.
// Returns an array of strings/React nodes suitable as JSX children.
function renderInline(text, keyPrefix) {
  const nodes = [];
  // Split on bold, italic, and inline-code markers while keeping the
  // delimiters so we know which style to apply to each piece.
  const parts = text.split(/(\*\*.+?\*\*|`.+?`|\*(?!\*).+?\*(?!\*))/g).filter(Boolean);
  parts.forEach((part, i) => {
    const key = `${keyPrefix}-${i}`;
    if (part.startsWith('**') && part.endsWith('**')) {
      nodes.push(<strong key={key} className="font-semibold">{part.slice(2, -2)}</strong>);
    } else if (part.startsWith('`') && part.endsWith('`')) {
      nodes.push(<code key={key} className="px-1 py-0.5 rounded bg-black/10 dark:bg-white/10 text-[0.85em] font-mono">{part.slice(1, -1)}</code>);
    } else if (part.startsWith('*') && part.endsWith('*')) {
      nodes.push(<em key={key}>{part.slice(1, -1)}</em>);
    } else {
      nodes.push(part);
    }
  });
  return nodes;
}

/**
 * Renders a chat message's text with basic markdown, the AI model is
 * prompted to use **bold**, bullet/numbered lists, and short paragraphs
 * (see systemPromptFor in aiService.js), but without this, that markdown
 * syntax would show up as literal asterisks and dashes rather than
 * actually being formatted. Deliberately minimal (no tables, headings,
 * links, images), a chat bubble doesn't need a full markdown engine,
 * just enough to make the model's structure readable.
 */
export default function FormattedMessage({ text }) {
  if (!text) return null;

  const lines = text.split('\n');
  const blocks = []; // { type: 'p' | 'ul' | 'ol', lines: [...] }

  lines.forEach((line) => {
    const bullet = /^\s*[-•]\s+(.*)/.exec(line);
    const numbered = /^\s*\d+[.)]\s+(.*)/.exec(line);
    if (bullet) {
      const last = blocks[blocks.length - 1];
      if (last?.type === 'ul') last.items.push(bullet[1]);
      else blocks.push({ type: 'ul', items: [bullet[1]] });
    } else if (numbered) {
      const last = blocks[blocks.length - 1];
      if (last?.type === 'ol') last.items.push(numbered[1]);
      else blocks.push({ type: 'ol', items: [numbered[1]] });
    } else if (line.trim() === '') {
      blocks.push({ type: 'gap' });
    } else {
      const last = blocks[blocks.length - 1];
      if (last?.type === 'p') last.lines.push(line);
      else blocks.push({ type: 'p', lines: [line] });
    }
  });

  return (
    <div className="space-y-2">
      {blocks.map((b, i) => {
        if (b.type === 'gap') return null;
        if (b.type === 'ul') {
          return (
            <ul key={i} className="list-disc pl-4 space-y-1">
              {b.items.map((item, j) => <li key={j}>{renderInline(item, `${i}-${j}`)}</li>)}
            </ul>
          );
        }
        if (b.type === 'ol') {
          return (
            <ol key={i} className="list-decimal pl-4 space-y-1">
              {b.items.map((item, j) => <li key={j}>{renderInline(item, `${i}-${j}`)}</li>)}
            </ol>
          );
        }
        return <p key={i} className="leading-relaxed">{renderInline(b.lines.join(' '), `${i}`)}</p>;
      })}
    </div>
  );
}
