import { useCallback, useMemo, useState } from "react";
import {
  assignPlanToSelf,
  checkSchedulableAsClient,
  checkSchedulableForClient,
  listClientAvailabilityAsCoach,
  listClientBusySlotsAsCoach,
  listMyAvailability,
  listMyBusySlots,
  listMyScheduledPlans,
  prescribePlanToClient,
  searchWorkoutPlans,
} from "../../api/plan_my_week";
import { usePlanMyWeek } from "../../contexts/plan_my_week_context";
import { ROLE_THEMES } from "../theme";
import AvailabilityCalendar from "../availability/AvailabilityCalendar";
import WorkoutPlanPopup from "./workout_plan_popup";
import { loadWeekCache, saveWeekCache } from "../../utils/scheduleCache";

const AMPM = ["AM", "PM"];

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function to24hTotal(h12, min, ampm) {
  let h = Number(h12) % 12;
  if (ampm === "PM") h += 12;
  return h * 60 + Number(min);
}

function fmtMinutes(totalMin) {
  const h24 = Math.floor(totalMin / 60) % 24;
  const min = totalMin % 60;
  const ampm = h24 < 12 ? "AM" : "PM";
  const h12 = h24 % 12 || 12;
  return `${h12}:${String(min).padStart(2, "0")} ${ampm}`;
}

function toApiBlock(b) {
  const [sh, sm] = (b.start_time || "00:00").split(":").map(Number);
  const [eh, em] = (b.end_time || "00:00").split(":").map(Number);
  const [y, mo, d] = b.date_iso.split("-").map(Number);
  const startLocal = new Date(y, mo - 1, d, sh, sm, 0);
  const endTotalMin = eh * 60 + em;
  const endLocal = endTotalMin >= 24 * 60
    ? new Date(y, mo - 1, d + 1, Math.floor((endTotalMin - 1440) / 60), (endTotalMin - 1440) % 60, 0)
    : new Date(y, mo - 1, d, eh, em, 0);
  return {
    start_dt: startLocal.toISOString(),
    end_dt: endLocal.toISOString(),
    repeats_weekly: b.repeats_weekly ?? false,
    recurrence_end_dt: b.recurrence_end_dt ?? null,
  };
}

let _idCounter = 1;
const nextId = () => `blk-${Date.now()}-${_idCounter++}`;

/**
 * Shared scheduling dialog used by both Browse Plans and Build Plan tabs.
 *
 * Props:
 *   plan        – { id, strata_name } for "browse" mode (already-persisted plan)
 *   planName    – string label used for ghost blocks on the calendar
 *   mode        – "browse" | "build"
 *   onBuildSave – async (blocks) => void  — called in build mode to persist plan + schedule
 *   onClose     – () => void
 */
