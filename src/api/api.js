/**
 * Base API helper — attaches JWT from localStorage to every request.
 * All client/coach/admin modules import `apiFetch` from here.
 */

const API_BASE = import.meta.env.PROD ? "https://api.till-failure.us" : "";  // Prod hits real backend, dev uses Vite proxy

export async function apiFetch(path, opts = {}) {
  const token = localStorage.getItem("jwt");
  const headers = { "Content-Type": "application/json", ...opts.headers };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const { skipAuthRedirect, ...fetchOpts } = opts;

  const res = await fetch(`${API_BASE}${path}`, { ...fetchOpts, headers });

  if (res.status === 401 && !skipAuthRedirect) {
    // Token expired or invalid — redirect to login
    localStorage.removeItem("jwt");
    window.location.href = "/login";
    throw new Error("Unauthorized");
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `API ${res.status}`);
  }

  return res.json();
}

/** Like apiGet but won't auto-redirect on 401 — lets callers fall back to mock data */
export const apiGetSafe = (path) => apiFetch(path, { skipAuthRedirect: true });

/** Convenience wrappers */
export const apiGet    = (path) => apiFetch(path);
export const apiPost   = (path, body) =>
  apiFetch(path, { method: "POST", body: JSON.stringify(body) });
export const apiPut    = (path, body) =>
  apiFetch(path, { method: "PUT", body: JSON.stringify(body) });
export const apiPatch  = (path, body) =>
  apiFetch(path, { method: "PATCH", body: JSON.stringify(body) });
export const apiDelete = (path) =>
  apiFetch(path, { method: "DELETE" });
