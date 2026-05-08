import { apiDelete, apiGet, apiPost, withQuery } from "./api";

export async function fetchCoachRequests({ skip = 0, limit = 100 } = {}) {
  const result = await apiGet(withQuery("/roles/admin/query/coach_requests", { skip, limit }));
  return Array.isArray(result) ? result.map(normalizeCoachRequest) : [];
}

export async function fetchTotalTransactions() {
  const result = await apiGet("/roles/admin/total_transactions");
  return normalizeTransactions(result);
}

/**
 * Platform engagement aggregates: active coach-client pairs and total messages
 * sent. Backs the two cards we put in place of the (fake) "this month" and
 * "active subscriptions" tiles. Returns zeros on failure so the dashboard
 * still renders if this single endpoint is unreachable.
 */
/**
 * Resolve a report by deleting the row. `kind` must match the backend
 * literal ("coach_on_client" | "client_on_coach") so the route picks the
 * correct table.
 */
export async function deleteReport(kind, reportId) {
  return apiDelete(`/roles/admin/reports/${kind}/${reportId}`);
}

/**
 * Platform-wide reports feed (both coach-on-client and client-on-coach).
 * Maps `created_at` to a short YYYY-MM-DD string so the dashboard's existing
 * report rows render without further formatting work.
 */
export async function fetchReports({ skip = 0, limit = 100 } = {}) {
  const result = await apiGet(withQuery("/roles/admin/reports", { skip, limit }));
  if (!Array.isArray(result)) return [];
  return result.map((r) => ({
    id: r.id,
    kind: r.kind,
    reporter_name: r.reporter_name,
    reported_name: r.reported_name,
    reported_account_id: r.reported_account_id ?? null,
    reason: r.reason,
    created_at: r.created_at ? String(r.created_at).slice(0, 10) : "",
  }));
}

export async function fetchPlatformEngagement() {
  try {
    const result = await apiGet("/roles/admin/platform_engagement");
    return {
      active_coach_client_pairs: Number(result?.active_coach_client_pairs) || 0,
      total_messages_sent: Number(result?.total_messages_sent) || 0,
    };
  } catch {
    return { active_coach_client_pairs: 0, total_messages_sent: 0 };
  }
}

/**
 * Platform-wide coach review aggregates, computed from /roles/client/query/hirable_coaches.
 * The backend already returns per-coach `avg_rating` and `rating_count`, so we just
 * weighted-average across them — coach A with 10 reviews at 4.0 dominates coach B
 * with 1 review at 5.0, which is what an admin actually wants to see.
 */
async function fetchPlatformReviewStats() {
  try {
    const result = await apiGet(
      withQuery("/roles/client/query/hirable_coaches", {
        skip: 0, limit: 1000, sort_by: "avg_rating", order: "desc",
      })
    );
    const coaches = Array.isArray(result) ? result : [];

    let weighted_sum = 0;
    let total_reviews = 0;
    let coaches_with_reviews = 0;
    coaches.forEach((c) => {
      const rating = Number(c?.avg_rating);
      const count = Number(c?.rating_count) || 0;
      if (Number.isFinite(rating) && count > 0) {
        weighted_sum += rating * count;
        total_reviews += count;
        coaches_with_reviews += 1;
      }
    });

    return {
      avg_coach_rating: total_reviews > 0
        ? Number((weighted_sum / total_reviews).toFixed(2))
        : 0,
      total_coach_reviews: total_reviews,
      coaches_with_reviews,
    };
  } catch {
    return { avg_coach_rating: 0, total_coach_reviews: 0, coaches_with_reviews: 0 };
  }
}

export async function fetchAdminStats() {
  const [requests, users, transactions, reviewStats, engagement] = await Promise.all([
    fetchCoachRequests(),
    fetchAllUsers(),
    fetchTotalTransactions().catch(() => ({ total_transactions: 0 })),
    fetchPlatformReviewStats(),
    fetchPlatformEngagement(),
  ]);

  // Account-status / growth metrics, derived from /roles/admin/accounts.
  const now = Date.now();
  const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
  const active_accounts = users.filter((u) => u.is_active).length;
  const signups_30d = users.filter((u) => {
    if (!u.created_at) return false;
    const t = new Date(u.created_at).getTime();
    return Number.isFinite(t) && now - t <= THIRTY_DAYS_MS;
  }).length;

  return {
    total_accounts: users.length,
    total_clients: users.filter((item) => item.role === "client").length,
    total_coaches: users.filter((item) => item.role === "coach").length,
    pending_role_requests: requests.length,
    active_accounts,
    deactivated_accounts: users.length - active_accounts,
    signups_30d,
    avg_coach_rating: reviewStats.avg_coach_rating,
    total_coach_reviews: reviewStats.total_coach_reviews,
    coaches_with_reviews: reviewStats.coaches_with_reviews,
    total_revenue: transactions.total_transactions ?? 0,
    active_coach_client_pairs: engagement.active_coach_client_pairs,
    total_messages_sent: engagement.total_messages_sent,
  };
}

