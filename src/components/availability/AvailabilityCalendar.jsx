import { useEffect, useMemo, useRef, useState } from "react";

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const HOUR_HEIGHT = 40; // px per hour
const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;

function startOfWeek(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1 - day);
  d.setDate(d.getDate() + diff);
  return d;
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function fmtRange(weekStart) {
  const weekEnd = addDays(weekStart, 6);
  const fmt = { month: "short", day: "numeric" };
  const s = weekStart.toLocaleDateString(undefined, fmt);
  const e = weekEnd.toLocaleDateString(undefined, { ...fmt, year: "numeric" });
  return `${s} – ${e}`;
}

function isSameDayLocal(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

// Expand a single backend row into concrete (start, end) Date pairs that intersect
// the [rangeStart, rangeEnd) window. Honors repeats_weekly + recurrence_end_dt.
function expandRow(row, rangeStart, rangeEnd) {
  const out = [];
  let s = new Date(row.start_dt);
  let e = new Date(row.end_dt);
  const cutoff = row.recurrence_end_dt ? new Date(row.recurrence_end_dt) : null;

  if (!row.repeats_weekly) {
    if (e > rangeStart && s < rangeEnd) out.push({ start: s, end: e, sourceId: row.id });
    return out;
  }

  // fast-forward to the first occurrence overlapping the range
  while (e <= rangeStart) {
    s = new Date(s.getTime() + WEEK_MS);
    e = new Date(e.getTime() + WEEK_MS);
  }
  while (s < rangeEnd) {
    if (cutoff && s >= cutoff) break;
    if (e > rangeStart && s < rangeEnd) out.push({ start: s, end: e, sourceId: row.id });
    s = new Date(s.getTime() + WEEK_MS);
    e = new Date(e.getTime() + WEEK_MS);
  }
  return out;
}

// Splits an interval into per-day segments so a window crossing midnight renders
// in both day columns.
function splitByDay(interval) {
  const out = [];
  let cursor = new Date(interval.start);
  while (cursor < interval.end) {
    const dayEnd = new Date(cursor);
    dayEnd.setHours(24, 0, 0, 0);
    const segEnd = dayEnd < interval.end ? dayEnd : interval.end;
    out.push({ start: new Date(cursor), end: new Date(segEnd), sourceId: interval.sourceId, ref: interval });
    cursor = segEnd;
  }
  return out;
}

// Merges contiguous (≤1 minute gap) segments on the same day. Carries the
// originating source ids so deletes know which row to remove.
function mergeContiguous(segments) {
  if (segments.length === 0) return [];
  const sorted = [...segments].sort((a, b) => a.start - b.start);
  const merged = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    const prev = merged[merged.length - 1];
    const cur = sorted[i];
    if (cur.start - prev.end <= 60_000 && isSameDayLocal(prev.start, cur.start)) {
      prev.end = cur.end > prev.end ? cur.end : prev.end;
      const ids = new Set([
        ...(prev.sourceIds || (prev.sourceId !== undefined ? [prev.sourceId] : [])),
        ...(cur.sourceIds || (cur.sourceId !== undefined ? [cur.sourceId] : [])),
      ]);
      prev.sourceIds = Array.from(ids);
      delete prev.sourceId;
    } else {
      merged.push({ ...cur });
    }
  }
  return merged.map((seg) => ({
    ...seg,
    sourceIds: seg.sourceIds || (seg.sourceId !== undefined ? [seg.sourceId] : []),
  }));
}

function bucketByDay(segments, weekStart) {
  const buckets = Array.from({ length: 7 }, () => []);
  segments.forEach((seg) => {
    const dayIdx = Math.floor((seg.start - weekStart) / DAY_MS);
    if (dayIdx >= 0 && dayIdx < 7) buckets[dayIdx].push(seg);
  });
  return buckets;
}

function topAndHeight(seg) {
  const dayStart = new Date(seg.start);
  dayStart.setHours(0, 0, 0, 0);
  const offsetMin = (seg.start - dayStart) / 60_000;
  const durationMin = (seg.end - seg.start) / 60_000;
  return {
    top: (offsetMin / 60) * HOUR_HEIGHT,
    height: Math.max(8, (durationMin / 60) * HOUR_HEIGHT),
  };
}

function pad(n) {
  return String(n).padStart(2, "0");
}

