/**
 * Workout API calls — shared by clients and coaches.
 *
 * Covers: preset library, custom workouts, CRUD, and coach → client assignment.
 * Same pattern as other API files: real endpoint first, mock fallback.
 */

import { apiGet, apiPost, withQuery } from "./api";
import {
  buildCoachWorkoutActivities,
  buildCoachWorkoutPayload,
  createCoachWorkout,
  createCoachWorkoutActivity,
  createLegacyCoachWorkout,
  createLegacyCoachWorkoutActivity,
  createLegacyCoachWorkoutPlan,
} from "./coach";

/* ═══════════════════════════════════════════════════════════════════════
   EXERCISE DATABASE — common exercises for the preset library & builder
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
   PRESET WORKOUTS — built-in templates anyone can use
   ═══════════════════════════════════════════════════════════════════════ */

const PRESET_WORKOUTS = [
  {
    id: "preset-ppl-push",
    name: "Push Day",
    description: "Chest, shoulders, and triceps focused compound and isolation work.",
    type: "preset",
    category: "Strength",
    difficulty: "Intermediate",
    est_duration_min: 60,
    muscle_groups: ["Chest", "Shoulders", "Arms"],
    exercises: [
      { name: "Bench Press",            sets: 4, reps: 6,  weight: 185, intensity_measure: "lbs", notes: "Warm up with bar first", rest_seconds: 60, equipment: "Barbell", estimated_calories_per_unit_frequency: 8 },
      { name: "Incline Dumbbell Press", sets: 3, reps: 10, weight: 60,  intensity_measure: "lbs",  notes: "", rest_seconds: 60, equipment: "Dumbbell", estimated_calories_per_unit_frequency: 7 },
      { name: "Overhead Press",         sets: 3, reps: 8,  weight: 95,  intensity_measure: "lbs", notes: "", equipment: "Barbell", estimated_calories_per_unit_frequency: 6 },
      { name: "Lateral Raises",         sets: 4, reps: 15, weight: 25,  intensity_measure: "lbs",  notes: "Control the negative", equipment: "Dumbbell", estimated_calories_per_unit_frequency: 4 },
      { name: "Tricep Pushdown",        sets: 3, reps: 12, weight: 50,  intensity_measure: "lbs",  notes: "", equipment: "Cable", estimated_calories_per_unit_frequency: 5 },
      { name: "Cable Flyes",            sets: 3, reps: 12, weight: 30,  intensity_measure: "lbs",  notes: "Squeeze at peak", equipment: "Cable", estimated_calories_per_unit_frequency: 5 },
    ],
  },
  {
    id: "preset-ppl-pull",
    name: "Pull Day",
    description: "Back and biceps — heavy rows, pulldowns, and isolation curls.",
    type: "preset",
    category: "Strength",
    difficulty: "Intermediate",
    est_duration_min: 55,
    muscle_groups: ["Back", "Arms"],
    exercises: [
      { name: "Barbell Row",       sets: 4, reps: 8,  weight: 155, intensity_measure: "lbs", notes: "", equipment: "Barbell", estimated_calories_per_unit_frequency: 8 },
      { name: "Lat Pulldown",      sets: 3, reps: 10, weight: 120, intensity_measure: "lbs",  notes: "", equipment: "Cable", estimated_calories_per_unit_frequency: 6 },
      { name: "Seated Cable Row",  sets: 3, reps: 10, weight: 100, intensity_measure: "lbs",  notes: "", equipment: "Cable", estimated_calories_per_unit_frequency: 6 },
      { name: "Face Pulls",        sets: 3, reps: 15, weight: 30,  intensity_measure: "lbs",  notes: "", equipment: "Cable", estimated_calories_per_unit_frequency: 4 },
      { name: "Bicep Curls",       sets: 3, reps: 12, weight: 35,  intensity_measure: "lbs",  notes: "", equipment: "Dumbbell", estimated_calories_per_unit_frequency: 4 },
      { name: "Hammer Curls",      sets: 3, reps: 12, weight: 30,  intensity_measure: "lbs",  notes: "", equipment: "Dumbbell", estimated_calories_per_unit_frequency: 4 },
    ],
  },
  {
    id: "preset-ppl-legs",
    name: "Leg Day",
    description: "Full lower-body session with compounds and accessories.",
    type: "preset",
    category: "Strength",
    difficulty: "Intermediate",
    est_duration_min: 65,
    muscle_groups: ["Legs", "Core"],
    exercises: [
      { name: "Barbell Squat",         sets: 4, reps: 6,  weight: 225, intensity_measure: "lbs", notes: "Hit depth", equipment: "Barbell", estimated_calories_per_unit_frequency: 10 },
      { name: "Romanian Deadlift",     sets: 3, reps: 10, weight: 185, intensity_measure: "lbs", notes: "", equipment: "Barbell", estimated_calories_per_unit_frequency: 9 },
      { name: "Leg Press",             sets: 3, reps: 12, weight: 360, intensity_measure: "lbs",  notes: "", equipment: "Machine", estimated_calories_per_unit_frequency: 7 },
      { name: "Leg Curl",              sets: 3, reps: 12, weight: 80,  intensity_measure: "lbs",  notes: "", equipment: "Machine", estimated_calories_per_unit_frequency: 5 },
      { name: "Calf Raises",           sets: 4, reps: 15, weight: 90,  intensity_measure: "lbs",  notes: "", equipment: "Machine", estimated_calories_per_unit_frequency: 4 },
      { name: "Hanging Leg Raises",    sets: 3, reps: 12, weight: 0,   intensity_measure: "bw",   notes: "", equipment: "Bodyweight", estimated_calories_per_unit_frequency: 5 },
    ],
  },
  {
    id: "preset-upper-lower-upper",
    name: "Upper Body Power",
    description: "Heavy compound lifts for upper-body strength and mass.",
    type: "preset",
    category: "Strength",
    difficulty: "Advanced",
    est_duration_min: 70,
    muscle_groups: ["Chest", "Back", "Shoulders", "Arms"],
    exercises: [
      { name: "Bench Press",        sets: 5, reps: 5,  weight: 205, intensity_measure: "lbs", notes: "", equipment: "Barbell", estimated_calories_per_unit_frequency: 9 },
      { name: "Barbell Row",        sets: 5, reps: 5,  weight: 175, intensity_measure: "lbs", notes: "", equipment: "Barbell", estimated_calories_per_unit_frequency: 9 },
      { name: "Overhead Press",     sets: 4, reps: 6,  weight: 115, intensity_measure: "lbs", notes: "", equipment: "Barbell", estimated_calories_per_unit_frequency: 7 },
      { name: "Pull-ups",           sets: 4, reps: 8,  weight: 0,   intensity_measure: "bw",  notes: "Add weight if possible", equipment: "Bodyweight", estimated_calories_per_unit_frequency: 8 },
      { name: "Dumbbell Flyes",     sets: 3, reps: 12, weight: 40,  intensity_measure: "lbs",  notes: "", equipment: "Dumbbell", estimated_calories_per_unit_frequency: 5 },
      { name: "Skull Crushers",     sets: 3, reps: 10, weight: 55,  intensity_measure: "lbs",  notes: "", equipment: "Barbell", estimated_calories_per_unit_frequency: 5 },
    ],
  },
  {
    id: "preset-full-body-beginner",
    name: "Full Body — Beginner",
    description: "Simple full-body routine for those new to lifting. Focus on form.",
    type: "preset",
    category: "General",
    difficulty: "Beginner",
    est_duration_min: 45,
    muscle_groups: ["Chest", "Back", "Legs", "Core"],
    exercises: [
      { name: "Barbell Squat",     sets: 3, reps: 8,  weight: 95,  intensity_measure: "lbs", notes: "Start light, get the form right", equipment: "Barbell", estimated_calories_per_unit_frequency: 8 },
      { name: "Bench Press",       sets: 3, reps: 8,  weight: 95,  intensity_measure: "lbs", notes: "", equipment: "Barbell", estimated_calories_per_unit_frequency: 7 },
      { name: "Barbell Row",       sets: 3, reps: 8,  weight: 85,  intensity_measure: "lbs", notes: "", equipment: "Barbell", estimated_calories_per_unit_frequency: 7 },
      { name: "Overhead Press",    sets: 3, reps: 8,  weight: 65,  intensity_measure: "lbs",  notes: "", equipment: "Barbell", estimated_calories_per_unit_frequency: 6 },
      { name: "Plank",             sets: 3, reps: 30, weight: 0,   intensity_measure: "sec",  notes: "Hold for time", equipment: "Bodyweight", estimated_calories_per_unit_frequency: 3 },
    ],
  },
  {
    id: "preset-hiit-cardio",
    name: "HIIT Cardio Blast",
    description: "High-intensity interval training for fat burning and conditioning.",
    type: "preset",
    category: "Cardio",
    difficulty: "Intermediate",
    est_duration_min: 30,
    muscle_groups: ["Cardio", "Core"],
    exercises: [
      { name: "Jump Rope",         sets: 5, reps: 60,  weight: 0, intensity_measure: "sec",  notes: "60s on, 30s off", equipment: "Bodyweight", estimated_calories_per_unit_frequency: 12 },
      { name: "Russian Twists",    sets: 3, reps: 20,  weight: 15, intensity_measure: "lbs", notes: "", equipment: "Bodyweight", estimated_calories_per_unit_frequency: 5 },
      { name: "Push-ups",          sets: 3, reps: 15,  weight: 0, intensity_measure: "bw",   notes: "", equipment: "Bodyweight", estimated_calories_per_unit_frequency: 6 },
      { name: "Rowing Machine",    sets: 4, reps: 90,  weight: 0, intensity_measure: "sec",  notes: "90s all-out effort", equipment: "Machine", estimated_calories_per_unit_frequency: 14 },
      { name: "Hanging Leg Raises", sets: 3, reps: 12, weight: 0, intensity_measure: "bw",   notes: "", equipment: "Bodyweight", estimated_calories_per_unit_frequency: 5 },
    ],
  },
  {
    id: "preset-mobility-recovery",
    name: "Mobility & Recovery",
    description: "Light movement, stretches, and recovery work for rest days.",
    type: "preset",
    category: "Recovery",
    difficulty: "Beginner",
    est_duration_min: 25,
    muscle_groups: ["Core", "Legs"],
    exercises: [
      { name: "Plank",              sets: 3, reps: 45, weight: 0, intensity_measure: "sec", notes: "Engage core fully", equipment: "Bodyweight", estimated_calories_per_unit_frequency: 3 },
      { name: "Ab Rollout",         sets: 3, reps: 10, weight: 0, intensity_measure: "bw",  notes: "Slow and controlled", equipment: "Bodyweight", estimated_calories_per_unit_frequency: 5 },
      { name: "Bulgarian Split Squat", sets: 2, reps: 10, weight: 0, intensity_measure: "bw", notes: "Per leg — go light", equipment: "Bodyweight", estimated_calories_per_unit_frequency: 6 },
      { name: "Hip Thrust",         sets: 3, reps: 12, weight: 0, intensity_measure: "bw",  notes: "Focus on glute squeeze", equipment: "Barbell", estimated_calories_per_unit_frequency: 6 },
    ],
  },
];

