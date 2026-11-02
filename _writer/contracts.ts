import { z } from "zod";
export const metadataSchema = z
  .object({
    title: z.string().optional(),
    date: z.string().nullable().optional(),
    categories: z.array(z.string()).optional(),
    description: z.string().nullable().optional(),
    reading_time: z.number().optional(),
    feature_image: z.string().nullable().optional(),
  })
  .passthrough();
export type Metadata = z.infer<typeof metadataSchema>;
export const postSchema = z.object({
  path: z.string(),
  version: z.string(),
  body: z.string(),
  meta: metadataSchema,
  title: z.string(),
  kind: z.enum(["draft", "post"]),
});
export type Post = z.infer<typeof postSchema>;
export const summarySchema = postSchema
  .omit({ body: true })
  .extend({ excerpt: z.string(), words: z.number() });
export type PostSummary = z.infer<typeof summarySchema>;
export const saveSchema = z.object({
  path: z.string(),
  version: z.string(),
  body: z.string(),
  meta: metadataSchema.optional(),
  updateFilename: z.boolean().optional(),
});
export type SaveInput = z.infer<typeof saveSchema>;
export const moveSchema = z.object({
  path: z.string(),
  version: z.string(),
  kind: z.enum(["draft", "post"]),
  date: z.string().optional(),
});
export type MoveInput = z.infer<typeof moveSchema>;
export const gitFileSchema = z.object({
  status: z.string(),
  path: z.string(),
  oldPath: z.string().optional(),
});
export type GitFile = z.infer<typeof gitFileSchema>;
export const gitSchema = z.object({
  branch: z.string(),
  upstream: z.string().nullable(),
  ahead: z.number(),
  behind: z.number(),
  files: z.array(gitFileSchema),
  existingPostChanges: z.array(z.string()),
  pushRevision: z.string(),
  log: z.array(
    z.object({ id: z.string(), message: z.string(), when: z.string() }),
  ),
});
export type GitState = z.infer<typeof gitSchema>;
export const configSchema = z.object({
  token: z.string(),
  root: z.string(),
  previewPort: z.number(),
});
export type Config = z.infer<typeof configSchema>;
export const previewSchema = z.object({
  running: z.boolean(),
  error: z.string().nullable(),
  log: z.string(),
  generation: z.number(),
  url: z.string().nullable(),
});
export const imageSchema = z.object({
  path: z.string(),
  name: z.string(),
  data: z.string(),
});
export const commitSchema = z.object({
  paths: z.array(z.string()).min(1),
  message: z.string().trim().min(1),
});
export const recoverySchema = z.object({
  body: z.string(),
  meta: metadataSchema,
  version: z.string(),
});
export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
export function hasCode(error: unknown, code: string): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === code
  );
}
