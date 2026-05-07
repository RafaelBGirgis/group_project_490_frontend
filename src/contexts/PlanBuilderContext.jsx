/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useMemo, useState } from "react";

/**
 * In-memory context that holds the user's draft workout plan + (for coaches)
 * the currently selected target client. Survives tab/route switches inside
 * /plan but is intentionally not persisted to localStorage so a refresh
 * resets the state — per product spec.
 *
 * draftPlan shape:
 * {
 *   id: number | null,   // backend id, null until saved
 *   strata_name: string, // plan name
 *   start_dt: string,    // ISO
 *   end_dt: string,      // ISO
 *   activities: [
 *     {
 *       _key,                       // local stable key
 *       workout_id,                 // for display
 *       workout_name,
 *       workout_type,               // "rep" | "duration"
 *       workout_activity_id,        // FK -> WorkoutActivity (intensity tier)
 *       intensity_measure,
 *       intensity_value,
 *       estimated_calories_per_unit_frequency,
 *       planned_reps?, planned_sets?, planned_duration?,
 *       estimated_calories,
 *     }
 *   ]
 * }
 */

const PlanBuilderCtx = createContext(null);

const EMPTY_DRAFT = {
  id: null,
  strata_name: "",
  start_dt: "",
  end_dt: "",
  activities: [],
};

export function PlanBuilderProvider({ children }) {
  const [draftPlan, setDraftPlan] = useState(EMPTY_DRAFT);
  const [selectedClient, setSelectedClient] = useState(null);

  const setName = useCallback((name) => {
    setDraftPlan((prev) => ({ ...prev, strata_name: name }));
  }, []);

  const setSchedule = useCallback((start_dt, end_dt) => {
    setDraftPlan((prev) => ({ ...prev, start_dt, end_dt }));
  }, []);

  const addActivity = useCallback((activity) => {
    setDraftPlan((prev) => ({
      ...prev,
      activities: [...prev.activities, { ...activity, _key: activity._key ?? Date.now() + Math.random() }],
    }));
  }, []);

  const updateActivity = useCallback((key, patch) => {
    setDraftPlan((prev) => ({
      ...prev,
      activities: prev.activities.map((a) => (a._key === key ? { ...a, ...patch } : a)),
    }));
  }, []);

  const removeActivity = useCallback((key) => {
    setDraftPlan((prev) => ({
      ...prev,
      activities: prev.activities.filter((a) => a._key !== key),
    }));
  }, []);

  const loadPlan = useCallback((plan) => {
    setDraftPlan({
      id: plan.id ?? null,
      strata_name: plan.strata_name ?? "",
      start_dt: plan.start_dt ?? "",
      end_dt: plan.end_dt ?? "",
      activities: (plan.activities ?? []).map((a, i) => ({ ...a, _key: a._key ?? `loaded-${i}-${Date.now()}` })),
    });
  }, []);

  const reset = useCallback(() => {
    setDraftPlan(EMPTY_DRAFT);
  }, []);

  const value = useMemo(() => ({
    draftPlan,
    selectedClient,
    setSelectedClient,
    setName,
    setSchedule,
    addActivity,
    updateActivity,
    removeActivity,
    loadPlan,
    reset,
  }), [draftPlan, selectedClient, setName, setSchedule, addActivity, updateActivity, removeActivity, loadPlan, reset]);

  return <PlanBuilderCtx.Provider value={value}>{children}</PlanBuilderCtx.Provider>;
}

export function usePlanBuilder() {
  const ctx = useContext(PlanBuilderCtx);
  if (!ctx) throw new Error("usePlanBuilder must be used inside <PlanBuilderProvider>");
  return ctx;
}
