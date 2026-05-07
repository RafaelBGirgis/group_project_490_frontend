import { apiGet, apiPost, withQuery } from "./api";
import {
  buildCoachWorkoutActivities,
  buildCoachWorkoutPayload,
  createCoachWorkout,
  createCoachWorkoutActivity,
  createLegacyCoachWorkout,
  createLegacyCoachWorkoutActivity,
  createLegacyCoachWorkoutPlan,
  fetchClientWorkoutPlanByCoach,
  prescribeWorkoutPlan,
} from "./coach";
import { assignWorkoutPlanToClient } from "./client";

/* ═══════════════════════════════════════════════════════════════════════
   EXERCISE DATABASE — common exercises for the in-app builder
   ═══════════════════════════════════════════════════════════════════════ */

export const EXERCISE_DATABASE = [
  // Chest
  { name: "Bench Press",            muscle_group: "Chest",     equipment: "Barbell"  },
  { name: "Incline Dumbbell Press", muscle_group: "Chest",     equipment: "Dumbbell" },
  { name: "Cable Flyes",            muscle_group: "Chest",     equipment: "Cable"    },
  { name: "Push-ups",               muscle_group: "Chest",     equipment: "Bodyweight" },
  { name: "Dumbbell Flyes",         muscle_group: "Chest",     equipment: "Dumbbell" },
  // Back
  { name: "Barbell Row",            muscle_group: "Back",      equipment: "Barbell"  },
  { name: "Lat Pulldown",           muscle_group: "Back",      equipment: "Cable"    },
  { name: "Seated Cable Row",       muscle_group: "Back",      equipment: "Cable"    },
  { name: "Pull-ups",               muscle_group: "Back",      equipment: "Bodyweight" },
  { name: "T-Bar Row",              muscle_group: "Back",      equipment: "Barbell"  },
  { name: "Face Pulls",             muscle_group: "Back",      equipment: "Cable"    },
  // Shoulders
  { name: "Overhead Press",         muscle_group: "Shoulders", equipment: "Barbell"  },
  { name: "Lateral Raises",         muscle_group: "Shoulders", equipment: "Dumbbell" },
  { name: "Front Raises",           muscle_group: "Shoulders", equipment: "Dumbbell" },
  { name: "Arnold Press",           muscle_group: "Shoulders", equipment: "Dumbbell" },
  { name: "Reverse Flyes",          muscle_group: "Shoulders", equipment: "Dumbbell" },
  // Legs
  { name: "Barbell Squat",          muscle_group: "Legs",      equipment: "Barbell"  },
  { name: "Romanian Deadlift",      muscle_group: "Legs",      equipment: "Barbell"  },
  { name: "Leg Press",              muscle_group: "Legs",      equipment: "Machine"  },
  { name: "Leg Curl",               muscle_group: "Legs",      equipment: "Machine"  },
  { name: "Leg Extension",          muscle_group: "Legs",      equipment: "Machine"  },
  { name: "Calf Raises",            muscle_group: "Legs",      equipment: "Machine"  },
  { name: "Bulgarian Split Squat",  muscle_group: "Legs",      equipment: "Dumbbell" },
  { name: "Hip Thrust",             muscle_group: "Legs",      equipment: "Barbell"  },
  // Arms
  { name: "Bicep Curls",            muscle_group: "Arms",      equipment: "Dumbbell" },
  { name: "Hammer Curls",           muscle_group: "Arms",      equipment: "Dumbbell" },
  { name: "Tricep Pushdown",        muscle_group: "Arms",      equipment: "Cable"    },
  { name: "Skull Crushers",         muscle_group: "Arms",      equipment: "Barbell"  },
  { name: "Preacher Curls",         muscle_group: "Arms",      equipment: "Machine"  },
  { name: "Overhead Tricep Extension", muscle_group: "Arms",   equipment: "Dumbbell" },
  // Core
  { name: "Plank",                  muscle_group: "Core",      equipment: "Bodyweight" },
  { name: "Cable Crunches",         muscle_group: "Core",      equipment: "Cable"    },
  { name: "Hanging Leg Raises",     muscle_group: "Core",      equipment: "Bodyweight" },
  { name: "Russian Twists",         muscle_group: "Core",      equipment: "Bodyweight" },
  { name: "Ab Rollout",             muscle_group: "Core",      equipment: "Bodyweight" },
  // Cardio
  { name: "Treadmill Run",          muscle_group: "Cardio",    equipment: "Machine"  },
  { name: "Rowing Machine",         muscle_group: "Cardio",    equipment: "Machine"  },
  { name: "Jump Rope",              muscle_group: "Cardio",    equipment: "Bodyweight" },
  { name: "Stair Climber",          muscle_group: "Cardio",    equipment: "Machine"  },
];

