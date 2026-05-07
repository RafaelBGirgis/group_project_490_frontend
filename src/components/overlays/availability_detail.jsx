/**
 * Interactive schedule editor overlay.
 *
 * Click any cell to cycle: unavailable → available → unavailable
 * Booked slots are locked (can't edit sessions already scheduled).
 * "Add Row" inserts a new time row at the bottom.
 * "Remove Row" deletes the last custom row.
 * "Save" pushes changes to the API.
 *
 * Props:
 *   slots     – [{ time, slots: [status|null, ...] }, ...]
 *   weekdays  – ["Mon","Tue",...]
 *   onSave    – (updatedSlots) => Promise<void>
 *   role      – "client" | "coach" (for accent colors)
 */

import { useState, useCallback, useEffect } from "react";

const FULL_WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const DEFAULT_TIME_OPTIONS = [
  "5AM","6AM","7AM","8AM","9AM","10AM","11AM",
  "12PM","1PM","2PM","3PM","4PM","5PM","6PM","7PM","8PM","9PM",
];

const normalizeStatus = (value) => {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized === "booked") return "booked";
  if (normalized === "available") return "available";
  return null;
};

function SlotCellEditable({ status, time, locked, onClick, isCoach }) {
  const base = "rounded-lg py-2.5 text-center text-xs font-medium transition-all";

  if (locked) {
    // Booked — can't edit
    return (
      <div
        className={`${base} ${
          isCoach ? "bg-blue-900/60 text-blue-300" : "bg-orange-900/60 text-orange-300"
        } cursor-not-allowed opacity-70`}
        title="Booked — cannot change"
      >
        {time}
      </div>
    );
  }

  if (status === "available") {
    return (
      <div
        onClick={onClick}
        className={`${base} cursor-pointer ${
          isCoach
            ? "bg-orange-900/60 text-orange-300 hover:bg-orange-800/70 ring-1 ring-orange-500/20"
            : "bg-blue-900/60 text-blue-300 hover:bg-blue-800/70 ring-1 ring-blue-500/20"
        }`}
      >
        {time}
      </div>
    );
  }

  // Unavailable / null
  return (
    <div
      onClick={onClick}
      className={`${base} bg-[#0A1020] text-gray-600 hover:bg-[#111B35] hover:text-gray-400 cursor-pointer border border-transparent hover:border-white/10`}
    >
      —
    </div>
  );
}

