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
} from "../../api/coach";

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

const SlotCell = ({ status, time }) => {
  const base = "rounded py-1 text-center text-[10px] font-medium transition-colors";
  if (status === "booked")
    return <div className={`${base} bg-orange-900/60 text-orange-300`}>{time}</div>;
  if (status === "available")
    return <div className={`${base} bg-blue-900/60 text-blue-300`}>{time}</div>;
  return <div className={`${base} bg-[#0A1020] text-gray-700`}>—</div>;
};

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
  const [availabilitySlots, setAvailabilitySlots] = useState([]);

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

  useEffect(() => {
    if (!clientId) return;
    Promise.all([
      fetchClientWeightHistory(clientId, { limit: PAGE_SIZE, skip: 0 }),
      fetchClientMoodHistory(clientId, { limit: PAGE_SIZE, skip: 0 }),
      fetchClientStepHistory(clientId, { limit: PAGE_SIZE, skip: 0 }),
      fetchClientWorkoutHistoryByCoach(clientId, { limit: PAGE_SIZE, skip: 0 }),
      fetchClientProgressPicturesByCoach(clientId, { limit: PAGE_SIZE, skip: 0 }),
      fetchClientMealHistoryByCoach(clientId, { limit: PAGE_SIZE, skip: 0 }),
      fetchClientAvailabilityByCoach(clientId),
    ]).then(([ws, ms, ss, whs, ps, mls, avail]) => {
      setWeights(ws);  setWeightsMore(ws.length === PAGE_SIZE);  setWeightsSkip(PAGE_SIZE);
      setMoods(ms);    setMoodsMore(ms.length === PAGE_SIZE);    setMoodsSkip(PAGE_SIZE);
      setSteps(ss);    setStepsMore(ss.length === PAGE_SIZE);    setStepsSkip(PAGE_SIZE);
      setWorkouts(whs); setWorkoutsMore(whs.length === PAGE_SIZE); setWorkoutsSkip(PAGE_SIZE);
      setPictures(ps); setPicturesMore(ps.length === PAGE_SIZE); setPicturesSkip(PAGE_SIZE);
      setMeals(mls);   setMealsMore(mls.length === PAGE_SIZE);   setMealsSkip(PAGE_SIZE);
      setAvailabilitySlots(avail);
    });
  }, [clientId]);

  const loadWorkoutPlan = useCallback(async () => {
    if (!clientId) return;
    const data = await fetchClientWorkoutPlanByCoach(clientId, activeDay);
    setWorkoutPlan({ strata_name: data.strata_name });
    setWorkoutActivities(data.activities ?? []);
  }, [clientId, activeDay]);

  useEffect(() => { loadWorkoutPlan(); }, [loadWorkoutPlan]);

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

      {/* ── Meals ────────────────────────────────────────────────────────── */}
      <TelemetryBlock
        title="Meals"
        items={meals}
        hasMore={mealsMore}
        onLoadMore={loadMoreMeals}
      >
        {groupByDate(meals, (m) => m.created_at || m.logged_at || m.last_updated).map(({ date, entries }) => (
          <div key={date} className="mb-3 last:mb-0">
            <p className="text-[10px] text-orange-400/70 uppercase tracking-widest mb-1.5">{date}</p>
            <div className="space-y-1">
              {entries.map((m, i) => (
                <div key={m.id ?? i} className="rounded-lg bg-[#0A1020] px-3 py-2 text-xs text-gray-300">
                  {m.client_prescribed_meal_id != null
                    ? `Prescribed #${m.client_prescribed_meal_id}`
                    : m.on_demand_meal_id != null
                      ? `On-demand #${m.on_demand_meal_id}`
                      : `Meal #${m.id || i + 1}`}
                </div>
              ))}
            </div>
          </div>
        ))}
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

      {/* ── Client Availability ───────────────────────────────────────────── */}
      <div className="rounded-2xl border border-white/6 bg-[#0B1120] p-4">
        <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-3">Client Availability</p>
        <div className="grid grid-cols-8 gap-1 mb-2">
          <div />
          {WEEKDAYS.map((d) => (
            <div key={d} className="text-[10px] text-gray-500 text-center font-medium">{d}</div>
          ))}
        </div>
        {availabilitySlots.length === 0 ? (
          <p className="text-gray-600 text-sm text-center py-4">No availability recorded</p>
        ) : (
          availabilitySlots.map(({ time, slots }) => (
            <div key={time} className="grid grid-cols-8 gap-1 mb-1">
              <div className="text-[10px] text-gray-500 flex items-center">{time}</div>
              {slots.map((status, i) => (
                <SlotCell key={i} status={status} time={time} />
              ))}
            </div>
          ))
        )}
        <div className="flex gap-4 mt-3">
          {[
            { color: "bg-blue-400", label: "Available" },
            { color: "bg-orange-400", label: "Booked" },
            { color: "bg-gray-600", label: "Unavailable" },
          ].map(({ color, label }) => (
            <span key={label} className="flex items-center gap-1.5 text-[10px] text-gray-400">
              <span className={`w-2 h-2 rounded-full ${color}`} />
              {label}
            </span>
          ))}
        </div>
      </div>

    </div>
  );
}
