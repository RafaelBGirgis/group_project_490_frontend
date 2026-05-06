import { apiDelete, apiFetch, apiGet, apiPatch, apiPost, withQuery } from "./api";

const WEEKDAY_NAMES = [
  "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday",
];
const SHORT_WEEKDAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DEFAULT_TIME_OPTIONS = [
  "5AM", "6AM", "7AM", "8AM", "9AM", "10AM", "11AM",
  "12PM", "1PM", "2PM", "3PM", "4PM", "5PM", "6PM", "7PM", "8PM", "9PM",
];

const GOAL_ENUM_MAP = {
  "Weight Loss": "weight loss",
  Maintenance: "maintenence",
  "Muscle Gain": "muscle gain",
};

export async function fetchMe() {
  try {
    return await apiGet("/me");
  } catch (error) {
    if (error?.status === 401) {
      localStorage.removeItem("jwt");
      window.location.href = "/login";
    }
    throw error;
  }
}

export async function fetchClientProfile() {
  return apiPost("/roles/client/me", {});
}

export async function fetchUnifiedProfile() {
  return apiGet("/roles/shared/account/me");
}

export async function fetchMyCoachRequests() {
  const result = await apiGet("/roles/client/my_coach_requests");
  const items = Array.isArray(result)
    ? result
    : Array.isArray(result?.requests)
      ? result.requests
      : Array.isArray(result?.coach_requests)
        ? result.coach_requests
        : [];
  return items.map(normalizeClientCoachRequest).filter(Boolean);
}

export async function fetchMyCoach() {
  try {
    const result = await apiGet("/roles/client/my_coach");
    return normalizeMyCoach(result);
  } catch (error) {
    if (error?.status === 404) {
      return null;
    }
    throw error;
  }
}

export async function fetchInvoices() {
  const result = await apiGet("/roles/client/invoices");
  return result?.invoices ?? [];
}

export async function fetchBillingCycles() {
  const result = await apiGet("/roles/client/current_billing_cycles");
  return result?.cycles ?? [];
}

export async function payInvoice(invoiceId, amount) {
  return apiPost(`/roles/client/pay_invoice/${invoiceId}`, { amount });
}

export async function createClientInitialSurvey(payload) {
  return apiPost("/roles/client/initial_survey", payload);
}

export async function updateClientInformation(payload) {
  return apiPatch("/roles/client/information", payload);
}

export async function updateAccount(payload) {
  return apiPatch("/roles/shared/account/update", payload);
}

export async function uploadProfilePicture(file) {
  const formData = new FormData();
  formData.append("file", file);
  const response = await apiFetch("/roles/shared/account/update_pfp", {
    method: "POST",
    body: formData,
    headers: {},
  });
  return normalizeUploadResponse(response);
}

// export async function uploadProgressPicture(file) {
//   const formData = new FormData();
//   formData.append("file", file);
//   const response = await apiFetch("/roles/client/upload_progress_picture", {
//     method: "POST",
//     body: formData,
//     headers: {},
//   });
//   return normalizeUploadResponse(response);
// }

export async function deactivateAccount() {
  return apiPost("/roles/shared/account/deactivate", {});
}

export async function activateAccount() {
  return apiPost("/roles/shared/account/activate", {});
}

export async function deleteAccount() {
  return apiDelete("/roles/shared/account/delete");
}

export async function fetchTelemetryToday(_clientId) {
  return {
    step_count: 8241,
    calories_burned: 540,
    calories_consumed: 1438,
    calories_goal: 2000,
  };
}

export async function fetchClientWorkoutPlans({ skip = 0, limit = 100 } = {}) {
  const result = await apiGet(withQuery("/roles/client/fitness/query/plans", { skip, limit }));
  if (Array.isArray(result)) return result;
  if (Array.isArray(result?.plans)) return result.plans;
  return [];
}

export async function fetchWorkoutPlan(_clientId, weekdayIdx) {
  try {
    const plans = await fetchClientWorkoutPlans();
    const adapted = adaptWorkoutPlansForDay(plans, weekdayIdx);
    if (adapted) return adapted;
  } catch {
    // Fall through to empty-state plan below.
  }

  void weekdayIdx;
  return { strata_name: "Rest Day", activities: [] };
}

