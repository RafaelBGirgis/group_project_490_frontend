import { apiGet, apiPatch, apiPost } from "./api";

/* ─── coach profile ───────────────────────────────────────────────── */

export async function fetchCoachProfile() {
  return apiPost("/roles/coach/me", {});
}

export async function createCoachRequest(payload) {
  return apiPost("/roles/coach/request_coach_creation", payload);
}

export async function updateCoachInformation(payload) {
  return apiPatch("/roles/coach/information", payload);
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
  return { success: true, message: "Coach deactivation endpoint is not available in the backend yet." };
}

export async function deleteCoachAccount() {
  return { success: true, message: "Coach deletion endpoint is not available in the backend yet." };
}

export async function fetchMyClients(_coachId) {
  const acceptedClients = readAcceptedCoachClients(_coachId);
  try {
    const items = await fetchClientRequests();
    const clients = await Promise.all(items.map(async (item) => {
      try {
        const detail = await lookupClient(item.client_id);
        return {
          id: item.client_id,
          request_id: item.request_id,
          name: detail?.base_account?.name || `Client #${item.client_id}`,
          goal: detail?.fitness_goals?.[0]?.goal_enum || "Pending request",
          status: "pending",
          joined: "",
          relationship_id: item.relationship_id ?? null,
          details: detail,
        };
      } catch {
        return {
          id: item.client_id,
          request_id: item.request_id,
          name: `Client #${item.client_id}`,
          goal: "Pending request",
          status: "pending",
          joined: "",
          relationship_id: item.relationship_id ?? null,
        };
      }
    }));
    return mergeClientsById(clients, acceptedClients);
  } catch {
    return acceptedClients;
  }
}

export async function fetchUpcomingSessions(_coachId) {
  return [];
}

export async function fetchClientRequests() {
  const response = await apiGet("/roles/coach/client_requests");
  return Array.isArray(response) ? response : [];
}

export async function lookupClient(clientId) {
  return apiGet(`/roles/coach/lookup_client/${clientId}`);
}

export async function acceptClientRequest(requestId) {
  return apiPost(`/roles/coach/accept_client/${requestId}`);
}

export async function denyClientRequest(requestId) {
  return apiPost(`/roles/coach/deny_client/${requestId}`);
}

export async function createClientReview(clientId, reportSummary) {
  return apiPost(
    `/roles/coach/client_review/${clientId}?report_summary=${encodeURIComponent(reportSummary)}`
  );
}

export async function fetchClientReports(clientId) {
  return apiGet(`/roles/coach/reports/${clientId}`);
}

export async function fetchCoachAvailability(coachId) {
  if (!coachId) return [];

  try {
    const response = await apiGet(`/roles/coach/coach_availability/${coachId}`);
    const grid = convertBackendAvailabilitiesToGrid(response?.coach_availabilities || []);
    return grid;
  } catch {
    return [];
  }
}

