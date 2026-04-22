/**
 * Workout API calls — shared by clients and coaches.
 *
 * Covers: preset library, custom workouts, CRUD, and coach → client assignment.
 * Same pattern as other API files: real endpoint first, mock fallback.
 */

import { apiGet, apiPost, apiPut } from "./api";

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
      { name: "Bench Press",            sets: 4, reps: 6,  weight: 185, intensity_measure: "lbs", notes: "Warm up with bar first", equipment: "Barbell", estimated_calories_per_unit_frequency: 8 },
      { name: "Incline Dumbbell Press", sets: 3, reps: 10, weight: 60,  intensity_measure: "lbs",  notes: "", equipment: "Dumbbell", estimated_calories_per_unit_frequency: 7 },
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
  try {
    return await apiGet("/workouts/presets");
  } catch {
    return PRESET_WORKOUTS;
  }
}

/** Fetch the user's custom (saved) workouts */
export async function fetchMyWorkouts(role, roleId) {
  try {
    return await apiGet(`/roles/${role}/${roleId}/workouts`);
  } catch {
    // Return a couple mock custom workouts
    return [
      {
        id: "custom-1",
        name: "My Chest & Triceps",
        description: "Custom chest and triceps session.",
        type: "custom",
        category: "Strength",
        difficulty: "Intermediate",
        est_duration_min: 50,
        muscle_groups: ["Chest", "Arms"],
        created_at: "2026-04-10T14:30:00Z",
        exercises: [
          { name: "Bench Press",            sets: 4, reps: 8,  weight: 175, intensity_measure: "lbs", notes: "", equipment: "Barbell", estimated_calories_per_unit_frequency: 8 },
          { name: "Incline Dumbbell Press", sets: 3, reps: 10, weight: 55,  intensity_measure: "lbs",  notes: "", equipment: "Dumbbell", estimated_calories_per_unit_frequency: 7 },
          { name: "Cable Flyes",            sets: 3, reps: 12, weight: 25,  intensity_measure: "lbs",  notes: "", equipment: "Cable", estimated_calories_per_unit_frequency: 5 },
          { name: "Tricep Pushdown",        sets: 3, reps: 12, weight: 45,  intensity_measure: "lbs",  notes: "", equipment: "Cable", estimated_calories_per_unit_frequency: 5 },
          { name: "Skull Crushers",         sets: 3, reps: 10, weight: 50,  intensity_measure: "lbs",  notes: "", equipment: "Barbell", estimated_calories_per_unit_frequency: 5 },
        ],
      },
    ];
  }
}

/** Save (create) a new custom workout */
export async function createWorkout(role, roleId, workout) {
  try {
    return await apiPost(`/roles/${role}/${roleId}/workouts`, workout);
  } catch {
    return { success: true, id: `custom-${Date.now()}`, ...workout };
  }
}

/** Update an existing workout */
export async function updateWorkout(role, roleId, workoutId, workout) {
  try {
    return await apiPut(`/roles/${role}/${roleId}/workouts/${workoutId}`, workout);
  } catch {
    return { success: true, ...workout };
  }
}

/** Delete a workout */
export async function deleteWorkout(role, roleId, workoutId) {
  try {
    return await apiPost(`/roles/${role}/${roleId}/workouts/${workoutId}/delete`, {});
  } catch {
    return { success: true };
  }
}

/** Duplicate a preset into the user's custom library */
export async function duplicatePreset(role, roleId, presetId) {
  try {
    return await apiPost(`/roles/${role}/${roleId}/workouts/duplicate`, { preset_id: presetId });
  } catch {
    const preset = PRESET_WORKOUTS.find((p) => p.id === presetId);
    if (!preset) return { success: false };
    return {
      success: true,
      id: `custom-${Date.now()}`,
      ...preset,
      type: "custom",
      name: `${preset.name} (Copy)`,
    };
  }
}

/* ─── weekly plan ────────────────────────────────────────────────────── */

/** Fetch the user's weekly plan (workouts assigned to days) */
export async function fetchWeeklyPlan(role, roleId) {
  try {
    return await apiGet(`/roles/${role}/${roleId}/weekly-plan`);
  } catch {
    return {
      monday:    null,
      tuesday:   null,
      wednesday: null,
      thursday:  null,
      friday:    null,
      saturday:  null,
      sunday:    null,
    };
  }
}

/** Save the user's weekly plan */
export async function saveWeeklyPlan(role, roleId, plan) {
  try {
    return await apiPost(`/roles/${role}/${roleId}/weekly-plan`, plan);
  } catch {
    return { success: true };
  }
}

/* ─── coach-only: assignment ─────────────────────────────────────────── */

/** Fetch clients the coach can assign workouts to */
export async function fetchAssignableClients(coachId) {
  try {
    return await apiGet(`/roles/coach/${coachId}/clients`);
  } catch {
    return [
      { id: 1, name: "John Doe",   goal: "Muscle Gain" },
      { id: 2, name: "Sarah Chen", goal: "Weight Loss" },
      { id: 3, name: "Mike Torres", goal: "Maintenance" },
      { id: 4, name: "Aisha Patel", goal: "Muscle Gain" },
      { id: 5, name: "Jordan Lee", goal: "Weight Loss" },
    ];
  }
}

/** Assign a workout to one or more clients */
export async function assignWorkout(coachId, workoutId, clientIds) {
  try {
    return await apiPost(`/roles/coach/${coachId}/assign-workout`, {
      workout_id: workoutId,
      client_ids: clientIds,
    });
  } catch {
    return { success: true, assigned_count: clientIds.length };
  }
}

/** Fetch workouts the coach has assigned (with client info) */
export async function fetchAssignedWorkouts(coachId) {
  try {
    return await apiGet(`/roles/coach/${coachId}/assigned-workouts`);
  } catch {
    return [
      {
        workout_id: "preset-ppl-push",
        workout_name: "Push Day",
        assigned_to: [
          { client_id: 1, name: "John Doe",   assigned_at: "2026-04-12T10:00:00Z" },
          { client_id: 5, name: "Jordan Lee",  assigned_at: "2026-04-14T08:00:00Z" },
        ],
      },
      {
        workout_id: "preset-ppl-legs",
        workout_name: "Leg Day",
        assigned_to: [
          { client_id: 1, name: "John Doe",   assigned_at: "2026-04-12T10:00:00Z" },
          { client_id: 2, name: "Sarah Chen",  assigned_at: "2026-04-13T09:00:00Z" },
        ],
      },
    ];
  }
}
