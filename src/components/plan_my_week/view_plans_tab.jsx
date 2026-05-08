import { useEffect, useMemo, useState } from "react";
import {
  deleteScheduledPlanAsClient,
  deleteScheduledPlanAsCoach,
  getClientScheduledPlansAsCoach,
  listMyScheduledPlans,
  searchWorkoutPlans,
} from "../../api/plan_my_week";
import { usePlanMyWeek } from "../../contexts/plan_my_week_context";

const WEEKDAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function parseDt(value) {
  if (!value) return null;
  const dt = new Date(value);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

function weekdayIndex(dt) {
  // JS getDay(): Sunday=0..Saturday=6 → remap to Mon..Sun
  return (dt.getDay() + 6) % 7;
}

function formatTime(dt) {
  const h = dt.getHours();
  const m = dt.getMinutes();
  const suf = h >= 12 ? "PM" : "AM";
  const hh = h % 12 || 12;
  return `${hh}:${String(m).padStart(2, "0")} ${suf}`;
}

function dateLabel(dt) {
  return dt.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function ViewPlansTab() {
  const { state } = usePlanMyWeek();
  const [scheduled, setScheduled] = useState([]);
  const [planLookup, setPlanLookup] = useState({}); // id → plan
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [working, setWorking] = useState(null);

  async function reload() {
    setLoading(true);
    setError("");
    try {
      const fetcher =
        state.role === "coach"
          ? () => getClientScheduledPlansAsCoach(state.selectedClientId)
          : () => listMyScheduledPlans({ limit: 100 });
      const [rows, plans] = await Promise.all([
        fetcher(),
        searchWorkoutPlans({ limit: 200 }),
      ]);
      setScheduled(rows);
      const map = {};
      plans.forEach((p) => {
        map[p.id] = p;
      });
      setPlanLookup(map);
    } catch (e) {
      setError(e?.message || "Failed to load scheduled plans");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.role, state.selectedClientId]);

  const grouped = useMemo(() => {
    const buckets = WEEKDAY_NAMES.map(() => []);
    scheduled.forEach((cwp) => {
      const start = parseDt(cwp.start_time);
      if (!start) return;
      buckets[weekdayIndex(start)].push(cwp);
    });
    buckets.forEach((arr) => arr.sort((a, b) => parseDt(a.start_time) - parseDt(b.start_time)));
    return buckets;
  }, [scheduled]);

  async function handleDelete(cwp) {
    if (!window.confirm("Remove this scheduled block? Availability will be redeemed.")) return;
    setWorking(cwp.id);
    try {
      if (state.role === "coach") {
        await deleteScheduledPlanAsCoach(cwp.id);
      } else {
        await deleteScheduledPlanAsClient(cwp.id);
      }
      await reload();
    } catch (e) {
      setError(e?.message || "Failed to delete.");
    } finally {
      setWorking(null);
    }
  }

  if (loading) {
    return <p className="text-sm text-gray-500 py-8 text-center">Loading scheduled plans…</p>;
  }
  if (error) {
    return (
      <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>
    );
  }

  return (
    <div className="space-y-4">
      {scheduled.length === 0 ? (
        <p className="text-sm text-gray-500 py-8 text-center">
          Nothing scheduled yet. Build a plan or browse the catalog and schedule one.
        </p>
      ) : null}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-7 gap-3">
        {WEEKDAY_NAMES.map((day, idx) => (
          <section
            key={day}
            className="rounded-xl border border-white/10 bg-[#0F1729] p-3 min-h-[140px]"
          >
            <h3 className="text-xs uppercase tracking-widest text-gray-500 mb-2">{day}</h3>
            {grouped[idx].length === 0 ? (
              <p className="text-[11px] text-gray-600">—</p>
            ) : (
              <ul className="space-y-2">
                {grouped[idx].map((cwp) => {
                  const start = parseDt(cwp.start_time);
                  const end = parseDt(cwp.end_time);
                  const plan = planLookup[cwp.workout_plan_id];
                  return (
                    <li
                      key={cwp.id}
                      className="rounded-lg border border-white/5 bg-[#0A1020] p-2"
                    >
                      <p className="text-[10px] text-gray-500">
                        {start ? `${dateLabel(start)} · ${formatTime(start)} → ${end ? formatTime(end) : "?"}` : "—"}
                      </p>
                      <p className="text-sm font-semibold text-white">
                        {plan?.strata_name || `Plan #${cwp.workout_plan_id}`}
                      </p>
                      {plan?.activities?.length ? (
                        <p className="text-[11px] text-gray-400 mt-0.5">
                          {plan.activities.length} activity·ies
                        </p>
                      ) : null}
                      <button
                        disabled={working === cwp.id}
                        onClick={() => handleDelete(cwp)}
                        className="mt-1 text-[11px] text-red-300 hover:underline disabled:opacity-40"
                      >
                        {working === cwp.id ? "removing…" : "remove"}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