export async function logWorkoutActivity(_clientId, _activityId) {
  return { success: true };
}

export async function fetchCoachInfo(_clientId) {
  return fetchMyCoach();
}

export async function fetchCoachRating(coachId) {
  try {
    const result = await fetchCoachReviews(coachId);
    const reviews = Array.isArray(result?.reviews) ? result.reviews : [];
    if (reviews.length === 0) {
      return { avg: 0, review_count: 0 };
    }
    const total = reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0);
    return {
      avg: Number((total / reviews.length).toFixed(1)),
      review_count: reviews.length,
    };
  } catch {
    return { avg: 0, review_count: 0 };
  }
}

export async function fetchNextSession(_clientId) {
  return null;
}

export async function fetchAvailability(clientId) {
  void clientId;
  try {
    const profile = await fetchClientProfile().catch(() => null);
    const unified = profile ? null : await fetchUnifiedProfile().catch(() => null);
    const clientDetails =
      profile?.client_account ||
      profile?.client_details ||
      unified?.client_details ||
      unified?.client ||
      profile ||
      unified;
    const availabilities =
      clientDetails?.availabilities ||
      clientDetails?.availability ||
      clientDetails?.client_availabilities ||
      [];
    return convertBackendAvailabilitiesToGrid(availabilities);
  } catch {
    return [];
  }
}

export async function saveAvailability(clientId, slots) {
  void clientId;
  const availabilities = convertGridToBackendAvailabilities(slots);
  await updateClientInformation({ availabilities });
  return fetchAvailability(clientId);
}

/**
 * Fetch the meals the client has logged via the daily survey (newest first).
 * Returns raw CompletedMealActivity rows from the backend — each carries
 * ids and timestamps but the backend currently exposes no route to resolve
 * those ids back to meal name / calories, so the consumer must accept a
 * minimal shape.
 */
export async function fetchMealsToday(_clientId, { skip = 0, limit = 100 } = {}) {
  try {
    const result = await apiGet(
      withQuery("/roles/client/telemetry/query/meals", { skip, limit })
    );
    if (!Array.isArray(result)) return [];
    return result.map((row) => ({
      id: row.id,
      client_prescribed_meal_id: row.client_prescribed_meal_id ?? null,
      on_demand_meal_id: row.on_demand_meal_id ?? null,
      logged_at: row.last_updated || null,
    }));
  } catch {
    return [];
  }
}

/**
 * Log a meal for today via the daily-survey/meal flow:
 *   POST /daily-survey/meal/start   (idempotent — only fires if not started)
 *   POST /daily-survey/meal/submit  (with on_demand_meal_id or client_prescribed_meal_id)
 *
 * The backend's MealSurveySubmitPayload requires at least one of those ids,
 * and there is no route to create a Meal row server-side, so the caller must
 * supply an existing id. Throws on backend rejection.
 */
export async function logMeal(_clientId, mealPayload = {}) {
  const onDemandId =
    mealPayload.on_demand_meal_id != null ? Number(mealPayload.on_demand_meal_id) : null;
  const prescribedId =
    mealPayload.client_prescribed_meal_id != null
      ? Number(mealPayload.client_prescribed_meal_id)
      : null;

  if (!Number.isFinite(onDemandId) && !Number.isFinite(prescribedId)) {
    throw new Error(
      "Meal log needs either an on_demand_meal_id or a client_prescribed_meal_id."
    );
  }

  // Mark the daily meal survey as started (silently no-ops if already started).
  try {
    await apiPost("/roles/client/fitness/daily-survey/meal/start", {});
  } catch (error) {
    // The backend returns 400 "already submitted/started" — that's fine here,
    // any other status will resurface from the submit call below anyway.
    if (error?.status && ![400, 409].includes(error.status)) {
      throw error;
    }
  }

  return apiPost("/roles/client/fitness/daily-survey/meal/submit", {
    on_demand_meal_id: Number.isFinite(onDemandId) ? onDemandId : null,
    client_prescribed_meal_id: Number.isFinite(prescribedId) ? prescribedId : null,
  });
}

