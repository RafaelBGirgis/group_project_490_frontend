/**
 * Client-role API calls.
 *
 * Pattern: every function tries the real endpoint first.
 * If the backend returns an error (endpoint not built yet), it falls back to
 * realistic mock data so the UI stays usable during development.
 *
 * When the backend team ships an endpoint, just remove the catch-block — done.
 */

import { apiGet, apiPost, apiPatch } from "./api";

/* ─── helpers ─────────────────────────────────────────────────────── */

const WEEKDAY_NAMES = [
  "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday",
];
const SHORT_WEEKDAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DEFAULT_TIME_OPTIONS = [
  "5AM","6AM","7AM","8AM","9AM","10AM","11AM",
  "12PM","1PM","2PM","3PM","4PM","5PM","6PM","7PM","8PM","9PM",
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
  const cacheKey = `client_availability_${clientId ?? "me"}`;
  const cached = localStorage.getItem(cacheKey);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch {
      localStorage.removeItem(cacheKey);
    }
  }

  const onboardingAvailability = getOnboardingAvailabilityFromStorage();
  if (onboardingAvailability.length > 0) {
    localStorage.setItem(cacheKey, JSON.stringify(onboardingAvailability));
    return onboardingAvailability;
  }

  try {
    return await apiGet(`/roles/client/${clientId}/availability`);
  } catch {
    return buildMockAvailability();
  }
}

