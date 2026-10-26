import { z } from "zod";
import type { ErrorRequestHandler } from "express";
import type { ChildProcess } from "node:child_process";
import {
  saveSchema,
  moveSchema,
  imageSchema,
  commitSchema,
  errorMessage,
} from "./contracts.ts";
import express from "express";
import { createServer } from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createServer as createViteServer } from "vite";
import { Blog, slugify } from "./core.ts";
const here = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT || 4317),
  previewPort = Number(process.env.PREVIEW_PORT || 4318);
const blog = await new Blog(
  process.env.BLOG_ROOT || path.resolve(here, ".."),
).init();
const token =
  process.env.PARETO_SESSION_TOKEN || crypto.randomBytes(32).toString("hex");
const app = express();
const server = createServer(app);
app.disable("x-powered-by");
app.use((req, res, next) => {
  if (
    ![`127.0.0.1:${port}`, `localhost:${port}`].includes(req.headers.host || "")
  )
    return res.status(403).send("Local access only");
  if (req.path.startsWith("/api/")) {
    res.set("Cache-Control", "no-store");
    if (
      req.headers.origin &&
      ![`http://127.0.0.1:${port}`, `http://localhost:${port}`].includes(
        req.headers.origin,
      )
    )
      return res.status(403).json({ error: "Invalid origin" });
    if (req.method !== "GET" && req.headers["x-writer-token"] !== token)
      return res.status(403).json({ error: "Invalid session" });
  }
  next();
});
app.use(express.json({ limit: "20mb" }));
app.get("/api/config", (_, res) =>
  res.json({ token, root: blog.root, previewPort }),
);
app.get("/api/posts", async (_, res) => res.json(await blog.list()));
app.get("/api/post", async (req, res) =>
  res.json(await blog.read(z.string().parse(req.query.path))),
);
app.put("/api/post", async (req, res) =>
  res.json(await blog.save(saveSchema.parse(req.body))),
);
app.post("/api/posts", async (req, res) =>
  res.json(
    await blog.create(z.object({ title: z.string() }).parse(req.body).title),
  ),
);
app.post("/api/move", async (req, res) =>
  res.json(await blog.move(moveSchema.parse(req.body))),
);
app.post("/api/image", async (req, res) => {
  const input = imageSchema.parse(req.body);
  const post = await blog.read(input.path);
  const ext = String(input.name || "")
    .split(".")
    .pop()!
    .toLowerCase();
  if (!["png", "jpg", "jpeg", "gif", "webp", "avif"].includes(ext))
    throw new Error("Use a PNG, JPEG, GIF, WebP, or AVIF image");
  const data = Buffer.from(input.data || "", "base64");
  if (!data.length || data.length > 12 * 1024 * 1024)
    throw new Error("Image must be under 12 MB");
  const folder =
    "assets/img/" +
    slugify(
      post.meta.title ||
        path
          .basename(post.path)
          .replace(/^\d{4}-\d{2}-\d{2}-/, "")
          .replace(/\.md$/, ""),
    );
  await fs.mkdir(await blog.safe(folder), { recursive: true });
  const name =
    slugify(path.basename(input.name, "." + ext)) +
    "-" +
    crypto.randomBytes(3).toString("hex") +
    "." +
    ext;
  await fs.writeFile(await blog.safe(folder + "/" + name), data, {
    flag: "wx",
  });
  res.json({ url: "/" + folder + "/" + name });
});
app.get("/api/git", async (_, res) => res.json(await blog.status()));
app.get("/api/diff", async (req, res) =>
  res.json({ diff: await blog.diff(z.string().parse(req.query.path)) }),
);
app.post("/api/commit", async (req, res) =>
  res.json({
    output: await blog.commit(
      commitSchema.parse(req.body).paths,
      commitSchema.parse(req.body).message,
    ),
  }),
);
app.post("/api/push", async (_, res) =>
  res.json({
    output: await blog.serial(async () => {
      const s = await blog.status();
      if (!s.upstream)
        throw new Error(
          "No upstream configured. Set it in your terminal first.",
        );
      if (s.behind)
        throw new Error(
          "The branch is behind its last known upstream. Pull and resolve changes in your terminal first.",
        );
      return (await blog.git(["push"])) || "Push completed.";
    }),
  }),
);
const temp = await fs.mkdtemp(path.join(os.tmpdir(), "blog-writer-preview-"));
let child: ChildProcess | null = null,
  previewLog = "",
  previewError: string | null = null;