/* ═══════════════════════════════════════════════════════════════════════
   API FUNCTIONS
   ═══════════════════════════════════════════════════════════════════════ */

/** Fetch all preset workouts (static library) */
export async function fetchPresetWorkouts() {
  return PRESET_WORKOUTS.map((workout) => normalizeWorkout(workout, "preset"));
}

/** Fetch the user's custom (saved) workouts */
export async function fetchMyWorkouts(role, roleId) {
  try {
    const response = await apiGet(
      withQuery("/roles/shared/fitness/query/workout", { skip: 0, limit: 1000 })
    );
    const list = Array.isArray(response)
      ? response
      : Array.isArray(response?.workouts)
        ? response.workouts
        : Array.isArray(response?.items)
          ? response.items
          : [];
    const withActivities = await hydrateWorkoutActivities(list);
    const backendWorkouts = withActivities.map((workout) => normalizeWorkout(workout, "custom"));
    return mergeWorkouts(backendWorkouts, getLocalWorkoutCache(role, roleId));
  } catch {
    return getLocalWorkoutCache(role, roleId).map((workout) => normalizeWorkout(workout, "custom"));
  }
}

/** Save (create) a new custom workout */
export async function createWorkout(role, roleId, workout) {
  if (role === "coach") {
    try {
      try {
        await createLegacyCoachWorkout(toLegacyCoachWorkoutPayload(workout));
      } catch {
        // Keep the canonical fitness route as source of truth for IDs.
      }
      const createdWorkout = await createCoachWorkout(buildCoachWorkoutPayload(workout));
      const workoutId = createdWorkout.workout_id;
      const activities = buildCoachWorkoutActivities(workoutId, workout.exercises || []);
      for (const activity of activities) {
        try {
          await createLegacyCoachWorkoutActivity(toLegacyCoachWorkoutActivityPayload(activity));
        } catch {
          // Ignore legacy-route failures if canonical route succeeds.
        }
        await createCoachWorkoutActivity(activity);
      }

      const cachedWorkout = { ...workout, id: workoutId, workout_id: workoutId, type: "custom" };
      writeLocalWorkoutCache(role, roleId, [cachedWorkout, ...getLocalWorkoutCache(role, roleId)]);

      return { success: true, id: workoutId, workout_id: workoutId, ...workout };
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
    message: "The backend spec does not include a client custom-workout create route.",
    ...workout,
  };
}

/** Update an existing workout */
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

/** Delete a workout */
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

  if (role === "coach") {
    return createWorkout(role, roleId, duplicated);
  }

  writeLocalWorkoutCache(role, roleId, [duplicated, ...getLocalWorkoutCache(role, roleId)]);
  return {
    success: true,
    ...duplicated,
    backend_gap: true,
    message: "The backend spec does not include a client preset-duplication route.",
  };
}

