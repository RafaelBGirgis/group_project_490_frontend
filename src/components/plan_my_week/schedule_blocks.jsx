import { useState } from "react";
import { ROLE_THEMES } from "../theme";
import { usePlanMyWeek } from "../../contexts/plan_my_week_context";

function todayIso() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function weekdayLabel(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return "";
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

/** Convert { h12, min, ampm } → 24-hour total minutes from midnight */
function to24h(h12, min, ampm) {
  let h = Number(h12) % 12;
  if (ampm === "PM") h += 12;
  return h * 60 + Number(min);
}

/** Format total-minutes-from-midnight as "8:05 AM" */
function fmtMinutes(totalMin) {
  const h24 = Math.floor(totalMin / 60) % 24;
  const min = totalMin % 60;
  const ampm = h24 < 12 ? "AM" : "PM";
  const h12 = h24 % 12 || 12;
  return `${h12}:${String(min).padStart(2, "0")} ${ampm}`;
}

const AMPM = ["AM", "PM"];

export default function ScheduleBlocks() {
  const { state, dispatch } = usePlanMyWeek();
  const theme = ROLE_THEMES[state.role] ?? ROLE_THEMES.client;

  const [date, setDate] = useState(todayIso());
  const [startH, setStartH] = useState("8");
  const [startMin, setStartMin] = useState("00");
  const [startAmPm, setStartAmPm] = useState("AM");
  const [endH, setEndH] = useState("9");
  const [endMin, setEndMin] = useState("00");
  const [endAmPm, setEndAmPm] = useState("AM");
  const [error, setError] = useState("");

  function clampHour(raw) {
    const n = parseInt(raw, 10);
    if (isNaN(n)) return "12";
    return String(Math.min(12, Math.max(1, n)));
  }

  function clampMin(raw) {
    const n = parseInt(raw, 10);
    if (isNaN(n)) return "00";
    return String(Math.min(59, Math.max(0, n))).padStart(2, "0");
  }

  function addBlock() {
    setError("");
    if (!date) return setError("Pick a date.");

    const startTotal = to24h(startH, startMin, startAmPm);
    const endTotal = to24h(endH, endMin, endAmPm);

    if (endTotal <= startTotal) return setError("End time must be after start time.");

    const pad2 = (n) => String(n).padStart(2, "0");
    const startTime = `${pad2(Math.floor(startTotal / 60))}:${pad2(startTotal % 60)}`;
    const endTime = `${pad2(Math.floor(endTotal / 60))}:${pad2(endTotal % 60)}`;

    dispatch({
      type: "ADD_BLOCK",
      block: { date_iso: date, start_time: startTime, end_time: endTime },
    });
  }

  return (
    <div className="rounded-xl border border-white/10 bg-[#0F1729] p-4 space-y-3">
      <h2 className="text-sm uppercase tracking-widest text-gray-500">Schedule blocks</h2>

      {/* Date */}
      <label>
        <span className="block text-[10px] uppercase tracking-widest text-gray-500 mb-1">Date</span>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full bg-[#0A1020] border border-white/10 rounded-lg px-2 py-1.5 text-sm"
        />
      </label>

      {/* Start time */}
      <div>
        <span className="block text-[10px] uppercase tracking-widest text-gray-500 mb-1">Start time</span>
        <div className="flex gap-1 items-center">
          <input
            type="number"
            min={1}
            max={12}
            value={startH}
            onChange={(e) => setStartH(e.target.value)}
            onBlur={(e) => setStartH(clampHour(e.target.value))}
            className="w-14 bg-[#0A1020] border border-white/10 rounded-lg px-2 py-1.5 text-sm text-center"
          />
          <span className="text-gray-400">:</span>
          <input
            type="number"
            min={0}
            max={59}
            value={startMin}
            onChange={(e) => setStartMin(e.target.value)}
            onBlur={(e) => setStartMin(clampMin(e.target.value))}
            className="w-14 bg-[#0A1020] border border-white/10 rounded-lg px-2 py-1.5 text-sm text-center"
          />
          <select
            value={startAmPm}
            onChange={(e) => setStartAmPm(e.target.value)}
            className="bg-[#0A1020] border border-white/10 rounded-lg px-2 py-1.5 text-sm"
          >
            {AMPM.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
      </div>

      {/* End time */}
      <div>
        <span className="block text-[10px] uppercase tracking-widest text-gray-500 mb-1">End time</span>
        <div className="flex gap-1 items-center">
          <input
            type="number"
            min={1}
            max={12}
            value={endH}
            onChange={(e) => setEndH(e.target.value)}
            onBlur={(e) => setEndH(clampHour(e.target.value))}
            className="w-14 bg-[#0A1020] border border-white/10 rounded-lg px-2 py-1.5 text-sm text-center"
          />
          <span className="text-gray-400">:</span>
          <input
            type="number"
            min={0}
            max={59}
            value={endMin}
            onChange={(e) => setEndMin(e.target.value)}
            onBlur={(e) => setEndMin(clampMin(e.target.value))}
            className="w-14 bg-[#0A1020] border border-white/10 rounded-lg px-2 py-1.5 text-sm text-center"
          />
          <select
            value={endAmPm}
            onChange={(e) => setEndAmPm(e.target.value)}
            className="bg-[#0A1020] border border-white/10 rounded-lg px-2 py-1.5 text-sm"
          >
            {AMPM.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
      </div>

      {error ? <p className="text-xs text-red-300">{error}</p> : null}
      <button
        onClick={addBlock}
        className={`w-full py-2 rounded-lg border text-sm ${theme.btnOutline}`}
      >
        + Add block
      </button>

      {state.pendingBlocks.length > 0 ? (
        <ul className="space-y-1.5 pt-2 border-t border-white/5">
          {state.pendingBlocks.map((b) => {
            const [sh, sm] = b.start_time.split(":").map(Number);
            const [eh, em] = b.end_time.split(":").map(Number);
            return (
              <li
                key={b._id}
                className="flex items-center justify-between text-xs bg-[#0A1020] rounded px-2 py-1.5"
              >
                <span>
                  <span className="text-white font-medium">{weekdayLabel(b.date_iso)}</span>{" "}
                  <span className="text-gray-400">
                    {fmtMinutes(sh * 60 + sm)} → {fmtMinutes(eh * 60 + em)}
                  </span>
                </span>
                <button
                  onClick={() => dispatch({ type: "REMOVE_BLOCK", id: b._id })}
                  className="text-red-300 hover:underline"
                >
                  remove
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
