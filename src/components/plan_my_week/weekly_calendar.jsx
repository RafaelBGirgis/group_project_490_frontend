import { useEffect, useMemo, useState } from "react";
import {
  getClientScheduledPlansAsCoach,
  listMyScheduledPlans,
  searchWorkoutPlans,
} from "../../api/plan_my_week";
import { usePlanMyWeek } from "../../contexts/plan_my_week_context";

const WEEKDAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function mondayOf(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day + 6) % 7;
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function isoDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function fmtMonthDay(date) {
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function fmtTime(dt) {
  const h = dt.getHours();
  const m = dt.getMinutes();
  const suf = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${suf}`;
}

function parseIso(v) {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * ghostBlocks: [{ date_iso: "YYYY-MM-DD", start_time: "HH:MM", end_time: "HH:MM", planName }]
 * planName: used as label for ghost blocks
 */
export default function WeeklyCalendar({ ghostBlocks = [], planName = "" }) {
  const { state } = usePlanMyWeek();
  const isCoach = state.role === "coach";
  const clientId = state.selectedClientId;

  const [weekStart, setWeekStart] = useState(() => mondayOf(new Date()));
  const [scheduled, setScheduled] = useState([]);
  const [planLookup, setPlanLookup] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const weekEnd = useMemo(() => addDays(weekStart, 7), [weekStart]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError("");

    const from_dt = weekStart.toISOString();
    const to_dt = weekEnd.toISOString();

    const fetchPlans = isCoach && clientId != null
      ? () => getClientScheduledPlansAsCoach(clientId, { from_dt, to_dt })
      : () => listMyScheduledPlans({ from_dt, to_dt });

    Promise.all([fetchPlans(), searchWorkoutPlans({ limit: 200 })])
      .then(([rows, plans]) => {
        if (!alive) return;
        setScheduled(rows);
        const map = {};
        plans.forEach((p) => { map[p.id] = p; });
        setPlanLookup(map);
      })
      .catch((e) => alive && setError(e?.message || "Failed to load schedule"))
      .finally(() => alive && setLoading(false));

    return () => { alive = false; };
  }, [weekStart, weekEnd, isCoach, clientId]);

  // Build day columns: 7 days starting from weekStart
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  // Group persisted plans into day buckets by occurrence start date
  const persistedByDay = useMemo(() => {
    const buckets = {};
    days.forEach((d) => { buckets[isoDate(d)] = []; });

    for (const cwp of scheduled) {
      const occs = cwp.occurrences ?? [];
      if (occs.length > 0) {
        for (const occ of occs) {
          const start = parseIso(occ.start_dt);
          const end = parseIso(occ.end_dt);
          if (!start) continue;
          const key = isoDate(start);
          if (buckets[key] !== undefined) {
            buckets[key].push({ cwp, start, end });
          }
        }
      } else {
        // fallback for old API shape (no occurrences field)
        const start = parseIso(cwp.start_time);
        const end = parseIso(cwp.end_time);
        if (!start) continue;
        const key = isoDate(start);
        if (buckets[key] !== undefined) {
          buckets[key].push({ cwp, start, end });
        }
      }
    }
    return buckets;
  }, [scheduled, days]);

  // Group ghost blocks by date_iso
  const ghostByDay = useMemo(() => {
    const buckets = {};
    days.forEach((d) => { buckets[isoDate(d)] = []; });
    for (const b of ghostBlocks) {
      if (buckets[b.date_iso] !== undefined) {
        const [sh, sm] = b.start_time.split(":").map(Number);
        const [eh, em] = b.end_time.split(":").map(Number);
        buckets[b.date_iso].push({
          _id: b._id,
          planName: b.planName || planName,
          startLabel: `${sh % 12 || 12}:${String(sm).padStart(2, "0")} ${sh < 12 ? "AM" : "PM"}`,
          endLabel: `${eh % 12 || 12}:${String(em).padStart(2, "0")} ${eh < 12 ? "AM" : "PM"}`,
        });
      }
    }
    return buckets;
  }, [ghostBlocks, days, planName]);

  const weekLabel = `${fmtMonthDay(weekStart)} – ${fmtMonthDay(addDays(weekStart, 6))}`;

  return (
    <div className="space-y-3">
      {/* Week nav */}
      <div className="flex items-center justify-between text-xs">
        <button
          onClick={() => setWeekStart((w) => addDays(w, -7))}
          className="px-2 py-1 rounded border border-white/10 hover:bg-white/5"
        >
          {"← Prev"}
        </button>
        <span className="text-gray-400 font-medium">{weekLabel}</span>
        <button
          onClick={() => setWeekStart((w) => addDays(w, 7))}
          className="px-2 py-1 rounded border border-white/10 hover:bg-white/5"
        >
          {"Next →"}
        </button>
      </div>

      {error ? (
        <p className="text-xs text-red-400">{error}</p>
      ) : null}

      {/* 7-day grid */}
      <div className="grid grid-cols-7 gap-1.5">
        {days.map((day, idx) => {
          const key = isoDate(day);
          const persisted = persistedByDay[key] || [];
          const ghosts = ghostByDay[key] || [];
          return (
            <section
              key={key}
              className="rounded-xl border border-white/10 bg-[#0F1729] p-2 min-h-[120px]"
            >
              <h3 className="text-[10px] uppercase tracking-widest text-gray-500 mb-1.5">
                {WEEKDAY_NAMES[idx]}
                <br />
                <span className="normal-case tracking-normal text-gray-600">{fmtMonthDay(day)}</span>
              </h3>

              {loading ? (
                <p className="text-[10px] text-gray-600">…</p>
              ) : (
                <ul className="space-y-1">
                  {persisted.map(({ cwp, start, end }, i) => {
                    const plan = planLookup[cwp.workout_plan_id];
                    return (
                      <li key={`p-${cwp.id}-${i}`} className="rounded border border-white/5 bg-[#0A1020] px-1.5 py-1">
                        <p className="text-[9px] text-gray-500">
                          {fmtTime(start)} – {fmtTime(end)}
                          {cwp.repeats_weekly ? " ↻" : ""}
                        </p>
                        <p className="text-[10px] font-medium text-white leading-tight">
                          {plan?.strata_name || `Plan #${cwp.workout_plan_id}`}
                        </p>
                      </li>
                    );
                  })}
                  {ghosts.map((g) => (
                    <li
                      key={g._id}
                      className="rounded border border-orange-400/40 bg-orange-500/15 px-1.5 py-1 opacity-75"
                    >
                      <p className="text-[9px] text-orange-300/70">
                        {g.startLabel} – {g.endLabel}
                      </p>
                      <p className="text-[10px] font-medium text-orange-200 leading-tight">
                        {g.planName || "New plan"}
                      </p>
                    </li>
                  ))}
                  {persisted.length === 0 && ghosts.length === 0 ? (
                    <li className="text-[10px] text-gray-700">—</li>
                  ) : null}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
