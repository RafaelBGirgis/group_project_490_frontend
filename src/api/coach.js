/**
 * Coach-role API calls.
 * Same pattern as client.js — real endpoint first, mock fallback.
 */

import { apiGet, apiPost } from "./api";

/* ─── coach profile ───────────────────────────────────────────────── */

export async function fetchCoachProfile() {
  return apiPost("/roles/coach/me", {});
}

export async function deactivateCoachAccount() {
  try {
    return await apiPost("/me/deactivate", {});
  } catch {
    // Mock until backend ships this endpoint
    return { success: true, message: "Coach account deactivated successfully" };
  }
}

export async function deleteCoachAccount() {
  try {
    return await apiPost("/me/delete", {});
  } catch {
    // Mock until backend ships this endpoint
    return { success: true, message: "Coach account deletion requested successfully" };
  }
}

/* ─── my clients ──────────────────────────────────────────────────── */

export async function fetchMyClients(coachId) {
  try {
    return await apiGet(`/roles/coach/${coachId}/clients`);
  } catch {
    return [
      { id: 1, name: "John Doe",     goal: "Muscle Gain",   status: "active",   joined: "2 weeks ago" },
      { id: 2, name: "Sarah Chen",   goal: "Weight Loss",   status: "active",   joined: "1 month ago" },
      { id: 3, name: "Mike Torres",  goal: "Maintenance",   status: "active",   joined: "3 months ago" },
      { id: 4, name: "Aisha Patel",  goal: "Muscle Gain",   status: "paused",   joined: "2 months ago" },
      { id: 5, name: "Jordan Lee",   goal: "Weight Loss",   status: "active",   joined: "1 week ago" },
    ];
  }
}

/* ─── schedule / upcoming sessions ────────────────────────────────── */

export async function fetchUpcomingSessions(coachId) {
  try {
    return await apiGet(`/roles/coach/${coachId}/sessions`);
  } catch {
    return [
      { id: 1, client_name: "John Doe",    weekday: "Monday",    start_time: "9:00 AM",  type: "Strength" },
      { id: 2, client_name: "Sarah Chen",  weekday: "Monday",    start_time: "11:00 AM", type: "Cardio" },
      { id: 3, client_name: "Mike Torres", weekday: "Tuesday",   start_time: "10:00 AM", type: "Strength" },
      { id: 4, client_name: "Jordan Lee",  weekday: "Wednesday", start_time: "2:00 PM",  type: "HIIT" },
      { id: 5, client_name: "John Doe",    weekday: "Thursday",  start_time: "9:00 AM",  type: "Strength" },
    ];
  }
}

/* ─── coach availability ──────────────────────────────────────────── */

export async function fetchCoachAvailability(coachId) {
  try {
    return await apiGet(`/roles/coach/${coachId}/availability`);
  } catch {
    const times = ["9AM","10AM","11AM","12PM","1PM","2PM","3PM","4PM"];
    return times.map((time) => ({
      time,
      slots: ["available","booked","available","booked","available",null,null],
    }));
  }
}

export async function saveCoachAvailability(coachId, slots) {
  try {
    return await apiPost(`/roles/coach/${coachId}/availability`, {
      availabilities: slots,
    });
  } catch {
    return { success: true };
  }
}

/* ─── coach stats ─────────────────────────────────────────────────── */

export async function fetchCoachStats(coachId) {
  try {
    return await apiGet(`/roles/coach/${coachId}/stats`);
  } catch {
    return {
      total_clients: 5,
      active_clients: 4,
      sessions_this_week: 8,
      avg_rating: 4.9,
      review_count: 47,
      revenue_this_month: 749.95,
    };
  }
}

/* ─── coach reviews ───────────────────────────────────────────────── */

export async function fetchCoachReviews(coachId) {
  try {
    return await apiGet(`/roles/coach/${coachId}/reviews`);
  } catch {
    return [
      { id: 1, client_name: "John Doe",    rating: 5, comment: "Best coach I've ever had. Transformed my training.",  created_at: "1 week ago" },
      { id: 2, client_name: "Sarah Chen",  rating: 5, comment: "Very knowledgeable and always on time.",              created_at: "2 weeks ago" },
      { id: 3, client_name: "Mike Torres", rating: 4, comment: "Great programs, solid feedback on form.",             created_at: "1 month ago" },
    ];
  }
}

/* ─── workout plans (coach creates for clients) ───────────────────── */

export async function fetchCoachWorkoutPlans(coachId) {
  try {
    return await apiGet(`/roles/coach/${coachId}/workout-plans`);
  } catch {
    return [
      { id: 1, strata_name: "Beginner Push/Pull/Legs", client_count: 2, last_updated: "2 days ago" },
      { id: 2, strata_name: "Advanced Strength",       client_count: 1, last_updated: "1 week ago" },
      { id: 3, strata_name: "Fat Loss HIIT Program",   client_count: 2, last_updated: "3 days ago" },
    ];
  }
}
