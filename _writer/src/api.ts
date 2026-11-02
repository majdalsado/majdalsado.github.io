import { z } from "zod";
import {
  configSchema,
  postSchema,
  summarySchema,
  gitSchema,
  previewSchema,
  type SaveInput,
  type MoveInput,
} from "../contracts.ts";
const responses = {
  config: configSchema,
  posts: z.array(summarySchema),
  post: postSchema,
  move: postSchema,
  image: z.object({ url: z.string() }),
  git: gitSchema,
  diff: z.object({ diff: z.string() }),
  commit: z.object({ output: z.string() }),
  push: z.object({ output: z.string() }),
  "preview/start": z.object({ started: z.boolean() }),
  preview: previewSchema,
};
type Route =
  | keyof typeof responses
  | `post?${string}`
  | `diff?${string}`
  | `preview?${string}`;
type Base<R extends Route> = R extends `${infer B}?${string}`
  ? B & keyof typeof responses
  : R & keyof typeof responses;
type Result<R extends Route> = z.infer<(typeof responses)[Base<R>]>;
type Requests = {
  posts: { title: string };
  post: SaveInput;
  move: MoveInput;
  image: { path: string; name: string; data: string };
  commit: { paths: string[]; message: string };
  push: { confirmedRevision?: string };
  "preview/start": Record<string, never>;
};
type Input<R extends Route> =
  Base<R> extends keyof Requests ? Requests[Base<R>] : never;
let token = "";
export function api(
  route: "posts",
  data: { title: string },
  method?: string,
): Promise<z.infer<typeof postSchema>>;
export function api<R extends Route>(
  route: R,
  data?: Input<R>,
  method?: string,
): Promise<Result<R>>;
export async function api(
  route: Route,
  data?: unknown,
  method = "POST",
): Promise<unknown> {
  const response = await fetch("/api/" + route, {
    method: data === undefined ? "GET" : method,
    headers: { "Content-Type": "application/json", "X-Writer-Token": token },
    body: data === undefined ? undefined : JSON.stringify(data),
  });
  const result: unknown = await response.json();
  if (!response.ok) {
    const failure = z.object({ error: z.string() }).safeParse(result);
    throw new Error(failure.success ? failure.data.error : "Request failed");
  }
  const base = route.split("?")[0] as keyof typeof responses;
  const value = (
    base === "posts" && data !== undefined ? postSchema : responses[base]
  ).parse(result);
  if (base === "config") token = configSchema.parse(value).token;
  return value;
}
