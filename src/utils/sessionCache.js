const SESSION_CACHE_KEY = "tf:session-cache:v1";

function getDefaultCache() {
  return {
    roleState: null,
    coachAccess: null,
    account: null,
    notifications: [],
    notificationCounts: {
      unreadCount: 0,
      unreadChatCount: 0,
    },
    lastRoleContext: null,
  };
}

function readCache() {
  if (typeof localStorage === "undefined") return getDefaultCache();
  try {
    const raw = localStorage.getItem(SESSION_CACHE_KEY);
    if (!raw) return getDefaultCache();
    return { ...getDefaultCache(), ...JSON.parse(raw) };
  } catch {
    return getDefaultCache();
  }
}

function writeCache(next) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(SESSION_CACHE_KEY, JSON.stringify(next));
  } catch {
    // Best-effort only.
  }
}

function updateCache(mutator) {
  const current = readCache();
  const next = mutator(current);
  writeCache(next);
  return next;
}

export function clearSessionCache() {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.removeItem(SESSION_CACHE_KEY);
  } catch {
    // Best-effort only.
  }
}

export function getCachedRoleState() {
  return readCache().roleState || null;
}

export function cacheRoleState(roleState) {
  if (!roleState) return getCachedRoleState();

  return updateCache((current) => {
    const previousRoleNames = Array.isArray(current.roleState?.roleNames)
      ? current.roleState.roleNames
      : [];
    const nextRoleNames = Array.isArray(roleState.roleNames) ? roleState.roleNames : [];
    const mergedRoleNames = [...new Set([...previousRoleNames, ...nextRoleNames])];

    return {
      ...current,
      roleState: {
        roleNames: mergedRoleNames,
        hasClientRole: mergedRoleNames.includes("client"),
        hasCoachRole: mergedRoleNames.includes("coach"),
        hasAdminRole: mergedRoleNames.includes("admin"),
        needsClientOnboarding: !mergedRoleNames.includes("client"),
      },
    };
  }).roleState;
}

export function cacheRoleHintsFromAccount(account) {
  if (!account || typeof account !== "object") return getCachedRoleState();
  const roleNames = [
    account.client_id != null ? "client" : null,
    account.coach_id != null ? "coach" : null,
    account.admin_id != null ? "admin" : null,
  ].filter(Boolean);

  if (roleNames.length === 0) return getCachedRoleState();
  return cacheRoleState({
    roleNames,
  });
}

export function getCachedCoachAccessState() {
  return readCache().coachAccess || null;
}

export function cacheCoachAccessState(coachAccess) {
  if (!coachAccess) return getCachedCoachAccessState();

  return updateCache((current) => ({
    ...current,
    coachAccess: {
      hasCoachRecord: Boolean(coachAccess.hasCoachRecord),
      canAccessCoach: Boolean(coachAccess.canAccessCoach),
      coachVerified: Boolean(coachAccess.coachVerified),
    },
  })).coachAccess;
}

export function getCachedAccountSnapshot() {
  return readCache().account || null;
}

export function cacheAccountSnapshot(account) {
  if (!account || typeof account !== "object") return getCachedAccountSnapshot();

  return updateCache((current) => ({
    ...current,
    account: {
      id: account.id ?? current.account?.id ?? null,
      name: account.name ?? current.account?.name ?? "",
      pfp_url: account.pfp_url ?? current.account?.pfp_url ?? "",
      client_id: account.client_id ?? current.account?.client_id ?? null,
      coach_id: account.coach_id ?? current.account?.coach_id ?? null,
      admin_id: account.admin_id ?? current.account?.admin_id ?? null,
      is_suspended: Boolean(account.is_suspended ?? current.account?.is_suspended ?? false),
    },
  })).account;
}

function countNotifications(notifications) {
  const items = Array.isArray(notifications) ? notifications : [];
  return {
    unreadCount: items.filter((item) => !item?.read).length,
    unreadChatCount: items.filter(
      (item) => !item?.read && item?.category === "chat_message"
    ).length,
  };
}

export function getCachedNotifications() {
  return Array.isArray(readCache().notifications) ? readCache().notifications : [];
}

export function getCachedNotificationCounts() {
  return readCache().notificationCounts || { unreadCount: 0, unreadChatCount: 0 };
}

export function cacheNotificationCounts(nextCounts = {}) {
  return updateCache((current) => ({
    ...current,
    notificationCounts: {
      unreadCount:
        nextCounts.unreadCount ?? current.notificationCounts?.unreadCount ?? 0,
      unreadChatCount:
        nextCounts.unreadChatCount ?? current.notificationCounts?.unreadChatCount ?? 0,
    },
  })).notificationCounts;
}

export function cacheNotifications(notifications) {
  const items = Array.isArray(notifications) ? notifications.slice(0, 50) : [];
  const notificationCounts = countNotifications(items);

  return updateCache((current) => ({
    ...current,
    notifications: items,
    notificationCounts,
  }));
}

export function getLastRoleContext() {
  return readCache().lastRoleContext || null;
}

export function setLastRoleContext(context) {
  if (!context?.role || !context?.dashboardPath) return getLastRoleContext();
  if (!["client", "coach", "admin"].includes(context.role)) return getLastRoleContext();

  return updateCache((current) => ({
    ...current,
    lastRoleContext: {
      role: context.role,
      dashboardPath: context.dashboardPath,
    },
  })).lastRoleContext;
}
