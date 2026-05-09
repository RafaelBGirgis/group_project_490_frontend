import { createContext, useContext, useMemo, useReducer } from "react";

/**
 * State for the Plan My Week flow. Lives in React Context so switching tabs
 * (Build / Browse / View) preserves draft work without polluting localStorage.
 *
 *   role:                "client" | "coach"
 *   selectedClientId:    only meaningful for coach role; null until a client is picked
 *   activeTab:           "build" | "browse" | "view"
 *   draftPlan: {
 *     strata_name: string,
 *     activities: [{
 *       _draft_id,                // local-only client id used as react key
 *       workout_id, workout_name, workout_type ("rep" | "duration"),
 *       workout_activity_id,
 *       intensity_measure, intensity_value,
 *       calories_per_unit_frequency,
 *       planned_reps?, planned_sets?, planned_duration?,
 *       estimated_calories
 *     }]
 *   }
 *   pendingBlocks:       [{ _id, date_iso, start_hour, end_hour }]
 */

const initialState = {
  role: "client",
  selectedClientId: null,
  selectedClientName: null,
  activeTab: "build",
  draftPlan: { strata_name: "", activities: [] },
  pendingBlocks: [],
};

let _draftCounter = 1;
const nextDraftId = () => `d${Date.now().toString(36)}-${_draftCounter++}`;

function reducer(state, action) {
  switch (action.type) {
    case "SET_ROLE":
      return { ...state, role: action.role };
    case "SELECT_CLIENT":
      return { ...state, selectedClientId: action.clientId, selectedClientName: action.clientName ?? null };
    case "SET_TAB":
      return { ...state, activeTab: action.tab };
    case "SET_PLAN_NAME":
      return { ...state, draftPlan: { ...state.draftPlan, strata_name: action.name } };
    case "ADD_ACTIVITY":
      return {
        ...state,
        draftPlan: {
          ...state.draftPlan,
          activities: [...state.draftPlan.activities, { _draft_id: nextDraftId(), ...action.activity }],
        },
      };
    case "REMOVE_ACTIVITY":
      return {
        ...state,
        draftPlan: {
          ...state.draftPlan,
          activities: state.draftPlan.activities.filter((a) => a._draft_id !== action.draftId),
        },
      };
    case "UPDATE_ACTIVITY":
      return {
        ...state,
        draftPlan: {
          ...state.draftPlan,
          activities: state.draftPlan.activities.map((a) =>
            a._draft_id === action.draftId ? { ...a, ...action.patch } : a
          ),
        },
      };
    case "ADD_BLOCK":
      return {
        ...state,
        pendingBlocks: [
          ...state.pendingBlocks,
          { _id: nextDraftId(), ...action.block },
        ],
      };
    case "REMOVE_BLOCK":
      return {
        ...state,
        pendingBlocks: state.pendingBlocks.filter((b) => b._id !== action.id),
      };
    case "CLEAR_DRAFT":
      return { ...state, draftPlan: { strata_name: "", activities: [] }, pendingBlocks: [] };
    case "CLEAR_BLOCKS":
      return { ...state, pendingBlocks: [] };
    default:
      return state;
  }
}

const PlanMyWeekContext = createContext(null);

export function PlanMyWeekProvider({ initialRole = "client", children }) {
  const [state, dispatch] = useReducer(reducer, { ...initialState, role: initialRole });
  const value = useMemo(() => ({ state, dispatch }), [state]);
  return <PlanMyWeekContext.Provider value={value}>{children}</PlanMyWeekContext.Provider>;
}

export function usePlanMyWeek() {
  const ctx = useContext(PlanMyWeekContext);
  if (!ctx) throw new Error("usePlanMyWeek must be used within <PlanMyWeekProvider>");
  return ctx;
}

/* ─── helpers ──────────────────────────────────────────────────────────── */

/**
 * Build the intensity label per the user's spec:
 *   - rep-based with units → "<value> <unit>"   (e.g. "135 lbs")
 *   - duration-based with units → "<value> <unit>"  (e.g. "60 sec")
 *   - no unit → "<value>"
 *   - no value at all → "—"
 */
export function intensityLabel({ intensity_measure, intensity_value }) {
  if (intensity_value == null || intensity_value === "") return "—";
  const unit = (intensity_measure || "").trim();
  return unit ? `${intensity_value} ${unit}` : `${intensity_value}`;
}

/**
 * Compute estimated calories for an activity draft.
 *   rep mode:  cal/freq × reps × sets
 *   dur mode:  cal/freq × duration
 */
export function estimateCalories({ workout_type, calories_per_unit_frequency, planned_reps, planned_sets, planned_duration }) {
  const c = Number(calories_per_unit_frequency || 0);
  if (workout_type === "duration") {
    const d = Number(planned_duration || 0);
    return Number((c * d).toFixed(2));
  }
  const r = Number(planned_reps || 0);
  const s = Number(planned_sets || 0);
  return Number((c * r * s).toFixed(2));
}
