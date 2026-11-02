import nspell from "nspell";
import aff from "../node_modules/dictionary-en/index.aff?raw";
import dic from "../node_modules/dictionary-en/index.dic?raw";
import { proseWords } from "./spelling-core.ts";
const dictionary = nspell({ aff, dic });
const normalized = (word: string) => word.replaceAll("’", "'");
self.onmessage = ({ data }) => {
  if (data.type === "check") {
    const cache = new Map<string, boolean>();
    const issues = proseWords(data.text).filter(({ word }) => {
      word = normalized(word);
      if (!cache.has(word)) cache.set(word, dictionary.correct(word));
      return !cache.get(word);
    });
    self.postMessage({ type: "check", id: data.id, issues });
  } else if (data.type === "suggest") {
    self.postMessage({ type: "suggest", id: data.id,
      suggestions: dictionary.suggest(normalized(data.word)).slice(0, 5) });
  }
};
