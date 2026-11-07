import { readRoute, routeURL, type Route } from "./url-state.ts";
import { api } from "./api.ts";
import {
  errorMessage,
  recoverySchema,
  type Config,
  type Post,
  type PostSummary,
  type Metadata,
  type GitState,
} from "../contracts.ts";
import type { EditorView } from "@codemirror/view";
import "@fontsource-variable/newsreader/standard.css";
import "@fontsource-variable/newsreader/standard-italic.css";
import "./style.css";
type InputId =
  | "#title"
  | "#date"
  | "#categories"
  | "#reading_time"
  | "#feature_image"
  | "#search";
type AreaId = "#description" | "#commit-message";
type SelectResult<S extends string> = S extends InputId
  ? HTMLInputElement
  : S extends AreaId
    ? HTMLTextAreaElement
    : S extends "#category"
      ? HTMLSelectElement
      : S extends "#details"
        ? HTMLElement
        : S extends "#preview-frame"
          ? HTMLIFrameElement
          : S extends "#commit" | "#push"
            ? HTMLButtonElement
            : HTMLElement;
function $<S extends string>(selector: S): SelectResult<S> {
  const element = document.querySelector(selector);
  if (!element) throw new Error("Missing UI element: " + selector);
  return element as SelectResult<S>;
}
const esc = (s: unknown) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[c] ?? c,
  );
let config: Config,
  posts: PostSummary[] = [],
  current: Post | null = null,
  editor: EditorView | null = null,
  screen = "library",
  filter = "all",
  query = "",
  category = "",
  dirty = false,
  savePromise: Promise<void> | null = null,
  saveTimer: ReturnType<typeof setTimeout> | undefined,
  revision = 0,
  previewTimer: ReturnType<typeof setInterval> | undefined,
  previewOpen = false,
  gitState: GitState | null = null,
  selected = new Set<string>(),
  busy = false;