export const MUSCLE_GROUPS = [
  "Chest", "Back", "Shoulders", "Legs", "Arms", "Core", "Cardio",
];

const DAY_ORDER = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

export async function fetchSupportedEquipment({ skip = 0, limit = 100 } = {}) {
  try {
    const response = await apiGet(
      withQuery("/roles/shared/fitness/query/supported_equiptment", { skip, limit })
    );
    const items = Array.isArray(response)
      ? response
      : Array.isArray(response?.items)
        ? response.items
        : Array.isArray(response?.equipment)
          ? response.equipment
          : [];
    const names = items
      .map((item) => item?.name || item?.equiptment_name || item?.equipment_name)
      .filter(Boolean);
    return Array.from(new Set(names));
  } catch {
    return [];
  }
}


/* ═══════════════════════════════════════════════════════════════════════
   API FUNCTIONS
   ═══════════════════════════════════════════════════════════════════════ */

/** Fetch all preset workouts (static library) */
export async function fetchPresetWorkouts() {
  return PRESET_WORKOUTS.map((workout) => normalizeWorkout(workout, "preset"));
}

/** Fetch the global library of workouts (read-only for clients) */
export async function fetchLibraryWorkouts({ text, workout_type, equipment_id } = {}) {
  try {
    const response = await apiGet(
      withQuery("/roles/shared/fitness/query/workout", {
        text,
        workout_type,
        equiptment_id: equipment_id,
        skip: 0,
        limit: 1000,
      })
    );
    const list = Array.isArray(response)
      ? response
      : Array.isArray(response?.workouts)
        ? response.workouts
        : Array.isArray(response?.items)
          ? response.items
          : [];
    const withActivities = await hydrateWorkoutActivities(list);
    return withActivities.map((workout) => normalizeWorkout(workout, "library"));
  } catch {
    return [];
  }
}

/** Fetch the user's view of workouts. Currently the same as the global library. */
export async function fetchMyWorkouts(role, roleId) {
  const backend = await fetchLibraryWorkouts();
  const cache = getLocalWorkoutCache(role, roleId);
  return mergeWorkouts(backend, cache);
}

/** Fetch activities belonging to a single workout */
export async function fetchActivitiesForWorkout(workoutId) {
  if (!workoutId) return [];
  try {
    const response = await apiGet(
      withQuery("/roles/shared/fitness/query/activity", {
        workout_id: workoutId,
        skip: 0,
        limit: 100,
      })
    );
    return Array.isArray(response)
      ? response
      : Array.isArray(response?.activities)
        ? response.activities
        : Array.isArray(response?.items)
          ? response.items
          : [];
  } catch {
    return [];
  }
}

/** Save (create) a new workout. Coach/admin only — clients only get a local copy. */
export async function createWorkout(role, roleId, workout) {
  const allowedToCreateOnBackend = role === "coach" || role === "admin";

  if (allowedToCreateOnBackend) {
    try {
      const createdWorkout = await createCoachWorkout(buildCoachWorkoutPayload(workout));
      const workoutId = createdWorkout.workout_id;
      const activities = buildCoachWorkoutActivities(workoutId, workout.exercises || []);
      const createdActivities = [];
      for (const activity of activities) {
        const created = await createCoachWorkoutActivity(activity);
        createdActivities.push({ ...activity, id: created?.workout_activity_id });
      }

      const cachedWorkout = {
        ...workout,
        id: workoutId,
        workout_id: workoutId,
        type: "custom",
        exercises: (workout.exercises || []).map((exercise, index) => ({
          ...exercise,
          id: createdActivities[index]?.id ?? exercise.id,
        })),
      };
      writeLocalWorkoutCache(role, roleId, [cachedWorkout, ...getLocalWorkoutCache(role, roleId)]);

      return { success: true, id: workoutId, workout_id: workoutId, ...cachedWorkout };
    } catch {
      const cachedWorkout = { ...workout, id: `custom-${Date.now()}`, type: "custom" };
      writeLocalWorkoutCache(role, roleId, [cachedWorkout, ...getLocalWorkoutCache(role, roleId)]);
      return { success: true, id: cachedWorkout.id, backend_gap: true, ...workout };
    }
  }

  const cachedWorkout = { ...workout, id: `custom-${Date.now()}`, type: "custom" };
  writeLocalWorkoutCache(role, roleId, [cachedWorkout, ...getLocalWorkoutCache(role, roleId)]);
  return {
    success: true,
    id: cachedWorkout.id,
    backend_gap: true,
    message: "Only coaches and admins can publish workouts to the shared library.",
    ...workout,
  };
}