export async function fetchAvailableCoaches(filters = {}) {
  try {
    const result = await apiGet(withQuery("/roles/client/query/hirable_coaches", {
      name: filters.name,
      specialty: filters.specialty,
      age_start: filters.age_start,
      age_end: filters.age_end,
      gender: filters.gender,
      sort_by: filters.sort_by || "avg_rating",
      order: filters.order || "desc",
      skip: filters.skip || 0,
      limit: filters.limit || 100,
    }));
    return Array.isArray(result) ? result.map(normalizeCoachItem) : [];
  } catch {
    return [];
  }
}

export async function requestCoach(_clientId, coachId) {
  return apiPost(`/roles/client/request_coach/${coachId}`);
}

export async function deleteCoachRequest(requestId) {
  return apiDelete(`/roles/shared/client_coach_relationship/delete_coach_request/${requestId}`);
}

export async function terminateRelationship(relationshipId) {
  return apiPost(`/roles/shared/client_coach_relationship/terminate_relationship/${relationshipId}`, {});
}

export async function fetchBackendHealth() {
  return apiGet("/");
}

export async function createCoachReport(coachId, reportSummary) {
  return apiPost(
    withQuery(`/roles/client/coach_report/${coachId}`, {
      report_summary: reportSummary,
    })
  );
}

export async function fetchCoachReports(coachId) {
  return apiGet(`/roles/client/reports/${coachId}`);
}

export async function createCoachReview(coachId, rating, reviewText) {
  return apiPost(
    withQuery(`/roles/client/coach_review/${coachId}`, {
      rating,
      review_text: reviewText,
    })
  );
}

export async function fetchCoachReviews(coachId) {
  return apiGet(`/roles/client/review/${coachId}`);
}

export function buildInitialSurveyPayload(form) {
  return {
    fitness_goals: {
      client_id: 0,
      goal_enum: GOAL_ENUM_MAP[form.primaryGoal] ?? String(form.primaryGoal || "").toLowerCase(),
    },
    payment_information: {
      ccnum: String(form.cardNumber || "").replace(/\s+/g, ""),
      cv: String(form.cardCvv || ""),
      exp_date: form.cardExpiry || "",
    },
    availabilities: convertTrainingAvailabilityObjectToBackend(
      form.trainingAvailability ?? {}
    ),
    initial_health_metric: {
      weight: extractWeightNumber(form.weight),
      client_telemetry_id: 0,
    },
  };
}

export function buildClientInformationPayload({
  primaryGoal,
  weight,
  trainingAvailability,
  paymentMethod,
}) {
  const payload = {};

  if (primaryGoal) {
    payload.fitness_goals = {
      client_id: 0,
      goal_enum: GOAL_ENUM_MAP[primaryGoal] ?? String(primaryGoal).toLowerCase(),
    };
  }

  const parsedWeight = extractWeightNumber(weight);
  if (parsedWeight > 0) {
    payload.health_metrics = {
      weight: parsedWeight,
      client_telemetry_id: 0,
    };
  }

  const availabilities = convertTrainingAvailabilityObjectToBackend(trainingAvailability);
  if (availabilities.length > 0) {
    payload.availabilities = availabilities;
  }

  const paymentInformation = buildPaymentInformation(paymentMethod);
  if (paymentInformation) {
    payload.payment_information = paymentInformation;
  }

  return payload;
}

function normalizeCoachItem(coach) {
  const specialties = typeof coach.specialties === "string"
    ? coach.specialties.split(",").map((item) => item.trim()).filter(Boolean)
    : Array.isArray(coach.specialties)
      ? coach.specialties
      : [];
  const certifications = Array.isArray(coach.certifications)
    ? coach.certifications.map((cert) => ({
        name: cert.certification_name || cert.name || "Certification",
        organization: cert.certification_organization || cert.organization || "Organization",
        year: cert.certification_date || cert.year || "",
        description: cert.certification_score || cert.description || "",
      }))
    : [];
  const experiences = Array.isArray(coach.experiences)
    ? coach.experiences.map((experience) => ({
        title: experience.experience_title || experience.title || "Experience",
        organization: experience.experience_name || experience.organization || experience.issuer || "",
        year: formatExperienceYear(experience.experience_start, experience.experience_end, experience.year),
        description: experience.experience_description || experience.description || "",
      }))
    : [];

  return {
    ...coach,
    bio: coach.bio || "",
    specialties,
    rating_avg: Number(coach.avg_rating ?? 0),
    review_count: Number(coach.rating_count ?? 0),
    experience_years: experiences.length,
    active_clients: 0,
    availability_slots: 0,
    pricing: coach.pricing || null,
    pricingInterval: coach.payment_interval || coach.pricing_interval || coach.pricing?.payment_interval || "",
    amount:
      coach.amount != null
        ? String(coach.amount)
        : coach.price_cents != null
          ? String(Number(coach.price_cents) / 100)
          : coach.pricing?.payment_amount != null
            ? String(coach.pricing.payment_amount)
            : "",
    certifications,
    experiences,
    verified: true,
  };
}

