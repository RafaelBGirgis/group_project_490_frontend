import { useState, useEffect, useCallback } from "react";
import { DayTabs, ListRow, StatusBadge } from "../index";
import ProfileAvatar from "../profile_avatar";
import {
  fetchClientWeightHistory,
  fetchClientMoodHistory,
  fetchClientStepHistory,
  fetchClientWorkoutHistoryByCoach,
  fetchClientProgressPicturesByCoach,
  fetchClientMealHistoryByCoach,
  fetchClientWorkoutPlanByCoach,
  fetchClientAvailabilityByCoach,
  fetchClientBusySlotsByCoach,
  createClientReview,
} from "../../api/coach";
import { getClientScheduledPlansAsCoach, searchWorkoutPlans } from "../../api/plan_my_week";
import { fetchClientWorkoutHistoryEnrichedByCoach } from "../../api/coach";
import AvailabilityCalendar from "../availability/AvailabilityCalendar";
import WorkoutJournal from "../workout_journal";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const TODAY_IDX = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;
const PAGE_SIZE = 10;

function formatDate(val) {
  if (!val) return "—";
  const d = new Date(val);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function groupByDate(items, getDate) {
  const groups = new Map();
  items.forEach((item) => {
    const key = formatDate(getDate(item));
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  });
  return [...groups.entries()].map(([date, entries]) => ({ date, entries }));
}

function TelemetryBlock({ title, items, hasMore, onLoadMore, children }) {
  return (
    <div className="rounded-2xl border border-white/6 bg-[#0B1120] p-4">
      <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-3">{title}</p>
      {items.length === 0 ? (
        <p className="text-gray-600 text-sm text-center py-3">No data recorded yet.</p>
      ) : (
        <>
          {children}
          {hasMore && (
            <button
              onClick={onLoadMore}
              className="mt-3 w-full py-2 rounded-xl border border-white/10 text-gray-400 text-xs hover:bg-white/5 transition-colors"
            >
              Load more
            </button>
          )}
        </>
      )}
    </div>
  );
}

/**
 * Props:
 *   clientId     – number
 *   detail       – object from lookupClient (base_account, fitness_goals, etc.)
 */
export default function ClientProfile({ clientId, detail }) {
  const [activeDay, setActiveDay] = useState(TODAY_IDX);
  const [workoutPlan, setWorkoutPlan] = useState(null);
  const [workoutActivities, setWorkoutActivities] = useState([]);
  const [availabilityRows, setAvailabilityRows] = useState([]);
  const [availabilityBusy, setAvailabilityBusy] = useState([]);
  const [availabilityRange, setAvailabilityRange] = useState({ from: null, to: null });

  const [weights, setWeights]       = useState([]);
  const [weightsSkip, setWeightsSkip] = useState(0);
  const [weightsMore, setWeightsMore] = useState(false);

  const [moods, setMoods]           = useState([]);
  const [moodsSkip, setMoodsSkip]   = useState(0);
  const [moodsMore, setMoodsMore]   = useState(false);

  const [steps, setSteps]           = useState([]);
  const [stepsSkip, setStepsSkip]   = useState(0);
  const [stepsMore, setStepsMore]   = useState(false);

  const [workouts, setWorkouts]     = useState([]);
  const [workoutsSkip, setWorkoutsSkip] = useState(0);
  const [workoutsMore, setWorkoutsMore] = useState(false);

  const [pictures, setPictures]     = useState([]);
  const [picturesSkip, setPicturesSkip] = useState(0);
  const [picturesMore, setPicturesMore] = useState(false);

  const [meals, setMeals]           = useState([]);
  const [mealsSkip, setMealsSkip]   = useState(0);
  const [mealsMore, setMealsMore]   = useState(false);

  // Separate slice of meals scoped to today, used by the "What they ate
  // today" panel at the top. Fetched alongside the page-1 history so
  // there's no extra round-trip on overlay open.
  const [todayMeals, setTodayMeals] = useState([]);

  const [reportDraft, setReportDraft] = useState("");
  const [submittingReport, setSubmittingReport] = useState(false);
  const [reportSubmitted, setReportSubmitted] = useState(false);

  useEffect(() => {
    if (!clientId) return;
    // Today's date as YYYY-MM-DD in local time. Used to filter the
    // meal-history endpoint server-side so the "today" panel only shows
    // what the client logged today, not the most-recent N meals.
    const today = (() => {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    })();

    Promise.all([
      fetchClientWeightHistory(clientId, { limit: PAGE_SIZE, skip: 0 }),
      fetchClientMoodHistory(clientId, { limit: PAGE_SIZE, skip: 0 }),
      fetchClientStepHistory(clientId, { limit: PAGE_SIZE, skip: 0 }),
      fetchClientWorkoutHistoryByCoach(clientId, { limit: PAGE_SIZE, skip: 0 }),
      fetchClientProgressPicturesByCoach(clientId, { limit: PAGE_SIZE, skip: 0 }),
      fetchClientMealHistoryByCoach(clientId, { limit: PAGE_SIZE, skip: 0 }),
      fetchClientMealHistoryByCoach(clientId, { limit: 50, skip: 0, onDate: today }),
    ]).then(([ws, ms, ss, whs, ps, mls, todayMls]) => {
      setWeights(ws);  setWeightsMore(ws.length === PAGE_SIZE);  setWeightsSkip(PAGE_SIZE);
      setMoods(ms);    setMoodsMore(ms.length === PAGE_SIZE);    setMoodsSkip(PAGE_SIZE);
      setSteps(ss);    setStepsMore(ss.length === PAGE_SIZE);    setStepsSkip(PAGE_SIZE);
      setWorkouts(whs); setWorkoutsMore(whs.length === PAGE_SIZE); setWorkoutsSkip(PAGE_SIZE);
      setPictures(ps); setPicturesMore(ps.length === PAGE_SIZE); setPicturesSkip(PAGE_SIZE);
      setMeals(mls);   setMealsMore(mls.length === PAGE_SIZE);   setMealsSkip(PAGE_SIZE);
      setTodayMeals(todayMls);
    });
  }, [clientId]);

  useEffect(() => {
    if (!clientId || !availabilityRange.from || !availabilityRange.to) return;
    Promise.all([
      fetchClientAvailabilityByCoach(clientId, availabilityRange.from, availabilityRange.to),
      fetchClientBusySlotsByCoach(clientId, availabilityRange.from, availabilityRange.to),
    ]).then(([rows, busy]) => {
      setAvailabilityRows(Array.isArray(rows) ? rows : []);
      setAvailabilityBusy(Array.isArray(busy) ? busy : []);
    });
  }, [clientId, availabilityRange]);

  const loadWorkoutPlan = useCallback(async () => {
    if (!clientId) return;
    const data = await fetchClientWorkoutPlanByCoach(clientId, activeDay);
    setWorkoutPlan({ strata_name: data.strata_name });
    setWorkoutActivities(data.activities ?? []);
  }, [clientId, activeDay]);

  useEffect(() => { loadWorkoutPlan(); }, [loadWorkoutPlan]);

  const handleSubmitReport = async () => {
    if (!reportDraft.trim()) return;
    setSubmittingReport(true);
    try {
      await createClientReview(clientId, reportDraft.trim());
      setReportDraft("");
      setReportSubmitted(true);
    } catch (e) {
      console.error(e);
      alert("Failed to submit report. Please try again later.");
    } finally {
      setSubmittingReport(false);
    }
  };

  const loadMoreWeights = async () => {
    const more = await fetchClientWeightHistory(clientId, { limit: PAGE_SIZE, skip: weightsSkip });
    setWeights((prev) => [...prev, ...more]);
    setWeightsMore(more.length === PAGE_SIZE);
    setWeightsSkip((s) => s + PAGE_SIZE);
  };
  const loadMoreMoods = async () => {
    const more = await fetchClientMoodHistory(clientId, { limit: PAGE_SIZE, skip: moodsSkip });
    setMoods((prev) => [...prev, ...more]);
    setMoodsMore(more.length === PAGE_SIZE);
    setMoodsSkip((s) => s + PAGE_SIZE);
  };
  const loadMoreSteps = async () => {
    const more = await fetchClientStepHistory(clientId, { limit: PAGE_SIZE, skip: stepsSkip });
    setSteps((prev) => [...prev, ...more]);
    setStepsMore(more.length === PAGE_SIZE);
    setStepsSkip((s) => s + PAGE_SIZE);
  };
  const loadMoreWorkouts = async () => {
    const more = await fetchClientWorkoutHistoryByCoach(clientId, { limit: PAGE_SIZE, skip: workoutsSkip });
    setWorkouts((prev) => [...prev, ...more]);
    setWorkoutsMore(more.length === PAGE_SIZE);
    setWorkoutsSkip((s) => s + PAGE_SIZE);
  };
  const loadMorePictures = async () => {
    const more = await fetchClientProgressPicturesByCoach(clientId, { limit: PAGE_SIZE, skip: picturesSkip });
    setPictures((prev) => [...prev, ...more]);
    setPicturesMore(more.length === PAGE_SIZE);
    setPicturesSkip((s) => s + PAGE_SIZE);
  };
  const loadMoreMeals = async () => {
    const more = await fetchClientMealHistoryByCoach(clientId, { limit: PAGE_SIZE, skip: mealsSkip });
    setMeals((prev) => [...prev, ...more]);
    setMealsMore(more.length === PAGE_SIZE);
    setMealsSkip((s) => s + PAGE_SIZE);
  };

  const journalFetchDayData = useCallback(async (isoDate) => {
    const [y, mo, d] = isoDate.split("-").map(Number);
    const from_dt = new Date(y, mo - 1, d, 0, 0, 0).toISOString();
    const to_dt = new Date(y, mo - 1, d, 23, 59, 59).toISOString();

    const [cwps, allPlans, allLogs] = await Promise.all([
      getClientScheduledPlansAsCoach(clientId, { from_dt, to_dt }).catch(() => []),
      searchWorkoutPlans({ limit: 200 }).catch(() => []),
      fetchClientWorkoutHistoryEnrichedByCoach(clientId, { limit: 200, skip: 0 }).catch(() => []),
    ]);

    const lookup = {};
    allPlans.forEach((p) => { lookup[p.id] = p; });

    const logs = allLogs.filter((l) => {
      const ts = l.last_updated || l.created_at;
      if (!ts) return false;
      try { return new Date(ts).toISOString().slice(0, 10) === isoDate; } catch { return false; }
    });

    const filtered = cwps.filter((cwp) =>
      (cwp.occurrences ?? []).some((occ) => {
        const s = new Date(occ.start_dt);
        return `${s.getFullYear()}-${String(s.getMonth() + 1).padStart(2, "0")}-${String(s.getDate()).padStart(2, "0")}` === isoDate;
      })
    );

    return { cwps: filtered, planLookup: lookup, logs };
  }, [clientId]);

  const name         = detail?.base_account?.name || "—";
  const age          = detail?.base_account?.age || "—";
  const gender       = detail?.base_account?.gender || "—";
  const goal         = detail?.fitness_goals?.[0]?.goal_enum || "—";
  const bio          = detail?.base_account?.bio;
  const pfpUrl       = detail?.base_account?.pfp_url;
  const currentWeight = weights[0]?.weight ?? null;

  return (
    <div className="space-y-5">

      {/* ── Basic Info ─────────────────────────────────────────────────────── */}
      <div className="flex items-start gap-5 rounded-2xl border border-white/6 bg-[#0B1120] p-5">
        <ProfileAvatar src={pfpUrl} name={name} size="xl" />
        <div className="flex-1 min-w-0">
          <h2 className="text-white font-bold text-xl">{name}</h2>
          <div className="flex flex-wrap gap-x-5 gap-y-1 mt-2">
            <span className="text-gray-400 text-sm">Age: <span className="text-white">{age}</span></span>
            <span className="text-gray-400 text-sm">Gender: <span className="text-white">{gender}</span></span>
            <span className="text-gray-400 text-sm">Goal: <span className="text-white">{goal}</span></span>
            {currentWeight != null && (
              <span className="text-gray-400 text-sm">
                Weight: <span className="text-white">{currentWeight} lbs</span>
              </span>
            )}
          </div>
          {bio ? (
            <p className="text-gray-500 text-sm mt-2 leading-relaxed">{bio}</p>
          ) : null}
        </div>
      </div>

      {/* ── What They Ate Today ──────────────────────────────────────────────
          Quick view scoped to today only, separate from the full history block
          below. Calories, macros, and meal name come pre-joined from the
          enriched /roles/coach/client_meals/{id}?on_date= endpoint. */}
      <div className="rounded-2xl border border-white/6 bg-[#0B1120] p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] uppercase tracking-widest text-gray-500">
            What {name === "—" ? "they" : name.split(" ")[0]} ate today
          </p>
          <p className="text-[10px] text-orange-400 font-semibold">
            {todayMeals.reduce((acc, m) => acc + Math.round(m.calories || 0), 0)} kcal · {todayMeals.length} meal{todayMeals.length === 1 ? "" : "s"}
          </p>
        </div>
        {todayMeals.length === 0 ? (
          <p className="text-gray-600 text-sm text-center py-3">
            Nothing logged yet today.
          </p>
        ) : (
          <div className="space-y-1.5">
            {todayMeals.map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between rounded-lg bg-[#0A1020] border border-white/5 px-3 py-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-white text-sm truncate">
                    {m.meal_name || "Unnamed meal"}
                    {m.meal_kind && (
                      <span className="ml-2 text-[10px] uppercase tracking-widest text-gray-500">
                        · {m.meal_kind}
                      </span>
                    )}
                  </p>
                  <p className="text-gray-500 text-[10px]">
                    P {Math.round(m.protein_g || 0)}g · C {Math.round(m.carbs_g || 0)}g · F {Math.round(m.fat_g || 0)}g
                  </p>
                </div>
                <p className="text-orange-400 font-bold text-xs whitespace-nowrap ml-3">
                  {Math.round(m.calories || 0)} kcal
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Body Weight Progression ────────────────────────────────────────── */}
      <TelemetryBlock
        title="Body Weight Progression"
        items={weights}
        hasMore={weightsMore}
        onLoadMore={loadMoreWeights}
      >
        <div className="space-y-0">
          {weights.map((w, i) => (
            <div
              key={w.id ?? i}
              className="flex justify-between items-center py-2 border-b border-white/5 last:border-0"
            >
              <span className="text-gray-400 text-xs">{formatDate(w.created_at || w.last_updated)}</span>
              <span className="text-white text-sm font-semibold">{w.weight} lbs</span>
            </div>
          ))}
        </div>
      </TelemetryBlock>

      {/* ── Completed Workouts ────────────────────────────────────────────── */}
      <TelemetryBlock
        title="Completed Workouts"
        items={workouts}
        hasMore={workoutsMore}
        onLoadMore={loadMoreWorkouts}
      >
        {groupByDate(workouts, (w) => w.created_at || w.logged_at || w.last_updated).map(({ date, entries }) => (
          <div key={date} className="mb-3 last:mb-0">
            <p className="text-[10px] text-orange-400/70 uppercase tracking-widest mb-1.5">{date}</p>
            <div className="space-y-1">
              {entries.map((w, i) => (
                <div key={w.id ?? i} className="rounded-lg bg-[#0A1020] px-3 py-2 text-xs text-gray-300">
                  {w.activity_name || w.name || `Workout #${w.id || i + 1}`}
                </div>
              ))}
            </div>
          </div>
        ))}
      </TelemetryBlock>

      {/* ── Step Count ───────────────────────────────────────────────────── */}
      <TelemetryBlock
        title="Step Count"
        items={steps}
        hasMore={stepsMore}
        onLoadMore={loadMoreSteps}
      >
        <div className="space-y-0">
          {steps.map((s, i) => (
            <div
              key={s.id ?? i}
              className="flex justify-between items-center py-2 border-b border-white/5 last:border-0"
            >
              <span className="text-gray-400 text-xs">{formatDate(s.created_at || s.last_updated)}</span>
              <span className="text-white text-sm font-semibold">{Number(s.step_count).toLocaleString()} steps</span>
            </div>
          ))}
        </div>
      </TelemetryBlock>

      {/* ── Mood Trends ──────────────────────────────────────────────────── */}
      <TelemetryBlock
        title="Mood Trends"
        items={moods}
        hasMore={moodsMore}
        onLoadMore={loadMoreMoods}
      >
        <div className="space-y-2">
          {moods.map((m, i) => (
            <div key={m.id ?? i} className="rounded-lg bg-[#0A1020] px-3 py-2">
              <p className="text-[10px] text-gray-500 mb-1.5">
                {formatDate(m.created_at || m.last_updated)}
              </p>
              <div className="flex flex-wrap gap-4 text-xs">
                {m.happiness_meter != null && (
                  <span className="text-gray-400">Mood: <span className="text-white font-medium">{m.happiness_meter}/10</span></span>
                )}
                {m.alertness != null && (
                  <span className="text-gray-400">Alertness: <span className="text-white font-medium">{m.alertness}/10</span></span>
                )}
                {m.healthiness != null && (
                  <span className="text-gray-400">Healthiness: <span className="text-white font-medium">{m.healthiness}/10</span></span>
                )}
              </div>
            </div>
          ))}
        </div>
      </TelemetryBlock>

      {/* ── Progress Pictures ─────────────────────────────────────────────── */}
      <TelemetryBlock
        title="Progress Pictures"
        items={pictures}
        hasMore={picturesMore}
        onLoadMore={loadMorePictures}
      >
        <div className="grid grid-cols-3 gap-3">
          {pictures.map((p, i) => {
            const imgUrl = p.url || p.pfp_url || p.picture_url || p.image_url;
            return (
              <div key={p.id ?? i}>
                {imgUrl ? (
                  <img
                    src={imgUrl}
                    alt={`Progress ${formatDate(p.created_at || p.last_updated)}`}
                    className="w-full aspect-square object-cover rounded-xl"
                  />
                ) : (
                  <div className="w-full aspect-square rounded-xl bg-[#0A1020] flex items-center justify-center text-gray-600 text-xs">
                    No image
                  </div>
                )}
                <p className="text-[9px] text-gray-500 text-center mt-1">
                  {formatDate(p.created_at || p.last_updated)}
                </p>
              </div>
            );
          })}
        </div>
      </TelemetryBlock>

      {/* ── Meal History ─────────────────────────────────────────────────── */}
      <TelemetryBlock
        title="Meal History"
        items={meals}
        hasMore={mealsMore}
        onLoadMore={loadMoreMeals}
      >
        {groupByDate(meals, (m) => m.logged_at || m.last_updated).map(({ date, entries }) => {
          const dayKcal = entries.reduce((acc, m) => acc + (m.calories || 0), 0);
          return (
            <div key={date} className="mb-3 last:mb-0">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-[10px] text-orange-400/70 uppercase tracking-widest">{date}</p>
                <p className="text-[10px] text-gray-500">{Math.round(dayKcal)} kcal</p>
              </div>
              <div className="space-y-1">
                {entries.map((m, i) => (
                  <div
                    key={m.id ?? i}
                    className="rounded-lg bg-[#0A1020] px-3 py-2 flex items-center justify-between"
                  >
                    <div className="min-w-0 flex-1">
                      <span className="text-xs text-white truncate block">
                        {m.meal_name || `Meal #${m.id || i + 1}`}
                        {m.meal_kind && (
                          <span className="ml-2 text-[9px] uppercase tracking-widest text-gray-500">
                            · {m.meal_kind}
                          </span>
                        )}
                      </span>
                    </div>
                    <span className="text-[10px] text-orange-400 font-semibold whitespace-nowrap ml-2">
                      {Math.round(m.calories || 0)} kcal
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </TelemetryBlock>

      {/* ── Weekly Workout Schedule ───────────────────────────────────────── */}
      <div className="rounded-2xl border border-white/6 bg-[#0B1120] p-4">
        <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-3">
          Weekly Workout Schedule{workoutPlan?.strata_name ? ` · ${workoutPlan.strata_name}` : ""}
        </p>
        <DayTabs days={WEEKDAYS} activeIndex={activeDay} onSelect={setActiveDay} role="coach" />
        <div className="mt-3 space-y-2">
          {workoutActivities.length === 0 ? (
            <p className="text-gray-600 text-sm text-center py-4">No activities for this day</p>
          ) : (
            workoutActivities.map((activity) => (
              <ListRow
                key={activity.id}
                label={activity.name}
                sub={`${activity.suggested_sets} sets · ${activity.suggested_reps} reps · ${activity.intensity_value} ${activity.intensity_measure}`}
                right={
                  activity.logged
                    ? <StatusBadge label="Logged" variant="success" />
                    : <StatusBadge label="Pending" variant="neutral" />
                }
              />
            ))
          )}
        </div>
      </div>

      {/* ── Workout Journal ───────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-white/6 bg-[#0B1120] p-4">
        <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-3">Workout Journal</p>
        <WorkoutJournal fetchDayData={journalFetchDayData} accent="#F59E0B" />
      </div>

      {/* ── Client Availability ───────────────────────────────────────────── */}
      <div className="rounded-2xl border border-white/6 bg-[#0B1120] p-4">
        <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-3">Client Availability</p>
        <AvailabilityCalendar
          availabilities={availabilityRows}
          busySlots={availabilityBusy}
          role="client"
          mode="view"
          onRangeChange={(from, to) => setAvailabilityRange({ from, to })}
        />
      </div>

      {/* ── Report User ───────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-red-500/20 bg-[#150B0B] p-4 mt-5">
        <p className="text-[10px] uppercase tracking-widest text-red-500 mb-2 font-bold flex items-center gap-2">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          Report User
        </p>

        {reportSubmitted ? (
          <div className="py-6 flex flex-col items-center justify-center text-center">
            <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center mb-3">
              <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-white text-sm font-medium mb-1">Report Submitted</p>
            <p className="text-gray-400 text-xs max-w-[200px]">
              Thank you. Our moderation team will review this report shortly.
            </p>
          </div>
        ) : (
          <>
            <p className="text-xs text-gray-400 mb-4">
              If this user violates our community guidelines, please describe the issue below. Reports are taken seriously and will be reviewed by our moderation team.
            </p>
            <div className="space-y-2">
              <textarea
                value={reportDraft}
                onChange={(e) => setReportDraft(e.target.value)}
                rows={3}
                placeholder="Please provide details about the violation..."
                className="w-full rounded-lg border border-red-500/20 bg-[#0A0505] px-3 py-2 text-xs text-white outline-none placeholder:text-gray-600 focus:border-red-500/50"
              />
              <button
                onClick={handleSubmitReport}
                disabled={submittingReport || !reportDraft.trim()}
                className="w-full py-2 rounded-xl bg-red-600/90 text-white text-xs font-semibold hover:bg-red-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submittingReport ? "Submitting..." : "Submit Report"}
              </button>
            </div>
          </>
        )}
      </div>

    </div>
  );
}
