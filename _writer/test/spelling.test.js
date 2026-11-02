import { test } from "node:test";
import assert from "node:assert/strict";
import { proseWords } from "../src/spelling-core.ts";
test("spelling checks prose and link labels, skipping code, URLs and email", () => {
  const text = "😀 A speling [label](https://example.com/typpo) `coode`\n\n```js\ncoode\n```\n\n    coode\n\nhttps://example.com/typpo test@example.com we’re";
  const words = proseWords(text);
  assert.deepEqual(words.map(x => x.word), ["speling", "label", "we’re"]);
  for (const word of words) assert.equal(text.slice(word.from, word.to), word.word);
});