async function startPreview() {
  if (child) return;
  previewError = null;
  previewLog = "";
  const plugins = path.join(temp, "plugins");
  await fs.mkdir(plugins, { recursive: true });
  await fs.writeFile(
    path.join(plugins, "writer.rb"),
    `require 'json'\nJekyll::Hooks.register :site, :post_write do |site|\n  entries = site.posts.docs.map { |p| [p.relative_path, p.url] }.to_h\n  File.write(File.join(site.dest, 'writer-manifest.json'), JSON.generate(entries))\nend\n`,
  );
  await fs.writeFile(
    path.join(temp, "config.yml"),
    `url: http://127.0.0.1:${previewPort}\nbaseurl: ''\nplugins_dir: ${JSON.stringify(plugins)}\n`,
  );
  child = spawn(
    "bundle",
    [
      "exec",
      "jekyll",
      "serve",
      "--source",
      blog.root,
      "--destination",
      path.join(temp, "site"),
      "--config",
      path.join(blog.root, "_config.yml") + "," + path.join(temp, "config.yml"),
      "--host",
      "127.0.0.1",
      "--port",
      String(previewPort),
      "--drafts",
      "--future",
      "--unpublished",
      "--disable-disk-cache",
    ],
    { cwd: blog.root, env: { ...process.env, JEKYLL_ENV: "development" } },
  );
  const append = (d: Buffer) => {
    previewLog = (previewLog + d.toString()).slice(-12000);
  };
  child.stdout!.on("data", append);
  child.stderr!.on("data", append);
  child.on("error", (e) => {
    previewError = e.message;
    child = null;
  });
  child.on("exit", (code) => {
    previewError = "Preview stopped (" + code + "). " + previewLog;
    child = null;
  });
}
app.post("/api/preview/start", async (_, res) => {
  await startPreview();
  res.json({ started: true });
});
app.get("/api/preview", async (req, res) => {
  let manifest: Record<string, string> = {},
    generation = 0;
  try {
    const manifestPath = path.join(temp, "site", "writer-manifest.json");
    manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
    generation = (await fs.stat(manifestPath)).mtimeMs;
  } catch {}
  const entry = Object.entries(manifest).find(
    ([p]) =>
      p.replace(/^\//, "") === req.query.path ||
      p.replace(/^\//, "") ===
        (typeof req.query.path === "string" ? req.query.path : "").replace(
          blog.collections + "/",
          "",
        ),
  );
  res.json({
    running: !!child,
    error: previewError,
    log: previewLog,
    generation,
    url: entry ? `http://127.0.0.1:${previewPort}${entry[1]}` : null,
  });
});
app.use("/api", (_, res) =>
  res.status(404).json({ error: "Unknown API route" }),
);
const handleError: ErrorRequestHandler = (err: unknown, req, res, next) => {
  console.error(errorMessage(err));
  const status =
    typeof err === "object" &&
    err !== null &&
    "status" in err &&
    typeof err.status === "number"
      ? err.status
      : 400;
  res.status(status).json({ error: errorMessage(err) });
};
app.use(handleError);
if (process.env.NODE_ENV === "production")
  app.use(express.static(path.join(here, "dist")));
else {
  const vite = await createViteServer({
    root: here,
    server: { middlewareMode: true, hmr: { server } },
    appType: "spa",
  });
  app.use(vite.middlewares);
}
server.listen(port, "127.0.0.1", () =>
  console.log(`Writing IDE: http://localhost:${port}\nBlog: ${blog.root}`),
);
let closing = false;
async function close() {
  if (closing) return;
  closing = true;
  child?.kill("SIGTERM");
  server.close();
  await fs.rm(temp, { recursive: true, force: true });
  process.exit(0);
}
process.on("SIGINT", close);
process.on("SIGTERM", close);
