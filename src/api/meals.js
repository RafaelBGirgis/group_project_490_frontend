// Meal CRUD + prescription helpers, used by both coach and client UIs.
// The backend doesn't split these by role at the URL level — same routes,
// the response varies based on what the caller is allowed to see.
import { apiGet, apiPost, apiDelete, withQuery } from "./api";

/**
 * Create a meal. Used by both coaches (building meals to prescribe) and
 * clients (logging their own custom meals).
 *
 * @param {string} mealName
 * @param {Array<{food_id: number, grams: number}>} foods
 * @returns the newly-created meal with computed totals
 */
export async function createMeal(mealName, foods) {
  return apiPost("/api/meals", { meal_name: mealName, foods });
}

/**
 * List meals visible to the caller. Coaches see their own + seeded library
 * meals; clients see their own + meals their coach prescribed to them.
 */
export async function fetchMealLibrary({ skip = 0, limit = 50, mineOnly = false } = {}) {
  try {
    const result = await apiGet(
      withQuery("/api/meals/library", { skip, limit, mine_only: mineOnly })
    );
    return Array.isArray(result) ? result : [];
  } catch {
    return [];
  }
}

export async function fetchMealDetail(mealId) {
  return apiGet(`/api/meals/${encodeURIComponent(mealId)}`);
}

export async function deleteMeal(mealId) {
  return apiDelete(`/api/meals/${encodeURIComponent(mealId)}`);
}

/**
 * Coach-only: assign one of their meals to a specific client.
 * `scheduledDate` (YYYY-MM-DD) + `mealKind` ("breakfast"/"lunch"/"dinner"/
 * "snack") wire it to a slot on the weekly planner. Both null = standing
 * recipe the client can log on any day.
 *
 * Same (date, kind) slot getting prescribed twice replaces the previous
 * row server-side, so the planner stays clean even with rapid edits.
 */
export async function prescribeMealToClient(clientId, mealId, { scheduledDate = null, mealKind = null } = {}) {
  return apiPost(`/api/meals/prescribe/${encodeURIComponent(clientId)}`, {
    meal_id: mealId,
    scheduled_date: scheduledDate,
    meal_kind: mealKind,
  });
}

/**
 * Client-only: list meals their coach has prescribed.
 * Pass `onDate` (YYYY-MM-DD) to filter to a single day's plan plus
 * standing recipes; omit it for the full prescription history.
 */
export async function fetchMyPrescribedMeals({ onDate, includeStanding = true } = {}) {
  try {
    const result = await apiGet(
      withQuery("/api/meals/prescribed/mine", {
        on_date: onDate,
        include_standing: includeStanding,
      })
    );
    return Array.isArray(result) ? result : [];
  } catch {
    return [];
  }
}

/**
 * Coach-only: list meals they've prescribed to a specific client.
 * Pass `weekStart` (YYYY-MM-DD, must be a Monday) to scope to one week
 * for the planner grid. Without it, returns the full history.
 */
export async function fetchPrescribedMealsByClient(clientId, { weekStart } = {}) {
  try {
    const result = await apiGet(
      withQuery(`/api/meals/prescribed/by_client/${encodeURIComponent(clientId)}`, {
        week_start: weekStart,
      })
    );
    return Array.isArray(result) ? result : [];
  } catch {
    return [];
  }
}

export async function unprescribeMeal(prescriptionId) {
  return apiDelete(
    `/api/meals/prescribed/${encodeURIComponent(prescriptionId)}`
  );
}
