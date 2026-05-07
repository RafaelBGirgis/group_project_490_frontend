export const SHORT_WEEKDAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export const EMPTY_TRAINING_AVAILABILITY = {
  Mon: [],
  Tue: [],
  Wed: [],
  Thu: [],
  Fri: [],
  Sat: [],
  Sun: [],
};

export function createEmptyTrainingAvailability() {
  return {
    Mon: [],
    Tue: [],
    Wed: [],
    Thu: [],
    Fri: [],
    Sat: [],
    Sun: [],
  };
}

export const DEFAULT_TIME_OPTIONS = [
  "5AM", "6AM", "7AM", "8AM", "9AM", "10AM", "11AM",
  "12PM", "1PM", "2PM", "3PM", "4PM", "5PM", "6PM", "7PM", "8PM", "9PM",
];

export function normalizeTimeLabel(raw) {
  const value = String(raw || "").trim().toUpperCase().replace(/\s+/g, "");
  if (!value) return "";
  return value
    .replace("A.M.", "AM")
    .replace("P.M.", "PM")
    .replace("A.M", "AM")
    .replace("P.M", "PM");
}

export function sortTimes(times) {
  return [...times].sort((a, b) => {
    const ai = DEFAULT_TIME_OPTIONS.indexOf(a);
    const bi = DEFAULT_TIME_OPTIONS.indexOf(b);
    if (ai === -1 && bi === -1) return a.localeCompare(b);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });
}

export function shortToLongWeekday(day) {
  const map = {
    Mon: "monday",
    Tue: "tuesday",
    Wed: "wednesday",
    Thu: "thursday",
    Fri: "friday",
    Sat: "saturday",
    Sun: "sunday",
  };
  return map[day] ?? null;
}

export function longWeekdayToShort(weekday) {
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

export function backendTimeToLabel(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;

  const isoMatch = raw.match(/T(\d{1,2}):(\d{2})/);
  const timeMatch = raw.match(/^(\d{1,2}):(\d{2})/);
  const match = isoMatch || timeMatch;
  if (!match) return normalizeTimeLabel(raw);

  let hour = Number(match[1]);
  if (!Number.isFinite(hour) || hour < 0 || hour > 23) return null;

  const suffix = hour >= 12 ? "PM" : "AM";
  hour = hour % 12 || 12;
  return `${hour}${suffix}`;
}

export function labelToHour(label) {
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

export function toBackendTime(hour) {
  return `${String(hour).padStart(2, "0")}:00:00`;
}

export function buildAvailabilityRecord(label, weekday) {
  const startHour = labelToHour(label);
  if (startHour == null || !weekday) return null;

  const endHour = startHour + 1;
  if (endHour > 23) return null;
  return {
    weekday,
    start_time: toBackendTime(startHour),
    end_time: toBackendTime(endHour),
  };
}

export function sanitizeBackendAvailabilityRecord(record) {
  const weekday = shortToLongWeekday(longWeekdayToShort(record?.weekday) || "");
  const startLabel = backendTimeToLabel(record?.start_time);
  const endLabel = backendTimeToLabel(record?.end_time);
  const startHour = startLabel ? labelToHour(startLabel) : null;
  const endHour = endLabel ? labelToHour(endLabel) : null;

  if (!weekday || startHour == null || endHour == null || endHour <= startHour) {
    return null;
  }

  return {
    weekday,
    start_time: toBackendTime(startHour),
    end_time: toBackendTime(endHour),
  };
}

export function convertTrainingAvailabilityToGrid(trainingAvailability) {
  if (!trainingAvailability || typeof trainingAvailability !== "object") return [];

  const allTimes = new Set();
  const normalizedByDay = SHORT_WEEKDAY_NAMES.map((day) => {
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

export function convertBackendAvailabilitiesToGrid(availabilities) {
  const byDay = createEmptyTrainingAvailability();

  (Array.isArray(availabilities) ? availabilities : []).forEach((slot) => {
    const shortDay = longWeekdayToShort(slot?.weekday);
    const label = backendTimeToLabel(slot?.start_time);
    if (shortDay && label && !byDay[shortDay].includes(label)) {
      byDay[shortDay].push(label);
    }
  });

  return convertTrainingAvailabilityToGrid(byDay);
}

export function convertGridToTrainingAvailability(slots) {
  const trainingAvailability = createEmptyTrainingAvailability();

  (Array.isArray(slots) ? slots : []).forEach(({ time, slots: daySlots }) => {
    (Array.isArray(daySlots) ? daySlots : []).forEach((status, dayIndex) => {
      if (status === "available") {
        trainingAvailability[SHORT_WEEKDAY_NAMES[dayIndex]].push(time);
      }
    });
  });

  return trainingAvailability;
}

export function convertTrainingAvailabilityObjectToBackend(trainingAvailability) {
  if (!trainingAvailability || typeof trainingAvailability !== "object") return [];

  return SHORT_WEEKDAY_NAMES.flatMap((shortDay) => {
    const weekday = shortToLongWeekday(shortDay);
    const entries = Array.isArray(trainingAvailability[shortDay]) ? trainingAvailability[shortDay] : [];
    return entries
      .map((label) => buildAvailabilityRecord(label, weekday))
      .filter(Boolean);
  });
}

export function convertGridToBackendAvailabilities(slots) {
  return convertTrainingAvailabilityObjectToBackend(
    convertGridToTrainingAvailability(slots)
  );
}

export function convertAvailabilityCandidatesToBackend(value) {
  if (Array.isArray(value)) {
    return sanitizeBackendAvailabilities(value);
  }

  if (!value || typeof value !== "object") {
    return null;
  }

  const trainingAvailability = SHORT_WEEKDAY_NAMES.some((day) => Array.isArray(value[day]))
    ? value
    : null;

  if (!trainingAvailability) {
    return null;
  }

  return sanitizeBackendAvailabilities(
    convertTrainingAvailabilityObjectToBackend(trainingAvailability)
  );
}

export function sanitizeBackendAvailabilities(availabilities) {
  return (Array.isArray(availabilities) ? availabilities : [])
    .map((record) => sanitizeBackendAvailabilityRecord(record))
    .filter(Boolean);
}

export function serializeBackendAvailabilities(availabilities) {
  return sanitizeBackendAvailabilities(availabilities)
    .map((record) => `${record.weekday}|${record.start_time}|${record.end_time}`)
    .sort();
}

export function extractBackendAvailabilities(payload) {
  const candidates = [
    payload,
    payload?.availabilities,
    payload?.availability,
    payload?.client_availabilities,
    payload?.coach_availabilities,
    payload?.client_account?.availabilities,
    payload?.client_account?.availability,
    payload?.coach_account?.availabilities,
    payload?.coach_account?.availability,
    payload?.client_details?.availabilities,
    payload?.client_details?.availability,
    payload?.coach_details?.availabilities,
    payload?.coach_details?.availability,
  ];

  for (const candidate of candidates) {
    const normalized = convertAvailabilityCandidatesToBackend(candidate);
    if (normalized) {
      return normalized;
    }
  }

  return null;
}
