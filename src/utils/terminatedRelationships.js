const STORAGE_KEY = "terminated_relationship_ids";

function readIds() {
  if (typeof window === "undefined" || !window.localStorage) {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = JSON.parse(raw || "[]");
    return Array.isArray(parsed)
      ? parsed.map((value) => Number(value)).filter(Number.isFinite)
      : [];
  } catch {
    return [];
  }
}

function writeIds(ids) {
  if (typeof window === "undefined" || !window.localStorage) {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
}

export function rememberTerminatedRelationshipId(relationshipId) {
  const id = Number(relationshipId);
  if (!Number.isFinite(id)) {
    return;
  }

  const ids = readIds();
  if (!ids.includes(id)) {
    writeIds([...ids, id]);
  }
}

export function getRememberedTerminatedRelationshipIds() {
  return readIds();
}

export function forgetTerminatedRelationshipId(relationshipId) {
  const id = Number(relationshipId);
  if (!Number.isFinite(id)) {
    return;
  }

  writeIds(readIds().filter((value) => value !== id));
}