/** Update an existing workout (no backend route — local cache only) */
export async function updateWorkout(role, roleId, workoutId, workout) {
  const updated = getLocalWorkoutCache(role, roleId).map((item) =>
    String(item.id) === String(workoutId) ? { ...item, ...workout, id: workoutId } : item
  );
  writeLocalWorkoutCache(role, roleId, updated);
  return {
    success: true,
    backend_gap: true,
    message: "The backend spec does not include a workout update route.",
    ...workout,
  };
}

/** Delete a workout (no backend route — local cache only) */
export async function deleteWorkout(role, roleId, workoutId) {
  const remaining = getLocalWorkoutCache(role, roleId).filter(
    (item) => String(item.id) !== String(workoutId)
  );
  writeLocalWorkoutCache(role, roleId, remaining);
  return {
    success: true,
    backend_gap: true,
    message: "The backend spec does not include a workout delete route.",
  };
}

/** Duplicate a preset into the user's custom library */
export async function duplicatePreset(role, roleId, presetId) {
  const preset = PRESET_WORKOUTS.find((p) => p.id === presetId);
  if (!preset) return { success: false };

  const duplicated = {
    ...preset,
    id: `custom-${Date.now()}`,
    type: "custom",
    name: `${preset.name} (Copy)`,
  };

  if (role === "coach" || role === "admin") {
    return createWorkout(role, roleId, duplicated);
  }

  writeLocalWorkoutCache(role, roleId, [duplicated, ...getLocalWorkoutCache(role, roleId)]);
  return {
    success: true,
    ...duplicated,
    backend_gap: true,
    message: "Only coaches and admins can publish workouts to the shared library.",
  };
}

/*  plans  */

/** Fetch the client's saved workout plans from the backend */
export async function fetchClientPlans({ skip = 0, limit = 100 } = {}) {
  try {
    const response = await apiGet(
      withQuery("/roles/client/fitness/query/plans", { skip, limit })
    );
    const plans = Array.isArray(response)
      ? response
      : Array.isArray(response?.plans)
        ? response.plans
        : [];
    return plans;
  } catch {
    return [];
  }
}

/** Create a single workout plan from a list of plan-activity entries */
export async function createWorkoutPlan(strataName, planActivities) {
  return apiPost("/roles/shared/fitness/plan", {
    strata_name: strataName,
    activities: planActivities,
  });
}

/** Self-assign a backend WorkoutPlan to the authenticated client. */
export async function assignPlanToSelf(workoutPlanId, startDt, endDt) {
  return apiPost("/roles/client/assign_plan", {
    workout_plan_id: workoutPlanId,
    start_dt: startDt,
    end_dt: endDt,
  });
}

/** Coach prescribes a backend WorkoutPlan to one of their accepted clients. */
export async function prescribePlanToClient(workoutPlanId, clientId, startDt, endDt) {
  return apiPost("/roles/coach/prescribe_plan", {
    workout_plan_id: workoutPlanId,
    client_id: clientId,
    start_dt: startDt,
    end_dt: endDt,
  });
}

/** Fetch the user's weekly plan view (one entry per weekday).
 *  Backend returns bare ClientWorkoutPlan rows (no enriched activities), so
 *  the weekly view shows a placeholder per active plan with no exercise list.
 */
