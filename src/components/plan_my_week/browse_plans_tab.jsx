import { useEffect, useState } from "react";
import {
  assignPlanToSelf,
  prescribePlanToClient,
  searchWorkoutPlans,
} from "../../api/plan_my_week";
import { ROLE_THEMES } from "../theme";
import { usePlanMyWeek } from "../../contexts/plan_my_week_context";

const PAGE_SIZE = 12;
const HOURS = Array.from({ length: 24 }, (_, i) => i);

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function fmtHour(h) {
  if (h === 0) return "12 AM";
  if (h === 12) return "12 PM";
  if (h === 24) return "12 AM (next day)";
  return h < 12 ? `${h} AM` : `${h - 12} PM`;
}

function addDays(iso, days) {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
}

export default function BrowsePlansTab() {
  const { state } = usePlanMyWeek();
  const theme = ROLE_THEMES[state.role] ?? ROLE_THEMES.client;
  const [text, setText] = useState("");
  const [skip, setSkip] = useState(0);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [scheduling, setScheduling] = useState(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError("");
    searchWorkoutPlans({ text: text.trim() || undefined, skip, limit: PAGE_SIZE })
      .then((rows) => alive && setItems(rows))
      .catch((e) => alive && setError(e?.message || "Failed to load plans"))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [text, skip]);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-white/10 bg-[#0F1729] p-3">
        <input
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setSkip(0);
          }}
          placeholder="Search plans by name..."
          className="w-full bg-[#0A1020] border border-white/10 rounded-lg px-3 py-2 text-sm"
        />
      </div>

      {error ? (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>
      ) : null}

      {loading ? (
        <p className="text-sm text-gray-500 py-8 text-center">Loading...</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-gray-500 py-8 text-center">No plans yet.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {items.map((plan) => (
            <article
              key={plan.id}
              className="rounded-xl border border-white/10 bg-[#0F1729] p-4 flex flex-col"
            >
              <header className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-white">{plan.strata_name}</h3>
                <span className="text-[10px] text-gray-500">
                  {plan.activities?.length || 0} activities
                </span>
              </header>
              <ul className="flex-1 space-y-1 text-xs text-gray-400 mb-3">
                {(plan.activities || []).slice(0, 4).map((a) => (
                  <li key={a.id}>
                    - {a.workout_name || `Activity #${a.workout_activity_id}`}
                    {" - "}
                    {a.intensity_value != null
                      ? `${a.intensity_value}${a.intensity_measure ? ` ${a.intensity_measure}` : ""}`
                      : "-"}
                    {a.planned_duration
                      ? ` · ${a.planned_duration}s`
                      : a.planned_reps && a.planned_sets
                        ? ` · ${a.planned_reps}x${a.planned_sets}`
                        : ""}
                  </li>
                ))}
                {(plan.activities?.length || 0) > 4 ? (
                  <li>+ {plan.activities.length - 4} more...</li>
                ) : null}
              </ul>
              <button
                onClick={() => setScheduling(plan)}
                className={`self-end px-3 py-1.5 rounded-lg text-xs font-semibold text-white ${theme.btnPrimary}`}
              >
                {"Schedule ->"}
              </button>
            </article>
          ))}
        </div>
      )}

      <footer className="flex items-center justify-between text-xs text-gray-400">
        <span>Page {Math.floor(skip / PAGE_SIZE) + 1}</span>
        <div className="flex gap-2">
          <button
            disabled={skip === 0}
            onClick={() => setSkip(Math.max(0, skip - PAGE_SIZE))}
            className="px-3 py-1 rounded border border-white/10 disabled:opacity-30"
          >
            {"<- Prev"}
          </button>
          <button
            disabled={items.length < PAGE_SIZE}
            onClick={() => setSkip(skip + PAGE_SIZE)}
            className="px-3 py-1 rounded border border-white/10 disabled:opacity-30"
          >
            {"Next ->"}
          </button>
        </div>
      </footer>

      {scheduling ? (
        <ScheduleModal plan={scheduling} onClose={() => setScheduling(null)} role={state.role} />
      ) : null}
    </div>
  );
}