function normalizeClientCoachRequest(item) {
  if (!item || typeof item !== "object") return null;

  const coachId =
    item.coach_id ??
    item.coachId ??
    item.coach?.id ??
    item.target_coach_id;
  const requestId = item.request_id ?? item.requestId ?? item.id;

  if (!coachId || !requestId) return null;

  return {
    ...item,
    coach_id: Number(coachId),
    request_id: Number(requestId),
    coach_name: item.coach_name || item.coachName || item.coach?.name || "",
    coach_email: item.coach_email || item.coachEmail || item.coach?.email || "",
    status: String(item.status || "pending").toLowerCase(),
    relationship_id:
      item.relationship_id != null
        ? Number(item.relationship_id)
        : item.relationshipId != null
          ? Number(item.relationshipId)
          : null,
    updated_at: item.updated_at || item.last_updated || item.created_at || null,
  };
}

function normalizeMyCoach(payload) {
  if (!payload || typeof payload !== "object") return null;

  const coachId =
    payload.coach_id ??
    payload.coachId ??
    payload.coach?.id ??
    payload.coach_account?.id ??
    payload.id;
  if (!coachId) return null;

  return {
    ...payload,
    coach_id: Number(coachId),
    relationship_id:
      payload.relationship_id != null
        ? Number(payload.relationship_id)
        : payload.relationshipId != null
          ? Number(payload.relationshipId)
          : payload.relationship?.id != null
            ? Number(payload.relationship.id)
            : payload.client_coach_relationship?.id != null
              ? Number(payload.client_coach_relationship.id)
          : null,
    account_id:
      payload.account_id ??
      payload.accountId ??
      payload.coach?.account_id ??
      payload.coach?.accountId ??
      payload.coach_account?.account_id ??
      payload.coach_account?.accountId ??
      null,
    name:
      payload.name ||
      payload.coach_name ||
      payload.coachName ||
      payload.coach_account?.name ||
      payload.coach?.name ||
      `Coach #${coachId}`,
    specialty:
      payload.specialty ||
      payload.primary_specialty ||
      payload.coach_account?.specialty ||
      payload.coach?.specialty ||
      "Active coach",
  };
}

function formatExperienceYear(start, end, fallback) {
  if (fallback) return String(fallback);
  const startYear = String(start || "").slice(0, 4);
  const endYear = String(end || "").slice(0, 4);
  if (startYear && endYear) return `${startYear}-${endYear}`;
  return startYear || endYear || "";
}

function buildPaymentInformation(paymentMethod) {
  if (!paymentMethod) return null;
  const ccnum = String(paymentMethod.ccnum || "").replace(/\s+/g, "");
  const cv = String(paymentMethod.cv || "");
  const exp_date = paymentMethod.exp_date || "";
  if (!ccnum || !cv || !exp_date) return null;
  return { ccnum, cv, exp_date };
}

function adaptWorkoutPlansForDay(plans, weekdayIdx) {
  if (!Array.isArray(plans) || plans.length === 0) return null;

  const matchingPlan = plans[weekdayIdx] ?? plans[0];
  if (!matchingPlan) return null;

  const activitiesSource =
    matchingPlan.activities ??
    matchingPlan.workout_activities ??
    matchingPlan.workout_plan_activities ??
    [];

  const activities = Array.isArray(activitiesSource)
    ? activitiesSource.map((activity, index) => normalizeWorkoutActivity(activity, index))
    : [];

  return {
    strata_name:
      matchingPlan.strata_name ??
      matchingPlan.name ??
      matchingPlan.workout_name ??
      matchingPlan.workout_plan?.name ??
      `Workout Plan #${matchingPlan.workout_plan_id ?? matchingPlan.id ?? weekdayIdx + 1}`,
    activities,
  };
}

