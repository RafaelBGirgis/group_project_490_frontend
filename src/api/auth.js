import { apiFetch, apiGet, apiPost } from "./api";

const SESSION_COOKIE_NAMES = ["jwt", "access_token", "token", "auth_token"];

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

export async function login(email, password) {
  return apiPost("/auth/login", {
    email: String(email || "").trim(),
    password,
  });
}

export async function signup(email, password, name, age, gender, pfp_url, bio, gcp_user_id) {
  return apiPost("/auth/signup", {
    email: String(email || "").trim(),
    password,
    name: String(name || "").trim(),
    age,
    gender,
    ...(pfp_url ? { pfp_url } : {}),
    ...(bio ? { bio } : {}),
    ...(gcp_user_id ? { gcp_user_id } : {}),
  });
}

export async function refreshToken(email, password) {
  const formData = new URLSearchParams();
  formData.append("grant_type", "password");
  formData.append("username", email);
  formData.append("password", password);

  return apiFetch("/auth/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: formData.toString(),
  });
}

export async function getCurrentAccount() {
  try {
    return await apiFetch("/me");
  } catch (error) {
    if (error?.status === 401) {
      localStorage.removeItem("jwt");
      window.location.href = "/login";
    }
    throw error;
  }
}

export function logout() {
  localStorage.removeItem("jwt");
  localStorage.removeItem("active_user_email");
  localStorage.removeItem("active_client_id");
  window.location.href = "/login";
}

export function storeToken(token) {
  if (token) {
    localStorage.setItem("jwt", token);
  }
}

export async function fetchAuthRoles() {
  return apiGet("/auth/roles");
}

export function getToken() {
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

export function isAuthenticated() {
  return Boolean(getToken());
}

export function syncTokenFromCookie() {
  return getToken();
}

export function initiateGoogleOAuth() {
  window.location.href = `${import.meta.env.VITE_API_BASE_URL || ""}/auth/google`;
}

export async function handleGoogleOAuthCallback(code, state) {
  const query = new URLSearchParams();
  if (code) query.set("code", code);
  if (state) query.set("state", state);
  return apiFetch(`/auth/google?${query.toString()}`);
}
