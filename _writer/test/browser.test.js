import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { chromium, expect } from "@playwright/test";
import { Blog } from "../core.ts";
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
test(
  "browser: writing, save, images, draft move, Jekyll rebuild, selective commit and push",
  { timeout: 90000 },
  async (t) => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "writer-browser-"));
    const remote = await fs.mkdtemp(path.join(os.tmpdir(), "writer-remote-"));
    await fs.mkdir(path.join(root, "all_collections/_posts"), {
      recursive: true,
    });
    await fs.mkdir(path.join(root, "_layouts"));
    await fs.writeFile(
      path.join(root, "_config.yml"),
      "collections_dir: all_collections\nmarkdown: kramdown\npermalink: /posts/:title/\n",
    );
    await fs.writeFile(
      path.join(root, "_layouts/post.html"),
      "<html><body><h1>{{ page.title }}</h1>{{ content }}</body></html>",
    );
    for (const f of ["Gemfile", "Gemfile.lock"])
      await fs.copyFile(
        new URL("../../" + f, import.meta.url),
        path.join(root, f),
      );
    const blog = await new Blog(root).init();
    await blog.git(["init"]);
    await blog.git(["config", "user.name", "Browser Test"]);
    await blog.git(["config", "user.email", "test@example.com"]);
    await blog.git(["add", "."]);
    await blog.git(["commit", "-m", "Initial"]);
    await blog.git(["init", "--bare", remote]);
    await blog.git(["remote", "add", "origin", remote]);
    await blog.git(["push", "-u", "origin", "HEAD"]);
    const server = spawn("node", ["--import", "tsx", "server.ts"], {
      cwd: path.resolve("."),
      env: {
        ...process.env,
        BLOG_ROOT: root,
        PORT: "4417",
        PREVIEW_PORT: "4418",
      },
      stdio: "pipe",
    });
    let logs = "";
    server.stdout.on("data", (d) => (logs += d));
    server.stderr.on("data", (d) => (logs += d));
    let browser;
    t.after(async () => {
      await browser?.close();
      server.kill("SIGTERM");
      await new Promise((r) => server.once("exit", r));
      await fs.rm(root, { recursive: true, force: true });
      await fs.rm(remote, { recursive: true, force: true });
    });
    for (let i = 0; i < 100; i++) {
      try {
        if ((await fetch("http://localhost:4417/api/config")).ok) break;
      } catch {}
      await pause(100);
    }
    // Malformed input must be rejected before touching the filesystem.
    const config = await (
      await fetch("http://localhost:4417/api/config")
    ).json();
    const invalid = await fetch("http://localhost:4417/api/post", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "X-Writer-Token": config.token,
      },
      body: JSON.stringify({
        path: "all_collections/_drafts/missing.md",
        version: "bad",
        body: 42,
        meta: { categories: "not an array" },
      }),
    });
    assert.equal(invalid.status, 400);
    assert.match((await invalid.json()).error, /Invalid input/);
    browser = await chromium.launch();
    const p = await browser.newPage({ viewport: { width: 1400, height: 950 } });
    const errors = [];
    p.on("pageerror", (e) => errors.push(e.message));
    await p.goto("http://localhost:4417");
    await p.getByRole("button", { name: "+ New draft" }).click();
    await p.locator("#title").fill("A quiet place");
    await p.locator("#categories").fill("writing, craft");
    await p.locator("#description").fill("A small test");
    await p.locator("#details-toggle").click();
    const body = p.getByLabel("Markdown body");
    await fs.mkdir(path.join(root, "assets/img"), { recursive: true });
    await fs.writeFile(path.join(root, "assets/img/figure.png"), Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a1X8AAAAASUVORK5CYII=", "base64"));
    const figureSource = '<figure class="article-figure">\n<img src="/assets/img/figure.png" alt="Test image">\n<figcaption>A useful caption</figcaption>\n</figure>';
    await body.fill("Before\n\n" + figureSource + "\n\nAfter");
    await body.press("ControlOrMeta+Home");
    await expect(p.locator(".writer-figure img")).toBeVisible();
    await expect.poll(() => p.locator(".writer-figure img").evaluate(img => img.naturalWidth)).toBe(1);
    await expect(p.locator(".writer-figure figcaption")).toHaveText("A useful caption");
    await p.getByRole("button", { name: "Edit figure", exact: true }).click();
    await expect(p.locator(".writer-figure")).toHaveCount(0);
    await expect(body).toContainText('<figure class="article-figure">');
    await body.press("ControlOrMeta+End");
    await expect(p.locator(".writer-figure")).toHaveCount(1);
    await expect(p.locator("#save-status")).toHaveText("Saved locally");
    assert.ok((await blog.read((await blog.list())[0].path)).body.includes(figureSource));
    await fs.unlink(path.join(root, "assets/img/figure.png"));

    await body.fill("A speling mistake. `speling` https://example.com/speling\n\n```js\nspeling\n```\n");
    await expect(p.locator(".spelling-error")).toHaveCount(1);
    await p.locator(".spelling-error").click();
    await p.getByRole("button", { name: "spelling", exact: true }).click();
    await expect(p.locator(".spelling-error")).toHaveCount(0);
    await expect(p.locator("#save-status")).toHaveText("Saved locally");
    assert.match((await blog.read((await blog.list())[0].path)).body, /^A spelling mistake/);
    await body.press("ControlOrMeta+z");
    await expect(p.locator(".spelling-error")).toHaveCount(1);
    await p.locator(".spelling-error").click();
    await body.press("Alt+Enter");
    await expect(p.getByRole("group", { name: "Spelling suggestions for speling" })).toBeVisible();
    await p.keyboard.press("Escape");
    await expect(p.locator(".spelling-suggestions")).toHaveCount(0);
    for (const [key, open, close] of [["b", "**", "**"], ["i", "*", "*"], ["u", "<u>", "</u>"]]) {
      await body.fill("Selected words");
      await body.press("ControlOrMeta+a");
      await body.press(`ControlOrMeta+${key}`);
      await expect(body).toHaveText(`${open}Selected words${close}`);
      await body.press(`ControlOrMeta+${key}`);
      await expect(body).toHaveText("Selected words");
      await body.fill("");
      await body.press(`ControlOrMeta+${key}`);
      await body.pressSequentially("Typed");
      await body.press(`ControlOrMeta+${key}`);
      await body.pressSequentially(" plain");
      await expect(body).toHaveText(`${open}Typed${close} plain`);
      await expect(p.locator("#save-status")).toHaveText("Saved locally");
      assert.equal((await blog.read((await blog.list())[0].path)).body, `${open}Typed${close} plain`);
    }
    for (const marker of ["-", "1."]) {
      await body.fill(`${marker} Parent\n${marker} Child`);
      await body.press("ControlOrMeta+End");
      await body.press("Tab");
      await expect(body).toBeFocused();
      await expect(p.locator("#save-status")).toHaveText("Saved locally");
      const listDraft = (await blog.list())[0];
      assert.equal((await blog.read(listDraft.path)).body, `${marker} Parent\n    ${marker} Child`);
      await body.press("Shift+Tab");
      await expect(p.locator("#save-status")).toHaveText("Saved locally");
      assert.equal((await blog.read(listDraft.path)).body, `${marker} Parent\n${marker} Child`);
    }
    await p
      .getByLabel("Markdown body")
      .fill("# Hello\n\nA paragraph with **weight**.");
    await expect(p.locator("#save-status")).toHaveText("Saved locally");
    let draft = (await blog.list())[0];
    assert.equal(draft.title, "A quiet place");
    assert.match((await blog.read(draft.path)).body, /weight/);
    assert.equal(new URL(p.url()).searchParams.get("file"), draft.path);
    await p.locator("#details-toggle").click();
    assert.equal(new URL(p.url()).searchParams.get("panel"), "details");
    await p.reload();
    await expect(p.locator("#details")).toBeVisible();
    await expect(p.getByLabel("Markdown body")).toContainText("weight");
    await p.locator("#details-toggle").click();
    await p.locator("#back").click();
    await expect(p).toHaveURL("http://localhost:4417/");
    await p.goBack();
    await expect(p.getByLabel("Markdown body")).toContainText("weight");
    await p.goForward();
    await expect(p.getByLabel("Search writing")).toBeVisible();
    await p.goBack();
    await expect(p.getByLabel("Markdown body")).toContainText("weight");

    await p.getByLabel("Markdown body").press("ControlOrMeta+End");
    await p.getByLabel("Markdown body").press("Enter");
    await p.getByLabel("Markdown body").pressSequentially("Explicit save.");
    await p.keyboard.press("ControlOrMeta+s");
    await expect(p.locator("#save-status")).toHaveText("Saved locally");
    assert.match((await blog.read(draft.path)).body, /Explicit save/);
    await p.getByLabel("Markdown body").evaluate((el) => {
      const dt = new DataTransfer();
      dt.items.add(
        new File(
          [new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])],
          "test.png",
          { type: "image/png" },
        ),
      );
      el.dispatchEvent(
        new ClipboardEvent("paste", {
          clipboardData: dt,
          bubbles: true,
          cancelable: true,
        }),
      );
    });
    await expect(p.getByLabel("Markdown body")).toContainText(
      "/assets/img/a-quiet-place/test-",
    );
    await expect(p.locator("#save-status")).toHaveText("Saved locally");
    await p.locator("#preview-toggle").click();
    await p
      .locator("#preview-frame")
      .waitFor({ state: "visible", timeout: 30000 });
    await expect(
      p
        .frameLocator("#preview-frame")
        .getByRole("heading", { name: "A quiet place" }),
    ).toBeVisible();
    await p.getByLabel("Markdown body").press("ControlOrMeta+End");
    await p.getByLabel("Markdown body").press("Enter");
    await p.getByLabel("Markdown body").pressSequentially("Rebuilt content.");
    await expect(
      p
        .frameLocator("#preview-frame")
        .getByText("Rebuilt content.", { exact: false }),
    ).toBeVisible({ timeout: 15000 });
    await p.locator("#details-toggle").click();
    await p.locator("#date").fill("2026-10-25");
    await p.locator("#move").click();
    await expect(p.locator("#kind-label")).toHaveText("Post");
    await p.locator("#details-toggle").click();
    await p.locator("#title").fill("A quiet place revised");
    await p.locator("#date").fill("2026-10-26");
    await expect(p.locator("#save-status")).toHaveText("Saved locally");
    assert.equal((await blog.list())[0].path, "all_collections/_posts/2026-10-25-a-quiet-place.md");
    await p.locator("#rename").click();
    await expect(p.locator(".file-path")).toContainText("2026-10-26-a-quiet-place-revised.md");
    const post = (await blog.list())[0];
    assert.equal(post.kind, "post");
    assert.equal(
      post.path,
      "all_collections/_posts/2026-10-26-a-quiet-place-revised.md",
    );
    await p.locator("#back").click();
    await p.getByLabel("Search writing").fill("quiet");
    await expect(p.locator(".post-row")).toHaveCount(1);
    await fs.writeFile(path.join(root, "unrelated.txt"), "Leave me staged");
    await blog.git(["add", "unrelated.txt"]);
    await p.locator("#git").click();
    await expect(p.locator("#commit-message")).toBeVisible();
    assert.equal(new URL(p.url()).searchParams.get("screen"), "git");
    await p.reload();
    await expect(p.locator("#commit-message")).toBeVisible();

    await p
      .getByRole("checkbox", { name: "Include " + post.path, exact: true })
      .check();
    const image = (await blog.status()).files.find((f) =>
      f.path.startsWith("assets/"),
    );
    await p
      .getByRole("checkbox", { name: "Include " + image.path, exact: true })
      .check();
    await p.locator("#commit-message").fill("Add writing and image");
    await p.locator("#commit").click();
    await expect(p.locator("#git-output")).toContainText(
      "Add writing and image",
    );
    assert.equal(
      (await blog.git(["diff", "--cached", "--name-only"])).trim(),
      "unrelated.txt",
    );
    await p.locator("#push").click();
    await expect(p.locator("#git-output")).toContainText("Push completed.");
    assert.equal((await blog.status()).ahead, 0);
    const live = await blog.read(post.path);
    await blog.save({ ...live, body: live.body + "\nChanged remotely published article." });
    await blog.commit([post.path], "Update existing article");
    const denied = await fetch("http://localhost:4417/api/push", {
      method: "POST", headers: { "Content-Type": "application/json", "X-Writer-Token": config.token }, body: "{}",
    });
    assert.equal(denied.ok, false);
    assert.match((await denied.json()).error, /existing remote articles/);
    await p.locator("#refresh").click();
    await expect(p.locator("#push")).toBeEnabled();
    const warning = p.waitForEvent("dialog");
    const pushClick = p.locator("#push").click();
    const dialog = await warning;
    assert.match(dialog.message(), /may be live/);
    assert.ok(dialog.message().includes(post.path));
    await dialog.dismiss();
    await pushClick;
    assert.equal((await blog.status()).ahead, 1);

    for (const width of [320, 375, 414, 768]) {
      await p.setViewportSize({ width, height: 900 });
      assert.equal(
        await p.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
      );
    }
    assert.deepEqual(errors, []);
    console.log(
      "Browser flows passed; temporary local remote used, no real blog commits or pushes.",
    );
  },
);
