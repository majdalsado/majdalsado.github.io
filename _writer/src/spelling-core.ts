import { parser } from "@lezer/markdown";
export type Misspelling = { from: number; to: number; word: string };

export function proseWords(text: string): Misspelling[] {
  const excluded: { from: number; to: number }[] = [];
  parser.parse(text).iterate({
    enter(node) {
      if (/^(FencedCode|CodeBlock|InlineCode|URL|Autolink|HTMLBlock|HTMLTag|LinkReference)$/.test(node.name)) {
        excluded.push({ from: node.from, to: node.to });
        return false;
      }
    },
  });
  // Bare URLs and email addresses are prose in CommonMark's syntax tree.
  for (const match of text.matchAll(/(?:https?:\/\/|www\.)\S+|[\w.+-]+@[\w.-]+\.[a-z]+/gi))
    excluded.push({ from: match.index, to: match.index + match[0].length });
  excluded.sort((a, b) => a.from - b.from);
  let index = 0;
  const words: Misspelling[] = [];
  for (const match of text.matchAll(/\p{L}+(?:['’]\p{L}+)*/gu)) {
    const from = match.index, to = from + match[0].length;
    while (index < excluded.length && excluded[index].to <= from) index++;
    if (excluded[index] && excluded[index].from < to) continue;
    if (match[0].length > 1) words.push({ from, to, word: match[0] });
  }
  return words;
}
