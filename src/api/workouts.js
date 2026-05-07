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
  fetchMyClients,
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
  return [];
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
  void role;
  void roleId;
  return fetchLibraryWorkouts();
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
  void roleId;
  const allowedToCreateOnBackend = role === "coach" || role === "admin";

  if (!allowedToCreateOnBackend) {
    throw new Error("Only coaches and admins can publish workouts to the shared library.");
  }

  try {
    const createdWorkout = await createCoachWorkout(buildCoachWorkoutPayload(workout));
    const workoutId = createdWorkout.workout_id;
    const activities = buildCoachWorkoutActivities(workoutId, workout.exercises || []);
    const createdActivities = [];
    for (const activity of activities) {
      const created = await createCoachWorkoutActivity(activity);
      createdActivities.push({ ...activity, id: created?.workout_activity_id });
    }

    return {
      success: true,
      id: workoutId,
      workout_id: workoutId,
      ...workout,
      type: "custom",
      exercises: (workout.exercises || []).map((exercise, index) => ({
        ...exercise,
        id: createdActivities[index]?.id ?? exercise.id,
      })),
    };
  } catch {
    const legacyCreatedWorkout = await createLegacyCoachWorkout(buildCoachWorkoutPayload(workout));
    const legacyWorkoutId = legacyCreatedWorkout?.workout_id ?? legacyCreatedWorkout?.id;
    if (!legacyWorkoutId) {
      throw new Error("Workout creation failed.");
    }
    const activities = buildCoachWorkoutActivities(legacyWorkoutId, workout.exercises || []);
    const createdActivities = [];
    for (const activity of activities) {
      const created = await createLegacyCoachWorkoutActivity(activity);
      createdActivities.push({ ...activity, id: created?.workout_activity_id ?? created?.id });
    }

    return {
      success: true,
      id: legacyWorkoutId,
      workout_id: legacyWorkoutId,
      ...workout,
      type: "custom",
      backend_source: "legacy",
      exercises: (workout.exercises || []).map((exercise, index) => ({
        ...exercise,
        id: createdActivities[index]?.id ?? exercise.id,
      })),
    };
  }
}

/** Update an existing workout (no backend route — local cache only) */
export async function updateWorkout(role, roleId, workoutId, workout) {
  void role;
  void roleId;
  void workoutId;
  void workout;
  throw new Error("The backend route list does not include a workout update endpoint.");
}

/** Delete a workout (no backend route — local cache only) */
export async function deleteWorkout(role, roleId, workoutId) {
  void role;
  void roleId;
  void workoutId;
  throw new Error("The backend route list does not include a workout delete endpoint.");
}

/** Duplicate a preset into the user's custom library */
export async function duplicatePreset(role, roleId, presetId) {
  void role;
  void roleId;
  void presetId;
  throw new Error("Preset workouts are no longer available without backend data.");
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

/** Fetch the user's weekly plan view (one entry per weekday) */
export async function fetchWeeklyPlan(role, roleId) {
  void role;
  void roleId;
  try {
    const plans = await fetchClientPlans();
    if (plans.length > 0) {
      return normalizeWeeklyPlanFromPlans(plans);
    }
  } catch {
    return emptyWeeklyPlan();
  }

  return emptyWeeklyPlan();
}

/** Save the user's weekly plan locally (no backend route for editing) */
export async function saveWeeklyPlan(role, roleId, plan) {
  void role;
  void roleId;
  void plan;
  throw new Error("The backend route list does not include a weekly-plan save endpoint.");
}

/** Publish each populated day as its own backend workout plan */
export async function publishWeeklyPlan(role, roleId, plan, fallbackName = "Weekly Plan") {
  const canUseLegacyCoachPlan = role === "coach";
  void roleId;
  const created = [];

  for (const dayKey of DAY_ORDER) {
    const dayWorkout = plan?.[dayKey];
    const exercises = Array.isArray(dayWorkout?.exercises) ? dayWorkout.exercises : [];
    const planActivities = buildPlanActivities(exercises);
    if (planActivities.length === 0) continue;

    const strataName = `${capitalize(dayKey)} - ${dayWorkout?.name || fallbackName}`;
    try {
      const result = await createWorkoutPlan(strataName, planActivities);
      const planId = result?.workout_plan_id ?? null;
      if (role === "client" && planId != null) {
        const { startDt, endDt } = buildAssignmentWindow(dayKey);
        const assigned = await assignWorkoutPlanToClient(planId, startDt, endDt);
        created.push({
          day: dayKey,
          plan_id: planId,
          client_workout_plan_id: assigned?.client_workout_plan_id ?? null,
        });
      } else {
        created.push({ day: dayKey, plan_id: planId });
      }
    } catch (error) {
      if (canUseLegacyCoachPlan) {
        try {
          const legacyResult = await createLegacyCoachWorkoutPlan({
            strata_name: strataName,
            activities: planActivities,
          });
          created.push({
            day: dayKey,
            plan_id: legacyResult?.workout_plan_id ?? legacyResult?.id ?? null,
            backend_source: "legacy",
          });
          continue;
        } catch (legacyError) {
          created.push({ day: dayKey, error: legacyError?.message || "Failed to publish" });
          continue;
        }
      }
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
  if (!coachId) {
    throw new Error("Missing coach id for workout assignment.");
  }
  const normalizedClientIds = (clientIds || [])
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value) && value > 0);
  if (normalizedClientIds.length === 0) {
    throw new Error("Select at least one client.");
  }

  const activities = await fetchActivitiesForWorkout(workoutId);
  const planActivities = buildPlanActivities(activities);
  if (planActivities.length === 0) {
    throw new Error("This workout cannot be assigned until its activities are available.");
  }

  const createdPlan = await createWorkoutPlan(`Assigned Workout ${workoutId}`, planActivities);
  const workoutPlanId = Number(createdPlan?.workout_plan_id);
  if (!Number.isFinite(workoutPlanId)) {
    throw new Error("Workout plan creation failed before assignment.");
  }

  const { startDt, endDt } = buildAssignmentWindow();
  const assigned = [];
  for (const clientId of normalizedClientIds) {
    const result = await prescribeWorkoutPlan(clientId, workoutPlanId, startDt, endDt);
    assigned.push({
      client_id: clientId,
      client_workout_plan_id: result?.client_workout_plan_id ?? null,
      workout_plan_id: workoutPlanId,
    });
  }

  return {
    success: true,
    workout_plan_id: workoutPlanId,
    assigned,
  };
}

/** Fetch workouts the coach has assigned (with client info) */
export async function fetchAssignedWorkouts(coachId) {
  const clients = await fetchMyClients(coachId);
  const activeClients = (clients || []).filter((client) => client?.status === "active" && client?.id != null);
  const grouped = new Map();

  await Promise.all(
    activeClients.map(async (client) => {
      try {
        const plans = await fetchCoachClientPlans(client.id);
        plans.forEach((plan, index) => {
          const key = Number(plan?.id ?? plan?.workout_plan_id ?? index);
          const existing = grouped.get(key) || {
            workout_id: key,
            workout_name: plan?.strata_name || plan?.name || `Workout Plan #${key}`,
            assigned_to: [],
          };
          existing.assigned_to.push({
            client_id: client.id,
            name: client.name || `Client #${client.id}`,
          });
          grouped.set(key, existing);
        });
      } catch {
        // Ignore per-client failures so the assigned view still renders.
      }
    })
  );

  return [...grouped.values()].sort((a, b) => a.workout_name.localeCompare(b.workout_name));
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