function ScheduleModal({ plan, onClose, role }) {
  const { state } = usePlanMyWeek();
  const theme = ROLE_THEMES[role] ?? ROLE_THEMES.client;
  const [blocks, setBlocks] = useState([]);
  const [date, setDate] = useState(todayIso());
  const [startHour, setStartHour] = useState(8);
  const [endHour, setEndHour] = useState(9);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function addBlock() {
    setError("");
    if (endHour <= startHour) return setError("End hour must be after start hour.");
    setBlocks((prev) => [...prev, { _id: `${Date.now()}-${prev.length}`, date_iso: date, start_hour: startHour, end_hour: endHour }]);
  }

  function toApiBlock(b) {
    const start = `${b.date_iso}T${String(b.start_hour).padStart(2, "0")}:00:00`;
    const end =
      b.end_hour >= 24
        ? `${addDays(b.date_iso, 1)}T00:00:00`
        : `${b.date_iso}T${String(b.end_hour).padStart(2, "0")}:00:00`;
    return { start_dt: start, end_dt: end };
  }

  async function submit() {
    setError("");
    setSuccess("");
    if (!blocks.length) return setError("Add at least one block.");
    setSubmitting(true);
    try {
      const apiBlocks = blocks.map(toApiBlock);
      if (state.role === "coach") {
        if (state.selectedClientId == null) throw new Error("No client selected.");
        await prescribePlanToClient({
          workout_plan_id: plan.id,
          client_id: state.selectedClientId,
          blocks: apiBlocks,
        });
      } else {
        await assignPlanToSelf({ workout_plan_id: plan.id, blocks: apiBlocks });
      }
      setSuccess(`Scheduled ${blocks.length} block(s).`);
      setBlocks([]);
    } catch (e) {
      setError(e?.message || "Schedule failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-[#0F1729] rounded-2xl border border-white/10 max-w-md w-full p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold">Schedule "{plan.strata_name}"</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl leading-none">x</button>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <label className="col-span-3">
            <span className="block text-[10px] uppercase tracking-widest text-gray-500 mb-1">Date</span>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-[#0A1020] border border-white/10 rounded-lg px-2 py-1.5 text-sm"
            />
          </label>
          <label>
            <span className="block text-[10px] uppercase tracking-widest text-gray-500 mb-1">Start</span>
            <select
              value={startHour}
              onChange={(e) => setStartHour(Number(e.target.value))}
              className="w-full bg-[#0A1020] border border-white/10 rounded-lg px-2 py-1.5 text-sm"
            >
              {HOURS.map((h) => (
                <option key={h} value={h}>{fmtHour(h)}</option>
              ))}
            </select>
          </label>
          <label className="col-span-2">
            <span className="block text-[10px] uppercase tracking-widest text-gray-500 mb-1">End</span>
            <select
              value={endHour}
              onChange={(e) => setEndHour(Number(e.target.value))}
              className="w-full bg-[#0A1020] border border-white/10 rounded-lg px-2 py-1.5 text-sm"
            >
              {[...HOURS.slice(1), 24].map((h) => (
                <option key={h} value={h}>{fmtHour(h)}</option>
              ))}
            </select>
          </label>
        </div>

        <button
          onClick={addBlock}
          className={`w-full py-2 rounded-lg border text-sm ${theme.btnOutline}`}
        >
          + Add block
        </button>

        {blocks.length > 0 ? (
          <ul className="space-y-1.5">
            {blocks.map((b) => (
              <li key={b._id} className="flex items-center justify-between text-xs bg-[#0A1020] rounded px-2 py-1.5">
                <span>
                  {b.date_iso} · {fmtHour(b.start_hour)} {"->"} {fmtHour(b.end_hour)}
                </span>
                <button
                  onClick={() => setBlocks((prev) => prev.filter((x) => x._id !== b._id))}
                  className="text-red-300 hover:underline"
                >
                  remove
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        {error ? <p className="text-xs text-red-300">{error}</p> : null}
        {success ? <p className="text-xs text-green-300">{success}</p> : null}

        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-white/10 rounded-lg">Close</button>
          <button
            disabled={submitting}
            onClick={submit}
            className={`px-4 py-2 text-sm rounded-lg font-semibold text-white disabled:opacity-50 ${theme.btnPrimary}`}
          >
            {submitting ? "Scheduling..." : `Schedule ${blocks.length || ""}`.trim()}
          </button>
        </div>
      </div>
    </div>
  );
}