function normalizeWorkoutActivity(activity, index) {
  return {
    id: activity.id ?? activity.workout_plan_activity_id ?? index + 1,
    name:
      activity.name ??
      activity.activity_name ??
      activity.workout_activity?.name ??
      `Activity ${index + 1}`,
    suggested_sets: Number(activity.planned_sets ?? activity.suggested_sets ?? activity.sets ?? 0),
    suggested_reps: Number(activity.planned_reps ?? activity.suggested_reps ?? activity.reps ?? 0),
    intensity_value: Number(activity.intensity_value ?? activity.weight ?? 0),
    intensity_measure: activity.intensity_measure ?? "lbs",
    logged: Boolean(activity.logged),
  };
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

function convertGridToBackendAvailabilities(slots) {
  const trainingAvailability = {
    Mon: [],
    Tue: [],
    Wed: [],
    Thu: [],
    Fri: [],
    Sat: [],
    Sun: [],
  };

  (slots || []).forEach(({ time, slots: daySlots }) => {
    daySlots.forEach((status, dayIndex) => {
      if (status === "available") {
        trainingAvailability[SHORT_WEEKDAY_NAMES[dayIndex]].push(time);
      }
    });
  });

  return convertTrainingAvailabilityObjectToBackend(trainingAvailability);
}

function convertTrainingAvailabilityObjectToBackend(trainingAvailability) {
  if (!trainingAvailability || typeof trainingAvailability !== "object") return [];

  return SHORT_WEEKDAY_NAMES.flatMap((shortDay) => {
    const longWeekday = shortToLongWeekday(shortDay);
    const entries = Array.isArray(trainingAvailability[shortDay]) ? trainingAvailability[shortDay] : [];
    return entries
      .map((label) => buildAvailabilityWindow(label, longWeekday))
      .filter(Boolean);
  });
}

function convertBackendAvailabilitiesToGrid(availabilities) {
  const byDay = { Mon: [], Tue: [], Wed: [], Thu: [], Fri: [], Sat: [], Sun: [] };
  (availabilities || []).forEach((slot) => {
    const shortDay = longWeekdayToShort(slot?.weekday);
    const label = backendTimeToLabel(slot?.start_time);
    if (shortDay && label) {
      byDay[shortDay].push(label);
    }
  });
  return convertTrainingAvailabilityToGrid(byDay);
}

function longWeekdayToShort(weekday) {
  const normalized = String(weekday || "").trim().toLowerCase();
  const map = {
    monday: "Mon",
    tuesday: "Tue",
    wednesday: "Wed",
    thursday: "Thu",
    friday: "Fri",
    saturday: "Sat",
    sunday: "Sun",
  };
  return map[normalized] ?? null;
}

function backendTimeToLabel(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const match = raw.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return normalizeTimeLabel(raw);
  let hour = Number(match[1]);
  if (!Number.isFinite(hour) || hour < 0 || hour > 23) return null;
  const suffix = hour >= 12 ? "PM" : "AM";
  hour = hour % 12 || 12;
  return `${hour}${suffix}`;
}

function shortToLongWeekday(day) {
  const map = {
    Mon: "monday",
    Tue: "tuesday",
    Wed: "wednesday",
    Thu: "thursday",
    Fri: "friday",
    Sat: "saturday",
    Sun: "sunday",
  };
  return map[day];
}

function buildAvailabilityWindow(label, weekday) {
  const startHour = labelToHour(label);
  if (startHour == null || !weekday) return null;
  const endHour = Math.min(startHour + 1, 23);
  return {
    weekday,
    start_time: toBackendTime(startHour),
    end_time: toBackendTime(endHour),
    max_time_commitment_seconds: 3600,
  };
}

function labelToHour(label) {
  const normalized = normalizeTimeLabel(label);
  if (!normalized) return null;
  const match = normalized.match(/^(\d{1,2})(?::(\d{2}))?(AM|PM)$/);
  if (!match) return null;
  let hour = Number(match[1]);
  const meridiem = match[3];
  if (meridiem === "AM" && hour === 12) hour = 0;
  if (meridiem === "PM" && hour !== 12) hour += 12;
  return hour;
}

function toBackendTime(hour) {
  return `${String(hour).padStart(2, "0")}:00:00`;
}

function extractWeightNumber(value) {
  const match = String(value || "").match(/\d+/);
  return match ? Number(match[0]) : 0;
}

function normalizeUploadResponse(response) {
  const resolvedUrl = extractUploadedAssetUrl(response);

  if (typeof response === "string") {
    return {
      url: resolvedUrl,
      public_url: resolvedUrl,
      pfp_url: resolvedUrl,
    };
  }

  if (!response || typeof response !== "object") {
    return response;
  }

  return resolvedUrl
    ? {
        ...response,
        url: resolvedUrl,
        public_url: response.public_url || resolvedUrl,
        pfp_url: response.pfp_url || resolvedUrl,
      }
    : response;
}

export function extractUploadedAssetUrl(response) {
  if (typeof response === "string") {
    return response.trim() || null;
  }

  if (!response || typeof response !== "object") {
    return null;
  }

  const candidates = [
    response.pfp_url,
    response.url,
    response.public_url,
    response.file_url,
    response.image_url,
    response.profile_picture_url,
    response.account?.pfp_url,
    response.account?.url,
    response.account?.public_url,
    response.data?.pfp_url,
    response.data?.url,
    response.data?.public_url,
  ];

  const directMatch = candidates.find((value) => typeof value === "string" && value.trim());
  if (directMatch) {
    return directMatch.trim();
  }

  for (const value of Object.values(response)) {
    if (typeof value === "string" && /^https?:\/\//i.test(value.trim())) {
      return value.trim();
    }
  }

  return null;
}

/* coach reviews & reports */

export async function submitCoachReview(coachId, rating, reviewText) {
  return apiPost(
    withQuery(`/roles/client/coach_review/${coachId}`, {
      rating,
      review_text: reviewText,
    }),
    null
  )
    .catch(() => ({ review_id: Date.now() }));
}

// export async function fetchCoachReviews(coachId) {
//   try {
//     return await apiGet(`/roles/client/review/${coachId}`);
//   } catch {
//     return { reviews: [] };
//   }
// }

export async function submitCoachReport(coachId, reportSummary) {
  try {
    return await apiPost(
      withQuery(`/roles/client/coach_report/${coachId}`, {
        report_summary: reportSummary,
      }),
      null
    );
  } catch {
    return { report_id: Date.now() };
  }
}

// export async function fetchCoachReports(coachId) {
//   try {
//     return await apiGet(`/roles/client/reports/${coachId}`);
//   } catch {
//     return { reports: [] };
//   }
// }

/* initial survey (onboarding) */

export async function submitInitialSurvey(surveyData) {
  return apiPost("/roles/client/initial_survey", surveyData);
}

/* update client info */

export async function updateClientInfo(payload) {
  return apiPatch("/roles/client/information", payload);
}

/* progress pictures */

/**
 * Upload a progress picture. The backend upserts one record per day so
 * re-uploading on the same day replaces the previous picture.
 * Returns { id, url, date }.
 */
export async function uploadProgressPicture(file) {
  const formData = new FormData();
  formData.append("file", file);
  const response = await apiFetch("/roles/client/upload_progress_picture", {
    method: "POST",
    body: formData,
    headers: {},
  });
  return response;
}

/** Fetch progress pictures for the current client, newest first. */
export async function fetchProgressPictures({ skip = 0, limit = 100 } = {}) {
  try {
    const result = await apiGet(withQuery("/roles/client/progress_pictures", { skip, limit }));
    return Array.isArray(result) ? result : [];
  } catch {
    return [];
  }
}

/*  client workout plans  */

// export async function fetchClientWorkoutPlans(skip = 0, limit = 20) {
//   try {
//     return await apiGet(`/roles/client/fitness/query/plans?skip=${skip}&limit=${limit}`);
//   } catch {
//     return [];
//   }
// }
