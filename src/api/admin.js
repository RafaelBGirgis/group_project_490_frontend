/**
 * Admin-role API calls.
 * Same pattern: real endpoint first, mock fallback.
 */

import { apiGet, apiPost } from "./api";

/* ═══════════════════════════════════════════════════════════════════════
   ADMIN STATS
   ═══════════════════════════════════════════════════════════════════════ */

export async function fetchAdminStats() {
  try {
    return await apiGet("/admin/stats");
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

/* ═══════════════════════════════════════════════════════════════════════
   ALL USERS — full list with status
   ═══════════════════════════════════════════════════════════════════════ */

export async function fetchAllUsers() {
  try {
    return await apiGet("/admin/users");
  } catch {
    return [
      { id: 1,  name: "Elena Marks",    email: "elena@mail.com",   role: "client", status: "active",    created_at: "2026-04-14", last_active: "2 min ago" },
      { id: 2,  name: "David Osei",     email: "david@mail.com",   role: "coach",  status: "active",    created_at: "2026-04-13", last_active: "1 hr ago" },
      { id: 3,  name: "Aisha Patel",    email: "aisha@mail.com",   role: "client", status: "active",    created_at: "2026-04-12", last_active: "3 hrs ago" },
      { id: 4,  name: "Chris Nguyen",   email: "chris@mail.com",   role: "client", status: "active",    created_at: "2026-04-11", last_active: "5 hrs ago" },
      { id: 5,  name: "Fatima Al-Amin", email: "fatima@mail.com",  role: "coach",  status: "active",    created_at: "2026-04-10", last_active: "Yesterday" },
      { id: 6,  name: "Marcus Webb",    email: "marcus@mail.com",  role: "client", status: "suspended", created_at: "2026-03-28", last_active: "3 days ago" },
      { id: 7,  name: "Priya Sharma",   email: "priya@mail.com",   role: "coach",  status: "active",    created_at: "2026-03-25", last_active: "Today" },
      { id: 8,  name: "Jordan Lee",     email: "jordan@mail.com",  role: "client", status: "active",    created_at: "2026-03-20", last_active: "Today" },
      { id: 9,  name: "Tanya Okonkwo",  email: "tanya@mail.com",   role: "coach",  status: "active",    created_at: "2026-03-18", last_active: "2 days ago" },
      { id: 10, name: "Sam Rivera",     email: "sam@mail.com",     role: "client", status: "deactivated", created_at: "2026-03-15", last_active: "1 week ago" },
      { id: 11, name: "Rafael Girgis",  email: "rafael@mail.com",  role: "coach",  status: "active",    created_at: "2026-03-10", last_active: "Today" },
      { id: 12, name: "Sandra Kim",     email: "sandra@mail.com",  role: "coach",  status: "active",    created_at: "2026-03-05", last_active: "Yesterday" },
      { id: 13, name: "Mike Torres",    email: "mike@mail.com",    role: "client", status: "active",    created_at: "2026-02-28", last_active: "Today" },
      { id: 14, name: "Sarah Chen",     email: "sarah@mail.com",   role: "client", status: "active",    created_at: "2026-02-20", last_active: "3 hrs ago" },
      { id: 15, name: "John Doe",       email: "john@mail.com",    role: "client", status: "active",    created_at: "2026-02-15", last_active: "Today" },
    ];
  }
}

/** Suspend or deactivate a user account */
export async function updateUserStatus(userId, newStatus) {
  try {
    return await apiPost(`/admin/users/${userId}/status`, { status: newStatus });
  } catch {
    return { success: true };
  }
}

/** Permanently delete a user account */
export async function deleteUser(userId) {
  try {
    return await apiPost(`/admin/users/${userId}/delete`, {});
  } catch {
    return { success: true };
  }
}

/* ═══════════════════════════════════════════════════════════════════════
   EXERCISE BANK — admin can CRUD exercises
   ═══════════════════════════════════════════════════════════════════════ */

export async function fetchExerciseBank() {
  try {
    return await apiGet("/admin/exercises");
  } catch {
    return [
      { id: 1,  name: "Bench Press",            muscle_group: "Chest",     equipment: "Barbell",    created_by: "System" },
      { id: 2,  name: "Incline Dumbbell Press", muscle_group: "Chest",     equipment: "Dumbbell",   created_by: "System" },
      { id: 3,  name: "Cable Flyes",            muscle_group: "Chest",     equipment: "Cable",      created_by: "System" },
      { id: 4,  name: "Push-ups",               muscle_group: "Chest",     equipment: "Bodyweight", created_by: "System" },
      { id: 5,  name: "Barbell Row",            muscle_group: "Back",      equipment: "Barbell",    created_by: "System" },
      { id: 6,  name: "Lat Pulldown",           muscle_group: "Back",      equipment: "Cable",      created_by: "System" },
      { id: 7,  name: "Pull-ups",               muscle_group: "Back",      equipment: "Bodyweight", created_by: "System" },
      { id: 8,  name: "Face Pulls",             muscle_group: "Back",      equipment: "Cable",      created_by: "System" },
      { id: 9,  name: "Overhead Press",         muscle_group: "Shoulders", equipment: "Barbell",    created_by: "System" },
      { id: 10, name: "Lateral Raises",         muscle_group: "Shoulders", equipment: "Dumbbell",   created_by: "System" },
      { id: 11, name: "Barbell Squat",          muscle_group: "Legs",      equipment: "Barbell",    created_by: "System" },
      { id: 12, name: "Romanian Deadlift",      muscle_group: "Legs",      equipment: "Barbell",    created_by: "System" },
      { id: 13, name: "Leg Press",              muscle_group: "Legs",      equipment: "Machine",    created_by: "System" },
      { id: 14, name: "Calf Raises",            muscle_group: "Legs",      equipment: "Machine",    created_by: "System" },
      { id: 15, name: "Bicep Curls",            muscle_group: "Arms",      equipment: "Dumbbell",   created_by: "System" },
      { id: 16, name: "Tricep Pushdown",        muscle_group: "Arms",      equipment: "Cable",      created_by: "System" },
      { id: 17, name: "Skull Crushers",         muscle_group: "Arms",      equipment: "Barbell",    created_by: "System" },
      { id: 18, name: "Plank",                  muscle_group: "Core",      equipment: "Bodyweight", created_by: "System" },
      { id: 19, name: "Hanging Leg Raises",     muscle_group: "Core",      equipment: "Bodyweight", created_by: "System" },
      { id: 20, name: "Russian Twists",         muscle_group: "Core",      equipment: "Bodyweight", created_by: "System" },
      { id: 21, name: "Treadmill Run",          muscle_group: "Cardio",    equipment: "Machine",    created_by: "System" },
      { id: 22, name: "Jump Rope",              muscle_group: "Cardio",    equipment: "Bodyweight", created_by: "System" },
      { id: 23, name: "Rowing Machine",         muscle_group: "Cardio",    equipment: "Machine",    created_by: "System" },
    ];
  }
}

export async function createExercise(exercise) {
  try {
    return await apiPost("/admin/exercises", exercise);
  } catch {
    return { success: true, id: Date.now(), ...exercise, created_by: "Admin" };
  }
}

export async function updateExercise(exerciseId, exercise) {
  try {
    return await apiPost(`/admin/exercises/${exerciseId}`, exercise);
  } catch {
    return { success: true, ...exercise };
  }
}

export async function deleteExercise(exerciseId) {
  try {
    return await apiPost(`/admin/exercises/${exerciseId}/delete`, {});
  } catch {
    return { success: true };
  }
}

/* ═══════════════════════════════════════════════════════════════════════
   ANALYTICS — daily/weekly/monthly active users over time
   ═══════════════════════════════════════════════════════════════════════ */

/* ═══════════════════════════════════════════════════════════════════════
   COACH REQUESTS — admin reviews pending coach applications
   ═══════════════════════════════════════════════════════════════════════ */

export async function fetchCoachRequests(skip = 0, limit = 20) {
  try {
    // Backend: GET /roles/admin/query/coach_requests?skip=&limit=
    return await apiGet(`/roles/admin/query/coach_requests?skip=${skip}&limit=${limit}`);
  } catch {
    return [];
  }
}

export async function resolveCoachRequest(coachRequestId, isApproved) {
  // Backend: POST /roles/admin/resolve_coach_request
  return apiPost("/roles/admin/resolve_coach_request", {
    coach_request_id: coachRequestId,
    is_approved: isApproved,
  });
}

/* ═══════════════════════════════════════════════════════════════════════
   ANALYTICS — daily/weekly/monthly active users over time
   ═══════════════════════════════════════════════════════════════════════ */

export async function fetchAnalytics() {
  try {
    return await apiGet("/admin/analytics");
  } catch {
    // Generate realistic mock engagement data
    const now = new Date();
    const daily = [];
    const weekly = [];
    const monthly = [];

    // Last 30 days of daily active users
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const base = 55 + Math.floor(Math.random() * 30);
      const weekday = d.getDay();
      const weekdayBoost = (weekday > 0 && weekday < 6) ? 10 : -5;
      daily.push({
        date: d.toISOString().slice(0, 10),
        label: `${d.getMonth() + 1}/${d.getDate()}`,
        active_users: Math.max(20, base + weekdayBoost),
        new_signups: Math.floor(Math.random() * 5) + 1,
      });
    }

    // Last 12 weeks
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i * 7);
      weekly.push({
        date: d.toISOString().slice(0, 10),
        label: `W${12 - i}`,
        active_users: 80 + Math.floor(Math.random() * 40) + (12 - i) * 2,
        new_signups: Math.floor(Math.random() * 15) + 5,
      });
    }

    // Last 6 months
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now);
      d.setMonth(d.getMonth() - i);
      monthly.push({
        date: d.toISOString().slice(0, 7),
        label: monthNames[d.getMonth()],
        active_users: 100 + Math.floor(Math.random() * 50) + (5 - i) * 8,
        new_signups: Math.floor(Math.random() * 30) + 10,
      });
    }

    return {
      daily,
      weekly,
      monthly,
      summary: {
        dau: daily[daily.length - 1]?.active_users ?? 0,
        wau: weekly[weekly.length - 1]?.active_users ?? 0,
        mau: monthly[monthly.length - 1]?.active_users ?? 0,
        dau_change: 12,
        wau_change: 8,
        mau_change: 15,
        total_signups_30d: daily.reduce((s, d) => s + d.new_signups, 0),
        avg_session_min: 24,
        retention_7d: 68,
      },
    };
  }
}