export default function AvailabilityDetail({
  slots: initialSlots,
  weekdays = FULL_WEEKDAYS,
  onSave,
  role = "client",
}) {
  const isCoach = role === "coach";
  const normalizeRows = useCallback((rows) => {
    const incoming = new Map(
      (rows ?? []).map((row) => [
        row.time,
        Array.from({ length: 7 }, (_, i) =>
          normalizeStatus(Array.isArray(row.slots) ? row.slots[i] : null)
        ),
      ])
    );

    return DEFAULT_TIME_OPTIONS.map((time) => ({
      time,
      slots: incoming.get(time) || Array(7).fill(null),
    }));
  }, []);
  const [slots, setSlots] = useState(() =>
    normalizeRows(initialSlots)
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setSlots(normalizeRows(initialSlots));
    setSaved(false);
    setHasChanges(false);
  }, [initialSlots, normalizeRows]);

  /*  toggle a cell  */
  const toggleCell = useCallback((timeIdx, dayIdx) => {
    setSlots((prev) => {
      const next = prev.map((row, ti) => {
        if (ti !== timeIdx) return row;
        const newSlots = [...row.slots];
        const current = newSlots[dayIdx];
        // Can't toggle booked slots
        if (current === "booked") return row;
        // Toggle: null/unavailable → available → null
        newSlots[dayIdx] = current === "available" ? null : "available";
        return { ...row, slots: newSlots };
      });
      return next;
    });
    setHasChanges(true);
    setSaved(false);
  }, []);

  /*  clear all availability  */
  const clearAll = () => {
    setSlots((prev) =>
      prev.map((row) => ({
        ...row,
        slots: row.slots.map((s) => (s === "booked" ? s : null)),
      }))
    );
    setHasChanges(true);
    setSaved(false);
  };

  /*  set full day available  */
  const setDayAvailable = (dayIdx) => {
    setSlots((prev) =>
      prev.map((row) => {
        const newSlots = [...row.slots];
        if (newSlots[dayIdx] !== "booked") {
          newSlots[dayIdx] = "available";
        }
        return { ...row, slots: newSlots };
      })
    );
    setHasChanges(true);
    setSaved(false);
  };

  /*  clear a full day  */
  const clearDay = (dayIdx) => {
    setSlots((prev) =>
      prev.map((row) => {
        const newSlots = [...row.slots];
        if (newSlots[dayIdx] !== "booked") {
          newSlots[dayIdx] = null;
        }
        return { ...row, slots: newSlots };
      })
    );
    setHasChanges(true);
    setSaved(false);
  };

  /*  save  */
  const handleSave = async () => {
    if (!onSave) return;
    setSaving(true);
    try {
      await onSave(slots);
      setSaved(true);
      setHasChanges(false);
    } catch { /* stay on overlay */ }
    finally { setSaving(false); }
  };

  /*  summary counts  */
  const totalAvailable = slots.reduce(
    (sum, row) => sum + row.slots.filter((s) => s === "available").length, 0
  );
  const totalBooked = slots.reduce(
    (sum, row) => sum + row.slots.filter((s) => s === "booked").length, 0
  );
  const totalUnavailable = slots.length * 7 - totalAvailable - totalBooked;
  const activeDays = weekdays.reduce(
    (sum, _, dayIdx) => sum + (slots.some((row) => row.slots[dayIdx] === "available") ? 1 : 0),
    0
  );

  const accentColor = isCoach ? "#F97316" : "#3B82F6";

  return (
    <>
      {/*  Summary Stats  */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-[#0A1020] rounded-xl p-3 text-center">
          <p style={{ color: accentColor }} className="font-bold text-xl">{totalAvailable}</p>
          <p className="text-gray-500 text-[10px] uppercase tracking-widest mt-0.5">Open Slots</p>
        </div>
        <div className="bg-[#0A1020] rounded-xl p-3 text-center">
          <p className={`font-bold text-xl ${isCoach ? "text-blue-400" : "text-orange-400"}`}>{totalBooked}</p>
          <p className="text-gray-500 text-[10px] uppercase tracking-widest mt-0.5">Booked</p>
        </div>
        <div className="bg-[#0A1020] rounded-xl p-3 text-center">
          <p className="text-white font-bold text-xl">{activeDays}</p>
          <p className="text-gray-500 text-[10px] uppercase tracking-widest mt-0.5">Active Days</p>
        </div>
        <div className="bg-[#0A1020] rounded-xl p-3 text-center">
          <p className="text-gray-400 font-bold text-xl">{totalUnavailable}</p>
          <p className="text-gray-500 text-[10px] uppercase tracking-widest mt-0.5">Unavailable</p>
        </div>
      </div>

      {/*  Instructions  */}
      <div className="rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3">
        <p className="text-gray-400 text-xs leading-relaxed">
          This editor saves one-hour availability windows by weekday for the backend routes.
          Click any cell to toggle between <span style={{ color: accentColor }} className="font-medium">available</span> and unavailable.
          Booked sessions are locked, and each saved slot is submitted as a `:00` hourly block.
        </p>
      </div>

      {/*  Schedule Grid  */}
      <div className="rounded-xl border border-white/5 bg-[rgba(255,255,255,0.02)] p-4">
        {/* Header row with clickable day names */}
        <div className="grid grid-cols-[60px_repeat(7,1fr)] gap-2 mb-3">
          <div />
          {weekdays.map((d, dayIdx) => {
            const dayHasSlots = slots.some((row) => row.slots[dayIdx] === "available");
            return (
              <div key={d} className="text-center">
                <button
                  onClick={() => dayHasSlots ? clearDay(dayIdx) : setDayAvailable(dayIdx)}
                  className="text-xs text-gray-400 font-semibold hover:text-white transition-colors"
                  title={dayHasSlots ? `Clear all ${d}` : `Set all ${d} available`}
                >
                  {d}
                </button>
              </div>
            );
          })}
        </div>

        {/* Time rows */}
        {slots.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-8">
            No time slots yet. Add a row to get started.
          </p>
        ) : (
          slots.map(({ time, slots: daySlots }, timeIdx) => {
            return (
              <div key={time} className="grid grid-cols-[60px_repeat(7,1fr)] gap-2 mb-2">
                <div className="text-xs text-gray-400 flex items-center font-medium">
                  {time}
                </div>
                {daySlots.map((status, dayIdx) => (
                  <SlotCellEditable
                    key={dayIdx}
                    status={status}
                    time={time}
                    locked={status === "booked"}
                    isCoach={isCoach}
                    onClick={() => toggleCell(timeIdx, dayIdx)}
                  />
                ))}
              </div>
            );
          })
        )}
      </div>

      {/*  Legend  */}
      <div className="flex gap-6 justify-center">
        {[
          { color: isCoach ? "bg-orange-400" : "bg-blue-400", label: "Available" },
          { color: isCoach ? "bg-blue-400" : "bg-orange-400", label: "Booked" },
          { color: "bg-gray-600", label: "Unavailable" },
        ].map(({ color, label }) => (
          <span key={label} className="flex items-center gap-2 text-xs text-gray-400">
            <span className={`w-3 h-3 rounded-full ${color}`} />
            {label}
          </span>
        ))}
      </div>

      {/*  Action Buttons  */}
      <div className="flex items-center gap-3 pt-2 border-t border-white/5">
        <button
          onClick={clearAll}
          className="text-xs text-gray-500 hover:text-red-400 transition-colors"
        >
          Clear all availability
        </button>
        <div className="flex-1" />
        {saved && (
          <span className="text-green-400 text-xs font-medium">✓ Saved</span>
        )}
        {onSave && (
          <button
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className={`px-6 py-2.5 rounded-xl text-sm font-medium text-white transition-colors disabled:cursor-not-allowed ${
              isCoach
                ? "bg-orange-600 hover:bg-orange-700 disabled:bg-orange-900/40"
                : "bg-blue-600 hover:bg-blue-700 disabled:bg-blue-900/40"
            }`}
          >
            {saving ? "Saving..." : "Save Schedule"}
          </button>
        )}
      </div>
    </>
  );
}
