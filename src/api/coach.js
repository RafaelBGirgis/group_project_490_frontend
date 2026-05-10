import { apiDelete, apiGet, apiPatch, apiPost, apiPut, withQuery } from "./api";

function resolveClientName(source, fallbackId) {
  return (
    source?.base_account?.name ||
    source?.account?.name ||
    source?.name ||
    source?.client_name ||
    source?.clientName ||
    source?.client_account?.name ||
    source?.client_account?.base_account?.name ||
    source?.client?.name ||
    source?.client?.base_account?.name ||
    `Client #${fallbackId}`
  );
}

function normalizeAcceptedClientItem(item) {
  if (!item || typeof item !== "object") return null;

  const clientId =
    item.client_id ??
    item.clientId ??
    item.client?.id ??
    item.client_account?.id ??
    item.client_account?.client_id ??
    item.base_account?.client_id ??
    item.id;
  const relationshipId =
    item.relationship_id ??
    item.relationshipId ??
    item.relationship?.id ??
    item.client_coach_relationship?.id ??
    item.client_coach_relationship?.relationship_id;
  const requestId =
    item.request_id ??
    item.requestId ??
    item.client_coach_request_id ??
    null;

  if (!clientId) return null;

  return {
    ...item,
    client_id: Number(clientId),
    relationship_id:
      relationshipId != null ? Number(relationshipId) : null,
    request_id:
      requestId != null ? Number(requestId) : null,
  };
}

function normalizeClientRequestItem(item) {
  if (!item || typeof item !== "object") return null;

  const clientId =
    item.client_id ??
    item.clientId ??
    item.client?.id ??
    item.base_account?.client_id;
  const requestId = item.request_id ?? item.requestId ?? item.id;

  if (!clientId || !requestId) return null;

  return {
    ...item,
    client_id: Number(clientId),
    request_id: Number(requestId),
    name: resolveClientName(item, clientId),
    age:
      item.age ??
      item.base_account?.age ??
      item.client?.age ??
      null,
    gender:
      item.gender ||
      item.base_account?.gender ||
      item.client?.gender ||
      "",
    pfp_url:
      item.pfp_url ||
      item.base_account?.pfp_url ||
      item.client?.pfp_url ||
      "",
    goal:
      item.goal ||
      item.fitness_goals?.[0]?.goal_enum ||
      item.client?.fitness_goals?.[0]?.goal_enum ||
      "Pending request",
    detail:
      item.detail ||
      {
        base_account: {
          id:
            item.base_account?.id ??
            item.account_id ??
            item.client?.account_id ??
            null,
          name: resolveClientName(item, clientId),
          age:
            item.age ??
            item.base_account?.age ??
            item.client?.age ??
            null,
          gender:
            item.gender ||
            item.base_account?.gender ||
            item.client?.gender ||
            "",
          pfp_url:
            item.pfp_url ||
            item.base_account?.pfp_url ||
            item.client?.pfp_url ||
            "",
          email:
            item.email ||
            item.base_account?.email ||
            item.client?.email ||
            "",
          bio:
            item.bio ||
            item.base_account?.bio ||
            item.client?.bio ||
            "",
        },
        fitness_goals: Array.isArray(item.fitness_goals) ? item.fitness_goals : [],
      },
  };
}

/*  coach profile  */

export async function fetchCoachProfile() {
  return apiPost("/roles/coach/me", {});
}

/**
 * One-shot dashboard payload — replaces the cluster of legacy
 * `/me`, `/clients`, `/client_requests`, `/earnings`, `/review/<id>`,
 * and per-row `/lookup_client/<id>` calls with a single round trip.
 *
 * The shape mirrors what `coach_dash.jsx` already expects after
 * normalization, so the page can swap to this without rewriting its
 * render path. Per-client `details` are inlined inside each clients[]
 * and client_requests[] entry — no follow-up lookupClient required.
 */