/* ─── weekly plan ────────────────────────────────────────────────────── */

/** Fetch the user's weekly plan (workouts assigned to days) */
export async function fetchWeeklyPlan(role, roleId) {
  try {
    if (role === "client") {
      const response = await apiGet(
        withQuery("/roles/client/fitness/query/plans", { skip: 0, limit: 100 })
      );
      const plans = Array.isArray(response)
        ? response
        : Array.isArray(response?.plans)
          ? response.plans
          : [];
      if (plans.length > 0) {
        return normalizeWeeklyPlanFromPlans(plans);
      }
    }
  } catch {
    // Fall through to local cache below.
  }

  return normalizeWeeklyPlan(readJson(getWeeklyPlanCacheKey(role, roleId)));
}

/** Save the user's weekly plan */
export async function saveWeeklyPlan(role, roleId, plan) {
  localStorage.setItem(getWeeklyPlanCacheKey(role, roleId), JSON.stringify(plan));
  return {
    success: true,
    backend_gap: true,
    message: "The backend spec does not include a weekly-plan save route.",
  };
}

export async function publishWeeklyPlan(role, roleId, plan, strataName = "Weekly Plan") {
  const dayEntries = Object.values(plan || {}).filter(Boolean);
  const firstWorkout = dayEntries[0];
  const activities = normalizePlanActivities(dayEntries);

  if (role === "coach" && firstWorkout) {
    try {
      await createLegacyCoachWorkoutPlan({
        strata_name: strataName,
        workout_activities: activities.map((activity, index) => ({
          id: null,
          workout_plan_id: null,
          workout_activity_id: activity.workout_activity_id || index + 1,
          estimated_calories: 0,
          modified_by_account_id: 0,
          planned_duration: activity.planned_duration ?? null,
          planned_reps: activity.planned_reps ?? null,
          planned_sets: activity.planned_sets ?? null,
        })),
      });
    } catch {
      // Keep going and try shared route too.
    }
  }

  return apiPost("/roles/shared/fitness/plan", {
    strata_name: strataName,
    activities,
  });
}