function toLocalInputDate(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function toLocalInputTime(date) {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function combineLocal(dateStr, timeStr) {
  if (!dateStr || !timeStr) return null;
  const [y, m, d] = dateStr.split("-").map(Number);
  const [hh, mm] = timeStr.split(":").map(Number);
  return new Date(y, m - 1, d, hh, mm, 0, 0);
}

function fmtTime(date) {
  return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function CreateForm({ accent, defaultDate, onCreate, onCancel, busy }) {
  const [date, setDate] = useState(defaultDate || toLocalInputDate(new Date()));
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("10:00");
  const [repeats, setRepeats] = useState(false);
  const [hasEndRepeat, setHasEndRepeat] = useState(false);
  const [endRepeat, setEndRepeat] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (defaultDate) setDate(defaultDate);
  }, [defaultDate]);

  const submit = async () => {
    const startLocal = combineLocal(date, start);
    const endLocal = combineLocal(date, end);
    if (!startLocal || !endLocal) {
      setError("Pick a date and a time range.");
      return;
    }
    if (endLocal <= startLocal) {
      setError("End time must be after start time.");
      return;
    }
    let recurrenceEnd = null;
    if (repeats && hasEndRepeat) {
      if (!endRepeat) {
        setError("Pick an end date for the recurrence, or uncheck the option to repeat indefinitely.");
        return;
      }
      const r = combineLocal(endRepeat, "23:59");
      if (r && r < endLocal) {
        setError("Recurrence end must be on or after the first end time.");
        return;
      }
      recurrenceEnd = r;
    }
    setError("");
    setSubmitting(true);
    try {
      await onCreate({
        start_dt: startLocal.toISOString(),
        end_dt: endLocal.toISOString(),
        repeats_weekly: repeats,
        recurrence_end_dt: recurrenceEnd ? recurrenceEnd.toISOString() : null,
      });
      onCancel?.();
    } catch (err) {
      setError(err?.message || "Failed to save availability.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-xl border border-white/10 bg-[#0F172A] p-4 space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <label className="block text-xs text-slate-400">
          Date
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="mt-1 w-full rounded-lg border border-white/10 bg-[#0A1020] px-3 py-2 text-sm text-white outline-none"
          />
        </label>
        <label className="block text-xs text-slate-400">
          Start
          <input
            type="time"
            step="60"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="mt-1 w-full rounded-lg border border-white/10 bg-[#0A1020] px-3 py-2 text-sm text-white outline-none"
          />
        </label>
        <label className="block text-xs text-slate-400">
          End
          <input
            type="time"
            step="60"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            className="mt-1 w-full rounded-lg border border-white/10 bg-[#0A1020] px-3 py-2 text-sm text-white outline-none"
          />
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-xs text-slate-300">
          <input type="checkbox" checked={repeats} onChange={(e) => setRepeats(e.target.checked)} />
          Repeat weekly
        </label>
        {repeats && (
          <label className="flex items-center gap-2 text-xs text-slate-300">
            <input
              type="checkbox"
              checked={hasEndRepeat}
              onChange={(e) => setHasEndRepeat(e.target.checked)}
            />
            End on a date
          </label>
        )}
        {repeats && hasEndRepeat && (
          <label className="block text-xs text-slate-400">
            Until
            <input
              type="date"
              value={endRepeat}
              onChange={(e) => setEndRepeat(e.target.value)}
              className="ml-2 rounded-lg border border-white/10 bg-[#0A1020] px-2 py-1 text-sm text-white outline-none"
            />
          </label>
        )}
        {repeats && !hasEndRepeat && (
          <span className="text-[11px] text-slate-500">Repeats indefinitely until deleted.</span>
        )}
      </div>
      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          {error}
        </div>
      )}
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-300 hover:bg-white/5"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={submitting || busy}
          className="rounded-lg px-4 py-2 text-xs font-medium text-white disabled:opacity-50"
          style={{ backgroundColor: accent }}
        >
          {submitting ? "Saving…" : "Add availability"}
        </button>
      </div>
    </div>
  );
}

function BookForm({ available, onBook, onCancel, accent }) {
  const [start, setStart] = useState(toLocalInputTime(available.start));
  const [end, setEnd] = useState(toLocalInputTime(available.end));
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const date = toLocalInputDate(available.start);

  const submit = async () => {
    const s = combineLocal(date, start);
    const ee = combineLocal(date, end);
    if (!s || !ee || ee <= s) {
      setError("End time must be after start time.");
      return;
    }
    if (s < available.start || ee > available.end) {
      setError("Pick a time inside the available window.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      await onBook({ start_dt: s.toISOString(), end_dt: ee.toISOString() });
      onCancel?.();
    } catch (err) {
      setError(err?.message || "Failed to book.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-xl border border-white/10 bg-[#0F172A] p-4 space-y-3">
      <p className="text-xs text-slate-400">
        Available {available.start.toLocaleDateString()} {fmtTime(available.start)} – {fmtTime(available.end)}
      </p>
      <div className="grid grid-cols-2 gap-3">
        <label className="block text-xs text-slate-400">
          Start
          <input
            type="time"
            step="60"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="mt-1 w-full rounded-lg border border-white/10 bg-[#0A1020] px-3 py-2 text-sm text-white outline-none"
          />
        </label>
        <label className="block text-xs text-slate-400">
          End
          <input
            type="time"
            step="60"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            className="mt-1 w-full rounded-lg border border-white/10 bg-[#0A1020] px-3 py-2 text-sm text-white outline-none"
          />
        </label>
      </div>
      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          {error}
        </div>
      )}
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-300 hover:bg-white/5"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={submitting}
          className="rounded-lg px-4 py-2 text-xs font-medium text-white disabled:opacity-50"
          style={{ backgroundColor: accent }}
        >
          {submitting ? "Booking…" : "Book this time"}
        </button>
      </div>
    </div>
  );
}

/**
 * Reusable calendar widget for availability + busy slots.
 *
 * Modes:
 *  - "edit":  user can add/delete their own availability windows.
 *  - "view":  read-only.
 *  - "book":  click an available block to open a booking sub-form.
 *
 * `availabilities` — backend rows ({ id, start_dt, end_dt, repeats_weekly, recurrence_end_dt }).
 * `busySlots`     — backend rows ({ busy_slot_id, start_dt, end_dt, source, source_name }).
 *
 * The widget is self-paginating (week prev/next). It calls `onRangeChange(fromIso, toIso)`
 * whenever the visible week changes so the caller can refetch.
 */
export default function AvailabilityCalendar({
  availabilities = [],
  busySlots = [],
  ghostBlocks = [],
  mode = "view",
  role = "client",
  onCreate,
  onDelete,
  onBook,
  onBusySlotClick,
  onRangeChange,
  initialDate,
  editDisabled = false,
}) {
  const isCoach = role === "coach";
  const accent = isCoach ? "#F97316" : "#3B82F6";
  const bookedColor = isCoach ? "#3B82F6" : "#F97316";

  const [weekStart, setWeekStart] = useState(() => startOfWeek(initialDate || new Date()));
  const [creating, setCreating] = useState(false);
  const [createDefaultDate, setCreateDefaultDate] = useState(null);
  const [bookingTarget, setBookingTarget] = useState(null);

  const weekEnd = useMemo(() => addDays(weekStart, 7), [weekStart]);

  // Keep a ref to the latest onRangeChange so re-renders don't refire the
  // effect when the parent passes an inline arrow function each render.
  const onRangeChangeRef = useRef(onRangeChange);
  useEffect(() => { onRangeChangeRef.current = onRangeChange; }, [onRangeChange]);

  // Only fire when the visible window actually changes.
  const lastFiredRange = useRef({ from: null, to: null });
  useEffect(() => {
    const fromIso = weekStart.toISOString();
    const toIso = weekEnd.toISOString();
    if (lastFiredRange.current.from === fromIso && lastFiredRange.current.to === toIso) {
      return;
    }
    lastFiredRange.current = { from: fromIso, to: toIso };
    onRangeChangeRef.current?.(fromIso, toIso);
  }, [weekStart, weekEnd]);

  const availabilitySegments = useMemo(() => {
    const expanded = availabilities.flatMap((row) => expandRow(row, weekStart, weekEnd));
    const split = expanded.flatMap(splitByDay);
    return mergeContiguous(split);
  }, [availabilities, weekStart, weekEnd]);

  const busySegments = useMemo(() => {
    const expanded = (busySlots || [])
      .map((b) => ({ start: new Date(b.start_dt), end: new Date(b.end_dt), source: b.source, source_id: b.source_id, source_name: b.source_name, busy_slot_id: b.busy_slot_id }))
      .filter((b) => b.end > weekStart && b.start < weekEnd);
    const split = expanded.flatMap((b) => {
      const out = [];
      let cursor = new Date(b.start);
      while (cursor < b.end) {
        const dayEnd = new Date(cursor);
        dayEnd.setHours(24, 0, 0, 0);
        const segEnd = dayEnd < b.end ? dayEnd : b.end;
        out.push({ ...b, start: new Date(cursor), end: new Date(segEnd) });
        cursor = segEnd;
      }
      return out;
    });
    return split;
  }, [busySlots, weekStart, weekEnd]);

  const availByDay = useMemo(() => bucketByDay(availabilitySegments, weekStart), [availabilitySegments, weekStart]);
  const busyByDay = useMemo(() => bucketByDay(busySegments, weekStart), [busySegments, weekStart]);

  const ghostByDay = useMemo(() => {
    const segments = ghostBlocks.flatMap((block) => {
      if (!block.date_iso || !block.start_time || !block.end_time) return [];
      const [y, m, d] = block.date_iso.split("-").map(Number);
      const [sh, sm] = block.start_time.split(":").map(Number);
      const [eh, em] = block.end_time.split(":").map(Number);
      const start = new Date(y, m - 1, d, sh, sm, 0);
      const end = new Date(y, m - 1, d, eh, em, 0);
      if (end <= start || end <= weekStart || start >= weekEnd) return [];
      return [{ start, end, planName: block.planName || "Plan" }];
    });
    return bucketByDay(segments, weekStart);
  }, [ghostBlocks, weekStart, weekEnd]);

  const goPrev = () => setWeekStart(addDays(weekStart, -7));
  const goNext = () => setWeekStart(addDays(weekStart, 7));
  const goToday = () => setWeekStart(startOfWeek(new Date()));

  const handleCreate = async (payload) => {
    if (!onCreate) return;
    await onCreate(payload);
  };

  const handleDelete = async (segment) => {
    if (!onDelete) return;
    if (!segment.sourceIds?.length) return;
    if (!window.confirm("Delete this availability window? Any rows that contributed to this block will be removed.")) {
      return;
    }
    for (const id of segment.sourceIds) {
      // eslint-disable-next-line no-await-in-loop
      await onDelete(id);
    }
  };

  const startCreateForDay = (dayIdx) => {
    const date = addDays(weekStart, dayIdx);
    setCreateDefaultDate(toLocalInputDate(date));
    setCreating(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button type="button" onClick={goPrev} className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-slate-200 hover:bg-white/5">
            ← Prev
          </button>
          <button type="button" onClick={goToday} className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-slate-200 hover:bg-white/5">
            This week
          </button>
          <button type="button" onClick={goNext} className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-slate-200 hover:bg-white/5">
            Next →
          </button>
        </div>
        <div className="text-sm font-medium text-slate-300">{fmtRange(weekStart)}</div>
        {mode === "edit" ? (
          <button
            type="button"
            onClick={() => { if (!editDisabled) { setCreateDefaultDate(null); setCreating(true); } }}
            disabled={editDisabled}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium text-white ${editDisabled ? "opacity-50 cursor-not-allowed" : ""}`}
            style={{ backgroundColor: accent }}
          >
            + Add availability
          </button>
        ) : <div className="w-[140px]" />}
      </div>

      {creating && mode === "edit" && (
        <CreateForm
          accent={accent}
          defaultDate={createDefaultDate}
          onCreate={handleCreate}
          onCancel={() => setCreating(false)}
        />
      )}

      {bookingTarget && mode === "book" && (
        <BookForm
          available={bookingTarget}
          accent={accent}
          onBook={onBook}
          onCancel={() => setBookingTarget(null)}
        />
      )}

      <div className="rounded-xl border border-white/10 bg-[rgba(255,255,255,0.02)] overflow-hidden">
        <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-white/10 bg-[#0A1020]">
          <div />
          {DAY_LABELS.map((label, i) => {
            const day = addDays(weekStart, i);
            const isToday = isSameDayLocal(day, new Date());
            return (
              <button
                key={label}
                type="button"
                onClick={mode === "edit" && !editDisabled ? () => startCreateForDay(i) : undefined}
                className={`px-2 py-2 text-center text-xs font-semibold ${isToday ? "text-white" : "text-slate-400"} ${mode === "edit" ? "hover:bg-white/5" : ""}`}
                title={mode === "edit" ? "Add availability on this day" : undefined}
              >
                {label}
                <div className="text-[10px] font-normal text-slate-500">{day.getDate()}</div>
              </button>
            );
          })}
        </div>
        <div className="relative grid grid-cols-[60px_repeat(7,1fr)]" style={{ height: HOUR_HEIGHT * 24 }}>
          {/* hour labels + horizontal lines */}
          <div className="relative">
            {Array.from({ length: 24 }).map((_, h) => (
              <div
                key={h}
                className="absolute right-2 -translate-y-1/2 text-[10px] text-slate-500"
                style={{ top: h * HOUR_HEIGHT }}
              >
                {h === 0 ? "12 AM" : h < 12 ? `${h} AM` : h === 12 ? "12 PM" : `${h - 12} PM`}
              </div>
            ))}
          </div>
          {Array.from({ length: 7 }).map((_, dayIdx) => (
            <div key={dayIdx} className="relative border-l border-white/5">
              {Array.from({ length: 24 }).map((_, h) => (
                <div
                  key={h}
                  className="absolute left-0 right-0 border-b border-white/5"
                  style={{ top: h * HOUR_HEIGHT, height: HOUR_HEIGHT }}
                />
              ))}
              {availByDay[dayIdx]?.map((seg, idx) => {
                const { top, height } = topAndHeight(seg);
                const clickable = (mode === "edit" && !editDisabled) || mode === "book";
                return (
                  <div
                    key={`a-${idx}`}
                    role={clickable ? "button" : undefined}
                    onClick={
                      mode === "edit" && !editDisabled
                        ? () => handleDelete(seg)
                        : mode === "book"
                          ? () => setBookingTarget(seg)
                          : undefined
                    }
                    className={`absolute left-0.5 right-0.5 rounded-md text-[10px] text-white px-1 py-0.5 overflow-hidden ${clickable ? "cursor-pointer hover:brightness-110" : ""}`}
                    style={{ top, height, backgroundColor: accent, opacity: 0.85 }}
                    title={
                      mode === "edit"
                        ? "Click to delete"
                        : mode === "book"
                          ? "Click to book this window"
                          : `Available ${fmtTime(seg.start)} – ${fmtTime(seg.end)}`
                    }
                  >
                    <div className="font-semibold">{fmtTime(seg.start)} – {fmtTime(seg.end)}</div>
                  </div>
                );
              })}
              {busyByDay[dayIdx]?.map((seg, idx) => {
                const { top, height } = topAndHeight(seg);
                const busyClickable = !!onBusySlotClick;
                return (
                  <div
                    key={`b-${idx}`}
                    role={busyClickable ? "button" : undefined}
                    onClick={busyClickable ? () => onBusySlotClick(seg) : undefined}
                    className={`absolute left-1 right-1 rounded-md text-[10px] text-white px-1 py-0.5 overflow-hidden ${busyClickable ? "cursor-pointer hover:brightness-110" : ""}`}
                    style={{
                      top,
                      height,
                      backgroundColor: bookedColor,
                      borderLeft: `3px solid ${bookedColor}`,
                      opacity: 0.95,
                    }}
                    title={`${seg.source_name || "Booked"} ${fmtTime(seg.start)} – ${fmtTime(seg.end)}`}
                  >
                    <div className="font-semibold">{seg.source_name || "Booked"}</div>
                    <div>{fmtTime(seg.start)} – {fmtTime(seg.end)}</div>
                  </div>
                );
              })}
              {ghostByDay[dayIdx]?.map((seg, idx) => {
                const { top, height } = topAndHeight(seg);
                return (
                  <div
                    key={`g-${idx}`}
                    className="absolute left-1 right-1 rounded-md text-[10px] text-white px-1 py-0.5 overflow-hidden pointer-events-none"
                    style={{
                      top,
                      height,
                      backgroundColor: "#F97316",
                      border: "1.5px dashed rgba(249,115,22,0.9)",
                      opacity: 0.5,
                    }}
                  >
                    <div className="font-semibold truncate">{seg.planName}</div>
                    <div>{fmtTime(seg.start)} – {fmtTime(seg.end)}</div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-center gap-6 text-xs text-slate-400">
        <span className="flex items-center gap-2">
          <span className="inline-block w-3 h-3 rounded" style={{ backgroundColor: accent }} />
          Available
        </span>
        <span className="flex items-center gap-2">
          <span className="inline-block w-3 h-3 rounded" style={{ backgroundColor: bookedColor }} />
          Booked
        </span>
      </div>
    </div>
  );
}