export async function fetchAllUsers({ sortBy = "name", sortDir = "asc", skip = 0, limit = 1000 } = {}) {
  const accounts = await apiGet(withQuery("/roles/admin/accounts", {
    sort_by: sortBy,
    sort_dir: sortDir,
    skip,
    limit,
  }));
  return Array.isArray(accounts) ? accounts.map(normalizeAdminAccount) : [];
}

/**
 * Suspend or reactivate another user's account (admin-only).
 * Routes: POST /roles/admin/accounts/{id}/(deactivate|activate)
 *
 * Backend safety: refuses if the target is the caller (use the self-service
 * routes instead) or if the target is the last remaining active admin.
 */
export async function updateUserStatus(userId, newStatus) {
  const action = newStatus === "active" ? "activate" : "deactivate";
  return apiPost(`/roles/admin/accounts/${userId}/${action}`, {});
}

/**
 * Permanently delete another user's account and all their data.
 * Route: DELETE /roles/admin/accounts/{id}
 *
 * Backend safety: refuses if the target is the caller or last admin. The
 * cascade-cleans every FK-blocked row (workouts, meals, chats, role-promotion
 * history) using the same purge helper as the self-delete route.
 */
export async function deleteUser(userId) {
  return apiDelete(`/roles/admin/accounts/${userId}`);
}

export async function fetchExerciseBank() {
  throw new Error("The backend route list does not include an exercise bank endpoint.");
}

export async function createExercise(exercise) {
  void exercise;
  throw new Error("The backend route list does not include an exercise creation endpoint.");
}

export async function updateExercise(exerciseId, exercise) {
  void exerciseId;
  void exercise;
  throw new Error("The backend route list does not include an exercise update endpoint.");
}

export async function deleteExercise(exerciseId) {
  void exerciseId;
  throw new Error("The backend route list does not include an exercise deletion endpoint.");
}

/**
 * Engagement bar-chart data: bucketed counts of active users and new signups
 * for the last 14 days / 12 weeks / 12 months.
 *   - active_users = distinct client_ids in client_telemetry per bucket
 *   - new_signups  = account rows whose created_at falls in the bucket
 * The backend returns all three rollups in one payload so the period tabs
 * (Daily/Weekly/Monthly) switch without refetching.
 */
export async function fetchAnalytics() {
  const result = await apiGet("/roles/admin/analytics");
  return {
    daily: Array.isArray(result?.daily) ? result.daily : [],
    weekly: Array.isArray(result?.weekly) ? result.weekly : [],
    monthly: Array.isArray(result?.monthly) ? result.monthly : [],
  };
}

export async function resolveCoachRequest(coach_request_id, is_approved) {
  return apiPost("/roles/admin/resolve_coach_request", {
    coach_request_id,
    is_approved,
  });
}

function normalizeCoachRequest(item) {
  return {
    ...item,
    id: item.coach_request_id,
    account_name: item.base_account?.name || `Coach Applicant #${item.coach_request_id}`,
    requested_role: "Coach",
    is_approved: null,
    created_at: item.base_account?.created_at || null,
  };
}

function normalizeAdminAccount(item) {
  return {
    ...item,
    id: item.id,
    name: item.name || "Unknown User",
    email: item.email || "",
    role: item.role || (Array.isArray(item.roles) && item.roles[0]) || "client",
    // Backend only knows is_active (true|false). The admin UI surfaces the
    // off-state as "suspended" (orange badge), so collapse any backend label
    // for inactive accounts to that single value.
    status: item.is_active === false ? "suspended" : "active",
    is_active: item.is_active !== false,
    created_at: item.created_at ? String(item.created_at).slice(0, 10) : "",
    last_active: item.last_active || "",
  };
}

function normalizeTransactions(result) {
  if (typeof result === "number") {
    return { total_transactions: result };
  }

  return {
    total_transactions:
      Number(
        result?.total_transacted ??
        result?.total_transactions ??
        result?.total_amount ??
        result?.amount ??
        0
      ) || 0,
  };
}