/* ─── coach-only: assignment ─────────────────────────────────────────── */

/** Fetch clients the coach can assign workouts to */
export async function fetchAssignableClients(coachId) {
  void coachId;
  return [];
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

function normalizeWorkout(workout, fallbackType = "custom") {
  if (!workout || typeof workout !== "object") {
    return {
      id: `workout-${Date.now()}`,
      name: "Untitled Workout",
      description: "",
      type: fallbackType,
      category: "General",
      difficulty: "Beginner",
      est_duration_min: 0,
      muscle_groups: [],
      exercises: [],
    };
  }

  const exercises = Array.isArray(workout.exercises)
    ? workout.exercises
    : Array.isArray(workout.activities)
      ? workout.activities
      : [];

  return {
    ...workout,
    id: workout.id ?? workout.workout_id ?? workout.name ?? `workout-${Date.now()}`,
    name: workout.name ?? workout.strata_name ?? workout.workout_name ?? "Untitled Workout",
    description: workout.description ?? "",
    type: workout.type ?? fallbackType,
    category: workout.category ?? "General",
    difficulty: workout.difficulty ?? "Beginner",
    est_duration_min: Number(workout.est_duration_min ?? 0),
    muscle_groups: Array.isArray(workout.muscle_groups) ? workout.muscle_groups : [],
    exercises: exercises.map((exercise, index) => ({
      ...exercise,
      _key: exercise._key ?? exercise.id ?? `${workout.id ?? workout.name ?? "workout"}-${index}`,
      name: exercise.name ?? exercise.activity_name ?? `Exercise ${index + 1}`,
      sets: Number(exercise.sets ?? exercise.planned_sets ?? 0),
      reps: Number(exercise.reps ?? exercise.planned_reps ?? 0),
      weight: Number(exercise.weight ?? exercise.intensity_value ?? 0),
      intensity_measure: exercise.intensity_measure ?? "lbs",
      notes: exercise.notes ?? "",
      equipment: exercise.equipment ?? "",
      estimated_calories_per_unit_frequency: Number(exercise.estimated_calories_per_unit_frequency ?? 0),
    })),
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

function normalizeWeeklyPlan(response) {
  const base = emptyWeeklyPlan();
  if (!response || typeof response !== "object") {
    return base;
  }

  Object.keys(base).forEach((day) => {
    const rawValue = response[day];
    base[day] = rawValue && typeof rawValue === "object"
      ? normalizeWorkout(rawValue, "custom")
      : null;
  });

  return base;
}

function normalizeWeeklyPlanFromPlans(plans) {
  const base = emptyWeeklyPlan();
  const dayKeys = Object.keys(base);
  plans.slice(0, dayKeys.length).forEach((plan, index) => {
    const dayKey = dayKeys[index];
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

async function hydrateWorkoutActivities(workouts) {
  return Promise.all(
    (workouts || []).map(async (workout) => {
      const workoutId = workout?.id ?? workout?.workout_id;
      if (!workoutId) {
        return workout;
      }

      try {
        const response = await apiGet(
          withQuery("/roles/shared/fitness/query/activity", {
            workout_id: workoutId,
            skip: 0,
            limit: 100,
          })
        );
        const activities = Array.isArray(response)
          ? response
          : Array.isArray(response?.activities)
            ? response.activities
            : Array.isArray(response?.items)
              ? response.items
              : [];
        return {
          ...workout,
          activities,
        };
      } catch {
        return workout;
      }
    })
  );
}

function getWorkoutCacheKey(role, roleId) {
  return `${role}_workouts:${roleId ?? "me"}`;
}

function getWeeklyPlanCacheKey(role, roleId) {
  return `${role}_weekly_plan:${roleId ?? "me"}`;
}

function getLocalWorkoutCache(role, roleId) {
  const cached = readJson(getWorkoutCacheKey(role, roleId));
  return Array.isArray(cached) ? cached : [];
}

function writeLocalWorkoutCache(role, roleId, workouts) {
  localStorage.setItem(getWorkoutCacheKey(role, roleId), JSON.stringify(workouts));
}

function mergeWorkouts(primary, secondary) {
  const byId = new Map();
  [...secondary, ...primary].forEach((workout) => {
    if (!workout) return;
    const normalized = normalizeWorkout(workout, "custom");
    byId.set(String(normalized.id), normalized);
  });
  return [...byId.values()];
}

function readJson(key) {
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function toLegacyCoachWorkoutPayload(workout) {
  return {
    name: workout.name,
    description: workout.description || "",
    instructions: workout.exercises
      ?.map((exercise, index) => `${index + 1}. ${exercise.name}${exercise.notes ? ` - ${exercise.notes}` : ""}`)
      .join("\n") || workout.description || "Coach-created workout",
    workout_type: workout.exercises?.some((exercise) => exercise.intensity_measure === "sec") ? "duration" : "rep",
    equipment: (workout.exercises || [])
      .map((exercise) => String(exercise.equipment || "").trim())
      .filter(Boolean)
      .filter((value, index, list) => list.indexOf(value) === index)
      .map((name) => ({ name, description: `${name} equipment` })),
  };
}

function toLegacyCoachWorkoutActivityPayload(activity) {
  return {
    workout_id: activity.workout_id,
    intensity_measure: activity.intensity_measure || null,
    intensity_value: activity.intensity_value ?? null,
    estimated_calories_per_unit_frequency: activity.estimated_calories_per_unit_frequency ?? 0,
  };
}

function normalizePlanActivities(workouts) {
  return workouts.flatMap((workout) =>
    (workout?.exercises || []).map((exercise, index) => ({
      workout_activity_id: Number(exercise.id ?? index + 1),
      planned_duration:
        exercise.intensity_measure === "sec"
          ? Number(exercise.weight ?? exercise.intensity_value ?? 0) || null
          : null,
      planned_reps:
        exercise.intensity_measure === "sec"
          ? null
          : Number(exercise.reps ?? exercise.planned_reps ?? 0) || null,
      planned_sets: Number(exercise.sets ?? exercise.planned_sets ?? 0) || null,
    }))
  );
}
