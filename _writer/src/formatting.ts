import { EditorSelection } from "@codemirror/state";
import { keymap, type Command } from "@codemirror/view";

// Markdown has no underline syntax; Jekyll renders inline HTML.
export function toggleFormat(open: string, close = open): Command {
  return ({ state, dispatch }) => {
    const transaction = state.changeByRange(range => {
      const { from, to } = range;
      const selected = state.doc.sliceString(from, to);
      const before = state.doc.sliceString(Math.max(0, from - open.length), from);
      const after = state.doc.sliceString(to, to + close.length);
      if (before === open && after === close) {
        return { changes: [{ from: from - open.length, to: from }, { from: to, to: to + close.length }],
          range: EditorSelection.range(from - open.length, to - open.length) };
      }
      if (!range.empty && selected.startsWith(open) && selected.endsWith(close) && selected.length >= open.length + close.length) {
        return { changes: [{ from, to: from + open.length }, { from: to - close.length, to }],
          range: EditorSelection.range(from, to - open.length - close.length) };
      }
      // Press the shortcut again after typing to continue outside the formatting.
      if (range.empty && after === close && state.doc.sliceString(state.doc.lineAt(from).from, from).includes(open)) {
        return { range: EditorSelection.cursor(from + close.length) };
      }
      return { changes: { from, to, insert: open + selected + close },
        range: EditorSelection.range(from + open.length, to + open.length) };
    });
    dispatch(state.update(transaction, { userEvent: "input.format", scrollIntoView: true }));
    return true;
  };
}
export const formatting = keymap.of([
  { key: "Mod-b", run: toggleFormat("**"), preventDefault: true },
  { key: "Mod-i", run: toggleFormat("*"), preventDefault: true },
  { key: "Mod-u", run: toggleFormat("<u>", "</u>"), preventDefault: true },
]);
