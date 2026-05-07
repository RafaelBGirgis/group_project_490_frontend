import { apiGet, apiPost, withQuery } from "./api";

export async function fetchCoachRequests({ skip = 0, limit = 100 } = {}) {
  const result = await apiGet(withQuery("/roles/admin/query/coach_requests", { skip, limit }));
  return Array.isArray(result) ? result.map(normalizeCoachRequest) : [];
}

export async function fetchTotalTransactions() {
  const result = await apiGet("/roles/admin/total_transactions");
  return normalizeTransactions(result);
}

export async function fetchAdminStats() {
  const [requests, users, transactions] = await Promise.all([
    fetchCoachRequests(),
    fetchAllUsers(),
    fetchTotalTransactions().catch(() => ({ total_transactions: 0 })),
  ]);
  return {
    total_accounts: users.length,
    total_clients: users.filter((item) => item.role === "client").length,
    total_coaches: users.filter((item) => item.role === "coach").length,
    pending_role_requests: requests.length,
    active_today: 0,
    active_this_week: 0,
    active_this_month: 0,
    total_revenue: transactions.total_transactions ?? 0,
    revenue_this_month: 0,
    active_subscriptions: 0,
    revenue_change: 0,
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

export async function updateUserStatus(userId, newStatus) {
  void userId;
  void newStatus;
  throw new Error("The backend route list does not include a user status update endpoint.");
}

export async function deleteUser(userId) {
  void userId;
  throw new Error("The backend route list does not include a user deletion endpoint.");
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

export async function fetchAnalytics() {
  try {
    const requests = await fetchCoachRequests();
    const count = requests.length;
    return {
      daily: [{ label: "Today", active_users: count, new_signups: count }],
      weekly: [{ label: "This Week", active_users: count, new_signups: count }],
      monthly: [{ label: "This Month", active_users: count, new_signups: count }],
      summary: {
        dau: count,
        wau: count,
        mau: count,
        dau_change: 0,
        wau_change: 0,
        mau_change: 0,
        total_signups_30d: count,
        avg_session_min: 0,
        retention_7d: 0,
      },
    };
  } catch {
    return {
      daily: [],
      weekly: [],
      monthly: [],
      summary: {
        dau: 0,
        wau: 0,
        mau: 0,
        dau_change: 0,
        wau_change: 0,
        mau_change: 0,
        total_signups_30d: 0,
        avg_session_min: 0,
        retention_7d: 0,
      },
    };
  }
}

export async function resolveCoachRequest(coach_request_id, is_approved) {
  return apiPost("/roles/admin/resolve_coach_request", {
    coach_request_id,
    is_approved,
  });
}

export async function refreshPayments() {
  return apiPost("/refresh_payments", {});
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

function normalizeTransactions(result) {
  if (typeof result === "number") {
    return { total_transactions: result };
  }

  return {
    total_transactions:
      Number(
        result?.total_transactions ??
        result?.total_amount ??
        result?.amount ??
        0
      ) || 0,
  };
}
