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
    await p
      .getByLabel("Markdown body")
      .fill("# Hello\n\nA paragraph with **weight**.");
    await expect(p.locator("#save-status")).toHaveText("Saved locally");
    let draft = (await blog.list())[0];
    assert.equal(draft.title, "A quiet place");
    assert.match((await blog.read(draft.path)).body, /weight/);
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
    const post = (await blog.list())[0];
    assert.equal(post.kind, "post");
    assert.equal(
      post.path,
      "all_collections/_posts/2026-10-25-a-quiet-place.md",
    );
    await p.locator("#back").click();
    await p.getByLabel("Search writing").fill("quiet");
    await expect(p.locator(".post-row")).toHaveCount(1);
    await fs.writeFile(path.join(root, "unrelated.txt"), "Leave me staged");
    await blog.git(["add", "unrelated.txt"]);
    await p.locator("#git").click();
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