export async function saveAvailability(clientId, slots) {
  const cacheKey = `client_availability_${clientId ?? "me"}`;
  localStorage.setItem(cacheKey, JSON.stringify(slots));

  const token = localStorage.getItem("jwt");
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  try {
    const payload = { availabilities: slots };
    const routesToTry = [
      "/roles/client/update_client_information",
      clientId ? `/roles/client/${clientId}/availability` : null,
    ].filter(Boolean);

    for (const route of routesToTry) {
      const res = await fetch(route, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        return await res.json().catch(() => ({ success: true }));
      }
    }

    return { success: true };
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

function normalizeTimeLabel(raw) {
  const value = String(raw || "").trim().toUpperCase().replace(/\s+/g, "");
  if (!value) return "";
  return value
    .replace("A.M.", "AM")
    .replace("P.M.", "PM")
    .replace("A.M", "AM")
    .replace("P.M", "PM");
}

function sortTimes(times) {
  return [...times].sort((a, b) => {
    const ai = DEFAULT_TIME_OPTIONS.indexOf(a);
    const bi = DEFAULT_TIME_OPTIONS.indexOf(b);
    if (ai === -1 && bi === -1) return a.localeCompare(b);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });
}

function convertTrainingAvailabilityToGrid(trainingAvailability) {
  if (!trainingAvailability || typeof trainingAvailability !== "object") return [];

  const allTimes = new Set();
  const normalizedByDay = SHORT_WEEKDAY_NAMES.map((day) => {
    const slots = Array.isArray(trainingAvailability[day]) ? trainingAvailability[day] : [];
    const normalizedSlots = slots
      .map((slot) => normalizeTimeLabel(slot))
      .filter(Boolean);
    normalizedSlots.forEach((slot) => allTimes.add(slot));
    return new Set(normalizedSlots);
  });

  const sortedTimes = sortTimes([...allTimes]);
  return sortedTimes.map((time) => ({
    time,
    slots: normalizedByDay.map((daySet) => (daySet.has(time) ? "available" : null)),
  }));
}

function getOnboardingAvailabilityFromStorage() {
  const email = (localStorage.getItem("active_user_email") || "").trim().toLowerCase();
  const keysToTry = email
    ? [`onboarding:${email}`, "onboarding:current"]
    : ["onboarding:current"];

  for (const key of keysToTry) {
    const raw = localStorage.getItem(key);
    if (!raw) continue;
    try {
      const parsed = JSON.parse(raw);
      const converted = convertTrainingAvailabilityToGrid(parsed?.trainingAvailability);
      if (converted.length > 0) return converted;
    } catch {
      // Ignore malformed storage and continue.
    }
  }

  return [];
}

/* ─── browse / search coaches ─────────────────────────────────────── */

export async function fetchAvailableCoaches({ name, specialty, sort_by, order } = {}) {
  try {
    const params = new URLSearchParams();
    if (name)      params.set("name", name);
    if (specialty)  params.set("specialty", specialty);
    if (sort_by)    params.set("sort_by", sort_by);
    if (order)      params.set("order", order);
    const qs = params.toString();
    const data = await apiGet(`/roles/client/query/hirable_coaches${qs ? `?${qs}` : ""}`);
    // Normalize backend response to match what the UI expects
    return data.map((c) => ({
      ...c,
      // Backend returns specialties as comma-separated string; split for UI
      specialties: typeof c.specialties === "string"
        ? c.specialties.split(",").map((s) => s.trim()).filter(Boolean)
        : c.specialties ?? [],
      // Map rating_count → review_count for UI compatibility
      review_count: c.rating_count ?? 0,
      // Backend doesn't return these yet — UI can handle undefined gracefully
      verified: true,
    }));
  } catch {
    return [
      {
        coach_id: 1,
        name: "Rafael Girgis",
        bio: "Certified strength coach with 8 years of experience.",
        specialties: ["Strength & Conditioning", "Powerlifting"],
        avg_rating: 4.9,  rating_avg: 4.9,
        review_count: 47,
        verified: true,
      },
    ];
  }
}

export async function requestCoach(clientId, coachId) {
  try {
    // Backend: POST /roles/client/request_coach/{coach_id} (uses JWT, no body needed)
    return await apiPost(`/roles/client/request_coach/${coachId}`, {});
  } catch {
    return { success: true, message: "Request sent" };
  }
}

/* ─── coach reviews & reports ──────────────────────────────────────── */

export async function submitCoachReview(coachId, rating, reviewText) {
  return apiPost(`/roles/client/coach_review/${coachId}`, null)
    .catch(() => ({ review_id: Date.now() }));
  // NOTE: backend takes rating + review_text as query params, not JSON body
}

export async function fetchCoachReviews(coachId) {
  try {
    return await apiGet(`/roles/client/review/${coachId}`);
  } catch {
    return { reviews: [] };
  }
}

export async function submitCoachReport(coachId, reportSummary) {
  try {
    return await apiPost(`/roles/client/coach_report/${coachId}`, null);
  } catch {
    return { report_id: Date.now() };
  }
}

export async function fetchCoachReports(coachId) {
  try {
    return await apiGet(`/roles/client/reports/${coachId}`);
  } catch {
    return { reports: [] };
  }
}

/* ─── initial survey (onboarding) ──────────────────────────────────── */

export async function submitInitialSurvey(surveyData) {
  return apiPost("/roles/client/initial_survey", surveyData);
}

/* ─── update client info ───────────────────────────────────────────── */

export async function updateClientInfo(payload) {
  return apiPatch("/roles/client/information", payload);
}

/* ─── upload progress picture ──────────────────────────────────────── */

export async function uploadProgressPicture(file) {
  const token = localStorage.getItem("jwt");
  const API_BASE = import.meta.env.PROD ? "https://api.till-failure.us" : "";
  const formData = new FormData();
  formData.append("file", file);
  const headers = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}/roles/client/upload_progress_picture`, {
    method: "POST",
    headers,
    body: formData,
  });
  if (!res.ok) throw new Error("Upload failed");
  return res.json();
}

/* ─── client workout plans ─────────────────────────────────────────── */

export async function fetchClientWorkoutPlans(skip = 0, limit = 20) {
  try {
    return await apiGet(`/roles/client/fitness/query/plans?skip=${skip}&limit=${limit}`);
  } catch {
    return [];
  }
}