export async function fetchCoachDashboardBundle() {
  try {
    const data = await apiGet("/roles/coach/dashboard_bundle");
    if (!data || typeof data !== "object") return null;

    const accepted = Array.isArray(data.clients) ? data.clients : [];
    const requests = Array.isArray(data.client_requests) ? data.client_requests : [];

    // Normalize accepted-client rows to the dashboard's renderer shape
    // ({id, name, goal, status, relationship_id, details}). We don't go
    // back to the network for any of these.
    const acceptedNormalized = accepted.map((row) => ({
      id: row.client_id,
      request_id: row.request_id ?? null,
      name: resolveClientName(row.details || row, row.client_id),
      goal:
        row.details?.fitness_goals?.[0]?.goal_enum ||
        row.goal ||
        "Active client",
      status: "active",
      joined: new Date().toLocaleDateString(),
      relationship_id: row.relationship_id ?? null,
      details: row.details || null,
    }));

    // Normalize pending requests too — same renderer.
    const pendingNormalized = requests.map((req) => ({
      id: req.client_id,
      request_id: req.request_id ?? req.id ?? null,
      name: resolveClientName(req, req.client_id),
      goal: req.fitness_goals?.[0]?.goal_enum || "Pending request",
      status: "pending",
      joined: "",
      relationship_id: null,
      details: {
        base_account: req.base_account || null,
        fitness_goals: req.fitness_goals || [],
      },
    }));

    return {
      profile: data.profile || null,
      stats: data.stats || null,
      earnings: data.earnings || null,
      reviews: Array.isArray(data.reviews) ? data.reviews : [],
      // The dashboard expects two separate state slices; we hand them out
      // pre-merged and indexed, so the page doesn't have to mergeClientsById.
      clients: mergeClientsById(pendingNormalized, acceptedNormalized),
      client_requests: requests,
      // Map of clientId -> details so the in-page cache pre-populates with
      // every detail the bundle already paid for, and follow-up clicks are
      // free. Keys are stringified to match what coach_dash.jsx already does.
      request_details_by_client_id: Object.fromEntries(
        [...accepted, ...requests]
          .filter((r) => r?.client_id)
          .map((r) => [
            r.client_id,
            r.details || { base_account: r.base_account || null, fitness_goals: r.fitness_goals || [] },
          ])
      ),
    };
  } catch {
    return null;
  }
}

export async function createCoachRequest(payload) {
  return apiPost("/roles/coach/request_coach_creation", payload);
}

export async function updateCoachInformation(payload) {
  return apiPatch("/roles/coach/information", payload);
}

export async function fetchCoachEarnings(since) {
  const params = since ? `?since=${since}` : "";
  return apiGet(`/roles/coach/earnings${params}`);
}

export async function createCoachWorkout(payload) {
  return apiPost("/roles/coach/fitness/workout", payload);
}

export async function createCoachWorkoutActivity(payload) {
  return apiPost("/roles/coach/fitness/activity", payload);
}

export async function createLegacyCoachWorkout(payload) {
  return apiPost("/roles/coach/create_workout", payload);
}

export async function createLegacyCoachWorkoutActivity(payload) {
  return apiPost("/roles/coach/create_workout_activity", payload);
}

export async function createLegacyCoachWorkoutPlan(payload) {
  return apiPost("/roles/coach/create_workout_plan", payload);
}

export async function deactivateCoachAccount() {
  return apiPost("/roles/shared/account/deactivate");
}

export async function deleteCoachAccount() {
  return apiDelete("/roles/shared/account/delete");
}

export async function fetchMyClients(_coachId) {
  try {
    // Fetch accepted clients from API and enrich with details
    const acceptedClientsResponse = await apiGet("/roles/coach/clients");
    const acceptedClients = await Promise.all(
      (Array.isArray(acceptedClientsResponse) ? acceptedClientsResponse : [])
        .map(normalizeAcceptedClientItem)
        .filter(Boolean)
        .map(async (item) => {
        try {
          const detail = await lookupClient(item.client_id);
          return {
            id: item.client_id,
            request_id: item.request_id,
            name: resolveClientName(detail, item.client_id),
            goal:
              detail?.fitness_goals?.[0]?.goal_enum ||
              item.goal ||
              item.fitness_goals?.[0]?.goal_enum ||
              "Active client",
            status: "active",
            joined: new Date().toLocaleDateString(),
            relationship_id: item.relationship_id,
            details: detail || item.detail || item.details || item,
          };
        } catch {
          return {
            id: item.client_id,
            request_id: item.request_id,
            name: resolveClientName(item, item.client_id),
            goal:
              item.goal ||
              item.fitness_goals?.[0]?.goal_enum ||
              "Active client",
            status: "active",
            joined: new Date().toLocaleDateString(),
            relationship_id: item.relationship_id,
            details: item.detail || item.details || item,
          };
        }
      })
    );

    // Fetch pending requests (API now returns full client details)
    const pendingRequests = await fetchClientRequests();
    const pendingClients = pendingRequests.map((request) => ({
      id: request.client_id,
      request_id: request.request_id,
      name: request.name || `Client #${request.client_id}`,
      goal: request.goal || "Pending request",
      status: "pending",
      joined: "",
      relationship_id: null,
      // Include basic details object for consistency
      details: {
        base_account: {
          name: request.name,
          age: request.age,
          gender: request.gender,
          pfp_url: request.pfp_url,
        },
      },
    }));

    return mergeClientsById(pendingClients, acceptedClients);
  } catch {
    return [];
  }
}