export async function fetchWeeklyPlan(role, roleId) {
  try {
    const plans = await fetchClientPlans();
    if (plans.length > 0) {
      return normalizeWeeklyPlanFromPlans(plans);
    }
  } catch {
    // Fall through to local cache below.
  }

  return normalizeWeeklyPlan(readJson(getWeeklyPlanCacheKey(role, roleId)));
}

/** Save the user's weekly plan locally (no backend route for editing) */
export async function saveWeeklyPlan(role, roleId, plan) {
  localStorage.setItem(getWeeklyPlanCacheKey(role, roleId), JSON.stringify(plan));
  return {
    success: true,
    backend_gap: true,
    message: "The backend spec does not include a weekly-plan update route — saved locally.",
  };
}

/** Publish each populated day as its own backend workout plan */
export async function publishWeeklyPlan(role, roleId, plan, fallbackName = "Weekly Plan") {
  void role;
  void roleId;
  const created = [];
  let populatedDays = 0;

  for (const dayKey of DAY_ORDER) {
    const dayWorkout = plan?.[dayKey];
    const exercises = Array.isArray(dayWorkout?.exercises) ? dayWorkout.exercises : [];
    if (exercises.length === 0) continue;
    populatedDays++;

    const planActivities = buildPlanActivities(exercises);
    if (planActivities.length === 0) {
      // Exercise list contains only items lacking real backend activity ids
      // (e.g. presets the user hasn't published as a workout first).
      created.push({ day: dayKey, error: "No backend-tracked activities to publish" });
      continue;
    }

    const strataName = `${capitalize(dayKey)} — ${dayWorkout?.name || fallbackName}`;
    try {
      const result = await createWorkoutPlan(strataName, planActivities);
      created.push({ day: dayKey, plan_id: result?.workout_plan_id ?? null });
    } catch (error) {
      created.push({ day: dayKey, error: error?.message || "Failed to publish" });
    }
  }

  return { success: true, published: created };
}

/*  coach-only: assignment  */

/** Fetch clients the coach can assign workouts to */
export async function fetchAssignableClients(coachId) {
  try {
    const clients = await fetchMyClients(coachId);
    return (clients || [])
      .filter((client) => client && client.id != null)
      .map((client) => ({
        id: client.id,
        name: client.name || `Client #${client.id}`,
        goal: client.goal || (client.status === "pending" ? "Pending request" : ""),
        status: client.status || "active",
      }));
  } catch {
    return [];
  }
}

/** Assign a workout to one or more clients */
export async function assignWorkout(coachId, workoutId, clientIds) {
  void coachId;
  void workoutId;
  return {
    success: true,
    assigned_count: clientIds.length,
    backend_gap: true,
    message: "The backend spec does not include a workout-assignment route.",
  };
}

/** Fetch workouts the coach has assigned (with client info) */
export async function fetchAssignedWorkouts(coachId) {
  void coachId;
  return [];
}

/* ═══════════════════════════════════════════════════════════════════════
   INTERNAL HELPERS
   ═══════════════════════════════════════════════════════════════════════ */

function normalizeWorkout(workout, fallbackType = "custom") {
  if (!workout || typeof workout !== "object") {
    return {
      id: null,
      name: "",
      description: "",
      instructions: "",
      workout_type: null,
      type: fallbackType,
      est_duration_min: 0,
      muscle_groups: [],
      exercises: [],
    };
  }

  const exercisesSource = Array.isArray(workout.exercises)
    ? workout.exercises
    : Array.isArray(workout.activities)
      ? workout.activities
      : [];

  return {
    ...workout,
    id: workout.id ?? workout.workout_id ?? workout.name ?? null,
    name: workout.name ?? workout.strata_name ?? workout.workout_name ?? "",
    description: workout.description ?? "",
    instructions: workout.instructions ?? "",
    workout_type: workout.workout_type ?? null,
    type: workout.type ?? fallbackType,
    est_duration_min: Number(workout.est_duration_min ?? 0),
    muscle_groups: Array.isArray(workout.muscle_groups) ? workout.muscle_groups : [],
    exercises: exercisesSource.map((exercise, index) => normalizeExercise(exercise, index, workout)),
  };
}

