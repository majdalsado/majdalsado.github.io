export type Route =
  | { screen: "library" | "git" }
  | { screen: "editor"; file: string; panel?: "details" | "preview" };
export function readRoute(search: string): Route {
  const params = new URLSearchParams(search);
  if (params.get("screen") === "git") return { screen: "git" };
  const file = params.get("file");
  if (!file) return { screen: "library" };
  const panel = params.get("panel");
  return { screen: "editor", file,
    ...(panel === "details" || panel === "preview" ? { panel } : {}) };
}
export function routeURL(route: Route): string {
  const params = new URLSearchParams();
  if (route.screen === "git") params.set("screen", "git");
  if (route.screen === "editor") {
    params.set("file", route.file);
    if (route.panel) params.set("panel", route.panel);
  }
  return location.pathname + (params.size ? `?${params}` : "");
}