export async function fetchUpcomingSessions(_coachId) {
  return [];
}

export async function fetchClientRequests() {
  const response = await apiGet("/roles/coach/client_requests");
  return Array.isArray(response)
    ? response.map(normalizeClientRequestItem).filter(Boolean)
    : [];
}

export async function lookupClient(clientId) {
  return apiGet(`/roles/coach/lookup_client/${clientId}`);
}

export async function acceptClientRequest(requestId) {
  return apiPost(`/roles/coach/accept_client/${requestId}`);
}

export async function denyClientRequest(requestId) {
  try {
    return await apiPost(`/roles/coach/deny_client/${requestId}`);
  } catch (error) {
    if (error?.status === 404 || error?.status === 405) {
      return apiDelete(`/roles/shared/client_coach_relationship/delete_coach_request/${requestId}`);
    }
    throw error;
  }
}

export async function terminateRelationship(relationshipId) {
  return apiPost(
    `/roles/shared/client_coach_relationship/terminate_relationship/${relationshipId}`,
    {}
  );
}

export async function prescribeWorkoutPlan(clientId, workoutPlanId, startDt, endDt) {
  return apiPost("/roles/coach/prescribe_plan", {
    client_id: Number(clientId),
    workout_plan_id: Number(workoutPlanId),
    start_dt: startDt,
    end_dt: endDt,
  });
}

export async function createClientReview(clientId, reportSummary) {
  return apiPost(
    `/roles/coach/client_review/${clientId}?report_summary=${encodeURIComponent(reportSummary)}`
  );
}

export async function fetchClientReports(clientId) {
  return apiGet(`/roles/coach/reports/${clientId}`);
}

// ─── Self-service availability + busy slot CRUD ──────────────────────────────

export async function listSelfAvailability(fromDt, toDt) {
  return apiGet(withQuery("/roles/coach/availability", { from_dt: fromDt, to_dt: toDt }));
}

export async function createSelfAvailability(payload) {
  return apiPost("/roles/coach/availability", payload);
}

export async function updateSelfAvailability(id, payload) {
  return apiPut(`/roles/coach/availability/${id}`, payload);
}

export async function deleteSelfAvailability(id) {
  return apiDelete(`/roles/coach/availability/${id}`);
}

export async function listSelfBusySlots(fromDt, toDt) {
  return apiGet(withQuery("/roles/coach/busy_slots", { from_dt: fromDt, to_dt: toDt }));
}

export async function createSelfBusySlot(payload) {
  return apiPost("/roles/coach/busy_slots", payload);
}

export async function deleteSelfBusySlot(id) {
  return apiDelete(`/roles/coach/busy_slots/${id}`);
}

// View a coach's availability as a client (for the booking UI)
export async function fetchCoachAvailabilityWindows(coachId, fromDt, toDt) {
  if (!coachId) return [];
  try {
    const response = await apiGet(
      withQuery(`/roles/coach/coach_availability/${coachId}`, { from_dt: fromDt, to_dt: toDt })
    );
    return Array.isArray(response) ? response : [];
  } catch {
    return [];
  }
}

export async function fetchCoachStats(coachId) {
  const [clients, reviews, plans] = await Promise.all([
    fetchMyClients(coachId),
    fetchCoachReviews(coachId),
    fetchCoachWorkoutPlans(coachId),
  ]);

  const avgRating = reviews.length
    ? reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / reviews.length
    : 0;

  return {
    total_clients: clients.length,
    active_clients: clients.filter((client) => client.status === "active" || client.status === "pending").length,
    sessions_this_week: 0,
    avg_rating: Number(avgRating.toFixed(1)),
    review_count: reviews.length,
    revenue_this_month: 0,
    workout_plan_count: plans.length,
  };
}

export async function fetchCoachReviews(coachId) {
  if (!coachId) return [];

  try {
    const response = await apiGet(`/roles/client/review/${coachId}`);
    const reviews = Array.isArray(response?.reviews) ? response.reviews : [];
    return reviews.map((review, index) => ({
      id: review.id ?? `${coachId}-${index}`,
      client_id: review.client_id ?? null,
      client_name: review.client_name || `Client #${review.client_id ?? index + 1}`,
      rating: Math.max(0, Math.min(5, Math.round(Number(review.rating ?? 0)))),
      comment: review.review_text || review.comment || "",
      created_at: review.last_updated
        ? new Date(review.last_updated).toLocaleDateString()
        : "",
      last_updated: review.last_updated || null,
    }));
  } catch {
    return [];
  }
}

