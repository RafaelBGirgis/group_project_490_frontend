import { apiGet, apiPost, apiDelete, withQuery } from "./api";

/* ─── Workouts (library) ─── */

export function searchWorkouts({ text, workout_type, equiptment_id, skip = 0, limit = 24 } = {}) {
  return apiGet(withQuery("/roles/shared/fitness/query/workout", {
    text, workout_type, equiptment_id, skip, limit,
  }));
}

export function listWorkoutActivities(workoutId, { skip = 0, limit = 50 } = {}) {
  return apiGet(withQuery("/roles/shared/fitness/query/activity", {
    workout_id: workoutId, skip, limit,
  }));
}

export function listSupportedEquipment({ skip = 0, limit = 100 } = {}) {
  return apiGet(withQuery("/roles/shared/fitness/query/supported_equiptment", { skip, limit }));
}

/* ─── Workout creation (coach) ─── */

export function createEquipment({ name, description }) {
  return apiPost("/roles/coach/fitness/equiptment", { name, description });
}

/**
 * Create a new workout with exactly 3 activity tiers.
 * payload: {
 *   name, description, instructions, workout_type ("rep"|"duration"),
 *   intensity_measure (e.g. "lbs", "kg", "sec"),
 *   activity_tiers: [{intensity_value, estimated_calories_per_unit_frequency} x3],
 *   equipment: [{equiptment_id?, name?, description?, is_required, is_recommended}],
 * }
 */
export function createWorkout(payload) {
  return apiPost("/roles/coach/fitness/workout", payload);
}

/* ─── Workout plans ─── */

export function searchWorkoutPlans({ text, skip = 0, limit = 24 } = {}) {
  return apiGet(withQuery("/roles/shared/fitness/query/workout_plan", { text, skip, limit }));
}

/**
 * Save a workout plan with its WorkoutPlanActivity rows.
 * payload: {
 *   strata_name,
 *   activities: [{workout_activity_id, planned_reps?, planned_sets?, planned_duration?}]
 * }
 */
export function saveWorkoutPlan(payload) {
  return apiPost("/roles/shared/fitness/plan", payload);
}

/* ─── Scheduling (client_workout_plan) ─── */

export function assignPlanToSelf({ workout_plan_id, start_dt, end_dt }) {
  return apiPost("/roles/client/assign_plan", {
    workout_plan_id,
    start_dt: toIsoUtc(start_dt),
    end_dt: toIsoUtc(end_dt),
  });
}

export function prescribePlanToClient({ workout_plan_id, client_id, start_dt, end_dt }) {
  return apiPost("/roles/coach/prescribe_plan", {
    workout_plan_id,
    client_id,
    start_dt: toIsoUtc(start_dt),
    end_dt: toIsoUtc(end_dt),
  });
}

export function deleteScheduledPlanAsClient(clientWorkoutPlanId) {
  return apiDelete(`/roles/client/fitness/client_workout_plan/${clientWorkoutPlanId}`);
}

export function deleteScheduledPlanAsCoach(clientWorkoutPlanId) {
  return apiDelete(`/roles/coach/client_workout_plan/${clientWorkoutPlanId}`);
}

export function listMyScheduledPlans({ skip = 0, limit = 50 } = {}) {
  return apiGet(withQuery("/roles/client/fitness/query/plans", { skip, limit }));
}

/* ─── Coach views of a target client ─── */

export function getClientAvailabilityAsCoach(clientId) {
  return apiGet(`/roles/coach/client/${clientId}/availability`);
}

export function getClientPlansAsCoach(clientId) {
  return apiGet(`/roles/coach/client/${clientId}/client_workout_plans`);
}

export function getMyAvailability() {
  // Reuse /me which already returns availabilities under client_details
  return apiGet("/roles/shared/account/me");
}

/* ─── Helpers ─── */

function toIsoUtc(value) {
  if (value instanceof Date) return value.toISOString();
  return new Date(value).toISOString();
}
