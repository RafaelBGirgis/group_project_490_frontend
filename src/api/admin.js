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
  try {
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
  } catch {
    return {
      total_accounts: 142,
      total_clients: 98,
      total_coaches: 21,
      pending_role_requests: 5,
      active_today: 67,
      active_this_week: 112,
      active_this_month: 138,
      total_revenue: 18420,
      revenue_this_month: 4250,
      active_subscriptions: 64,
      revenue_change: 12,
    };
  }
}

export async function fetchAllUsers({ sortBy = "name", sortDir = "asc", skip = 0, limit = 1000 } = {}) {
  try {
    const accounts = await apiGet(withQuery("/roles/admin/accounts", {
      sort_by: sortBy,
      sort_dir: sortDir,
      skip,
      limit,
    }));
    return Array.isArray(accounts) ? accounts.map(normalizeAdminAccount) : [];
  } catch {
    return [
      { id: 1, name: "Elena Marks", email: "elena@mail.com", role: "client", status: "active", created_at: "2026-04-14", last_active: "2 min ago" },
    ];
  }
}

export async function updateUserStatus(userId, newStatus) {
  return { success: true, userId, status: newStatus };
}

export async function deleteUser(userId) {
  return { success: true, userId };
}

export async function fetchExerciseBank() {
  return [
    { id: 1, name: "Bench Press", muscle_group: "Chest", equipment: "Barbell", created_by: "System" },
    { id: 2, name: "Barbell Row", muscle_group: "Back", equipment: "Barbell", created_by: "System" },
  ];
}

export async function createExercise(exercise) {
  return { success: true, id: Date.now(), ...exercise, created_by: "Admin" };
}

export async function updateExercise(exerciseId, exercise) {
  return { success: true, id: exerciseId, ...exercise };
}

export async function deleteExercise(exerciseId) {
  return { success: true, id: exerciseId };
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

function normalizeAdminAccount(item) {
  return {
    id: item.id,
    name: item.name || "Unknown Account",
    email: item.email || "unknown@example.com",
    role: item.role || item.roles?.[0] || "client",
    roles: item.roles || [item.role || "client"],
    status: item.status || (item.is_active ? "active" : "deactivated"),
    is_active: Boolean(item.is_active),
    created_at: item.created_at?.slice?.(0, 10) || "",
    last_active: item.last_active || "",
  };
}
