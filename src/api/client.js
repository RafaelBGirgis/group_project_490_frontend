/**
 * Client-role API calls.
 *
 * Pattern: every function tries the real endpoint first.
 * If the backend returns an error (endpoint not built yet), it falls back to
 * realistic mock data so the UI stays usable during development.
 *
 * When the backend team ships an endpoint, just remove the catch-block — done.
 */

import { apiGet, apiPost } from "./api";

/* ─── helpers ─────────────────────────────────────────────────────── */

const WEEKDAY_NAMES = [
  "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday",
];

function todayWeekday() {
  const d = new Date().getDay();          // 0 = Sun
  return WEEKDAY_NAMES[d === 0 ? 6 : d - 1];
}

/* ─── account / profile ───────────────────────────────────────────── */

export async function fetchMe() {
  return apiGet("/me");
}

export async function fetchClientProfile() {
  // POST because backend defined it that way (no request body needed)
  return apiPost("/roles/client/me", {});
}

export async function deactivateAccount() {
  try {
    return await apiPost("/me/deactivate", {});
  } catch {
    // Mock until backend ships this endpoint
    return { success: true, message: "Account deactivated successfully" };
  }
}

export async function deleteAccount() {
  try {
    return await apiPost("/me/delete", {});
  } catch {
    // Mock until backend ships this endpoint
    return { success: true, message: "Account deletion requested successfully" };
  }
}

/* ─── telemetry (steps, calories burned, calories consumed) ──────── */

export async function fetchTelemetryToday(clientId) {
  try {
    return await apiGet(`/roles/client/${clientId}/telemetry/today`);
  } catch {
    // Mock until backend ships this endpoint
    return {
      step_count: 8241,
      calories_burned: 540,
      calories_consumed: 1438,
      calories_goal: 2000,
    };
  }
}

/* ─── workout plan + activities ───────────────────────────────────── */

export async function fetchWorkoutPlan(clientId, weekdayIdx) {
  const day = WEEKDAY_NAMES[weekdayIdx];
  try {
    return await apiGet(`/roles/client/${clientId}/workout-plan?day=${day}`);
  } catch {
    // Mock per-day workout data
    const plans = {
      monday:    { strata_name: "Push Day", activities: pushActivities() },
      tuesday:   { strata_name: "Pull Day", activities: pullActivities() },
      wednesday: { strata_name: "Legs",     activities: legActivities()  },
      thursday:  { strata_name: "Push Day", activities: pushActivities() },
      friday:    { strata_name: "Pull Day", activities: pullActivities() },
      saturday:  { strata_name: "Rest Day", activities: [] },
      sunday:    { strata_name: "Rest Day", activities: [] },
    };
    return plans[day] ?? { strata_name: "Rest Day", activities: [] };
  }
}

export async function logWorkoutActivity(clientId, activityId) {
  try {
    return await apiPost(`/roles/client/${clientId}/workout-log`, {
      workout_plan_activity_id: activityId,
    });
  } catch {
    // Optimistic — let UI toggle the badge immediately
    return { success: true };
  }
}

/* ─── coach info ──────────────────────────────────────────────────── */

export async function fetchCoachInfo(clientId) {
  try {
    const data = await apiGet(`/roles/client/${clientId}/coach`);
    return data; // null or coach object
  } catch {
    // No coach assigned — return null so the UI shows "Find a Coach"
    return null;
  }
}

export async function fetchCoachRating(coachId) {
  try {
    return await apiGet(`/roles/coach/${coachId}/rating`);
  } catch {
    return { avg: 4.9, review_count: 47 };
  }
}

export async function fetchNextSession(clientId) {
  try {
    return await apiGet(`/roles/client/${clientId}/next-session`);
  } catch {
    return { weekday: "Monday", start_time: "9:00 AM" };
  }
}

/* ─── availability ────────────────────────────────────────────────── */

export async function fetchAvailability(clientId) {
  try {
    return await apiGet(`/roles/client/${clientId}/availability`);
  } catch {
    return buildMockAvailability();
  }
}

export async function saveAvailability(clientId, slots) {
  try {
    return await apiPost(`/roles/client/update_client_information`, {
      availabilities: slots,
    });
  } catch {
    return { success: true };
  }
}

/* ─── meals ───────────────────────────────────────────────────────── */

export async function fetchMealsToday(clientId) {
  try {
    return await apiGet(`/roles/client/${clientId}/meals/today`);
  } catch {
    return [
      { id: 1, meal_type: "Breakfast", meal_name: "Oats & Berries",  calories: 380 },
      { id: 2, meal_type: "Lunch",     meal_name: "Chicken & Rice",  calories: 620 },
      { id: 3, meal_type: "Snack",     meal_name: "Protein Bar",     calories: 220 },
    ];
  }
}

export async function logMeal(clientId, mealPayload) {
  try {
    return await apiPost(`/roles/client/${clientId}/meal-log`, mealPayload);
  } catch {
    return { success: true };
  }
}

/* ─── mock data factories ─────────────────────────────────────────── */

function pushActivities() {
  return [
    { id: 1, name: "Bench Press",          suggested_sets: 4, suggested_reps: 6,  intensity_value: 185, intensity_measure: "lbs", logged: false },
    { id: 2, name: "Incline Dumbbell Press",suggested_sets: 3, suggested_reps: 10, intensity_value: 60,  intensity_measure: "lbs", logged: false },
    { id: 3, name: "Tricep Pushdown",      suggested_sets: 3, suggested_reps: 12, intensity_value: 50,  intensity_measure: "lbs", logged: false },
    { id: 4, name: "Lateral Raises",       suggested_sets: 4, suggested_reps: 15, intensity_value: 25,  intensity_measure: "lbs", logged: false },
  ];
}

