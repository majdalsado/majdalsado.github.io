import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Blog, merge, split } from "../core.ts";
async function fixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "writer-test-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  await fs.mkdir(path.join(root, "all_collections/_posts"), {
    recursive: true,
  });
  await fs.writeFile(
    path.join(root, "_config.yml"),
    "collections_dir: all_collections\n",
  );
  const blog = await new Blog(root).init();
  await blog.git(["init"]);
  await blog.git(["config", "user.email", "test@example.com"]);
  await blog.git(["config", "user.name", "Test"]);
  await blog.git(["add", "."]);
  await blog.git(["commit", "-m", "Initial"]);
  return blog;
}
test("front matter roundtrips unknown fields and comments", () => {
  const raw =
    "---\nlayout: post\n# keep me\ncustom: [a, b]\ntitle: Old\n---\nBody";
  const next = merge(raw, "New body", { title: "New", categories: ["one"] });
  assert.match(next, /# keep me/);
  assert.deepEqual(split(next).doc.toJS().custom, ["a", "b"]);
  assert.equal(split(next).body, "New body");
});
test("create, autosave, stale save protection, and draft transitions", async (t) => {
  const b = await fixture(t);
  const p = await b.create("Hello world");
  assert.equal(p.path, "all_collections/_drafts/hello-world.md");
  const saved = await b.save({
    ...p,
    body: "# My writing",
    meta: { title: "Hello", custom: "ignored" },
  });
  assert.equal(saved.body, "# My writing");
  await assert.rejects(() => b.save({ ...p, body: "stale" }), { status: 409 });
  const moved = await b.move({ ...saved, kind: "post", date: "2026-10-25" });
  assert.equal(moved.path, "all_collections/_posts/2026-10-25-hello.md");
  assert.equal(moved.meta.date, "2026-10-25");
  assert.equal(
    (await b.move({ ...moved, kind: "draft" })).body,
    "# My writing",
  );
});
test("paths cannot escape or follow symlinks", async (t) => {
  const b = await fixture(t);
  await assert.rejects(() => b.safe("../secret"));
  await assert.rejects(() => b.safe(".git/config"));
  await fs.symlink(os.tmpdir(), path.join(b.root, "escape"));
  await assert.rejects(() => b.safe("escape/file"));
});
test("selected commit excludes unrelated staged and untracked files", async (t) => {
  const b = await fixture(t);
  const p = await b.create("Selected");
  await fs.writeFile(path.join(b.root, "unrelated.txt"), "keep staged");
  await b.git(["add", "unrelated.txt"]);
  await fs.writeFile(path.join(b.root, "untouched.txt"), "keep untracked");
  await b.commit([p.path], "Write selected draft");
  const committed = (
    await b.git(["show", "--format=", "--name-only", "HEAD"])
  ).trim();
  assert.equal(committed, p.path);
  assert.equal(
    (await b.git(["diff", "--cached", "--name-only"])).trim(),
    "unrelated.txt",
  );
  assert.match(await b.git(["status", "--porcelain"]), /\?\? untouched.txt/);
});
test("commit includes both sides of a staged rename and preserves other staging", async (t) => {
  const b = await fixture(t);
  const p = await b.create("Rename");
  await b.commit([p.path], "Draft");
  const moved = await b.move({ ...p, kind: "post", date: "2026-10-25" });
  await b.git(["add", "-A"]);
  const s = await b.status();
  assert.ok(s.files.some((f) => f.oldPath === p.path));
  await b.commit([moved.path], "Move draft");
  assert.equal((await b.git(["status", "--porcelain"])).trim(), "");
});
