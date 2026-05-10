import { fetchAuthRoles } from "../api/auth";
import { fetchMe } from "../api/client";
import { cacheRoleState, getCachedRoleState } from "./sessionCache";

const KNOWN_ROLE_NAMES = new Set(["client", "coach", "admin"]);

function checkDeactivated(rolesResponse) {
  if (Array.isArray(rolesResponse)) {
    return rolesResponse.some((r) => String(r).toLowerCase().includes("deactivated"));
  }
  if (rolesResponse && typeof rolesResponse === "object") {
    return Object.values(rolesResponse).some(
      (v) => typeof v === "string" && v.toLowerCase().includes("deactivated")
    );
  }
  return false;
}

function checkSuspended(rolesResponse) {
  if (Array.isArray(rolesResponse)) {
    return rolesResponse.some((r) => String(r).toLowerCase().includes("suspended"));
  }
  if (rolesResponse && typeof rolesResponse === "object") {
    return Object.values(rolesResponse).some(
      (v) => typeof v === "string" && v.toLowerCase().includes("suspended")
    );
  }
  return false;
}
const ROLE_KEY_MAP = {
  client: "client",
  coach: "coach",
  admin: "admin",
  client_id: "client",
  coach_id: "coach",
  admin_id: "admin",
};

function normalizeRoleName(value) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");

  if (!normalized) {
    return null;
  }

  if (normalized.includes("admin")) return "admin";
  if (normalized.includes("coach")) return "coach";
  if (normalized.includes("client")) return "client";
  return null;
}

function addRole(roleSet, value) {
  const normalized = normalizeRoleName(value);
  if (normalized && KNOWN_ROLE_NAMES.has(normalized)) {
    roleSet.add(normalized);
  }
}

function collectRoles(source, roleSet) {
  if (!source) {
    return;
  }

  if (Array.isArray(source)) {
    source.forEach((item) => collectRoles(item, roleSet));
    return;
  }

  if (typeof source === "string") {
    addRole(roleSet, source);
    return;
  }

  if (typeof source !== "object") {
    return;
  }

  Object.entries(source).forEach(([key, value]) => {
    const mappedRole = ROLE_KEY_MAP[key];
    if (
      mappedRole &&
      value != null &&
      value !== false &&
      value !== "" &&
      !(typeof value === "number" && Number.isNaN(value))
    ) {
      roleSet.add(mappedRole);
    }

    if (["role", "name", "slug", "type"].includes(key)) {
      addRole(roleSet, value);
    }

    if (
      value &&
      (Array.isArray(value) || typeof value === "object")
    ) {
      collectRoles(value, roleSet);
    }
  });
}

export function normalizeRoleState(rolesResponse) {
  const roleSet = new Set();
  collectRoles(rolesResponse, roleSet);
  const isDeactivated = checkDeactivated(rolesResponse);
  const isSuspended = checkSuspended(rolesResponse);

  return {
    roleNames: [...roleSet],
    hasClientRole: roleSet.has("client"),
    hasCoachRole: roleSet.has("coach"),
    hasAdminRole: roleSet.has("admin"),
    needsClientOnboarding: !roleSet.has("client"),
    isDeactivated,
    isSuspended,
  };
}

export async function resolveRoleState() {
  const rolesResponse = await fetchAuthRoles().catch(() => null);
  const normalized = normalizeRoleState(rolesResponse);
  return cacheRoleState(normalized) || normalized;
}

export async function resolveSessionState() {
  const account = await fetchMe();
  const roleState = await resolveRoleState();
  return {
    account,
    ...roleState,
  };
}

export function getImmediateRoleState() {
  return getCachedRoleState() || {
    roleNames: [],
    hasClientRole: false,
    hasCoachRole: false,
    hasAdminRole: false,
    needsClientOnboarding: true,
    isDeactivated: false,
    isSuspended: false,
  };
}