export async function fetchCoachWorkoutPlans(_coachId) {
  // TODO: Implement API endpoint to fetch coach workout plans
  // For now, returning empty array as we migrate away from localStorage caching
  return [];
}

// ─── Coach-view client telemetry & schedule ──────────────────────────────────

const COACH_CLIENT_TELEMETRY = "/roles/coach/client_telemetry";

async function fetchCoachClientList(clientId, type, { limit = 10, skip = 0 } = {}) {
  try {
    const result = await apiGet(withQuery(`${COACH_CLIENT_TELEMETRY}/${clientId}/${type}`, { limit, skip }));
    return Array.isArray(result) ? result : [];
  } catch {
    return [];
  }
}

export function fetchClientWeightHistory(clientId, opts) {
  return fetchCoachClientList(clientId, "weights", opts);
}

export function fetchClientMoodHistory(clientId, opts) {
  return fetchCoachClientList(clientId, "moods", opts);
}

export function fetchClientStepHistory(clientId, opts) {
  return fetchCoachClientList(clientId, "steps", opts);
}

export function fetchClientWorkoutHistoryByCoach(clientId, opts) {
  return fetchCoachClientList(clientId, "workouts", opts);
}

export function fetchClientWorkoutHistoryEnrichedByCoach(clientId, opts) {
  return fetchCoachClientList(clientId, "workouts_enriched", opts);
}

export async function fetchClientProgressPicturesByCoach(clientId, { limit = 10, skip = 0 } = {}) {
  try {
    const result = await apiGet(withQuery(`/roles/coach/client_progress_pictures/${clientId}`, { limit, skip }));
    return Array.isArray(result) ? result : [];
  } catch {
    return [];
  }
}

/**
 * Coach view of a client's meal log. Backend returns enriched rows with
 * meal_name, meal_kind, calories, and macros joined live from meal_food/food.
 * Pass `onDate` (YYYY-MM-DD) to scope to a single day — used by the
 * "what they ate today" section on the client-profile overlay.
 */
export async function fetchClientMealHistoryByCoach(clientId, { limit = 50, skip = 0, onDate } = {}) {
  try {
    const result = await apiGet(
      withQuery(`/roles/coach/client_meals/${clientId}`, { limit, skip, on_date: onDate })
    );
    return Array.isArray(result) ? result : [];
  } catch {
    return [];
  }
}

export async function fetchClientWorkoutPlanByCoach(clientId, weekdayIdx) {
  try {
    const result = await apiGet(
      withQuery(`/roles/coach/client_plans/${clientId}`, { skip: 0, limit: 100 })
    );
    const plans = Array.isArray(result) ? result : [];
    if (plans.length > 0) {
      const matchingPlan = plans[weekdayIdx] ?? plans[0];
      if (matchingPlan) {
        const activitiesSource =
          matchingPlan.activities ??
          matchingPlan.workout_activities ??
          matchingPlan.workout_plan_activities ??
          [];
        const activities = Array.isArray(activitiesSource)
          ? activitiesSource.map((a, i) => ({
              id: a.id ?? i + 1,
              name: a.name ?? a.activity_name ?? a.workout_activity?.name ?? `Activity ${i + 1}`,
              suggested_sets: Number(a.planned_sets ?? a.suggested_sets ?? a.sets ?? 0),
              suggested_reps: Number(a.planned_reps ?? a.suggested_reps ?? a.reps ?? 0),
              intensity_value: Number(a.intensity_value ?? a.weight ?? 0),
              intensity_measure: a.intensity_measure ?? "lbs",
              logged: Boolean(a.logged),
            }))
          : [];
        return {
          strata_name:
            matchingPlan.strata_name ??
            matchingPlan.name ??
            "",
          activities,
        };
      }
    }
  } catch {
    // Fall through to empty-state plan below.
  }
  return { strata_name: "", activities: [] };
}

export async function fetchClientAvailabilityByCoach(clientId, fromDt, toDt) {
  try {
    const result = await apiGet(
      withQuery(`/roles/coach/client/${clientId}/availability`, { from_dt: fromDt, to_dt: toDt })
    );
    return Array.isArray(result) ? result : [];
  } catch {
    return [];
  }
}

export async function fetchClientBusySlotsByCoach(clientId, fromDt, toDt) {
  try {
    const result = await apiGet(
      withQuery(`/roles/coach/client/${clientId}/busy_slots`, { from_dt: fromDt, to_dt: toDt })
    );
    return Array.isArray(result) ? result : [];
  } catch {
    return [];
  }
}

