// Browser-only demo auth bridge for client API calls (C08). Server routes
// still verify tokens; this only attaches the token stored by DemoLogin.
export async function clientAuthHeaders(): Promise<Record<string, string>> {
  if (typeof window === "undefined") return {};
  const token = window.localStorage.getItem("dwas-demo-token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function clientUid(): string {
  if (typeof window === "undefined") return "demo-client";
  return window.localStorage.getItem("dwas-demo-uid") || "demo-client";
}
