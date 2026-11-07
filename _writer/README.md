# Pareto Writer

A localhost writing IDE for Majd's Jekyll blog. The app lives in the blog repository under `_writer/` and edits its Markdown files directly. Jekyll explicitly excludes `_writer/` from the public build.

## Run

```sh
cd /Users/majd/dev/majdalsado.github.io
pnpm install
pnpm dev
```

The root command opens http://localhost:4317. You can also double-click `Writer.command` in Finder. Stop with Control-C in its terminal.

Requires Node 20.19+ (or 22.12+), Ruby/Bundler, and the blog's installed gems. Run `pnpm install` from the blog root and `bundle install` in the blog if setting up another machine.

Defaults to the parent repository directory, so the checkout can be moved without changing code. Override with `BLOG_ROOT=/absolute/path pnpm start`. `PORT` defaults to 4317 and `PREVIEW_PORT` to 4318. Both servers bind to loopback only.

## Writing

- Search the list, filter Drafts / Posts, or filter by category. Opening a file hides the list.
- Markdown syntax stays visible, with headings, bold, italics, and links styled.
- URLs preserve the open document (`?file=…`), panel (`&panel=details` or `preview`), and Git screen (`?screen=git`). Refresh and browser Back/Forward restore these views. Cursor/scroll position and library filters stay in per-tab session storage.
- Spelling is checked locally with nspell and a bundled English dictionary in a background worker. Click an underlined word for corrections, or use **Alt+Enter** at the word. **Escape** closes suggestions. Code, URLs, and email addresses are skipped. No text is sent to a spelling service.
- **⌘B**, **⌘I**, and **⌘U** toggle bold, italic, and underline on selected text. With no selection, type inside the inserted formatting and press the shortcut again to continue outside it. Underline uses inline `<u>` HTML. Windows/Linux use Ctrl.
- **Tab** indents the current line or selection by four spaces; **Shift+Tab** outdents. Use these to nest Markdown list items. Press **Escape**, then **Tab** to move keyboard focus out of the editor.
- Edits autosave after 650 ms of idle time. **⌘S** saves immediately. Document details shows the word count and local save status.
- **⌘N** creates a draft, **⌘⇧L** returns to the list, **⌘⇧P** toggles Jekyll preview. On other systems use Ctrl instead of Cmd. The editor also supports undo/redo, find, and standard text navigation.
- Document details open from the toolbar into a separate inspector and are collapsed by default. Draft/Post status also lives in the toolbar. Title, date, categories, description, reading time, and feature image are stored in YAML front matter; other fields and YAML comments are preserved.
- Paste or drop PNG, JPEG, GIF, WebP, or AVIF files (up to 12 MB). Images go under `assets/img/<document-name>/` with unique names. The inserted Markdown selects the alt text for editing.
- Drafts live under `all_collections/_drafts/`. Move to Posts with a date to create a dated filename. Move back to Drafts to remove the date prefix. These actions do not commit or push.

The two pre-existing `xx`-dated drafts were moved to `_drafts` on 2026-10-25, without changing their bytes.

## Preview

The tool starts `bundle exec jekyll serve` on demand with drafts, future posts, and unpublished content enabled **only for local preview**. It builds into a temporary directory using the actual site layouts. A temporary Jekyll hook reports each post's actual generated URL. The iframe refreshes after completed builds, independently of typing and saves. The public site's config and templates are unchanged.

## Git

The separate Git screen shows the current branch, changed files, diffs, recent commits, and ahead/behind counts from the last known remote state.

Select files, write a message, and click **Commit**. Only selected working-tree files are committed, with both sides of staged renames included. Unrelated staged files remain staged. **Push** is a separate action using the configured upstream. There is no force push, automatic pull, or automatic commit. Resolve merges and set upstreams in your terminal when needed. Existing Git hooks still run.

## Recovery and limits

Writes are atomic and compare a content hash against the last opened version. If another editor changes a file, saving stops rather than overwriting it. Unsaved edits also have a browser-local recovery copy; after a reload, matching copies are restored, and conflicting copies can be downloaded. Keep one active editor tab per file. Files or Git operations initiated outside the app appear when reopening the list or refreshing Git.

The UI uses the America/Edmonton date when suggesting a new post date. It does not modify existing post dates. Drafts are omitted from normal Jekyll output, but committing/pushing them still stores them in the repository.

## Development and verification

Run these commands from `_writer/`.

```sh
pnpm dev
pnpm typecheck
pnpm build
pnpm test
```

Browser tests require `pnpm exec playwright install chromium`. Tests use disposable Git repos and a local bare remote; they do not commit or push the real blog. Browser/Jekyll integration tests reuse the installed gems and Gemfile from the parent blog repository.

For a built frontend: `pnpm build && NODE_ENV=production pnpm start`.

## Interaction guidance

Applied Emil Kowalski's [animate](https://github.com/emilkowalski/skills/blob/main/skills/animate/SKILL.md) and [animation-performance](https://github.com/emilkowalski/skills/blob/main/skills/animation-performance/SKILL.md) skills (reviewed 2026-10-25). Typing, shortcuts, list changes, and panel toggles are instant. Pointer hover feedback uses only a 125 ms opacity transition; reduced-motion disables that transition. No animation library or layout animation is needed.

## Visual design

Newsreader is bundled locally (including italics) for offline writing. Pale warm paper and a lighter surrounding surface replace the dark ochre study; deep blue ink supplies the accent. Interface labels use the system sans-serif. Monospace is reserved for actual code and Git diffs. The paper uses a subtle edge and soft shadow. There are no ruled lines, binding effects, or layered page edges.

## Type safety

Application code uses strict TypeScript. `pnpm build` runs the type checker before bundling; `pnpm start` uses `tsx` without a separate server compilation step. Shared contracts in `contracts.ts` describe documents, metadata, saves, moves, and Git state. Zod validates API inputs/responses and parsed front matter at runtime, including unknown metadata preservation. Functional tests remain in JavaScript and run through `tsx` against the TypeScript implementation. Types complement the stale-save checks and end-to-end tests; they do not replace them.

Draft filenames follow title changes on save. In Details, **Update filename** explicitly regenerates a post filename from its date and title. Name collisions are rejected without overwriting content. Push requires confirmation when outgoing commits modify or remove posts already in the last known upstream snapshot; these may be live, and filename/date changes may break links. This comparison does not verify deployment status or fetch the remote.

HTML figures with local raster images display as image/caption widgets in the writing view. Click **Edit figure** to edit the original HTML; move the cursor outside to restore its display. Rendering does not alter saved Markdown.