function normalizeExercise(exercise, index, workout) {
  const id = exercise.id ?? exercise.workout_activity_id ?? null;
  return {
    ...exercise,
    _key: exercise._key ?? id ?? `${workout?.id ?? workout?.name ?? "workout"}-${index}`,
    id,
    name: exercise.name ?? exercise.activity_name ?? `Exercise ${index + 1}`,
    sets: Number(exercise.sets ?? exercise.planned_sets ?? 0),
    reps: Number(exercise.reps ?? exercise.planned_reps ?? 0),
    weight: Number(exercise.weight ?? exercise.intensity_value ?? 0),
    intensity_measure: exercise.intensity_measure ?? "lbs",
    notes: exercise.notes ?? "",
    equipment: exercise.equipment ?? "",
    estimated_calories_per_unit_frequency: Number(exercise.estimated_calories_per_unit_frequency ?? 0),
  };
}

function emptyWeeklyPlan() {
  return {
    monday: null,
    tuesday: null,
    wednesday: null,
    thursday: null,
    friday: null,
    saturday: null,
    sunday: null,
  };
}

function normalizeWeeklyPlanFromPlans(plans) {
  const base = emptyWeeklyPlan();

  plans.forEach((plan, index) => {
    const dayKey = matchDayFromName(plan?.strata_name) ?? DAY_ORDER[index] ?? null;
    if (!dayKey) return;

    const activities =
      plan.activities ??
      plan.workout_activities ??
      plan.workout_plan_activities ??
      [];

    base[dayKey] = normalizeWorkout(
      {
        ...plan,
        id: plan.id ?? plan.workout_plan_id ?? `${dayKey}-plan`,
        name: plan.strata_name ?? plan.name ?? `Plan ${index + 1}`,
        exercises: activities,
      },
      "custom"
    );
  });

  return base;
}

function matchDayFromName(name) {
  if (!name) return null;
  const lower = String(name).toLowerCase();
  return DAY_ORDER.find((day) => lower.startsWith(day) || lower.includes(`${day} `)) ?? null;
}

async function hydrateWorkoutActivities(workouts) {
  return Promise.all(
    (workouts || []).map(async (workout) => {
      const workoutId = workout?.id ?? workout?.workout_id;
      if (!workoutId) {
        return workout;
      }

      const activities = await fetchActivitiesForWorkout(workoutId);
      return { ...workout, activities };
    })
  );
}

function buildPlanActivities(exercises) {
  return (exercises || [])
    .map((exercise) => {
      const activityId = Number(exercise.id ?? exercise.workout_activity_id);
      if (!Number.isFinite(activityId) || activityId <= 0) return null;

      const isDuration = exercise.intensity_measure === "sec";
      if (isDuration) {
        const duration = Number(exercise.weight ?? exercise.intensity_value ?? exercise.reps ?? 0);
        if (!Number.isFinite(duration) || duration <= 0) return null;
        return {
          workout_activity_id: activityId,
          planned_duration: duration,
          planned_reps: null,
          planned_sets: null,
        };
      }

      const reps = Number(exercise.reps ?? exercise.planned_reps ?? 0);
      const sets = Number(exercise.sets ?? exercise.planned_sets ?? 0);
      if (!reps || !sets) return null;
      return {
        workout_activity_id: activityId,
        planned_duration: null,
        planned_reps: reps,
        planned_sets: sets,
      };
    })
    .filter(Boolean);
}

function buildAssignmentWindow(dayKey = null) {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  if (dayKey && DAY_ORDER.includes(dayKey)) {
    const todayIndex = (now.getDay() + 6) % 7;
    const targetIndex = DAY_ORDER.indexOf(dayKey);
    const delta = (targetIndex - todayIndex + 7) % 7;
    start.setDate(start.getDate() + delta);
  }

  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return {
    startDt: start.toISOString(),
    endDt: end.toISOString(),
  };
}

async function fetchCoachClientPlans(clientId) {
  try {
    const result = await apiGet(
      withQuery(`/roles/coach/client_plans/${clientId}`, { skip: 0, limit: 100 })
    );
    return Array.isArray(result)
      ? result
      : Array.isArray(result?.plans)
        ? result.plans
        : [];
  } catch {
    const singlePlan = await fetchClientWorkoutPlanByCoach(clientId, 0).catch(() => null);
    return singlePlan?.strata_name ? [singlePlan] : [];
  }
}

function capitalize(value) {
  const text = String(value || "");
  return text.charAt(0).toUpperCase() + text.slice(1);
}
