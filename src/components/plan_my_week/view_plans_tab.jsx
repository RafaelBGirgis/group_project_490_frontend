import { useCallback, useEffect, useState } from "react";
import { usePlanMyWeek } from "../../contexts/plan_my_week_context";
import {
  deleteScheduledPlanAsClient,
  deleteScheduledPlanAsCoach,
  listClientAvailabilityAsCoach,
  listClientBusySlotsAsCoach,
  listMyAvailability,
  listMyBusySlots,
  listMyScheduledPlans,
  logWorkoutActivityForCwp,
  searchWorkoutPlans,
} from "../../api/plan_my_week";
import { createClientAvailability, deleteClientAvailability, fetchMe } from "../../api/client";
import { loadWeekCache, saveWeekCache } from "../../utils/scheduleCache";
import AvailabilityCalendar from "../availability/AvailabilityCalendar";
import WorkoutPlanPopup from "./workout_plan_popup";

function isoDateStr(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function todayIso() {
  return isoDateStr(new Date());
}

export default function ViewPlansTab() {
  const { state, dispatch } = usePlanMyWeek();
  const isCoach = state.role === "coach";
  const clientId = state.selectedClientId;

  const [currentAccountId, setCurrentAccountId] = useState(null);
  const [availabilities, setAvailabilities] = useState([]);
  const [busySlots, setBusySlots] = useState([]);
  const [selectedCwpData, setSelectedCwpData] = useState(null);
  const [cwpLookup, setCwpLookup] = useState({});
  const [planLookup, setPlanLookup] = useState({});
  const [crudReady, setCrudReady] = useState(false);
  const [lastFromIso, setLastFromIso] = useState(null);

  useEffect(() => {
    fetchMe().then((me) => setCurrentAccountId(me?.id ?? null)).catch(() => {});
  }, []);

  const handleRangeChange = useCallback(async (fromIso, toIso) => {
    setLastFromIso(fromIso);

    // Paint from cache immediately
    const cached = loadWeekCache(fromIso);
    if (cached) {
      setAvailabilities(cached.availabilities || []);
      setBusySlots(cached.busySlots || []);
      if (!isCoach) {
        const cwpMap = {};
        (cached.cwps || []).forEach((c) => { cwpMap[c.id] = c; });
        setCwpLookup(cwpMap);
        const planMap = {};
        (cached.plans || []).forEach((p) => { planMap[p.id] = p; });
        setPlanLookup(planMap);
      }
    }
    setCrudReady(false);

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
      // silently ignore
    } finally {
      setCrudReady(true);
    }
  }, [isCoach, clientId]);

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
      localDate: slotDate,
    });
  }, [cwpLookup, planLookup]);

  const handleDeleteCwp = useCallback(async (cwpId) => {
    if (isCoach) {
      await deleteScheduledPlanAsCoach(cwpId);
    } else {
      await deleteScheduledPlanAsClient(cwpId);
    }
    setSelectedCwpData(null);
  }, [isCoach]);

  const handleLogActivity = useCallback(async (activityData) => {
    await logWorkoutActivityForCwp(activityData);
  }, []);

  const handleCreateAvailability = useCallback(async (payload) => {
    await createClientAvailability(payload);
    // Refetch to get server-assigned IDs
    if (lastFromIso) {
      const from = lastFromIso;
      const to = new Date(new Date(from).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const [rows, busy] = await Promise.all([
        listMyAvailability({ from_dt: from, to_dt: to }),
        listMyBusySlots({ from_dt: from, to_dt: to }),
      ]);
      setAvailabilities(rows);
      setBusySlots(busy);
      saveWeekCache(from, { availabilities: rows, busySlots: busy, cwps: Object.values(cwpLookup), plans: Object.values(planLookup) });
    }
  }, [lastFromIso, cwpLookup, planLookup]);

  const handleDeleteAvailability = useCallback(async (id) => {
    await deleteClientAvailability(id);
    if (lastFromIso) {
      const from = lastFromIso;
      const to = new Date(new Date(from).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const [rows, busy] = await Promise.all([
        listMyAvailability({ from_dt: from, to_dt: to }),
        listMyBusySlots({ from_dt: from, to_dt: to }),
      ]);
      setAvailabilities(rows);
      setBusySlots(busy);
      saveWeekCache(from, { availabilities: rows, busySlots: busy, cwps: Object.values(cwpLookup), plans: Object.values(planLookup) });
    }
  }, [lastFromIso, cwpLookup, planLookup]);

  return (
    <div className="space-y-4">
      <AvailabilityCalendar
        availabilities={availabilities}
        busySlots={busySlots}
        mode={isCoach ? "view" : "edit"}
        // In the coach prescription lifecycle the calendar visualizes the
        // client's window: blue for available, orange for booked (matches
        // the ghost-block transparency used in ScheduleDialog).
        role={isCoach ? "client" : state.role}
        onRangeChange={handleRangeChange}
        onBusySlotClick={!isCoach ? handleBusySlotClick : undefined}
        onCreate={!isCoach ? handleCreateAvailability : undefined}
        onDelete={!isCoach ? handleDeleteAvailability : undefined}
        editDisabled={!crudReady}
      />

      {selectedCwpData && (
        <WorkoutPlanPopup
          cwp={selectedCwpData.cwp}
          plan={selectedCwpData.plan}
          occurrenceStart={selectedCwpData.occurrenceStart}
          occurrenceEnd={selectedCwpData.occurrenceEnd}
          isToday={selectedCwpData.localDate === todayIso()}
          localDate={selectedCwpData.localDate}
          onDelete={() => handleDeleteCwp(selectedCwpData.cwp.id)}
          onLog={handleLogActivity}
          onEdit={
            !isCoach && currentAccountId != null &&
            (selectedCwpData.plan?.created_by_account_id === currentAccountId ||
             selectedCwpData.cwp?.created_by_account_id === currentAccountId)
              ? () => { setSelectedCwpData(null); dispatch({ type: "SET_TAB", tab: "my_plans" }); }
              : undefined
          }
          onClose={() => setSelectedCwpData(null)}
        />
      )}
    </div>
  );
}
