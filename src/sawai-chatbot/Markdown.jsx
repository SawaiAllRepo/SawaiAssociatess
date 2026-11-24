// Minimal, safe markdown for bot replies: **bold**, "-"/"1." lists,
// [links](https://...), bare https:// links and line breaks.
//
// It builds React elements directly (never dangerouslySetInnerHTML), so
// model output can't inject HTML or scripts. Only http(s) links render.

const INLINE_SOURCE = /\*\*(.+?)\*\*|\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|(https?:\/\/[^\s<>()]+[^\s<>().,!?;:'"])/.source;

const BULLET = /^\s*[-*•]\s+(.*)$/;
const NUMBERED = /^\s*\d+[.)]\s+(.*)$/;

const Link = ({ href, children }) => (
  <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>
);

function renderInline(text, keyPrefix) {
  const parts = [];
  let last = 0;
  let match;
  let i = 0;

  // A fresh regex per call: renderInline recurses for **bold**, and a
  // shared /g regex would have its position reset by the inner call.
  const inline = new RegExp(INLINE_SOURCE, "g");
  while ((match = inline.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    const key = `${keyPrefix}-${i++}`;
    if (match[1] !== undefined) parts.push(<strong key={key}>{renderInline(match[1], key)}</strong>);
    else if (match[2] !== undefined) parts.push(<Link key={key} href={match[3]}>{match[2]}</Link>);
    else parts.push(<Link key={key} href={match[4]}>{match[4]}</Link>);
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

/* Group lines into paragraphs (lines joined by <br/>) and lists. */
function toBlocks(text) {
  const blocks = [];
  let current = null;

  for (const line of text.replace(/\r\n/g, "\n").split("\n")) {
    const bullet = line.match(BULLET);
    const numbered = !bullet && line.match(NUMBERED);

    if (bullet || numbered) {
      const type = bullet ? "ul" : "ol";
      if (current?.type !== type) blocks.push((current = { type, lines: [] }));
      current.lines.push((bullet || numbered)[1]);
    } else if (!line.trim()) {
      current = null; // blank line ends the paragraph / list
    } else {
      if (current?.type !== "p") blocks.push((current = { type: "p", lines: [] }));
      current.lines.push(line.trim());
    }
  }
  return blocks;
}

export default function Markdown({ text }) {
  return (
    <div className="sc-md">
      {toBlocks(String(text || "")).map((block, b) => {
        if (block.type === "p") {
          return (
            <p key={b}>
              {block.lines.map((line, l) => (
                <span key={l}>{l > 0 && <br />}{renderInline(line, `${b}-${l}`)}</span>
              ))}
            </p>
          );
        }
        const List = block.type;
        return (
          <List key={b}>
            {block.lines.map((line, l) => <li key={l}>{renderInline(line, `${b}-${l}`)}</li>)}
          </List>
        );
      })}
    </div>
  );
}
