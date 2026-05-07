import { useEffect, useMemo } from "react";

const COACH_PROFILE_CACHE_VERSION = 1;

const getCoachProfileCacheKey = (coachId) =>
  `coach-profile:${coachId || "current"}:route-cache:v${COACH_PROFILE_CACHE_VERSION}`;

const readCoachProfileCache = (coachId) => {
  try {
    const raw = localStorage.getItem(getCoachProfileCacheKey(coachId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const writeCoachProfileCache = (coachId, payload) => {
  if (!coachId) return;
  try {
    localStorage.setItem(
      getCoachProfileCacheKey(coachId),
      JSON.stringify({ ...payload, cachedAt: new Date().toISOString() })
    );
  } catch {
    // Cache writes are best-effort only.
  }
};

export default function CoachProfile({ coach, rating, nextSession, onMessage }) {
  const coachId = coach?.coach_id || coach?.id;
  const cachedPayload = useMemo(() => readCoachProfileCache(coachId), [coachId]);
  const displayCoach = coach || cachedPayload?.coach;
  const displayRating = rating || cachedPayload?.rating;
  const displayNextSession = nextSession || cachedPayload?.nextSession;

  useEffect(() => {
    if (!coachId || !coach) return;
    writeCoachProfileCache(coachId, { coach, rating, nextSession });
  }, [coachId, coach, rating, nextSession]);

  if (!displayCoach) {
    return (
      <p className="py-8 text-center text-sm text-gray-500">
        No coach assigned yet.
      </p>
    );
  }

  const initials = displayCoach.name
    ?.split(" ")
    .map((namePart) => namePart[0])
    .join("") ?? "?";

  return (
    <>
      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-blue-900/40 text-xl font-bold text-blue-400">
          {displayCoach.pfp_url ? (
            <img
              src={displayCoach.pfp_url}
              alt={displayCoach.name}
              className="h-16 w-16 rounded-full object-cover"
            />
          ) : (
            initials
          )}
        </div>
        <div>
          <p className="text-xl font-bold text-white">{displayCoach.name}</p>
          <p className="text-sm text-gray-400">{displayCoach.specialty}</p>
          {displayRating && (
            <p className="mt-0.5 text-sm text-yellow-400">
              Rating {displayRating.avg} / 5 · {displayRating.review_count} reviews
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <InfoCard label="Specialty" value={displayCoach.specialty} />
        <InfoCard
          label="Next Session"
          value={
            displayNextSession
              ? `${displayNextSession.weekday} · ${displayNextSession.start_time}`
              : "Not scheduled"
          }
        />
        <InfoCard
          label="Rating"
          value={displayRating ? `${displayRating.avg} / 5.0` : "No ratings yet"}
        />
        <InfoCard
          label="Reviews"
          value={displayRating ? `${displayRating.review_count} total` : "-"}
        />
      </div>

      <div className="flex gap-3 pt-2">
        <button
          className="flex-1 rounded-xl bg-blue-600 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-700"
          onClick={onMessage}
        >
          Send Message
        </button>
        <button
          className="flex-1 rounded-xl border border-gray-700 py-3 text-sm text-gray-300 transition-colors hover:bg-gray-800"
          onClick={() => {}}
        >
          Leave a Review
        </button>
      </div>
    </>
  );
}

function InfoCard({ label, value }) {
  return (
    <div className="rounded-xl bg-[#0A1020] p-4">
      <p className="mb-1 text-[10px] uppercase tracking-widest text-gray-500">
        {label}
      </p>
      <p className="text-sm font-medium text-white">{value}</p>
    </div>
  );
}