let metadata: Metadata = {};
const app = $("#app");
let restoringRoute = false;
let routeQueue = Promise.resolve();
function currentRoute(): Route {
  if (screen === "editor" && current) return {
    screen: "editor", file: current.path,
    ...(previewOpen ? { panel: "preview" as const } :
      document.querySelector("#details:not([hidden])") ? { panel: "details" as const } : {}),
  };
  return { screen: screen === "git" ? "git" : "library" };
}
function syncURL(replace = false) {
  if (restoringRoute) return;
  const url = routeURL(currentRoute());
  if (url !== location.pathname + location.search + location.hash)
    history[replace ? "replaceState" : "pushState"](null, "", url);
}
function rememberPosition() {
  if (!editor || !current) return;
  try { sessionStorage.setItem("writer-position:" + current.path, JSON.stringify({
    anchor: editor.state.selection.main.anchor, head: editor.state.selection.main.head,
    scroll: previewOpen ? $(".writing-pane").scrollTop : window.scrollY,
  })); } catch {}
}
async function restoreRoute(route: Route) {
  restoringRoute = true;
  try {
    await save();
    if (route.screen === "editor") {
      if (screen !== "editor" || current?.path !== route.file) await openPost(route.file);
      setDetails(route.panel === "details");
      if (previewOpen !== (route.panel === "preview")) await togglePreview();
    } else if (route.screen === "git") await git();
    else await library();
  } catch (e) {
    if (!editor || !current) await library();
    error(e);
  } finally {
    restoringRoute = false;
    syncURL(true);
  }
}
window.addEventListener("popstate", () => {
  const target = readRoute(location.search);
  routeQueue = routeQueue.then(() => restoreRoute(target)).catch(error);
});
function icon(name: string) {
  const icons: Record<string, string> = {
    back: "←",
    plus: "+",
    preview: "◧",
    details: "☷",
    git: "⑂",
    close: "×",
  };
  return icons[name] || name;
}
function error(e: unknown) {
  const el = document.querySelector<HTMLElement>("#notice");
  if (el) {
    el.hidden = false;
    el.textContent = errorMessage(e);
    el.setAttribute("role", "alert");
  } else alert(errorMessage(e));
}
function today() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Edmonton",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
function shell(content: string) {
  app.innerHTML = `<div id="notice" hidden></div>${content}`;
  window.scrollTo(0, 0);
}
function recoveryKey(p: string) {
  return "writer:" + config.root + ":" + p;
}
function markDirty() {
  if (!current || !editor) return;
  dirty = true;
  revision++;
  localStorage.setItem(
    recoveryKey(current.path),
    JSON.stringify({
      body: editor.state.doc.toString(),
      meta: metadata,
      version: current.version,
    }),
  );
  updateSave("Unsaved");
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => save().catch(error), 650);
}
function updateSave(text: string) {
  if (document.querySelector("#save-status"))
    $("#save-status").textContent = text;
  if (document.querySelector("#words") && editor)
    $("#words").textContent =
      editor.state.doc.toString().trim().split(/\s+/).filter(Boolean).length +
      " words";
}
async function save() {
  clearTimeout(saveTimer);
  if (savePromise) {
    await savePromise;
    if (dirty) return save();
    return;
  }
  if (!current || !editor || !dirty) return;
  const post = current,
    rev = revision,
    body = editor.state.doc.toString(),
    meta = structuredClone(metadata);
  updateSave("Saving…");
  savePromise = api(
    "post",
    { path: post.path, version: post.version, body, meta },
    "PUT",
  )
    .then((result) => {
      current = result;
      if (post.path !== result.path) {
        const cachedRecovery = localStorage.getItem(recoveryKey(post.path));
        if (cachedRecovery) localStorage.setItem(recoveryKey(result.path), cachedRecovery);
        localStorage.removeItem(recoveryKey(post.path));
        const label = document.querySelector(".file-path");
        if (label) label.textContent = result.path;
        syncURL(true);
      }
      if (revision === rev) {
        dirty = false;
        localStorage.removeItem(recoveryKey(result.path));
        updateSave("Saved locally");
      } else {
        const cached = JSON.parse(
          localStorage.getItem(recoveryKey(result.path)) || "{}",
        );
        cached.version = result.version;
        localStorage.setItem(recoveryKey(result.path), JSON.stringify(cached));
      }
    })
    .catch((e) => {
      updateSave("Not saved · retry ⌘S");
      throw e;
    })
    .finally(() => (savePromise = null));
  await savePromise;
  if (dirty) return save();
}
async function navigate(fn: () => Promise<void>) {
  try {
    await save();
    await fn();
  } catch (e) {
    error(e);
  }
}
function destroyEditor() {
  rememberPosition();
  editor?.destroy();
  editor = null;
  clearInterval(previewTimer);
  previewOpen = false;
}
async function library() {
  destroyEditor();
  current = null;
  screen = "library";
  posts = await api("posts");
  shell(
    `<main class="library"><header class="library-head"><a class="wordmark" href="#" aria-label="Pareto Writer home">pareto writer</a><div class="head-actions"><button id="git">${icon("git")} <span>Git</span></button><button class="primary" id="new">${icon("plus")} New draft</button></div></header><section class="library-title"><p class="eyebrow">ALSADO.CA · LOCAL WORKSPACE</p><h1>Writing</h1></section><div class="library-tools"><div class="tabs" role="group" aria-label="Filter writing"><button data-filter="all">All writing <small>${posts.length}</small></button><button data-filter="draft">Drafts <small>${posts.filter((p) => p.kind === "draft").length}</small></button><button data-filter="post">Posts <small>${posts.filter((p) => p.kind === "post").length}</small></button></div><div class="search-tools"><input id="search" type="search" placeholder="Search posts and drafts…" aria-label="Search writing"><select id="category" aria-label="Category"><option value="">All categories</option>${[
      ...new Set(
        posts.flatMap((p) =>
          Array.isArray(p.meta.categories) ? p.meta.categories : [],
        ),
      ),
    ]
      .sort()
      .map((c) => `<option>${esc(c)}</option>`)
      .join(
        "",
      )}</select></div></div><div class="list-heading"><span>TITLE</span><span>DATE / WORDS</span></div><div id="posts"></div><footer class="library-footer"><span><kbd>⌘</kbd> <kbd>N</kbd> new draft</span></footer></main>`,
  );
  $(".wordmark").onclick = (event) => { event.preventDefault(); void navigate(library); };
  $("#new").onclick = () => newDraft();
  $("#git").onclick = () => navigate(git);
  $("#search").value = query;
  $("#search").oninput = (e) => {
    query = $("#search").value;
    renderList();
  };
  $("#category").value = category;
  $("#category").onchange = (e) => {
    category = $("#category").value;
    renderList();
  };
  document.querySelectorAll<HTMLElement>("[data-filter]").forEach(
    (b) =>
      (b.onclick = () => {
        filter = b.dataset.filter || "all";
        renderList();
      }),
  );
  renderList();
  syncURL();
}
function renderList() {
  try { sessionStorage.setItem("writer-library", JSON.stringify({ filter, query, category })); } catch {}
  document.querySelectorAll<HTMLElement>("[data-filter]").forEach((b) => {
    b.classList.toggle("selected", b.dataset.filter === filter);
    b.setAttribute("aria-pressed", String(b.dataset.filter === filter));
  });
  const list = posts
    .filter(
      (p) =>
        (filter === "all" || p.kind === filter) &&
        (!category || (p.meta.categories || []).includes(category)) &&
        `${p.title} ${p.excerpt} ${(p.meta.categories || []).join(" ")}`
          .toLowerCase()
          .includes(query.toLowerCase()),
    )
    .sort(
      (a, b) =>
        String(b.meta.date || "").localeCompare(String(a.meta.date || "")) ||
        a.title.localeCompare(b.title),
    );
  $("#posts").innerHTML = list.length
    ? list
        .map(
          (p) =>
            `<button class="post-row" data-path="${esc(p.path)}"><span class="post-copy"><span class="post-title">${esc(p.title)} ${p.kind === "draft" ? '<span class="draft-dot" title="Draft"></span>' : ""}</span><span class="post-excerpt">${esc(p.excerpt || "No preview text")}</span></span><span class="post-info"><span>${p.kind === "draft" ? "Draft" : esc(String(p.meta.date || "").slice(0, 10))}</span><span>${p.words.toLocaleString()} words</span></span></button>`,
        )
        .join("")
    : '<p class="empty">No matching posts or drafts.</p>';
  document
    .querySelectorAll<HTMLElement>("[data-path]")
    .forEach((b) => (b.onclick = () => openPost(b.dataset.path!).catch(error)));
}
async function newDraft() {
  await navigate(async () => {
    const p = await api("posts", { title: "Untitled" });
    await openPost(p.path);
    setDetails(true);
    $("#title").select();
  });
}
async function openPost(rel: string, replaceURL = false) {
  const {
    EditorState,
    EditorView,
    keymap,
    drawSelection,
    placeholder,
    defaultKeymap,
    indentWithTab,
    indentUnit,
    history,
    historyKeymap,
    markdown,
    markdownKeymap,
    syntaxHighlighting,
    searchKeymap,
    highlightSelectionMatches,
    style,
    spelling,
    formatting,
    figures,
  } = await import("./editor-support.ts");
  const p = await api(`post?path=${encodeURIComponent(rel)}`);
  destroyEditor();
  current = p;
  metadata = structuredClone(p.meta);
  dirty = false;
  revision = 0;
  screen = "editor";
  let body = p.body;
  const cached = localStorage.getItem(recoveryKey(rel));
  let recovery = false;
  if (cached) {
    try {
      const saved = recoverySchema.parse(JSON.parse(cached));
      if (saved.version === p.version) {
        body = saved.body;
        metadata = saved.meta;
        recovery = true;
      }
    } catch {}
  }
  shell(
    `<header class="editor-head"><button id="back" title="Writing list (⌘⇧L)">← <span>Writing</span></button><span class="document-label">${esc(p.title)}</span><div class="head-actions"><span id="kind-label" class="document-status">${p.kind === "draft" ? "Draft" : "Post"}</span><button id="details-toggle" aria-expanded="false" aria-controls="details">Details</button><button id="preview-toggle" title="Preview (⌘⇧P)" aria-pressed="false">◧ <span>Preview</span></button><button id="git" title="Git">⑂ <span>Git</span></button></div></header><main class="writing-layout"><section class="writing-pane"><div id="editor"></div></section><aside id="details" hidden aria-label="Document details"><div class="inspector-head"><h2>Document details</h2><button id="close-details" aria-label="Close document details">×</button></div><div class="details-fields"><label class="full">Title<input id="title" value="${esc(metadata.title || "")}" autocomplete="off"></label><label>Date<input id="date" type="date" value="${esc(String(metadata.date || "").slice(0, 10))}"></label><label>Categories<input id="categories" value="${esc((Array.isArray(metadata.categories) ? metadata.categories : []).join(", "))}" placeholder="thoughts, programming"></label><label class="full">Description<textarea id="description" rows="2">${esc(metadata.description || "")}</textarea></label><label>Reading time (minutes)<input id="reading_time" type="number" min="1" value="${esc(metadata.reading_time || 1)}"></label><label>Feature image<input id="feature_image" value="${esc(metadata.feature_image || "")}" placeholder="/assets/img/…"></label><div class="full document-actions"><span id="words"></span><button id="save-status" title="Save locally (⌘S)">Saved locally</button><span class="file-path">${esc(p.path)}</span><button id="rename">Update filename</button><button id="move">${p.kind === "draft" ? "Move to Posts" : "Move to Drafts"}</button></div></div></aside><section id="preview-pane" hidden aria-label="Jekyll preview"><div class="preview-bar"><span>JEKYLL PREVIEW</span><div><button id="refresh-preview">Refresh</button><button id="close-preview" aria-label="Close preview">×</button></div></div><p id="preview-message" class="subtle">Starting local Jekyll…</p><iframe id="preview-frame" title="Actual Jekyll page" sandbox="allow-scripts allow-same-origin" hidden></iframe></section></main>`,
  );
  editor = new EditorView({
    parent: $("#editor"),
    state: EditorState.create({
      doc: body,
      extensions: [
        history(),
        drawSelection(),
        markdown(),
        spelling,
        formatting,
        figures,
        indentUnit.of("    "),
        syntaxHighlighting(style),
        EditorView.lineWrapping,
        highlightSelectionMatches(),

        keymap.of([
          indentWithTab,
          ...defaultKeymap,
          ...historyKeymap,
          ...markdownKeymap,
          ...searchKeymap,
        ]),
        EditorView.contentAttributes.of({
          "aria-label": "Markdown body",
          spellcheck: "false",
          autocorrect: "off",
          writingsuggestions: "false",
          lang: "en",
        }),
        EditorView.updateListener.of((u) => {
          if (u.docChanged) markDirty();
        }),
        EditorView.domEventHandlers({
          paste: handlePaste,
          drop: handleDrop,
          dragover: (e) => {
            if (e.dataTransfer?.types.includes("Files")) {
              e.preventDefault();
              return true;
            }
            return false;
          },
        }),
      ],
    }),
  });
  for (const name of [
    "title",
    "date",
    "categories",
    "description",
    "reading_time",
    "feature_image",
  ] as const)
    document.querySelector<HTMLInputElement | HTMLTextAreaElement>(
      "#" + name,
    )!.oninput = (e) => {
      const input = e.currentTarget as HTMLInputElement | HTMLTextAreaElement;
      if (name === "categories")
        metadata.categories = input.value
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
      else if (name === "reading_time")
        metadata.reading_time = Math.max(1, Number(input.value) || 1);
      else if (name === "date") metadata.date = input.value || null;
      else metadata[name] = input.value;
      if (name === "title")
        $(".document-label").textContent = input.value || "Untitled";
      markDirty();
    };
  $("#back").onclick = () => navigate(library);
  $("#git").onclick = () => navigate(git);
  $("#save-status").onclick = () => save().catch(error);
  $("#details-toggle").onclick = () => setDetails(Boolean($("#details").hidden));
  $("#close-details").onclick = () => {
    setDetails(false);
    $("#details-toggle").focus();
  };
  $("#preview-toggle").onclick = togglePreview;
  $("#close-preview").onclick = togglePreview;
  $("#refresh-preview").onclick = () => refreshPreview(true);
  $("#move").onclick = movePost;
  $("#rename").onclick = () => navigate(async () => {
    if (!current || !editor) return;
    const renamed = await api("post", { path: current.path, version: current.version,
      body: editor.state.doc.toString(), meta: metadata, updateFilename: true }, "PUT");
    await openPost(renamed.path, true);
    setDetails(true);
    syncURL(true);
  });
  if (recovery) {
    markDirty();
    error(new Error("Recovered your unsaved local writing."));
  } else if (cached) {
    error(
      new Error(
        "A recovered copy differs from the file on disk. Download it before continuing.",
      ),
    );
    const b = document.createElement("button");
    b.textContent = "Download recovered copy";
    b.onclick = () => {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(
        new Blob([cached], { type: "application/json" }),
      );
      a.download = "recovered-draft.json";
      a.click();
    };
    $("#notice").append(b);
  }
  updateSave(recovery ? "Recovered · saving…" : "Saved locally");
  try {
    const position = JSON.parse(sessionStorage.getItem("writer-position:" + rel) || "null");
    if (position && editor) {
      const clamp = (n: unknown) => typeof n === "number" && Number.isFinite(n) ? Math.max(0, Math.min(editor!.state.doc.length, Math.floor(n))) : 0;
      editor.dispatch({ selection: { anchor: clamp(position.anchor), head: clamp(position.head) } });
      const view = editor;
      requestAnimationFrame(() => { if (editor === view && Number.isFinite(position.scroll)) {
        if (previewOpen) $(".writing-pane").scrollTop = position.scroll;
        else window.scrollTo(0, position.scroll);
      } });
    }
  } catch {}
  editor?.focus();
  syncURL(replaceURL);
}
async function movePost() {
  await navigate(async () => {
    if (!current) return;
    const date = $("#date").value || today();
    if (current.kind === "draft" && !$("#date").value) {
      setDetails(true);
      $("#date").value = date;
      metadata.date = date;
      markDirty();
      error(
        new Error(
          "Choose a date in Document details, then click Move to Posts again.",
        ),
      );
      $("#date").focus();
      return;
    }
    const next = await api("move", {
      path: current.path,
      version: current.version,
      kind: current.kind === "draft" ? "post" : "draft",
      date,
    });
    await openPost(next.path);
  });
}
async function upload(file: File) {
  if (!current || !editor) return;
  const post = current.path,
    view = editor;
  const data = await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(",")[1]);
    r.onerror = () => reject(new Error("Could not read image"));
    r.readAsDataURL(file);
  });
  const result = await api("image", {
    path: post,
    name: file.name || "pasted.png",
    data,
  });
  if (editor !== view)
    throw new Error(
      "Image saved, but the document changed. Image: " + result.url,
    );
  const insert = `![${file.name.replace(/\.[^.]+$/, "").replace(/[\[\]]/g, "")}](${result.url})`;
  const from = view.state.selection.main.from;
  view.dispatch({
    changes: { from, to: view.state.selection.main.to, insert },
    selection: { anchor: from + 2, head: from + insert.indexOf("]") },
  });
  view.focus();
}
function handlePaste(e: ClipboardEvent) {
  const files = [...(e.clipboardData?.files || [])];
  if (!files.length) return false;
  e.preventDefault();
  (async () => {
    for (const f of files) await upload(f);
  })().catch(error);
  return true;
}
function handleDrop(e: DragEvent, view: EditorView) {
  const files = [...(e.dataTransfer?.files || [])];
  if (!files.length) return false;
  e.preventDefault();
  const pos = view.posAtCoords({ x: e.clientX, y: e.clientY });
  if (pos !== null) view.dispatch({ selection: { anchor: pos } });
  (async () => {
    for (const f of files) await upload(f);
  })().catch(error);
  return true;
}
function setDetails(open: boolean) {
  if (open && previewOpen) void togglePreview();
  $("#details").hidden = !open;
  $("#details-toggle").setAttribute("aria-expanded", String(open));
  $(".writing-layout").classList.toggle("with-details", open);
  syncURL(true);
}
async function togglePreview() {
  previewOpen = !previewOpen;
  if (previewOpen) setDetails(false);
  $("#preview-pane").hidden = !previewOpen;
  $(".writing-layout").classList.toggle("with-preview", previewOpen);
  $("#preview-toggle").setAttribute("aria-pressed", String(previewOpen));
  syncURL(true);
  if (!previewOpen) {
    clearInterval(previewTimer);
    editor?.focus();
    return;
  }
  try {
    await save();
    await api("preview/start", {});
    await refreshPreview(true);
    previewTimer = setInterval(() => refreshPreview(false), 1800);
  } catch (e) {
    error(e);
  }
}
let lastPreviewVersion = "";
async function refreshPreview(force: boolean) {
  if (!current || !previewOpen) return;
  try {
    const path = current.path;
    const s = await api(`preview?path=${encodeURIComponent(path)}`);
    if (!previewOpen || current?.path !== path) return;
    if (s.error) {
      $("#preview-message").hidden = false;
      $("#preview-message").textContent = s.error;
      return;
    }
    if (s.url) {
      $("#preview-message").hidden = true;
      const frame = $("#preview-frame");
      frame.hidden = false;
      if (
        force ||
        lastPreviewVersion !== path + ":" + s.generation ||
        !frame.src
      ) {
        frame.src = s.url + "?writer=" + Date.now();
        lastPreviewVersion = path + ":" + s.generation;
      }
    } else {
      $("#preview-message").hidden = false;
      $("#preview-message").textContent = "Jekyll is building this page…";
    }
  } catch (e) {
    error(e);
  }
}
async function git() {
  destroyEditor();
  current = null;
  screen = "git";
  selected = new Set();
  gitState = await api("git");
  const state = gitState;
  shell(
    `<main class="git-page"><header class="library-head"><button id="back">← Writing</button><span class="eyebrow">SOURCE CONTROL</span><button id="refresh">Refresh</button></header><div class="git-title"><div><p class="eyebrow">${esc(gitState.branch || "DETACHED HEAD")}</p><h1>Git</h1></div><div class="sync-state"><span>${gitState.ahead} ahead · ${gitState.behind} behind</span><button class="primary" id="push" ${!gitState.upstream || !gitState.ahead ? "disabled" : ""}>Push ↑</button></div></div><p class="subtle git-explainer">Remote: ${esc(gitState.upstream || "not configured")}. Counts reflect the last known remote state.</p><div class="git-grid"><section class="changes"><div class="section-label">CHANGED FILES <span>${gitState.files.length}</span></div><div id="changed-files">${gitState.files.map((f, i) => `<div class="change-row"><input type="checkbox" aria-label="Include ${esc(f.path)}" data-index="${i}"><button data-diff="${i}"><span class="git-code">${esc(f.status)}</span><span>${esc(f.path)}</span></button></div>`).join("") || '<p class="empty">Working tree is clean.</p>'}</div><label class="commit-label">Commit message<textarea id="commit-message" rows="3" placeholder="What changed?"></textarea></label><button class="primary" id="commit" disabled>Commit selected files</button></section><section class="diff-pane"><div class="section-label" id="diff-title">DIFF</div><pre id="diff">Select a file to review its changes.</pre></section></div><section class="history"><h2>Recent commits</h2>${gitState.log.map((l) => `<div class="commit-row"><code>${esc(l.id)}</code><span>${esc(l.message)}</span><small>${esc(l.when)}</small></div>`).join("")}</section><pre id="git-output" hidden aria-live="polite"></pre></main>`,
  );
  $("#back").onclick = () => library().catch(error);
  $("#refresh").onclick = () => git().catch(error);
  $("#push").onclick = () => gitAction("push", {});
  $("#commit").onclick = () =>
    gitAction("commit", {
      paths: [...selected],
      message: $("#commit-message").value,
    });
  $("#commit-message").oninput = updateCommit;
  document.querySelectorAll<HTMLInputElement>("[data-index]").forEach(
    (el) =>
      (el.onchange = () => {
        const p = state.files[Number(el.dataset.index)].path;
        if (el.checked) selected.add(p);
        else selected.delete(p);
        updateCommit();
      }),
  );
  document.querySelectorAll<HTMLElement>("[data-diff]").forEach(
    (el) =>
      (el.onclick = async () => {
        const p = state.files[Number(el.dataset.diff)].path;
        $("#diff-title").textContent = p;
        try {
          const { diff } = await api(`diff?path=${encodeURIComponent(p)}`);
          if (document.querySelector("#diff-title")?.textContent === p)
            $("#diff").innerHTML = diff
              .split("\n")
              .map(
                (l) =>
                  `<span class="${l.startsWith("+") ? "added" : l.startsWith("-") ? "removed" : ""}">${esc(l) || " "}</span>`,
              )
              .join("");
        } catch (e) {
          error(e);
        }
      }),
  );
  syncURL();
}
function updateCommit() {
  $("#commit").disabled =
    busy || !selected.size || !$("#commit-message").value.trim();
}
async function gitAction(
  action: "commit" | "push",
  data: { paths: string[]; message: string } | { confirmedRevision?: string },
) {
  if (busy) return;
  if (action === "push") {
    try {
      const pending = await api("git");
      if (pending.existingPostChanges.length) {
        if (!window.confirm("This push changes or removes articles already on the remote branch:\n\n" +
          pending.existingPostChanges.join("\n") +
          "\n\nThese articles may be live. Renaming or changing their date can break existing links. Push anyway?")) return;
        data = { confirmedRevision: pending.pushRevision };
      }
    } catch (e) { error(e); return; }
  }
  busy = true;
  document
    .querySelectorAll<
      HTMLButtonElement | HTMLInputElement | HTMLTextAreaElement
    >(".git-page button,.git-page input,.git-page textarea")
    .forEach((b) => (b.disabled = true));
  const out = $("#git-output");
  out.hidden = false;
  out.textContent = action === "push" ? "Pushing…" : "Committing…";
  try {
    const result = await api(action, data);
    await git();
    $("#git-output").hidden = false;
    $("#git-output").textContent = result.output;
  } catch (e) {
    error(e);
    out.textContent = "Operation failed. " + errorMessage(e);
    document
      .querySelectorAll<
        HTMLButtonElement | HTMLInputElement | HTMLTextAreaElement
      >(".git-page button,.git-page input,.git-page textarea")
      .forEach((b) => (b.disabled = false));
  } finally {
    busy = false;
    if (document.querySelector("#commit")) updateCommit();
  }
}
document.addEventListener("keydown", (e) => {
  if (!(e.metaKey || e.ctrlKey)) return;
  if (e.key.toLowerCase() === "s") {
    e.preventDefault();
    save().catch(error);
  }
  if (e.key.toLowerCase() === "n" && !busy) {
    e.preventDefault();
    newDraft().catch(error);
  }
  if (e.shiftKey && e.key.toLowerCase() === "l" && !busy) {
    e.preventDefault();
    navigate(library);
  }
  if (e.shiftKey && e.key.toLowerCase() === "p" && screen === "editor") {
    e.preventDefault();
    togglePreview();
  }
});
window.addEventListener("beforeunload", (e) => {
  rememberPosition();
  if (dirty || savePromise || busy) {
    e.preventDefault();
    e.returnValue = "";
  }
});
window.addEventListener("online", () => {
  if (dirty) save().catch(error);
});
try {
  config = await api("config");
  try {
    const saved = JSON.parse(sessionStorage.getItem("writer-library") || "null");
    if (saved) {
      filter = ["all", "draft", "post"].includes(saved.filter) ? saved.filter : "all";
      query = typeof saved.query === "string" ? saved.query : "";
      category = typeof saved.category === "string" ? saved.category : "";
    }
  } catch {}
  await restoreRoute(readRoute(location.search));
  setTimeout(() => import("./editor-support.ts").catch(() => {}), 150);
} catch (e) {
  shell('<main class="library"><h1>Could not open your writing.</h1></main>');
  error(e);
}
