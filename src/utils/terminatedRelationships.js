const STORAGE_KEY = "terminated_relationship_ids";

function readIds() {
  if (typeof window === "undefined" || !window.sessionStorage) return [];

  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed.map((value) => Number(value)).filter((value) => Number.isFinite(value) && value > 0)
      : [];
  } catch {
    return [];
  }
}

function writeIds(ids) {
  if (typeof window === "undefined" || !window.sessionStorage) return;
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(new Set(ids))));
}

export function rememberTerminatedRelationshipId(relationshipId) {
  const numericId = Number(relationshipId);
  if (!Number.isFinite(numericId) || numericId <= 0) return;
  writeIds([...readIds(), numericId]);
}

export function forgetTerminatedRelationshipId(relationshipId) {
  const numericId = Number(relationshipId);
  if (!Number.isFinite(numericId) || numericId <= 0) return;
  writeIds(readIds().filter((value) => value !== numericId));
}

export function isRelationshipTerminatedInSession(relationshipId) {
  const numericId = Number(relationshipId);
  if (!Number.isFinite(numericId) || numericId <= 0) return false;
  return readIds().includes(numericId);
}
