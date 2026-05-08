import { useState } from "react";
import { usePlanMyWeek } from "../../contexts/plan_my_week_context";

const HOURS = Array.from({ length: 24 }, (_, i) => i);

function todayIso() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function fmtHour(h) {
  if (h === 0) return "12 AM";
  if (h === 12) return "12 PM";
  if (h < 12) return `${h} AM`;
  if (h === 24) return "12 AM (next day)";
  return `${h - 12} PM`;
}

function weekdayLabel(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return "";
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

export default function ScheduleBlocks() {
  const { state, dispatch } = usePlanMyWeek();
  const [date, setDate] = useState(todayIso());
  const [startHour, setStartHour] = useState(8);
  const [endHour, setEndHour] = useState(9);
  const [error, setError] = useState("");

  function addBlock() {
    setError("");
    if (!date) return setError("Pick a date.");
    if (endHour <= startHour) return setError("End hour must be after start hour.");
    dispatch({
      type: "ADD_BLOCK",
      block: { date_iso: date, start_hour: Number(startHour), end_hour: Number(endHour) },
    });
  }

  return (
    <div className="rounded-xl border border-white/10 bg-[#0F1729] p-4 space-y-3">
      <h2 className="text-sm uppercase tracking-widest text-gray-500">Schedule blocks</h2>

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

      {error ? <p className="text-xs text-red-300">{error}</p> : null}
      <button
        onClick={addBlock}
        className="w-full py-2 rounded-lg border border-orange-500/30 text-orange-300 text-sm hover:bg-orange-500/10"
      >
        + Add block
      </button>

      {state.pendingBlocks.length > 0 ? (
        <ul className="space-y-1.5 pt-2 border-t border-white/5">
          {state.pendingBlocks.map((b) => (
            <li key={b._id} className="flex items-center justify-between text-xs bg-[#0A1020] rounded px-2 py-1.5">
              <span>
                <span className="text-white font-medium">{weekdayLabel(b.date_iso)}</span>{" "}
                <span className="text-gray-400">
                  {fmtHour(b.start_hour)} → {fmtHour(b.end_hour)}
                </span>
              </span>
              <button
                onClick={() => dispatch({ type: "REMOVE_BLOCK", id: b._id })}
                className="text-red-300 hover:underline"
              >
                remove
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
