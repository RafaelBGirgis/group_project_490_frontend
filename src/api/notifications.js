import { apiGet, apiPost, withQuery } from "./api";

/**
 * One-shot inbox payload: the recent slice + total + unread + per-category
 * counts in a single round trip. Use this for the bell badge / dropdown so
 * the page doesn't have to derive counts client-side. Fall back to the
 * paginated `queryNotifications` for "see all" / category filters.
 */
export async function fetchNotificationsSnapshot({ recentLimit = 25 } = {}) {
  try {
    const result = await apiGet(
      withQuery("/roles/shared/notifications/snapshot", { recent_limit: recentLimit })
    );
    return result || { total_count: 0, unread_count: 0, categories: {}, recent: [] };
  } catch {
    return { total_count: 0, unread_count: 0, categories: {}, recent: [] };
  }
}

/**
 * Paginated/filtered list. The snapshot covers the dashboard hot path; this
 * is for the "all notifications" page or category-scoped filters.
 */
export async function queryNotifications({
  skip = 0,
  limit = 100,
  onlyUnread = false,
  category = null,
} = {}) {
  const params = { skip, limit };
  if (onlyUnread) params.only_unread = true;
  if (category) params.category = category;
  const result = await apiGet(withQuery("/roles/shared/notifications/query", params));
  return Array.isArray(result) ? result : [];
}

export async function readNotification(notificationId) {
  return apiPost(`/roles/shared/notifications/read/${notificationId}`);
}

export async function readAllNotifications() {
  return apiPost("/roles/shared/notifications/read_all");
}