// ─────────────────────────────────────────────────────────────────────────────

export function buildCoachRequestPayload(form, availabilityWindows) {
  return {
    availabilities: (Array.isArray(availabilityWindows) ? availabilityWindows : []).map((w) => ({
      account_id: 0,
      start_dt: w.start_dt,
      end_dt: w.end_dt,
      repeats_weekly: !!w.repeats_weekly,
      recurrence_end_dt: w.recurrence_end_dt ?? null,
    })),
    experiences: (form.experiences || []).map(mapExperienceToBackend),
    certifications: (form.certifications || []).map(mapCertificationToBackend),
    specialties: form.specializations || [],
    payment_interval: form.paymentInterval || "monthly",
    price_cents: Number(form.priceCents ?? 0),
  };
}

export function buildCoachInformationPayload({
  certifications,
  experiences,
  specializations,
}) {
  const payload = {};

  if (Array.isArray(certifications) && certifications.length > 0) {
    payload.certifications = certifications.map(mapCertificationToBackend);
  }
  if (Array.isArray(experiences) && experiences.length > 0) {
    payload.experiences = experiences.map(mapExperienceToBackend);
  }
  if (Array.isArray(specializations) && specializations.length > 0) {
    payload.specialties = specializations;
  }

  return payload;
}

export function buildCoachWorkoutPayload(workout) {
  return {
    name: workout.name,
    description: workout.description || "",
    instructions: workout.exercises
      ?.map((exercise, index) => `${index + 1}. ${exercise.name}${exercise.notes ? ` - ${exercise.notes}` : ""}`)
      .join("\n") || workout.description || "Coach-created workout",
    workout_type: workout.exercises?.some((exercise) => exercise.intensity_measure === "sec") ? "duration" : "rep",
    equipment: dedupeEquipment(workout.exercises || []),
  };
}

export function buildCoachWorkoutActivities(workoutId, exercises) {
  return (exercises || [])
    .filter((exercise) => exercise.name)
    .map((exercise) => ({
      workout_id: workoutId,
      intensity_measure: exercise.intensity_measure || "lbs",
      intensity_value: Number(exercise.weight ?? exercise.intensity_value ?? 0),
      estimated_calories_per_unit_frequency: Number(exercise.estimated_calories_per_unit_frequency ?? 0),
    }));
}

function dedupeEquipment(exercises) {
  const seen = new Set();
  return exercises
    .map((exercise) => String(exercise.equipment || "").trim())
    .filter(Boolean)
    .filter((name) => {
      const key = name.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((name) => ({
      name,
      description: `${name} equipment`,
      is_required: true,
      is_recommended: true,
    }));
}

function mapCertificationToBackend(certification) {
  return {
    certification_name: certification.title || certification.certification_name || "Certification",
    certification_date: normalizeDate(certification.year || certification.certification_date),
    certification_score: certification.description || certification.certification_score || null,
    certification_organization: certification.issuer || certification.certification_organization || "Organization",
  };
}

function mapExperienceToBackend(experience) {
  const { start, end } = parseExperienceDates(
    experience.startDate || experience.experience_start || experience.year,
    experience.endDate || experience.experience_end,
  );
  return {
    experience_name: experience.organization || experience.experience_name || "Organization",
    experience_title: experience.title || experience.experience_title || "Experience",
    experience_description: experience.description || experience.experience_description || "",
    experience_start: start,
    experience_end: end,
  };
}

function parseExperienceDates(startValue, endValue) {
  const toDateString = (value, fallbackSide) => {
    const text = String(value || "").trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
    if (/^\d{4}$/.test(text)) {
      return fallbackSide === "end" ? `${text}-12-31` : `${text}-01-01`;
    }
    return "";
  };

  const start = toDateString(startValue, "start");
  const end = toDateString(endValue, "end") || start;
  const currentYear = new Date().getFullYear();

  return {
    start: start || `${currentYear}-01-01`,
    end: end || `${currentYear}-12-31`,
  };
}

function normalizeDate(value) {
  const text = String(value || "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  if (/^\d{4}$/.test(text)) return `${text}-01-01`;
  return `${new Date().getFullYear()}-01-01`;
}


function mergeClientsById(primaryClients, fallbackClients) {
  const merged = [];
  const seen = new Set();

  [fallbackClients, primaryClients].flat().forEach((client) => {
    if (!client?.id || seen.has(Number(client.id))) return;
    seen.add(Number(client.id));
    merged.push(client);
  });

  return merged;
}

