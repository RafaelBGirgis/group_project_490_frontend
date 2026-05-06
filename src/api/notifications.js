import { apiGet, apiPost, withQuery } from "./api";

export async function queryNotifications({ skip = 0, limit = 100 } = {}) {
  const result = await apiGet(withQuery("/roles/shared/notifications/query", { skip, limit }));
  return Array.isArray(result) ? result : [];
}

export async function readNotification(notificationId) {
  return apiPost(`/roles/shared/notifications/read/${notificationId}`);
}

export async function readAllNotifications() {
  return apiPost("/roles/shared/notifications/read_all");
}
