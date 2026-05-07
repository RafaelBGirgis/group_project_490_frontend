import { apiDelete, apiGet, apiPost, withQuery } from "./api";

/* ─── Workout / activity / equipment catalog ────────────────────────────── */

export async function searchWorkouts({
  text,
  workout_type,
  equiptment_id,
  skip = 0,
  limit = 24,
} = {}) {
  const result = await apiGet(
    withQuery("/roles/shared/fitness/query/workout", {
      text: text || undefined,
      workout_type: workout_type || undefined,
      equiptment_id: equiptment_id ?? undefined,
      skip,
      limit,
    })
  );
  return Array.isArray(result) ? result : [];
}

export async function listWorkoutActivities(workoutId) {
  const result = await apiGet(
    withQuery("/roles/shared/fitness/query/activity", { workout_id: workoutId })
  );
  return Array.isArray(result) ? result : [];
}

export async function listEquipment() {
  const result = await apiGet("/roles/shared/fitness/query/supported_equiptment");
  return Array.isArray(result) ? result : [];
}

/* ─── Workout creation (coach only) ─────────────────────────────────────── */

export async function createEquipment({ name, description }) {
  return apiPost("/roles/coach/fitness/equiptment", { name, description: description || null });
}

/**
 * Coach creates a Workout + 3 WorkoutActivity tiers + equipment list.
 * Payload shape:
 *   {
 *     name, description, instructions, workout_type: "rep" | "duration",
 *     intensity_measure: "lbs" | "kg" | "sec" | "min" | "" (free-text),
 *     activity_tiers: [
 *       { intensity_value, estimated_calories_per_unit_frequency },
 *       ... (exactly 3)
 *     ],
 *     equipment: [{ equiptment_id?, name?, description?, is_required, is_recommended }]
 *   }
 */
export async function createWorkout(payload) {
  return apiPost("/roles/coach/fitness/workout", payload);
}

/* ─── Workout plans ─────────────────────────────────────────────────────── */

export async function searchWorkoutPlans({ text, skip = 0, limit = 24 } = {}) {
  const result = await apiGet(
    withQuery("/roles/shared/fitness/query/workout_plan", {
      text: text || undefined,
      skip,
      limit,
    })
  );
  return Array.isArray(result) ? result : [];
}

/**
 * Saves a new WorkoutPlan with its activities.
 * activities: [{ workout_activity_id, planned_reps?, planned_sets?, planned_duration? }]
 */
export async function createWorkoutPlan({ strata_name, activities }) {
  return apiPost("/roles/shared/fitness/plan", { strata_name, activities });
}

/* ─── Scheduling ────────────────────────────────────────────────────────── */

/** blocks: [{ start_dt, end_dt }] — ISO strings */
export async function assignPlanToSelf({ workout_plan_id, blocks }) {
  return apiPost("/roles/client/assign_plan", { workout_plan_id, blocks });
}

export async function prescribePlanToClient({ workout_plan_id, client_id, blocks }) {
  return apiPost("/roles/coach/prescribe_plan", { workout_plan_id, client_id, blocks });
}

export async function listMyScheduledPlans({ skip = 0, limit = 100 } = {}) {
  const result = await apiGet(
    withQuery("/roles/client/fitness/query/plans", { skip, limit })
  );
  return Array.isArray(result) ? result : [];
}

export async function deleteScheduledPlanAsClient(planId) {
  return apiDelete(`/roles/client/fitness/client_workout_plan/${planId}`);
}

export async function deleteScheduledPlanAsCoach(planId) {
  return apiDelete(`/roles/coach/client_workout_plan/${planId}`);
}

/* ─── Coach view of clients ─────────────────────────────────────────────── */

export async function listAcceptedClients({ text, skip = 0, limit = 24 } = {}) {
  const result = await apiGet(
    withQuery("/roles/coach/clients", {
      text: text || undefined,
      skip,
      limit,
    })
  );
  return Array.isArray(result) ? result : [];
}

export async function getClientAvailabilityAsCoach(clientId) {
  const result = await apiGet(`/roles/coach/client/${clientId}/availability`);
  return Array.isArray(result) ? result : [];
}

export async function getClientScheduledPlansAsCoach(clientId) {
  const result = await apiGet(`/roles/coach/client/${clientId}/client_workout_plans`);
  return Array.isArray(result) ? result : [];
}

/* ─── Self availability (used for client-side fast-fail validation) ─────── */

export async function getMyAvailability() {
  try {
    const result = await apiPost("/roles/client/me", {});
    const ca = result?.client_account;
    if (Array.isArray(ca?.availabilities)) return ca.availabilities;
    // Fall back to any nested availability list the backend exposes.
    if (Array.isArray(result?.availabilities)) return result.availabilities;
  } catch {
    // Swallow — caller can still attempt to schedule and let the server validate.
  }
  return [];
}
