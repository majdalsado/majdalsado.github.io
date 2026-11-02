import {
  metadataSchema,
  hasCode,
  type Metadata,
  type Post,
  type PostSummary,
  type SaveInput,
  type MoveInput,
  type GitFile,
  type GitState,
} from "./contracts.ts";
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import YAML from "yaml";
import { z } from "zod";
const exec = promisify(execFile);
export const hash = (s: string) =>
  crypto.createHash("sha256").update(s).digest("hex");
export const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "untitled";
export function split(raw: string) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  const doc = YAML.parseDocument(match?.[1] || "");
  if (doc.errors.length)
    throw new Error("Invalid front matter: " + doc.errors[0].message);
  return { doc, body: match ? raw.slice(match[0].length) : raw };
}
export function merge(raw: string, body: string, fields?: Metadata) {
  const { doc } = split(raw);
  for (const [key, value] of Object.entries(fields || {})) {
    if (
      ![
        "title",
        "date",
        "categories",
        "description",
        "reading_time",
        "feature_image",
      ].includes(key)
    )
      continue;
    if (value === null) doc.delete(key);
    else doc.set(key, value);
  }
  return `---\n${doc.toString()}---\n${body}`;
}
export class Blog {
  root: string;
  collections = ".";
  posts = "_posts";
  drafts = "_drafts";
  private queue: Promise<unknown> = Promise.resolve();
  constructor(root: string) {
    this.root = path.resolve(root);
    this.queue = Promise.resolve();
  }
  async init() {
    this.root = await fs.realpath(this.root);
    const config = z
      .object({ collections_dir: z.string().optional() })
      .parse(
        YAML.parse(
          await fs.readFile(path.join(this.root, "_config.yml"), "utf8"),
        ),
      );
    this.collections = config.collections_dir || ".";
    this.posts = path.posix.join(this.collections, "_posts");
    this.drafts = path.posix.join(this.collections, "_drafts");
    await this.safe(this.drafts);
    await fs.mkdir(path.join(this.root, this.drafts), { recursive: true });
    return this;
  }
  serial<T>(fn: () => Promise<T>): Promise<T> {
    const p = this.queue.then(fn);
    this.queue = p.catch(() => {});
    return p;
  }
  async safe(rel: string) {
    if (
      typeof rel !== "string" ||
      rel.includes("\0") ||
      path.isAbsolute(rel) ||
      rel.split(/[\\/]/).includes("..") ||
      rel.split(/[\\/]/).includes(".git")
    )
      throw new Error("Invalid path");
    const full = path.resolve(this.root, rel);
    if (!full.startsWith(this.root + path.sep))
      throw new Error("Path outside blog");
    let current = this.root;
    for (const part of path.relative(this.root, full).split(path.sep)) {
      current = path.join(current, part);
      try {
        if ((await fs.lstat(current)).isSymbolicLink())
          throw new Error("Symlinks are not supported");
      } catch (e) {
        if (!hasCode(e, "ENOENT")) throw e;
      }
    }
    return full;
  }
  async contentPath(rel: string) {
    if (
      ![this.posts, this.drafts].some((dir) => rel.startsWith(dir + "/")) ||
      !/\.(md|markdown)$/i.test(rel)
    )
      throw new Error("Not a post or draft");
    return this.safe(rel);
  }
  async read(rel: string): Promise<Post> {
    const raw = await fs.readFile(await this.contentPath(rel), "utf8");
    const { doc, body } = split(raw);
    const meta = metadataSchema.parse(doc.toJS() || {});
    return {
      path: rel,
      version: hash(raw),
      body,
      meta,
      title: meta.title || path.basename(rel, ".md"),
      kind: rel.startsWith(this.drafts + "/") ? "draft" : "post",
    };
  }
  async list(): Promise<PostSummary[]> {
    const walk = async (dir: string): Promise<string[]> => {
      const result = [];
      for (const ent of await fs.readdir(await this.safe(dir), {
        withFileTypes: true,
      })) {
        const rel = dir + "/" + ent.name;
        if (ent.isDirectory()) result.push(...(await walk(rel)));
        else if (ent.isFile() && /\.(md|markdown)$/i.test(ent.name))
          result.push(rel);
      }
      return result;
    };
    const paths = [...(await walk(this.posts)), ...(await walk(this.drafts))];
    return Promise.all(
      paths.map(async (p) => {
        const post = await this.read(p);
        return {
          ...post,
          body: undefined,
          excerpt: post.body
            .replace(/<!--[\s\S]*?-->/g, "")
            .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
            .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
            .replace(/[#*`\[\]]/g, "")
            .trim()
            .slice(0, 140),
          words: post.body.trim().split(/\s+/).filter(Boolean).length,
        };
      }),
    );
  }
  async save({ path: rel, version, body, meta, updateFilename }: SaveInput) {
    return this.serial(async () => {
      if (typeof body !== "string") throw new Error("Missing body");
      const file = await this.contentPath(rel);
      const raw = await fs.readFile(file, "utf8").catch((e) => {
        if (hasCode(e, "ENOENT")) throw Object.assign(new Error("This article was moved or removed. Reload before saving."), { status: 409 });
        throw e;
      });
      if (hash(raw) !== version)
        throw Object.assign(
          new Error(
            "This file changed outside the editor. Your writing is kept here. Reload the disk version or copy your text before reconciling.",
          ),
          { status: 409 },
        );
      const current = await this.read(rel);
      let target = rel;
      if (updateFilename || (current.kind === "draft" && meta?.title !== undefined && meta.title !== current.meta.title)) {
        const title = meta?.title ?? current.meta.title ?? "Untitled";
        let prefix = "";
        if (current.kind === "post") {
          const date = String(meta?.date ?? current.meta.date ?? path.basename(rel).slice(0, 10)).slice(0, 10);
          if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date)
            throw new Error("Choose a valid date before updating the filename.");
          prefix = date + "-";
        }
        target = path.posix.dirname(rel) + "/" + prefix + slugify(title) + ".md";
      }
      const next = merge(raw, body, meta);
      if (target !== rel) {
        const destination = await this.contentPath(target);
        try { await fs.writeFile(destination, next, { flag: "wx" }); }
        catch (e) { if (hasCode(e, "EEXIST")) throw new Error("An article already has that filename. Choose a different title."); throw e; }
        try { await fs.unlink(file); }
        catch (e) { await fs.unlink(destination); throw e; }
        return this.read(target);
      }
      const temp = file + ".writer-" + crypto.randomUUID();
      await fs.writeFile(temp, next);
      await fs.rename(temp, file);
      return this.read(rel);
    });
  }
  async create(title: string) {
    return this.serial(async () => {
      title = String(title || "Untitled").trim() || "Untitled";
      const base = slugify(title);
      let n = 0;
      while (true) {
        const rel = this.drafts + "/" + base + (n ? "-" + n : "") + ".md";
        try {
          await fs.writeFile(
            await this.contentPath(rel),
            `---\n${YAML.stringify({ layout: "post", title, categories: [], description: "", reading_time: 1 })}---\n`,
            { flag: "wx" },
          );
          return this.read(rel);
        } catch (e) {
          if (!hasCode(e, "EEXIST")) throw e;
          n++;
        }
      }
    });
  }
  async move({ path: rel, version, kind, date }: MoveInput) {
    return this.serial(async () => {
      if (!["draft", "post"].includes(kind))
        throw new Error("Invalid destination");
      const current = await this.read(rel);
      if (current.version !== version)
        throw Object.assign(
          new Error("File changed on disk; reload before moving."),
          { status: 409 },
        );
      if (kind === current.kind) return current;
      const raw = await fs.readFile(await this.contentPath(rel), "utf8");
      const stem = path
        .basename(rel)
        .replace(/^\d{4}-(?:\d{2}|xx)-(?:\d{2}|xx)-/, "")
        .replace(/\.(md|markdown)$/i, "");
      if (
        kind === "post" &&
        (!/^\d{4}-\d{2}-\d{2}$/.test(date || "") ||
          new Date(date || "").toISOString().slice(0, 10) !== date)
      )
        throw new Error("Choose a valid date");
      const target =
        (kind === "draft" ? this.drafts : this.posts) +
        "/" +
        (kind === "post" ? date + "-" : "") +
        slugify(current.meta.title || stem) +
        ".md";
      const next = kind === "post" ? merge(raw, current.body, { date }) : raw;
      await fs.writeFile(await this.contentPath(target), next, { flag: "wx" });
      try {
        await fs.unlink(await this.contentPath(rel));
      } catch (e) {
        await fs.unlink(await this.contentPath(target));
        throw e;
      }
      return this.read(target);
    });
  }
  async git(args: string[], env: NodeJS.ProcessEnv = {}) {
    const r = await exec("git", args, {
      cwd: this.root,
      env: { ...process.env, ...env },
      maxBuffer: 8 * 1024 * 1024,
      timeout: 60000,
    });
    return r.stdout;
  }
  async status(): Promise<GitState> {
    const raw = await this.git([
      "status",
      "--porcelain=v1",
      "-z",
      "--untracked-files=all",
    ]);
    const parts = raw.split("\0");
    const files: GitFile[] = [];
    for (let i = 0; i < parts.length; i++) {
      if (!parts[i]) continue;
      const status = parts[i].slice(0, 2);
      const file: GitFile = { status, path: parts[i].slice(3) };
      if (/[RC]/.test(status)) file.oldPath = parts[++i];
      files.push(file);
    }
    const branch = (await this.git(["branch", "--show-current"])).trim();
    let upstream: string | null = null,
      ahead = 0,
      behind = 0;
    try {
      upstream = (
        await this.git(["rev-parse", "--abbrev-ref", "@{upstream}"])
      ).trim();
      [behind, ahead] = (
        await this.git([
          "rev-list",
          "--left-right",
          "--count",
          "@{upstream}...HEAD",
        ])
      )
        .trim()
        .split(/\s+/)
        .map(Number);
    } catch {}
    const log = (await this.git(["log", "-8", "--format=%h%x09%s%x09%ar"]))
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((l) => {
        const [id, message, when] = l.split("\t");
        return { id, message, when };
      });
    const pushRevision = (await this.git(["rev-parse", "HEAD"])).trim() + ":" +
      (upstream ? (await this.git(["rev-parse", "@{upstream}"])).trim() : "");
    const existingPostChanges = upstream ? (await this.git([
      "diff", "--no-renames", "--name-only", "-z", "--diff-filter=MD", "@{upstream}", "HEAD", "--", this.posts + "/",
    ])).split("\0").filter(Boolean) : [];
    return { branch, upstream, ahead, behind, files, log, existingPostChanges, pushRevision };
  }
  async diff(rel: string) {
    const file = await this.safe(rel);
    const status = await this.status();
    const entry = status.files.find((f) => f.path === rel);
    if (!entry) return "";
    if (entry.status === "??") {
      const buf = await fs.readFile(file);
      if (buf.includes(0)) return "Binary file";
      return buf
        .toString("utf8")
        .slice(0, 200000)
        .split("\n")
        .map((l) => "+" + l)
        .join("\n");
    }
    return (
      await this.git([
        "diff",
        "HEAD",
        "--",
        rel,
        ...(entry.oldPath ? [entry.oldPath] : []),
      ])
    ).slice(0, 200000);
  }
  async commit(paths: string[], message: string) {
    return this.serial(async () => {
      if (
        !Array.isArray(paths) ||
        !paths.length ||
        !String(message || "").trim()
      )
        throw new Error("Select files and enter a commit message");
      const state = await this.status();
      if (state.files.some((f) => /U|AA|DD/.test(f.status)))
        throw new Error("Resolve Git conflicts before committing.");
      const chosen = [];
      for (const p of paths) {
        await this.safe(p);
        const f = state.files.find((f) => f.path === p);
        if (!f) throw new Error("File is no longer changed: " + p);
        chosen.push(p);
        if (f.oldPath) chosen.push(f.oldPath);
      }
      const index = path.join(
        await fs.mkdtemp(
          path.join((await import("node:os")).tmpdir(), "writer-index-"),
        ),
        "index",
      );
      try {
        await this.git(["read-tree", "HEAD"], { GIT_INDEX_FILE: index });
        await this.git(["add", "-A", "--", ...chosen], {
          GIT_INDEX_FILE: index,
        });
        const output = await this.git(["commit", "-m", message], {
          GIT_INDEX_FILE: index,
        });
        await this.git(["reset", "HEAD", "--", ...chosen]);
        return output;
      } finally {
        await fs.rm(path.dirname(index), { recursive: true, force: true });
      }
    });
  }
}
