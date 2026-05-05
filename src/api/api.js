const API_BASE = import.meta.env.VITE_API_BASE_URL || "";
const SESSION_COOKIE_NAMES = ["jwt", "access_token", "token", "auth_token"];

function buildUrl(path) {
  return `${API_BASE}${path}`;
}

function isPlainObject(value) {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

function normalizeErrorDetail(detail) {
  if (Array.isArray(detail)) {
    return detail.map((item) => item?.msg || String(item)).join(", ");
  }
  if (typeof detail === "string") {
    return detail;
  }
  return null;
}

function readCookie(name) {
  if (typeof document === "undefined" || !document.cookie) {
    return null;
  }

  const prefix = `${name}=`;
  const match = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix));

  if (!match) {
    return null;
  }

  const value = match.slice(prefix.length).trim();
  if (!value) {
    return null;
  }

  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function getToken() {
  const storedToken = localStorage.getItem("jwt");
  if (storedToken) {
    return storedToken;
  }

  for (const cookieName of SESSION_COOKIE_NAMES) {
    const cookieToken = readCookie(cookieName);
    if (cookieToken) {
      localStorage.setItem("jwt", cookieToken);
      return cookieToken;
    }
  }

  return null;
}

export async function apiFetch(path, opts = {}) {
  const token = getToken();
  const headers = { ...(opts.headers || {}) };
  const isFormData = typeof FormData !== "undefined" && opts.body instanceof FormData;

  if (!isFormData && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(buildUrl(path), {
    credentials: opts.credentials || "include",
    ...opts,
    headers,
  });

  if (res.status === 401) {
    const error = new Error("Unauthorized");
    error.status = 401;
    throw error;
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(normalizeErrorDetail(body?.detail) || `API ${res.status}`);
  }

  if (res.status === 204) {
    return null;
  }

  const contentType = res.headers?.get?.("content-type") || "";
  if (contentType.includes("application/json")) {
    return res.json().catch(() => null);
  }

  if (typeof res.text !== "function") {
    return typeof res.json === "function" ? res.json().catch(() => null) : null;
  }

  const text = await res.text().catch(() => "");
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export function withQuery(path, query = {}) {
  const params = new URLSearchParams();

  Object.entries(query).forEach(([key, value]) => {
    if (value == null || value === "") return;
    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (item != null && item !== "") params.append(key, String(item));
      });
      return;
    }
    params.append(key, String(value));
  });

  const queryString = params.toString();
  return queryString ? `${path}?${queryString}` : path;
}

export const apiGet = (path) => apiFetch(path);

export const apiPost = (path, body, opts = {}) =>
  apiFetch(path, {
    ...opts,
    method: "POST",
    body:
      body == null
        ? undefined
        : opts.body instanceof FormData
          ? opts.body
          : isPlainObject(body) || Array.isArray(body)
            ? JSON.stringify(body)
            : body,
  });

export const apiPut = (path, body, opts = {}) =>
  apiFetch(path, {
    ...opts,
    method: "PUT",
    body: body == null ? undefined : JSON.stringify(body),
  });

export const apiPatch = (path, body, opts = {}) =>
  apiFetch(path, {
    ...opts,
    method: "PATCH",
    body: body == null ? undefined : JSON.stringify(body),
  });

export const apiDelete = (path, opts = {}) =>
  apiFetch(path, { ...opts, method: "DELETE" });
