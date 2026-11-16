/**
 * ============================================================================
 * KNOWLEDGE SYSTEMS — REPLY RENDERER
 * ============================================================================
 *
 * The backend answers /chat in one piece of plain text (markdown-ish, as models
 * write it). The workspace renders structured blocks:
 *
 *   { type: "heading",   level, text }
 *   { type: "paragraph", segments: [{ type: "text", value }] }
 *   { type: "code",      language, text }
 *
 * so this module turns the reply into those blocks.
 *
 * `reveal` walks the fully-parsed blocks and returns a shallow prefix of them
 * after `charCount` visible characters. Revealing from already-parsed blocks
 * means a half-written "## Heading" never flashes its hashes, and the cursor
 * never sits inside a code fence.
 */

const HEADING = /^(#{1,6})\s+(.*)$/;
const FENCE = /^\s{0,3}(```|~~~)\s*([\w+-]*)\s*$/;
const LIST_ITEM = /^\s*([-*•]|\d+[.)])\s+/;
const QUOTE = /^\s*>\s?/;

/**
 * Parse a reply into renderable blocks. Angle brackets and other markup stay
 * literal text — Vue escapes every interpolation, so nothing here is trusted HTML.
 */
export function parseReply(text) {
  const blocks = [];
  let paragraph = [];
  let code = null;

  const flushParagraph = () => {
    if (!paragraph.length) return;
    const value = paragraph.join("\n").trim();
    paragraph = [];
    if (value) {
      blocks.push({ type: "paragraph", segments: [{ type: "text", value }] });
    }
  };

  String(text || "")
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .forEach((line) => {
      const fence = line.match(FENCE);
      if (fence) {
        if (code) {
          // Closing fence: emit the block without its trailing blank line.
          blocks.push({
            type: "code",
            language: code.language,
            text: code.lines.join("\n").replace(/\n+$/, ""),
          });
          code = null;
        } else {
          flushParagraph();
          code = { language: fence[2] || "", lines: [] };
        }
        return;
      }

      if (code) {
        code.lines.push(line);
        return;
      }

      if (!line.trim()) {
        flushParagraph();
        return;
      }

      const heading = line.match(HEADING);
      if (heading) {
        flushParagraph();
        blocks.push({
          type: "heading",
          level: Math.min(heading[1].length, 3),
          text: heading[2].trim(),
        });
        return;
      }

      // Models number their own sections; insisting on our own breaks "1.5".
      // So list items and quotes simply read as lines of the same paragraph.
      paragraph.push(line.replace(LIST_ITEM, "$1 ").replace(QUOTE, ""));
    });

  // An unclosed fence (a reply cut short) still renders as code.
  if (code) {
    blocks.push({
      type: "code",
      language: code.language,
      text: code.lines.join("\n"),
    });
  }
  flushParagraph();
  return blocks;
}

/** Total visible characters across blocks. */
export function blockCharCount(blocks) {
  return blocks.reduce(
    (sum, block) =>
      sum +
      (block.type === "paragraph"
        ? block.segments.reduce((n, seg) => n + seg.value.length, 0)
        : block.type === "code"
          ? block.text.length
          : block.text.length),
    0,
  );
}

/**
 * Prefix of `blocks` containing exactly `charCount` characters.
 * Paragraphs are clipped mid-word so the typewriter advances per character;
 * code blocks appear whole once their turn comes.
 */
export function reveal(blocks, charCount) {
  let remaining = Math.max(0, charCount);
  const out = [];

  for (const block of blocks) {
    if (remaining <= 0) break;

    if (block.type === "paragraph") {
      const segments = [];
      for (const seg of block.segments) {
        if (remaining <= 0) break;
        if (seg.value.length <= remaining) {
          segments.push({ ...seg });
          remaining -= seg.value.length;
        } else {
          segments.push({ ...seg, value: seg.value.slice(0, remaining) });
          remaining = 0;
        }
      }
      if (segments.length) out.push({ type: "paragraph", segments });
    } else {
      // Headings and code appear as soon as the reveal reaches them.
      out.push({ ...block });
      remaining -= block.text.length;
    }
  }

  return out;
}
