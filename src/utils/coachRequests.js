function getResolutionKey(requestId) {
  return `coach_request_resolution:${requestId}`;
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function getClientCoachRequestsKey(email) {
  return `pending_coach_requests:${normalizeEmail(email)}`;
}

function readJson(key) {
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function normalizeStatus(value) {
  return String(value || "").trim().toLowerCase();
}

export function isApprovedCoachRequest(request) {
  const status = normalizeStatus(request?.status);
  return status === "approved" || request?.is_accepted === true;
}

export function isPendingCoachRequest(request) {
  const status = normalizeStatus(request?.status);
  return status === "pending" || (!status && request?.is_accepted == null);
}

export function resolveActiveCoachRelationship(myCoach, requestList) {
  const byCoachId = {};

  (Array.isArray(requestList) ? requestList : []).forEach((request) => {
    const coachId = Number(request?.coach_id);
    if (!Number.isFinite(coachId)) {
      return;
    }

    const previous = byCoachId[coachId];
    const previousTime = new Date(previous?.updated_at || 0).getTime();
    const currentTime = new Date(request?.updated_at || 0).getTime();

    if (!previous || currentTime >= previousTime) {
      byCoachId[coachId] = {
        ...previous,
        ...request,
        coach_id: coachId,
      };
    }
  });

  if (myCoach?.coach_id != null) {
    const coachId = Number(myCoach.coach_id);
    byCoachId[coachId] = {
      ...(byCoachId[coachId] || {}),
      ...myCoach,
      coach_id: coachId,
      status: byCoachId[coachId]?.status || "approved",
    };
  }

  const activeCoach = myCoach?.relationship_id != null
    ? {
        ...(byCoachId[Number(myCoach.coach_id)] || {}),
        ...myCoach,
      }
    : null;

  return { activeCoach, byCoachId };
}

export function saveCoachRequestResolution(requestId, status) {
  if (!requestId || !status) return;
  localStorage.setItem(
    getResolutionKey(requestId),
    JSON.stringify({
      status,
      resolvedAt: new Date().toISOString(),
    })
  );
}

export function readCoachRequestResolution(requestId) {
  if (!requestId) return null;
  const raw = localStorage.getItem(getResolutionKey(requestId));
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function clearCoachRequestResolution(requestId) {
  if (!requestId) return;
  localStorage.removeItem(getResolutionKey(requestId));
}

export function readClientCoachRequests(email) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return {};
  const parsed = readJson(getClientCoachRequestsKey(normalizedEmail));
  if (!parsed || typeof parsed !== "object") return {};

  return Object.fromEntries(
    Object.entries(parsed).map(([coachId, value]) => {
      if (typeof value === "number") {
        return [
          coachId,
          {
            coach_id: Number(coachId),
            request_id: value,
            status: "pending",
            relationship_id: null,
            updated_at: new Date().toISOString(),
          },
        ];
      }
      return [coachId, value];
    })
  );
}

export function saveClientCoachRequest(email, coachId, data) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail || !coachId || !data) return;

  const existing = readClientCoachRequests(normalizedEmail);
  const next = {
    ...existing,
    [coachId]: {
      ...(existing[coachId] || {}),
      ...data,
      coach_id: Number(coachId),
      updated_at: new Date().toISOString(),
    },
  };

  localStorage.setItem(getClientCoachRequestsKey(normalizedEmail), JSON.stringify(next));
}

export function removeClientCoachRequest(email, coachId) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail || !coachId) return;
  const existing = readClientCoachRequests(normalizedEmail);
  if (!existing[coachId]) return;
  const next = { ...existing };
  delete next[coachId];
  localStorage.setItem(getClientCoachRequestsKey(normalizedEmail), JSON.stringify(next));
}

export function updateClientCoachRequestByRequestId(requestId, updates) {
  if (!requestId || !updates || typeof updates !== "object") return;

  const keys = Object.keys(localStorage).filter((key) => key.startsWith("pending_coach_requests:"));
  keys.forEach((key) => {
    const parsed = readJson(key);
    if (!parsed || typeof parsed !== "object") return;

    let changed = false;
    const next = { ...parsed };
    Object.entries(next).forEach(([coachId, value]) => {
      if (Number(value?.request_id) !== Number(requestId)) return;
      next[coachId] = {
        ...value,
        ...updates,
        updated_at: new Date().toISOString(),
      };
      changed = true;
    });

    if (changed) {
      localStorage.setItem(key, JSON.stringify(next));
    }
  });
}
