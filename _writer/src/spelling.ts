import { StateEffect, StateField } from "@codemirror/state";
import { Decoration, EditorView, ViewPlugin, keymap, showTooltip, type DecorationSet, type Tooltip, type ViewUpdate } from "@codemirror/view";
import type { Misspelling } from "./spelling-core.ts";

const setIssues = StateEffect.define<Misspelling[]>();
const setPopup = StateEffect.define<Tooltip | null>();
const issuesField = StateField.define<Misspelling[]>({
  create: () => [],
  update(value, tr) {
    if (tr.docChanged) value = [];
    for (const effect of tr.effects) if (effect.is(setIssues)) value = effect.value;
    return value;
  },
});
const marks = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(value, tr) {
    if (tr.docChanged) value = Decoration.none;
    for (const effect of tr.effects) if (effect.is(setIssues))
      value = Decoration.set(effect.value.map(issue => Decoration.mark({
        class: "spelling-error", attributes: { title: "Spelling suggestions (Alt+Enter)" },
      }).range(issue.from, issue.to)), true);
    return value;
  },
  provide: field => EditorView.decorations.from(field),
});
const popup = StateField.define<Tooltip | null>({
  create: () => null,
  update(value, tr) {
    if (tr.docChanged || tr.selection) value = null;
    for (const effect of tr.effects) if (effect.is(setPopup)) value = effect.value;
    return value;
  },
  provide: field => showTooltip.from(field),
});
const checker = ViewPlugin.fromClass(class {
  worker = new Worker(new URL("./spelling.worker.ts", import.meta.url), { type: "module" });
  timer?: ReturnType<typeof setTimeout>;
  version = 0;
  request = 0;
  pending?: { id: number; version: number; issue: Misspelling; keyboard: boolean };
  constructor(readonly view: EditorView) {
    this.worker.onmessage = ({ data }) => {
      if (data.type === "check" && data.id === this.version) {
        view.dispatch({ effects: setIssues.of(data.issues) });
      } else if (data.type === "suggest" && this.pending && this.pending.id === data.id && this.pending.version === this.version) {
        const { issue, keyboard } = this.pending;
        this.pending = undefined;
        view.dispatch({ effects: setPopup.of({
          pos: issue.from, end: issue.to, above: false,
          create: () => {
            const dom = document.createElement("div");
            dom.className = "spelling-suggestions";
            dom.setAttribute("role", "group");
            dom.setAttribute("aria-label", `Spelling suggestions for ${issue.word}`);
            if (!data.suggestions.length) dom.textContent = "No suggestions";
            for (const suggestion of data.suggestions as string[]) {
              const button = document.createElement("button");
              button.type = "button";
              button.textContent = suggestion;
              button.addEventListener("click", () => {
                if (view.state.doc.sliceString(issue.from, issue.to) !== issue.word) return;
                view.dispatch({ changes: { from: issue.from, to: issue.to, insert: suggestion },
                  selection: { anchor: issue.from + suggestion.length }, userEvent: "input.spelling" });
                view.focus();
              });
              dom.append(button);
            }
            dom.addEventListener("keydown", event => {
              if (event.key === "Escape") {
                event.preventDefault();
                view.dispatch({ effects: setPopup.of(null) });
                view.focus();
              }
            });
            return { dom, mount() { if (keyboard) dom.querySelector("button")?.focus(); } };
          },
        }) });
      }
    };
    this.schedule();
  }
  schedule() {
    this.version++;
    this.pending = undefined;
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.worker.postMessage({ type: "check", id: this.version, text: this.view.state.doc.toString() }), 400);
  }
  update(update: ViewUpdate) {
    if (update.docChanged) this.schedule();
    if (update.selectionSet) this.pending = undefined;
  }
  suggest(pos: number, keyboard = false) {
    const issue = this.view.state.field(issuesField).find(item => item.from <= pos && pos <= item.to);
    if (!issue) return false;
    const id = ++this.request;
    this.pending = { id, version: this.version, issue, keyboard };
    this.worker.postMessage({ type: "suggest", id, word: issue.word });
    return true;
  }
  destroy() { clearTimeout(this.timer); this.worker.terminate(); }
}, {
  eventHandlers: {
    click(event, view) {
      if (!(event.target instanceof Element) || !event.target.closest(".spelling-error")) {
        if (view.state.field(popup)) view.dispatch({ effects: setPopup.of(null) });
        return false;
      }
      const pos = view.posAtCoords({ x: event.clientX, y: event.clientY });
      return pos !== null && this.suggest(pos);
    },
  },
});
export const spelling = [issuesField, marks, popup, checker, keymap.of([
  { key: "Alt-Enter", run: view => view.plugin(checker)?.suggest(view.state.selection.main.head, true) ?? false },
  { key: "Escape", run: view => {
    if (!view.state.field(popup)) return false;
    view.dispatch({ effects: setPopup.of(null) });
    return true;
  } },
])];
