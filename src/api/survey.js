import { apiGet, apiPost, withQuery } from "./api";

/**
 * Daily check-in survey — backend has 5 separate sub-surveys, each with its own
 * GET today / POST start / POST submit endpoints. We expose the 3 simple ones
 * (mood, body metrics, steps) here. Workout + meal sub-surveys need foreign
 * keys to plan activities and prescribed meals, which the client doesn't
 * always have.
 */

const BASE = "/roles/client/fitness/daily-survey";

/*  mood / wellbeing  */

export function fetchDailyMoodSurvey() {
  return apiGet(`${BASE}/today`);
}

export function startDailyMoodSurvey() {
  return apiPost(`${BASE}/start`, {});
}

/**
 * @param {{ happiness_meter: number, alertness: number, healthiness: number,
 *           todays_goals: string, todays_appreciation: string }} payload
 *  Each meter must be between 1 and 10 inclusive.
 */
export function submitDailyMoodSurvey(payload) {
  return apiPost(`${BASE}/submit`, payload);
}

/*  body metrics  */

export function fetchDailyBodyMetricsSurvey() {
  return apiGet(`${BASE}/body-metrics/today`);
}

export function startDailyBodyMetricsSurvey() {
  return apiPost(`${BASE}/body-metrics/start`, {});
}

/**
 * @param {{ weight: number, progress_pic_url?: string }} payload
 * `progress_pic_url`, when provided, is stored by the backend in DailyProgressPicture.
 *  Weight must be a positive integer.
 */
export function submitDailyBodyMetricsSurvey(payload) {
  return apiPost(`${BASE}/body-metrics/submit`, payload);
}

/*  steps  */

export function fetchDailyStepsSurvey() {
  return apiGet(`${BASE}/steps/today`);
}

export function startDailyStepsSurvey() {
  return apiPost(`${BASE}/steps/start`, {});
}

/**
 * @param {{ step_count: number }} payload — between 0 and 100000.
 */
export function submitDailyStepsSurvey(payload) {
  return apiPost(`${BASE}/steps/submit`, payload);
}

/*  combined helpers  */

/**
 * Synthesize a survey-shaped status object from today's progress picture, so
 * the daily check-in banner/overlay can treat progress pic as a first-class
 * section alongside mood/body/steps.
 *
 * The backend has no /daily-survey/progress-pic endpoint — DailyProgressPicture
 * is a stand-alone telemetry row. We poll the gallery and check whether any
 * row's date is today (string startsWith "YYYY-MM-DD"). Null on fetch error
 * so the banner/overlay can render an "Unavailable" state.
 */
export async function fetchTodayProgressPicStatus() {
  // Lazy import to avoid a circular client.js → api.js → survey.js path
  const { fetchProgressPictures } = await import("./client");
  try {
    const pics = await fetchProgressPictures();
    const todayStr = new Date().toISOString().slice(0, 10);
    const todays = pics.find((p) => String(p.date).startsWith(todayStr)) || null;
    return {
      is_seen: true,
      is_started: !!todays,
      is_finished: !!todays,
      progress_picture_id: todays?.id ?? null,
      progress_picture_url: todays?.url ?? null,
    };
  } catch {
    return null;
  }
}

/**
 * Fetch the status of all four daily check-in sections in parallel. Returns
 * `{ mood, body_metrics, steps, progress_pic }`, each shaped like
 * `{ is_seen, is_started, is_finished, ... }` or `null` on error.
 *
 * Progress pic is synthesized from today's gallery row (no dedicated survey row).
 */
export async function fetchAllDailySurveys() {
  const [mood, body_metrics, steps, progress_pic] = await Promise.all([
    fetchDailyMoodSurvey().catch(() => null),
    fetchDailyBodyMetricsSurvey().catch(() => null),
    fetchDailyStepsSurvey().catch(() => null),
    fetchTodayProgressPicStatus(),
  ]);
  return { mood, body_metrics, steps, progress_pic };
}

/*  telemetry history (past survey submissions)  */

const TELEMETRY = "/roles/client/telemetry/query";

async function fetchList(path, { limit = 30, skip = 0 } = {}) {
  try {
    const response = await apiGet(withQuery(path, { skip, limit }));
    return Array.isArray(response) ? response : [];
  } catch {
    return [];
  }
}

/** Past mood / wellbeing entries (CompletedSurvey rows, newest first). */
export function fetchMoodHistory(opts) {
  return fetchList(`${TELEMETRY}/moods`, opts);
}

/** Past body-metric entries (HealthMetrics rows, weight only). */
export function fetchWeightHistory(opts) {
  return fetchList(`${TELEMETRY}/weights`, opts);
}

/** Past step-count entries (StepCount rows, newest first). */
export function fetchStepHistory(opts) {
  return fetchList(`${TELEMETRY}/steps`, opts);
}

/** Past completed-workout entries. */
export function fetchWorkoutHistory(opts) {
  return fetchList(`${TELEMETRY}/workouts`, opts);
}

/** Past completed-workout entries enriched with activity name and actual metrics. */
export function fetchWorkoutHistoryEnriched(opts) {
  return fetchList(`${TELEMETRY}/workouts_enriched`, opts);
}

/** Fetch a single random todays_appreciation entry from the client's mood history. */
export async function fetchRandomAppreciation() {
  try {
    return await apiGet(`${TELEMETRY}/random_appreciation`);
  } catch {
    return null;
  }
}

/**
 * Fetch all three (mood/weight/steps) histories in parallel.
 * Returns `{ moods, weights, steps }` — each is an array (possibly empty).
 */
export async function fetchTelemetryHistory({ limit = 14 } = {}) {
  const [moods, weights, steps] = await Promise.all([
    fetchMoodHistory({ limit }),
    fetchWeightHistory({ limit }),
    fetchStepHistory({ limit }),
  ]);
  return { moods, weights, steps };
}
