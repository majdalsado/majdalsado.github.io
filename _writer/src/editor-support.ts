import { EditorState } from "@codemirror/state";
import {
  EditorView,
  keymap,
  drawSelection,
  placeholder,
} from "@codemirror/view";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { markdown, markdownKeymap } from "@codemirror/lang-markdown";
import { syntaxHighlighting, HighlightStyle } from "@codemirror/language";
import { searchKeymap, highlightSelectionMatches } from "@codemirror/search";
import { tags } from "@lezer/highlight";
export const style = HighlightStyle.define([
  {
    tag: tags.heading1,
    fontSize: "1.55em",
    fontWeight: "500",
    lineHeight: "1.5",
  },
  { tag: tags.heading2, fontSize: "1.25em", fontWeight: "500" },
  { tag: tags.heading3, fontWeight: "500" },
  { tag: tags.strong, fontWeight: "600" },
  { tag: tags.emphasis, fontStyle: "italic" },
  { tag: tags.link, color: "var(--accent)", textDecoration: "underline" },
  { tag: tags.url, color: "var(--muted)" },
  {
    tag: tags.monospace,
    fontFamily: "var(--mono)",
    fontSize: ".88em",
  },
  { tag: tags.processingInstruction, color: "var(--muted)" },
  { tag: tags.quote, color: "var(--muted)" },
]);
export {
  EditorState,
  EditorView,
  keymap,
  drawSelection,
  placeholder,
  defaultKeymap,
  history,
  historyKeymap,
  markdown,
  markdownKeymap,
  syntaxHighlighting,
  searchKeymap,
  highlightSelectionMatches,
};
