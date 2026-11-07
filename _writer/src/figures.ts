import { StateField } from "@codemirror/state";
import { syntaxTree } from "@codemirror/language";
import { Decoration, EditorView, WidgetType, type DecorationSet } from "@codemirror/view";

class FigureWidget extends WidgetType {
  constructor(readonly source: string, readonly alt: string, readonly caption: string, readonly from: number) { super(); }
  eq(other: FigureWidget) { return this.source === other.source && this.alt === other.alt && this.caption === other.caption && this.from === other.from; }
  get estimatedHeight() { return 300; }
  toDOM(view: EditorView) {
    const figure = document.createElement("figure");
    figure.className = "writer-figure";
    const image = document.createElement("img");
    image.src = "/api/asset?path=" + encodeURIComponent(this.source.slice(1));
    image.alt = this.alt;
    image.loading = "lazy";
    image.addEventListener("load", () => view.requestMeasure());
    image.addEventListener("error", () => {
      image.hidden = true;
      const message = document.createElement("p");
      message.textContent = "Image unavailable: " + this.alt;
      figure.prepend(message);
      view.requestMeasure();
    }, { once: true });
    figure.append(image);
    if (this.caption) {
      const caption = document.createElement("figcaption");
      caption.textContent = this.caption;
      figure.append(caption);
    }
    const edit = document.createElement("button");
    edit.type = "button";
    edit.className = "figure-edit";
    edit.textContent = "Edit figure";
    edit.addEventListener("click", () => {
      view.dispatch({ selection: { anchor: this.from + 1 }, scrollIntoView: true });
      view.focus();
    });
    figure.append(edit);
    return figure;
  }
  ignoreEvent() { return true; }
}

export const figures = StateField.define<DecorationSet>({
  create: state => buildFigures(state),
  update: (value, tr) => tr.docChanged || tr.selection || syntaxTree(tr.startState) !== syntaxTree(tr.state) ? buildFigures(tr.state) : value,
  provide: field => EditorView.decorations.from(field),
});
function buildFigures(state: import("@codemirror/state").EditorState): DecorationSet {
  const ranges: ReturnType<Decoration["range"]>[] = [];
  syntaxTree(state).iterate({ enter(node) {
    if (node.name !== "HTMLBlock") return;
    const text = state.doc.sliceString(node.from, node.to);
    for (const match of text.matchAll(/<figure\b[^>]*>[\s\S]*?<\/figure>/gi)) {
      const from = node.from + match.index, to = from + match[0].length;
      if (state.selection.ranges.some(r => r.empty ? r.head > from && r.head < to : r.from < to && r.to > from)) continue;
      const parsed = new DOMParser().parseFromString(match[0], "text/html");
      const img = parsed.querySelector("figure img");
      const src = img?.getAttribute("src") || "";
      if (!src.startsWith("/assets/img/") || src.includes("..") || !/\.(webp|png|jpe?g|gif|avif)$/i.test(src)) continue;
      ranges.push(Decoration.replace({ block: true, widget: new FigureWidget(src,
        img?.getAttribute("alt") || "Article image", parsed.querySelector("figcaption")?.textContent || "", from) }).range(from, to));
    }
    return false;
  } });
  return Decoration.set(ranges, true);
}