export default function ScheduleDialog({ plan, planName, mode = "browse", onBuildSave, onClose }) {
  const { state } = usePlanMyWeek();
  const theme = ROLE_THEMES[state.role] ?? ROLE_THEMES.client;
  const isCoach = state.role === "coach";
  const clientId = state.selectedClientId;

  const [blocks, setBlocks] = useState([]);
  const [date, setDate] = useState(todayIso());
  const [startH, setStartH] = useState("8");
  const [startMin, setStartMin] = useState("00");
  const [startAmPm, setStartAmPm] = useState("AM");
  const [endH, setEndH] = useState("9");
  const [endMin, setEndMin] = useState("00");
  const [endAmPm, setEndAmPm] = useState("AM");
  const [repeatsWeekly, setRepeatsWeekly] = useState(false);
  const [hasRecurEnd, setHasRecurEnd] = useState(false);
  const [recurEndDate, setRecurEndDate] = useState("");
  const [validating, setValidating] = useState(false);
  const [blockError, setBlockError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [availabilities, setAvailabilities] = useState([]);
  const [busySlots, setBusySlots] = useState([]);
  const [cwpLookup, setCwpLookup] = useState({});
  const [planLookup, setPlanLookup] = useState({});
  const [selectedCwpData, setSelectedCwpData] = useState(null);

  const displayName = plan?.strata_name || planName || "New plan";

  // Reactive preview block: updates as form inputs change, shown on calendar before "Add block"
  const previewBlock = useMemo(() => {
    if (!date) return null;
    const startTotal = to24hTotal(startH, startMin, startAmPm);
    const endTotal = to24hTotal(endH, endMin, endAmPm);
    if (endTotal <= startTotal) return null;
    const pad2 = (n) => String(n).padStart(2, "0");
    return {
      _id: "__preview__",
      date_iso: date,
      start_time: `${pad2(Math.floor(startTotal / 60))}:${pad2(startTotal % 60)}`,
      end_time: `${pad2(Math.floor(endTotal / 60))}:${pad2(endTotal % 60)}`,
      planName: displayName,
    };
  }, [date, startH, startMin, startAmPm, endH, endMin, endAmPm, displayName]);

  const allGhostBlocks = useMemo(
    () => (previewBlock ? [...blocks, previewBlock] : [...blocks]),
    [blocks, previewBlock]
  );

  const handleRangeChange = useCallback(async (fromIso, toIso) => {
    // Paint from cache immediately
    const cached = loadWeekCache(fromIso);
    if (cached) {
      setAvailabilities(cached.availabilities || []);
      setBusySlots(cached.busySlots || []);
      const cwpMap = {};
      (cached.cwps || []).forEach((c) => { cwpMap[c.id] = c; });
      setCwpLookup(cwpMap);
      const planMap = {};
      (cached.plans || []).forEach((p) => { planMap[p.id] = p; });
      setPlanLookup(planMap);
    }

    try {
      const [avail, busy, cwps, allPlans] = await Promise.all([
        isCoach && clientId != null
          ? listClientAvailabilityAsCoach(clientId, { from_dt: fromIso, to_dt: toIso })
          : listMyAvailability({ from_dt: fromIso, to_dt: toIso }),
        isCoach && clientId != null
          ? listClientBusySlotsAsCoach(clientId, { from_dt: fromIso, to_dt: toIso })
          : listMyBusySlots({ from_dt: fromIso, to_dt: toIso }),
        !isCoach ? listMyScheduledPlans({ from_dt: fromIso, to_dt: toIso }) : Promise.resolve([]),
        searchWorkoutPlans({ limit: 200 }),
      ]);
      setAvailabilities(avail);
      setBusySlots(busy);

      const cwpMap = {};
      cwps.forEach((c) => { cwpMap[c.id] = c; });
      setCwpLookup(cwpMap);

      const planMap = {};
      allPlans.forEach((p) => { planMap[p.id] = p; });
      setPlanLookup(planMap);

      saveWeekCache(fromIso, { availabilities: avail, busySlots: busy, cwps, plans: allPlans });
    } catch {
      // Silently ignore — calendar still usable
    }
  }, [isCoach, clientId]);

  function isoDateStr(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  }

  const handleBusySlotClick = useCallback((seg) => {
    if (seg.source !== "workout_plan" || seg.source_id == null) return;
    const cwp = cwpLookup[seg.source_id];
    if (!cwp) return;
    const plan = planLookup[cwp.workout_plan_id] ?? null;
    const slotDate = isoDateStr(seg.start);
    const occ = (cwp.occurrences ?? []).find((o) => {
      const s = new Date(o.start_dt);
      return isoDateStr(s) === slotDate;
    }) ?? { start_dt: seg.start.toISOString(), end_dt: seg.end.toISOString() };
    setSelectedCwpData({
      cwp,
      plan,
      occurrenceStart: occ.start_dt,
      occurrenceEnd: occ.end_dt,
    });
  }, [cwpLookup, planLookup]);

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

  async function addBlock() {
    setBlockError("");
    if (!date) return setBlockError("Pick a date.");
    const startTotal = to24hTotal(startH, startMin, startAmPm);
    const endTotal = to24hTotal(endH, endMin, endAmPm);
    if (endTotal <= startTotal) return setBlockError("End time must be after start time.");

    const pad2 = (n) => String(n).padStart(2, "0");
    const startTime = `${pad2(Math.floor(startTotal / 60))}:${pad2(startTotal % 60)}`;
    const endTime = `${pad2(Math.floor(endTotal / 60))}:${pad2(endTotal % 60)}`;

    const apiBlock = toApiBlock({ date_iso: date, start_time: startTime, end_time: endTime });

    setValidating(true);
    try {
      if (isCoach) {
        if (clientId == null) { setBlockError("No client selected."); return; }
        await checkSchedulableForClient({
          client_id: clientId,
          start_dt: apiBlock.start_dt,
          end_dt: apiBlock.end_dt,
        });
      } else {
        await checkSchedulableAsClient({ start_dt: apiBlock.start_dt, end_dt: apiBlock.end_dt });
      }
    } catch (e) {
      setBlockError(e?.message || "This time block is not available.");
      return;
    } finally {
      setValidating(false);
    }

    setBlocks((prev) => [
      ...prev,
      {
        _id: nextId(),
        date_iso: date,
        start_time: startTime,
        end_time: endTime,
        repeats_weekly: repeatsWeekly,
        recurrence_end_dt: repeatsWeekly && hasRecurEnd && recurEndDate
          ? new Date(recurEndDate).toISOString()
          : null,
      },
    ]);
  }

  async function submit() {
    setSubmitError("");
    setSuccess("");
    if (!blocks.length) return setSubmitError("Add at least one block.");
    setSubmitting(true);
    try {
      const apiBlocks = blocks.map(toApiBlock);

      if (mode === "build") {
        await onBuildSave(apiBlocks);
        setSuccess("Plan saved and scheduled.");
        setBlocks([]);
      } else {
        if (isCoach) {
          if (clientId == null) throw new Error("No client selected.");
          await prescribePlanToClient({
            workout_plan_id: plan.id,
            client_id: clientId,
            blocks: apiBlocks,
          });
        } else {
          await assignPlanToSelf({ workout_plan_id: plan.id, blocks: apiBlocks });
        }
        setSuccess(`Scheduled ${blocks.length} block(s).`);
        setBlocks([]);
      }
    } catch (e) {
      setSubmitError(e?.message || "Schedule failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-[#0F1729] rounded-2xl border border-white/10 w-full max-w-6xl max-h-[92vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 shrink-0">
          <h3 className="text-lg font-bold">Schedule "{displayName}"</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl leading-none">×</button>
        </div>

        {/* Body */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* LEFT — block CRUD */}
          <div className="w-72 shrink-0 border-r border-white/10 p-4 flex flex-col gap-3 overflow-y-auto">
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
                  type="number" min={1} max={12} value={startH}
                  onChange={(e) => setStartH(e.target.value)}
                  onBlur={(e) => setStartH(clampHour(e.target.value))}
                  className="w-14 bg-[#0A1020] border border-white/10 rounded-lg px-2 py-1.5 text-sm text-center"
                />
                <span className="text-gray-400">:</span>
                <input
                  type="number" min={0} max={59} value={startMin}
                  onChange={(e) => setStartMin(e.target.value)}
                  onBlur={(e) => setStartMin(clampMin(e.target.value))}
                  className="w-14 bg-[#0A1020] border border-white/10 rounded-lg px-2 py-1.5 text-sm text-center"
                />
                <select value={startAmPm} onChange={(e) => setStartAmPm(e.target.value)}
                  className="bg-[#0A1020] border border-white/10 rounded-lg px-2 py-1.5 text-sm">
                  {AMPM.map((v) => <option key={v}>{v}</option>)}
                </select>
              </div>
            </div>

            {/* End time */}
            <div>
              <span className="block text-[10px] uppercase tracking-widest text-gray-500 mb-1">End time</span>
              <div className="flex gap-1 items-center">
                <input
                  type="number" min={1} max={12} value={endH}
                  onChange={(e) => setEndH(e.target.value)}
                  onBlur={(e) => setEndH(clampHour(e.target.value))}
                  className="w-14 bg-[#0A1020] border border-white/10 rounded-lg px-2 py-1.5 text-sm text-center"
                />
                <span className="text-gray-400">:</span>
                <input
                  type="number" min={0} max={59} value={endMin}
                  onChange={(e) => setEndMin(e.target.value)}
                  onBlur={(e) => setEndMin(clampMin(e.target.value))}
                  className="w-14 bg-[#0A1020] border border-white/10 rounded-lg px-2 py-1.5 text-sm text-center"
                />
                <select value={endAmPm} onChange={(e) => setEndAmPm(e.target.value)}
                  className="bg-[#0A1020] border border-white/10 rounded-lg px-2 py-1.5 text-sm">
                  {AMPM.map((v) => <option key={v}>{v}</option>)}
                </select>
              </div>
            </div>

            {/* Recurrence */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={repeatsWeekly}
                  onChange={(e) => { setRepeatsWeekly(e.target.checked); if (!e.target.checked) setHasRecurEnd(false); }}
                  className="accent-blue-500"
                />
                <span className="text-gray-300">Repeat weekly</span>
              </label>
              {repeatsWeekly && (
                <label className="flex items-center gap-2 text-sm cursor-pointer ml-4">
                  <input
                    type="checkbox"
                    checked={hasRecurEnd}
                    onChange={(e) => setHasRecurEnd(e.target.checked)}
                    className="accent-blue-500"
                  />
                  <span className="text-gray-400">End on a date</span>
                </label>
              )}
              {repeatsWeekly && hasRecurEnd && (
                <label className="ml-4 block">
                  <span className="block text-[10px] uppercase tracking-widest text-gray-500 mb-1">Until</span>
                  <input
                    type="date"
                    value={recurEndDate}
                    onChange={(e) => setRecurEndDate(e.target.value)}
                    className="w-full bg-[#0A1020] border border-white/10 rounded-lg px-2 py-1.5 text-sm"
                  />
                </label>
              )}
              {repeatsWeekly && !hasRecurEnd && (
                <p className="ml-4 text-[11px] text-slate-500">Repeats indefinitely until deleted.</p>
              )}
            </div>

            {blockError ? <p className="text-xs text-red-300">{blockError}</p> : null}

            <button
              onClick={addBlock}
              disabled={validating}
              className={`w-full py-2 rounded-lg border text-sm disabled:opacity-50 ${theme.btnOutline}`}
            >
              {validating ? "Checking…" : "+ Add block"}
            </button>

            {/* Queued blocks */}
            {blocks.length > 0 ? (
              <ul className="space-y-1.5 border-t border-white/5 pt-2">
                {blocks.map((b) => {
                  const [sh, sm] = b.start_time.split(":").map(Number);
                  const [eh, em] = b.end_time.split(":").map(Number);
                  return (
                    <li key={b._id} className="flex items-center justify-between text-xs bg-[#0A1020] rounded px-2 py-1.5">
                      <span>
                        <span className="text-white">{b.date_iso}</span>
                        {" · "}
                        <span className="text-gray-400">
                          {fmtMinutes(sh * 60 + sm)} → {fmtMinutes(eh * 60 + em)}
                        </span>
                        {b.repeats_weekly ? <span className="ml-1 text-blue-400">↻</span> : null}
                      </span>
                      <button
                        onClick={() => setBlocks((prev) => prev.filter((x) => x._id !== b._id))}
                        className="text-red-300 hover:underline ml-2"
                      >
                        ×
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : null}

            {submitError ? <p className="text-xs text-red-300">{submitError}</p> : null}
            {success ? <p className="text-xs text-green-300">{success}</p> : null}

            <div className="flex gap-2 pt-1 mt-auto">
              <button onClick={onClose} className="flex-1 py-2 text-sm border border-white/10 rounded-lg">
                Close
              </button>
              <button
                disabled={submitting || blocks.length === 0}
                onClick={submit}
                className={`flex-1 py-2 text-sm rounded-lg font-semibold text-white disabled:opacity-50 ${theme.btnPrimary}`}
              >
                {submitting ? "Scheduling…" : `Schedule${blocks.length ? ` (${blocks.length})` : ""}`}
              </button>
            </div>
          </div>

          {/* RIGHT — availability calendar with ghost preview blocks */}
          <div className="flex-1 overflow-y-auto p-4">
            <AvailabilityCalendar
              availabilities={availabilities}
              busySlots={busySlots}
              ghostBlocks={allGhostBlocks}
              mode="view"
              // Coach prescription view: blue for available, orange for booked,
              // ghost blocks remain transparent (intent to book).
              role={isCoach ? "client" : state.role}
              onRangeChange={handleRangeChange}
              onBusySlotClick={!isCoach ? handleBusySlotClick : undefined}
            />
          </div>
        </div>
      </div>

      {selectedCwpData && (
        <WorkoutPlanPopup
          cwp={selectedCwpData.cwp}
          plan={selectedCwpData.plan}
          occurrenceStart={selectedCwpData.occurrenceStart}
          occurrenceEnd={selectedCwpData.occurrenceEnd}
          isToday={false}
          onClose={() => setSelectedCwpData(null)}
        />
      )}
    </div>
  );
}