function pullActivities() {
  return [
    { id: 5, name: "Barbell Row",       suggested_sets: 4, suggested_reps: 8,  intensity_value: 155, intensity_measure: "lbs", logged: false },
    { id: 6, name: "Lat Pulldown",      suggested_sets: 3, suggested_reps: 10, intensity_value: 120, intensity_measure: "lbs", logged: false },
    { id: 7, name: "Face Pulls",        suggested_sets: 3, suggested_reps: 15, intensity_value: 30,  intensity_measure: "lbs", logged: false },
    { id: 8, name: "Bicep Curls",       suggested_sets: 3, suggested_reps: 12, intensity_value: 35,  intensity_measure: "lbs", logged: false },
  ];
}

function legActivities() {
  return [
    { id: 9,  name: "Barbell Squat",    suggested_sets: 4, suggested_reps: 6,  intensity_value: 225, intensity_measure: "lbs", logged: false },
    { id: 10, name: "Romanian Deadlift", suggested_sets: 3, suggested_reps: 10, intensity_value: 185, intensity_measure: "lbs", logged: false },
    { id: 11, name: "Leg Press",        suggested_sets: 3, suggested_reps: 12, intensity_value: 360, intensity_measure: "lbs", logged: false },
    { id: 12, name: "Calf Raises",      suggested_sets: 4, suggested_reps: 15, intensity_value: 90,  intensity_measure: "lbs", logged: false },
  ];
}

function buildMockAvailability() {
  const times = ["9AM","10AM","11AM","12PM","1PM","2PM","3PM","4PM"];
  return times.map((time) => ({
    time,
    slots: [
      "booked","booked","available","booked","booked",null,null,
    ],
  }));
}

/* ─── browse / search coaches ─────────────────────────────────────── */

export async function fetchAvailableCoaches() {
  try {
    return await apiGet("/roles/coaches/browse");
  } catch {
    return [
      {
        coach_id: 1,
        name: "Rafael Girgis",
        bio: "Certified strength coach with 8 years of experience helping clients reach their peak performance. Specializing in powerlifting and body recomposition.",
        pfp_url: null,
        specialties: ["Strength & Conditioning", "Powerlifting"],
        rating_avg: 4.9,
        review_count: 47,
        active_clients: 12,
        pricing: { amount: 149.99, interval: "monthly" },
        certifications: [
          { name: "CSCS", organization: "NSCA" },
          { name: "CPT", organization: "NASM" },
        ],
        experience_years: 8,
        availability_slots: 6,
        verified: true,
      },
      {
        coach_id: 2,
        name: "Sandra Kim",
        bio: "Former collegiate track athlete turned fitness coach. I specialize in HIIT, functional training, and helping busy professionals stay consistent.",
        pfp_url: null,
        specialties: ["HIIT", "Functional Training", "Weight Loss"],
        rating_avg: 4.7,
        review_count: 31,
        active_clients: 8,
        pricing: { amount: 49.99, interval: "weekly" },
        certifications: [
          { name: "CPT", organization: "ACE" },
          { name: "Nutrition Coach", organization: "Precision Nutrition" },
        ],
        experience_years: 5,
        availability_slots: 10,
        verified: true,
      },
      {
        coach_id: 3,
        name: "David Osei",
        bio: "Sports science graduate specializing in hypertrophy and bodybuilding prep. I bring an evidence-based approach to every program I write.",
        pfp_url: null,
        specialties: ["Bodybuilding", "Hypertrophy", "Contest Prep"],
        rating_avg: 4.8,
        review_count: 22,
        active_clients: 6,
        pricing: { amount: 199.99, interval: "monthly" },
        certifications: [
          { name: "CSCS", organization: "NSCA" },
          { name: "Sports Nutrition", organization: "ISSN" },
        ],
        experience_years: 6,
        availability_slots: 4,
        verified: true,
      },
      {
        coach_id: 4,
        name: "Maria Santos",
        bio: "Yoga instructor and wellness coach focused on flexibility, mobility, and mind-body connection. Great for recovery and injury prevention.",
        pfp_url: null,
        specialties: ["Yoga", "Mobility", "Injury Prevention"],
        rating_avg: 5.0,
        review_count: 15,
        active_clients: 10,
        pricing: { amount: 99.99, interval: "monthly" },
        certifications: [
          { name: "RYT-500", organization: "Yoga Alliance" },
          { name: "Corrective Exercise", organization: "NASM" },
        ],
        experience_years: 10,
        availability_slots: 8,
        verified: true,
      },
      {
        coach_id: 5,
        name: "James Mitchell",
        bio: "Marathon runner and endurance coach. Whether you're training for your first 5K or your 10th marathon, I'll get you to the finish line.",
        pfp_url: null,
        specialties: ["Running", "Endurance", "Cardio"],
        rating_avg: 4.6,
        review_count: 38,
        active_clients: 15,
        pricing: { amount: 129.99, interval: "monthly" },
        certifications: [
          { name: "RRCA Certified", organization: "RRCA" },
          { name: "CPT", organization: "ACSM" },
        ],
        experience_years: 12,
        availability_slots: 3,
        verified: true,
      },
    ];
  }
}

export async function requestCoach(clientId, coachId) {
  try {
    return await apiPost(`/roles/client/${clientId}/coach-request`, { coach_id: coachId });
  } catch {
    return { success: true, message: "Request sent" };
  }
}