export async function saveCoachAvailability(coachId, slots) {
  if (!coachId) {
    throw new Error("Missing coach id for availability update.");
  }
  const cacheKey = `coach_profile:${coachId ?? "me"}`;
  const availability = convertFromSlotsFormat(slots);
  const backendAvailabilities = convertTrainingAvailabilityObjectToBackend(availability);

  await updateCoachInformation({
    availabilities: backendAvailabilities,
  });

  const refreshed = await fetchCoachAvailability(coachId);
  const existing = readJson(cacheKey) || {};
  localStorage.setItem(
    cacheKey,
    JSON.stringify({
      ...existing,
      availability: convertFromSlotsFormat(refreshed),
    })
  );

  return refreshed;
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

export async function fetchCoachWorkoutPlans(coachId) {
  const cacheKey = `coach_workouts:${coachId ?? "me"}`;
  const cached = readJson(cacheKey);
  if (Array.isArray(cached) && cached.length > 0) {
    return cached.map((workout) => ({
      id: workout.id,
      strata_name: workout.name,
      client_count: 0,
      last_updated: "recently",
    }));
  }

  return [];
}

export function cacheAcceptedClientForCoach(coachId, client) {
  if (!coachId || !client?.id) return;
  const key = getAcceptedClientsKey(coachId);
  const cached = readJson(key);
  const list = Array.isArray(cached) ? cached : [];
  const next = [
    {
      ...client,
      status: "active",
      joined: client.joined || new Date().toLocaleDateString(),
    },
    ...list.filter((item) => Number(item.id) !== Number(client.id)),
  ];
  localStorage.setItem(key, JSON.stringify(next));
}

export function removeAcceptedClientForCoach(coachId, clientId) {
  if (!coachId || !clientId) return;
  const key = getAcceptedClientsKey(coachId);
  const cached = readJson(key);
  if (!Array.isArray(cached)) return;
  localStorage.setItem(
    key,
    JSON.stringify(cached.filter((item) => Number(item.id) !== Number(clientId)))
  );
}

export function buildCoachRequestPayload(form, availability) {
  return {
    availabilities: convertTrainingAvailabilityObjectToBackend(availability),
    experiences: (form.experiences || []).map(mapExperienceToBackend),
    certifications: (form.certifications || []).map(mapCertificationToBackend),
    specialties: form.specializations || [],
    payment_interval: form.paymentInterval || "monthly",
    price_cents: Number(form.priceCents ?? 0),
  };
}

export function buildCoachInformationPayload({
  availability,
  certifications,
  experiences,
  specializations,
}) {
  const payload = {};

  const mappedAvailability = convertTrainingAvailabilityObjectToBackend(availability);
  if (mappedAvailability.length > 0) {
    payload.availabilities = mappedAvailability;
  }
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
  const { start, end } = parseExperienceDates(experience.year || experience.experience_start);
  return {
    experience_name: experience.organization || experience.experience_name || "Organization",
    experience_title: experience.title || experience.experience_title || "Experience",
    experience_description: experience.description || experience.experience_description || "",
    experience_start: start,
    experience_end: end,
  };
}

function parseExperienceDates(value) {
  const text = String(value || "").trim();
  const years = [...text.matchAll(/\d{4}/g)].map((match) => match[0]);
  if (years.length >= 2) {
    return {
      start: `${years[0]}-01-01`,
      end: `${years[1]}-12-31`,
    };
  }
  if (years.length === 1) {
    return {
      start: `${years[0]}-01-01`,
      end: `${years[0]}-12-31`,
    };
  }
  const today = new Date().getFullYear();
  return {
    start: `${today}-01-01`,
    end: `${today}-12-31`,
  };
}

function normalizeDate(value) {
  const text = String(value || "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  if (/^\d{4}$/.test(text)) return `${text}-01-01`;
  return `${new Date().getFullYear()}-01-01`;
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

function getAcceptedClientsKey(coachId) {
  return `coach_accepted_clients:${coachId ?? "me"}`;
}

function readAcceptedCoachClients(coachId) {
  const parsed = readJson(getAcceptedClientsKey(coachId));
  if (!Array.isArray(parsed)) return [];

  return parsed.filter((client) => {
    if (!client?.id) return false;
    const relationshipKey = `client_relationship:${client.id}:${coachId}`;
    const activeRelationship = localStorage.getItem(relationshipKey);
    if (!client.relationship_id) return true;
    return String(activeRelationship || "") === String(client.relationship_id);
  });
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
  const normalizedByDay = WEEKDAYS.map((day) => {
    const slots = Array.isArray(trainingAvailability[day]) ? trainingAvailability[day] : [];
    const normalizedSlots = slots.map((slot) => normalizeTimeLabel(slot)).filter(Boolean);
    normalizedSlots.forEach((slot) => allTimes.add(slot));
    return new Set(normalizedSlots);
  });

  const sortedTimes = sortTimes([...allTimes]);
  return sortedTimes.map((time) => ({
    time,
    slots: normalizedByDay.map((daySet) => (daySet.has(time) ? "available" : null)),
  }));
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
  // The availability grid is keyed on whole-hour buckets, and the frontend
  // always writes :00:00 minutes. Any stray non-zero minutes in the backend
  // (seed data, older clients) get floored to the hour so they merge into
  // the matching bucket instead of producing an off-grid row like "10:49PM".
  let hour = Number(match[1]);
  if (!Number.isFinite(hour) || hour < 0 || hour > 23) return null;
  const suffix = hour >= 12 ? "PM" : "AM";
  hour = hour % 12 || 12;
  return `${hour}${suffix}`;
}

function convertFromSlotsFormat(slots) {
  const result = { Mon: [], Tue: [], Wed: [], Thu: [], Fri: [], Sat: [], Sun: [] };
  (slots || []).forEach(({ time, slots: daySlots }) => {
    daySlots.forEach((status, dayIndex) => {
      if (status === "available") {
        result[WEEKDAYS[dayIndex]].push(time);
      }
    });
  });
  return result;
}

function convertTrainingAvailabilityObjectToBackend(trainingAvailability) {
  if (!trainingAvailability || typeof trainingAvailability !== "object") return [];

  return WEEKDAYS.flatMap((shortDay) => {
    const weekday = shortToLongWeekday(shortDay);
    const entries = Array.isArray(trainingAvailability[shortDay]) ? trainingAvailability[shortDay] : [];
    return entries
      .map((label) => buildAvailabilityWindow(label, weekday))
      .filter(Boolean);
  });
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
    start_time: `${String(startHour).padStart(2, "0")}:00:00`,
    end_time: `${String(endHour).padStart(2, "0")}:00:00`,
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
