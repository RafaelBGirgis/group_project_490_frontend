import { apiDelete, apiFetch, apiGet, apiPatch, apiPost, apiPut, withQuery } from "./api";
import { clearAuth } from "./auth";
import { cacheAccountSnapshot, cacheRoleHintsFromAccount } from "../utils/sessionCache";

const WEEKDAY_NAMES = [
  "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday",
];

const GOAL_ENUM_MAP = {
  "Weight Loss": "weight loss",
  Maintenance: "maintenence",
  "Muscle Gain": "muscle gain",
};

export async function fetchMe() {
  try {
    const result = await apiGet("/me");
    cacheAccountSnapshot(result);
    cacheRoleHintsFromAccount(result);
    return result;
  } catch (error) {
    if (error?.status === 401) {
      clearAuth();
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    throw error;
  }
}

export async function fetchClientProfile() {
  return apiPost("/roles/client/me", {});
}

export async function fetchUnifiedProfile() {
  try {
    const result = await apiGet("/roles/shared/account/me");
    return {
      ...result,
      account: result?.account || null,
      roles: Array.isArray(result?.roles) ? result.roles : [],
      client_details:
        result?.client_details ??
        result?.client_account ??
        null,
      coach_details:
        result?.coach_details ??
        result?.coach_account ??
        null,
    };
  } catch {
    const account = await apiGet("/me");
    const [clientDetails, coachDetails] = await Promise.all([
      account?.client_id ? apiPost("/roles/client/me", {}).catch(() => null) : Promise.resolve(null),
      account?.coach_id ? apiPost("/roles/coach/me", {}).catch(() => null) : Promise.resolve(null),
    ]);

    return {
      account,
      roles: [],
      client_details:
        clientDetails?.client_account ||
        clientDetails?.client_details ||
        clientDetails ||
        null,
      coach_details:
        coachDetails?.coach_account ||
        coachDetails?.coach_details ||
        coachDetails ||
        null,
    };
  }
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
    if (!result || result.coach === null) return null;
    const normalized = normalizeMyCoach(result);
    if (!normalized?.relationship_id) return null;
    return normalized;
  } catch (error) {
    if (error?.status === 404) return null;
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

/**
 * Aggregated calorie summary for today, scoped to the authenticated client.
 * Backend joins through CompletedWorkoutActivity.estimated_calories (burned)
 * and MealIngredient.calories via CompletedMealActivity → Meal (consumed).
 *
 * Always returns a fully-populated object — nulls coerce to 0 — so callers can
 * read every field without optional-chaining or fallbacks.
 */
export async function fetchCaloriesToday() {
  try {
    const r = await apiGet("/roles/client/telemetry/calories_today");
    return {
      calories_consumed: Number(r?.calories_consumed ?? 0),
      calories_burned: Number(r?.calories_burned ?? 0),
      net_calories: Number(r?.net_calories ?? 0),
      calories_goal: Number(r?.calories_goal ?? 2000),
      meal_count: Number(r?.meal_count ?? 0),
      workout_count: Number(r?.workout_count ?? 0),
    };
  } catch {
    return {
      calories_consumed: 0,
      calories_burned: 0,
      net_calories: 0,
      calories_goal: 2000,
      meal_count: 0,
      workout_count: 0,
    };
  }
}

export async function fetchTelemetryToday(_clientId) {
  try {
    const [steps, workouts, meals, weights] = await Promise.all([
      apiGet(withQuery("/roles/client/telemetry/query/steps", { skip: 0, limit: 1 })).catch(() => []),
      apiGet(withQuery("/roles/client/telemetry/query/workouts", { skip: 0, limit: 100 })).catch(() => []),
      apiGet(withQuery("/roles/client/telemetry/query/meals", { skip: 0, limit: 100 })).catch(() => []),
      apiGet(withQuery("/roles/client/telemetry/query/weights", { skip: 0, limit: 1 })).catch(() => []),
    ]);

    const latestSteps = Array.isArray(steps) ? steps[0] : null;
    const latestWeight = Array.isArray(weights) ? weights[0] : null;

    // Only surface today's step count — yesterday's reading shouldn't appear as today's.
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    const stepDateStr = (() => {
      const ts = latestSteps?.last_updated || latestSteps?.created_at;
      if (!ts) return null;
      try {
        const d = new Date(ts);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      } catch { return null; }
    })();
    const todayStepCount = stepDateStr === todayStr ? Number(latestSteps?.step_count ?? 0) : 0;

    return {
      step_count: todayStepCount,
      calories_burned: sumTelemetryValue(workouts, [
        "calories_burned",
        "estimated_calories_burned",
        "estimated_calories",
      ]),
      calories_consumed: sumTelemetryValue(meals, [
        "calories_consumed",
        "calories",
        "total_calories",
      ]),
      calories_goal: Number(latestWeight?.calories_goal ?? 2000),
    };
  } catch {
    return {
      step_count: 0,
      calories_burned: 0,
      calories_consumed: 0,
      calories_goal: 2000,
    };
  }
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

export async function listClientAvailability(fromDt, toDt) {
  return apiGet(withQuery("/roles/client/availability", { from_dt: fromDt, to_dt: toDt }));
}

export async function createClientAvailability(payload) {
  return apiPost("/roles/client/availability", payload);
}

export async function updateClientAvailability(id, payload) {
  return apiPut(`/roles/client/availability/${id}`, payload);
}

export async function deleteClientAvailability(id) {
  return apiDelete(`/roles/client/availability/${id}`);
}

export async function listClientBusySlots(fromDt, toDt) {
  return apiGet(withQuery("/roles/client/busy_slots", { from_dt: fromDt, to_dt: toDt }));
}

export async function createClientBusySlot(payload) {
  return apiPost("/roles/client/busy_slots", payload);
}

export async function deleteClientBusySlot(id) {
  return apiDelete(`/roles/client/busy_slots/${id}`);
}

/**
 * Fetch the meals the client has logged via the daily survey (newest first).
 * Returns completed meal activity rows from the backend with meal_name.
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
      meal_name: row.meal_name ?? null,
    }));
  } catch {
    return [];
  }
}

export async function fetchAvailableOnDemandMeals(_clientId) {
  return [];
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
  try {
    return await apiDelete(`/roles/client/rescind_request/${requestId}`);
  } catch (error) {
    if (error?.status === 404 || error?.status === 405) {
      return apiDelete(`/roles/shared/client_coach_relationship/delete_coach_request/${requestId}`);
    }
    throw error;
  }
}

export async function terminateRelationship(relationshipId) {
  return apiPost(`/roles/shared/client_coach_relationship/terminate_relationship/${relationshipId}`, {});
}

export async function assignWorkoutPlanToClient(workoutPlanId, startDt, endDt) {
  return apiPost("/roles/client/assign_plan", {
    workout_plan_id: Number(workoutPlanId),
    start_dt: startDt,
    end_dt: endDt,
  });
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
  const availabilities = (Array.isArray(form.availabilityWindows) ? form.availabilityWindows : []).map((w) => ({
    account_id: 0,
    start_dt: w.start_dt,
    end_dt: w.end_dt,
    repeats_weekly: !!w.repeats_weekly,
    recurrence_end_dt: w.recurrence_end_dt ?? null,
  }));
  return {
    fitness_goals: {
      client_id: 0,
      goal_enum: GOAL_ENUM_MAP[form.primaryGoal] ?? String(form.primaryGoal || "").toLowerCase(),
    },
    payment_information: {
      ccnum: String(form.cardNumber || "").replace(/\s+/g, ""),
      cv: String(form.cardCvv || ""),
      exp_date: normalizePaymentExpiryDate(form.cardExpiry),
    },
    availabilities,
    initial_health_metric: {
      weight: extractWeightNumber(form.weight),
      client_telemetry_id: 0,
    },
  };
}

export function buildClientInformationPayload({
  primaryGoal,
  weight,
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

function sumTelemetryValue(rows, keys) {
  return (Array.isArray(rows) ? rows : []).reduce((sum, row) => {
    const value = keys.find((key) => Number.isFinite(Number(row?.[key])));
    return sum + (value ? Number(row[value]) : 0);
  }, 0);
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

  const derivedStatus =
    item.status != null
      ? String(item.status).toLowerCase()
      : item.is_accepted === true
        ? "approved"
        : item.is_accepted === false
          ? "rejected"
          : "pending";

  return {
    ...item,
    coach_id: Number(coachId),
    request_id: Number(requestId),
    coach_name: item.coach_name || item.coachName || item.coach?.name || "",
    coach_email: item.coach_email || item.coachEmail || item.coach?.email || "",
    status: derivedStatus,
    relationship_id:
      item.relationship_id != null
        ? Number(item.relationship_id)
        : item.relationshipId != null
          ? Number(item.relationshipId)
          : item.relationship?.id != null
            ? Number(item.relationship.id)
            : item.client_coach_relationship?.id != null
              ? Number(item.client_coach_relationship.id)
          : null,
    updated_at: item.updated_at || item.last_updated || item.created_at || null,
  };
}

function normalizeMyCoach(payload) {
  if (!payload || typeof payload !== "object") return null;

  const coachAccount =
    payload.coach_account ||
    payload.coach ||
    payload.account ||
    payload.base_account ||
    null;
  const relationship =
    payload.client_coach_relationship ||
    payload.relationship ||
    payload.coach_relationship ||
    null;
  const coachId =
    payload.coach_id ??
    payload.coachId ??
    payload.client_coach_relationship?.coach_id ??
    payload.client_coach_relationship?.coachId ??
    relationship?.coach_id ??
    relationship?.coachId ??
    payload.coach?.id ??
    payload.coach_account?.id ??
    coachAccount?.coach_id ??
    coachAccount?.coachId ??
    coachAccount?.id ??
    payload.id;
  if (!coachId) return null;

  const relationshipId =
    payload.relationship_id ??
    payload.relationshipId ??
    relationship?.relationship_id ??
    relationship?.relationshipId ??
    relationship?.id ??
    payload.client_coach_relationship?.id ??
    payload.client_coach_relationship?.relationship_id ??
    payload.client_coach_relationship?.relationshipId ??
    null;

  if (relationshipId == null) return null;

  const relationshipStatus = String(
    payload.relationship_status ??
    payload.status ??
    relationship?.status ??
    payload.client_coach_relationship?.status ??
    ""
  ).trim().toLowerCase();
  const isExplicitlyInactive =
    relationship?.is_active === false ||
    payload.client_coach_relationship?.is_active === false ||
    payload.is_active === false ||
    ["terminated", "ended", "inactive", "cancelled", "canceled", "deleted", "rejected", "revoked"].includes(relationshipStatus);

  if (isExplicitlyInactive) {
    return null;
  }

  return {
    ...payload,
    coach_id: Number(coachId),
    relationship_id: relationshipId != null ? Number(relationshipId) : null,
    account_id:
      payload.account_id ??
      payload.accountId ??
      payload.base_account?.id ??
      payload.coach?.account_id ??
      payload.coach?.accountId ??
      payload.coach_account?.account_id ??
      payload.coach_account?.accountId ??
      payload.coach_account?.base_account?.id ??
      coachAccount?.account_id ??
      coachAccount?.accountId ??
      coachAccount?.base_account?.id ??
      coachAccount?.id ??
      null,
    name:
      payload.name ||
      payload.coach_name ||
      payload.coachName ||
      payload.coach_account?.name ||
      payload.coach_account?.base_account?.name ||
      payload.coach?.name ||
      payload.coach?.base_account?.name ||
      payload.base_account?.name ||
      coachAccount?.name ||
      coachAccount?.base_account?.name ||
      `Coach #${coachId}`,
    specialty:
      payload.specialty ||
      payload.primary_specialty ||
      payload.coach_account?.specialty ||
      payload.coach_account?.specialties ||
      payload.coach?.specialty ||
      payload.coach?.specialties ||
      coachAccount?.specialty ||
      coachAccount?.specialties ||
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
  const exp_date = normalizePaymentExpiryDate(paymentMethod.exp_date);
  if (!ccnum || !cv || !exp_date) return null;
  return { ccnum, cv, exp_date };
}

function normalizePaymentExpiryDate(value) {
  const normalized = String(value || "").trim();
  if (!normalized) return "";
  if (/^\d{4}-\d{2}$/.test(normalized)) {
    return `${normalized}-01`;
  }
  return normalized;
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
  );
}

// export async function fetchCoachReviews(coachId) {
//   try {
//     return await apiGet(`/roles/client/review/${coachId}`);
//   } catch {
//     return { reviews: [] };
//   }
// }

export async function submitCoachReport(coachId, reportSummary) {
  return apiPost(
    withQuery(`/roles/client/coach_report/${coachId}`, {
      report_summary: reportSummary,
    }),
    null
  );
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
