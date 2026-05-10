import { useNavigate } from "react-router-dom";
import { useState, useEffect, useCallback, useRef } from "react";
import {
  Navbar,
  StatCard,
  DashboardCard,
  ProgressRing,
  DayTabs,
  ListRow,
  SectionHeader,
  Overlay,
  SkeletonStatCard,
  SkeletonDashCard,
  SkeletonGreeting,
  SkeletonRing,
  SkeletonAvailability,
} from "../components";

import MealDetail from "../components/overlays/meal_detail";
import WorkoutPlanPopup from "../components/plan_my_week/workout_plan_popup";
import DailySurvey from "../components/overlays/daily_survey";
import StepsLog from "../components/overlays/steps_log";
import {
  fetchMe,
  fetchClientProfile,
  fetchTelemetryToday,
  fetchCaloriesToday,
  fetchMyCoach,
  fetchCoachRating,
  fetchMealsToday,
  fetchMyCoachRequests,
  logMeal,
  deleteCoachRequest,
  terminateRelationship,
} from "../api/client";
import {
  listMyScheduledPlans,
  searchWorkoutPlans,
  deleteScheduledPlanAsClient,
  logWorkoutActivityForCwp,
} from "../api/plan_my_week";
import {
  fetchAllDailySurveys,
  fetchDailyStepsSurvey,
  fetchStepHistory,
  fetchWorkoutHistory,
  fetchRandomAppreciation,
} from "../api/survey";
import { getConversationWithAccount } from "../api/chat";
import {
  isApprovedCoachRequest,
  isPendingCoachRequest,
  resolveActiveCoachRelationship,
} from "../utils/coachRequests";
import { loadDayCache, saveDayCache } from "../utils/scheduleCache";
import {
  forgetTerminatedCoachId,
  getRememberedTerminatedCoachIds,
  rememberTerminatedCoachId,
  rememberTerminatedRelationshipId,
} from "../utils/terminatedRelationships";
import { getCoachAccessState, getImmediateCoachAccessState } from "../utils/roleAccess";
import { getImmediateRoleState, resolveRoleState } from "../utils/sessionAuth";
import { setLastRoleContext } from "../utils/sessionCache";

const role = "client";
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const TODAY_IDX = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;
const pct = (val, max) => Math.min(100, Math.round((val / max) * 100));

function getWeekDateForIdx(weekdayIdx) {
  const today = new Date();
  const todayIdx = today.getDay() === 0 ? 6 : today.getDay() - 1;
  const diff = weekdayIdx - todayIdx;
  const target = new Date(today);
  target.setDate(today.getDate() + diff);
  target.setHours(0, 0, 0, 0);
  const y = target.getFullYear();
  const m = String(target.getMonth() + 1).padStart(2, "0");
  const d = String(target.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export default function ClientDash() {
  const navigate = useNavigate();
  const immediateRoleState = getImmediateRoleState();
  const immediateCoachAccess = getImmediateCoachAccessState();

  /*  auth guard  */
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    setAuthed(true);
  }, [navigate]);

  useEffect(() => {
    setLastRoleContext({ role: "client", dashboardPath: "/client" });
  }, []);

  /*  overlay state  */
  const [overlay, setOverlay] = useState(null); // "workout" | "coach" | "availability" | "meals" | "survey" | "steps" | null
  const closeOverlay = () => setOverlay(null);

  /*  daily survey state  */
  const [surveyStatus, setSurveyStatus] = useState({ mood: null, body_metrics: null, steps: null, progress_pic: null });
  const [stepsRecent, setStepsRecent] = useState([]);

  // True when the entry's last_updated/created_at falls on the current local date.
  const isFromToday = (entry) => {
    const ts = entry?.last_updated || entry?.created_at;
    if (!ts) return false;
    try {
      const d = new Date(ts);
      const t = new Date();
      return d.getFullYear() === t.getFullYear()
        && d.getMonth() === t.getMonth()
        && d.getDate() === t.getDate();
    } catch { return false; }
  };

  const refreshSurveyStatus = useCallback(async () => {
    try {
      const [all, recent] = await Promise.all([
        fetchAllDailySurveys(),
        fetchStepHistory({ limit: 7 }),
      ]);
      setSurveyStatus(all);
      setStepsRecent(recent);
      // Only surface step count if the latest entry is from today; otherwise
      // show 0 so the card never displays a stale reading as "today".
      const latest = recent?.[0];
      if (latest && isFromToday(latest) && Number.isFinite(Number(latest.step_count))) {
        setStepCount(Number(latest.step_count));
      } else {
        setStepCount(0);
      }
    } catch {
      // Endpoint failures fall through; the overlay handles its own errors.
    }
  }, []);

  const refreshStepsOnly = useCallback(async () => {
    try {
      const [stepsStatus, recent] = await Promise.all([
        fetchDailyStepsSurvey().catch(() => null),
        fetchStepHistory({ limit: 7 }),
      ]);
      setSurveyStatus((prev) => ({ ...prev, steps: stepsStatus }));
      setStepsRecent(recent);
      const latest = recent?.[0];
      if (latest && isFromToday(latest) && Number.isFinite(Number(latest.step_count))) {
        setStepCount(Number(latest.step_count));
      } else {
        setStepCount(0);
      }
    } catch {
      // Ignore — card just keeps last known data.
    }
  }, []);

  /*  core state  */
  const [account, setAccount] = useState(null);
  const [clientId, setClientId] = useState(null);
  const [activeDay, setActiveDay] = useState(TODAY_IDX);
  const [stepCount, setStepCount] = useState(null);
  const [caloriesBurned, setCaloriesBurned] = useState(null);
  const [caloriesConsumed, setCaloriesConsumed] = useState(null);
  const [caloriesGoal, setCaloriesGoal] = useState(2000);
  const [todayPlans, setTodayPlans] = useState([]);
  const [planLookup, setPlanLookup] = useState({});
  const [selectedCwpData, setSelectedCwpData] = useState(null); // { cwp, plan, occurrenceStart, occurrenceEnd }
  const [completedCount, setCompletedCount] = useState(0);
  // Set of cwp.id values already logged today. Populated from server history on
  // load (survives page refresh) and updated optimistically on each log action.
  const [loggedCwpIds, setLoggedCwpIds] = useState(new Set());
  const [crudReady, setCrudReady] = useState(false);
  const [coach, setCoach] = useState(null);
  const [coachRating, setCoachRating] = useState(null);
  const [prescribedMeals, setPrescribedMeals] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [relationshipId, setRelationshipId] = useState(null);
  const [canSwitchToCoach, setCanSwitchToCoach] = useState(
    immediateCoachAccess.canAccessCoach
  );
  const [canSwitchToAdmin, setCanSwitchToAdmin] = useState(immediateRoleState.hasAdminRole);
  const [pendingCoachRequest, setPendingCoachRequest] = useState(null);
  const [approvedCoachRequest, setApprovedCoachRequest] = useState(null);
  // Tracks whether there's something worth polling for (pending request or active coach).
  // Using a ref so the interval callback reads fresh state without needing to restart.
  const shouldPollRef = useRef(false);
  const [requestStatusError, setRequestStatusError] = useState("");
  const [requestStatusMessage, setRequestStatusMessage] = useState("");
  const [openingCoachChat, setOpeningCoachChat] = useState(false);
  const [terminatingRelationship, setTerminatingRelationship] = useState(false);
  // Random gratitude entry pulled from /roles/client/telemetry/random_appreciation.
  // null = not yet fetched, "" = fetched-but-no-history, "..." = real value.
  // The card under the steps card uses these three states for distinct
  // copy (loading / fallback / quote).
  const [appreciation, setAppreciation] = useState(null);

  const refreshCoachRelationshipState = useCallback(async () => {
    const [requestList, myCoach] = await Promise.all([
      fetchMyCoachRequests().catch(() => null),
      fetchMyCoach(),
    ]);
    const { activeCoach, byCoachId } = resolveActiveCoachRelationship(myCoach, requestList);
    const terminatedCoachIds = new Set(getRememberedTerminatedCoachIds());
    const activeCoachId = Number(activeCoach?.coach_id);

    if (Number.isFinite(activeCoachId)) {
      forgetTerminatedCoachId(activeCoachId);
      terminatedCoachIds.delete(activeCoachId);
    }

    const requestValues = Object.values(byCoachId);
    const nextApproved =
      requestValues
        .filter((request) => {
          const coachId = Number(request?.coach_id);
          return !(terminatedCoachIds.has(coachId) && !activeCoach);
        })
        .filter(isApprovedCoachRequest)
        .sort((a, b) => new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime())[0]
      || null;
    const nextPending =
      (!nextApproved
        ? requestValues
          .filter(isPendingCoachRequest)
          .sort((a, b) => new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime())[0]
        : null)
      || null;

    setPendingCoachRequest(nextPending);
    setApprovedCoachRequest(nextApproved);
    const nextCoach = activeCoach;
    setCoach(nextCoach);
    setRelationshipId(
      nextCoach?.relationship_id != null ? Number(nextCoach.relationship_id) : null
    );
    if (!nextCoach) {
      setCoachRating(null);
    }
    // Only keep polling if there's something that could change.
    shouldPollRef.current = !!(nextCoach || nextPending);
    return { nextPending, nextApproved, myCoach: nextCoach };
  }, []);

  /*  load account + client profile  */
  useEffect(() => {
    if (!authed) return;

    (async () => {
      try {
        const me = await fetchMe();
        setAccount(me);
        if (me.daily_calorie_budget) setCaloriesGoal(me.daily_calorie_budget);
        const roleState = await resolveRoleState();
        setCanSwitchToAdmin(roleState.hasAdminRole);
        const coachAccess = await getCoachAccessState(me, roleState);
        setCanSwitchToCoach(coachAccess.canAccessCoach);

        if (me.client_id) {
          setClientId(me.client_id);
          await refreshCoachRelationshipState();
          try {
            await fetchClientProfile();
          } catch { /* profile fetch optional */ }
        } else {
          await refreshCoachRelationshipState();
        }
        setLoading(false);
      } catch {
        // fetchMe will redirect on 401 — keep loading=true so skeleton
        // stays visible during the redirect instead of flashing empty content
        setLoading(false);
      }
    })();
  }, [authed, refreshCoachRelationshipState]);

  useEffect(() => {
    if (!clientId) return undefined;

    const refreshRequests = () => {
      if (shouldPollRef.current) void refreshCoachRelationshipState();
    };

    window.addEventListener("focus", refreshRequests);
    const intervalId = window.setInterval(refreshRequests, 15000);

    return () => {
      window.removeEventListener("focus", refreshRequests);
      window.clearInterval(intervalId);
    };
  }, [clientId, refreshCoachRelationshipState]);

  /*  load dashboard data once we have a clientId  */
  useEffect(() => {
    if (!clientId) return;
    refreshSurveyStatus();

    // Pull one random past gratitude entry to display under the steps card.
    // Resolves to "" (empty string sentinel) when the client has nothing
    // logged yet — distinguishes "no data" from "still loading" (null).
    fetchRandomAppreciation().then((data) => {
      setAppreciation(data?.todays_appreciation || "");
    }).catch(() => setAppreciation(""));

    (async () => {
      // YYYY-MM-DD in local time, used to scope meal lookups to today only.
      // Without this, fetchMealsToday returns the most recent N meals across
      // history, which can leak yesterday's meals into the dashboard card.
      const todayIso = (() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      })();

      try {
        const [telemetry, calories, meals] =
          await Promise.all([
            fetchTelemetryToday(clientId).catch(() => ({ step_count: 0 })),
            fetchCaloriesToday().catch(() => ({})),
            fetchMealsToday(clientId, { onDate: todayIso }).catch(() => []),
          ]);

        setStepCount(telemetry.step_count);
        // Calories come from the dedicated /calories_today route, which sums
        // the right columns (CompletedWorkoutActivity.estimated_calories for
        // burned; MealIngredient.calories via CompletedMealActivity for
        // consumed) and is scoped to today.
        if (Number.isFinite(calories.calories_burned)) {
          setCaloriesBurned(calories.calories_burned);
        }
        if (Number.isFinite(calories.calories_consumed)) {
          setCaloriesConsumed(calories.calories_consumed);
        }
        if (Number.isFinite(calories.calories_goal) && calories.calories_goal > 0) {
          setCaloriesGoal(calories.calories_goal);
        }

        setPrescribedMeals(meals);
      } catch {
        // Leave the last known dashboard state in place if the refresh fails.
      }
    })();
  }, [
    clientId,
    refreshSurveyStatus,
  ]);

  /*  load coach rating when coach is known  */
  useEffect(() => {
    if (!coach?.coach_id) return;
    fetchCoachRating(coach.coach_id).then(setCoachRating);
  }, [coach]);

  /*  load scheduled plans when day changes  */
  const loadPlansForDay = useCallback(async () => {
    if (!clientId) return;
    const dateIso = getWeekDateForIdx(activeDay);

    // Show cached plans immediately while API loads
    const cached = loadDayCache(dateIso);
    if (cached) {
      setTodayPlans(cached.plans || []);
      setPlanLookup(cached.planLookup || {});
    }
    setCrudReady(false);

    const [y, mo, d] = dateIso.split("-").map(Number);
    const from_dt = new Date(y, mo - 1, d, 0, 0, 0).toISOString();
    const to_dt = new Date(y, mo - 1, d, 23, 59, 59).toISOString();

    try {
      const [cwps, allPlans] = await Promise.all([
        listMyScheduledPlans({ from_dt, to_dt }),
        searchWorkoutPlans({ limit: 200 }),
      ]);

      const filtered = cwps.filter((cwp) => {
        const occs = cwp.occurrences ?? [];
        return occs.some((occ) => {
          const start = new Date(occ.start_dt);
          const occDate = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-${String(start.getDate()).padStart(2, "0")}`;
          return occDate === dateIso;
        });
      });

      const lookup = {};
      allPlans.forEach((p) => { lookup[p.id] = p; });
      setTodayPlans(filtered);
      setPlanLookup(lookup);
      saveDayCache(dateIso, { plans: filtered, planLookup: lookup });

      // For today's tab only: fetch workout history and mark already-logged CWPs
      // so the Log button stays disabled after a page refresh.
      if (activeDay === TODAY_IDX) {
        try {
          const history = await fetchWorkoutHistory({ limit: 200 });
          const todayStr = dateIso; // "YYYY-MM-DD"
          const loggedActivityIds = new Set(
            history
              .filter((h) => {
                const ts = h.last_updated || h.created_at;
                return ts && new Date(ts).toISOString().slice(0, 10) === todayStr;
              })
              .map((h) => h.workout_plan_activity_id)
              .filter(Boolean)
          );
          if (loggedActivityIds.size > 0) {
            const alreadyDone = new Set();
            filtered.forEach((cwp) => {
              const plan = lookup[cwp.workout_plan_id];
              const actIds = (plan?.activities ?? []).map((a) => a.id);
              if (actIds.some((id) => loggedActivityIds.has(id))) {
                alreadyDone.add(cwp.id);
              }
            });
            if (alreadyDone.size > 0) {
              setLoggedCwpIds((prev) => new Set([...prev, ...alreadyDone]));
              setCompletedCount((prev) => prev + alreadyDone.size);
            }
          }
        } catch {
          // History fetch is best-effort — don't block the plan list.
        }
      }
    } catch {
      setTodayPlans([]);
    } finally {
      setCrudReady(true);
    }
  }, [clientId, activeDay]);

  // Paint cached plans immediately on mount / day-tab change before clientId resolves
  useEffect(() => {
    const dateIso = getWeekDateForIdx(activeDay);
    const cached = loadDayCache(dateIso);
    if (cached) {
      setTodayPlans(cached.plans || []);
      setPlanLookup(cached.planLookup || {});
    }
  }, [activeDay]);

  // Reset completed count + logged set when day changes
  useEffect(() => {
    setCompletedCount(0);
    setLoggedCwpIds(new Set());
  }, [activeDay]);

  useEffect(() => { loadPlansForDay(); }, [loadPlansForDay]);

  /*  open workout plan popup  */
  function openCwpPopup(cwp) {
    const dateIso = getWeekDateForIdx(activeDay);
    const occs = cwp.occurrences ?? [];
    const occ = occs.find((o) => {
      const start = new Date(o.start_dt);
      const occDate = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-${String(start.getDate()).padStart(2, "0")}`;
      return occDate === dateIso;
    }) ?? occs[0];
    setSelectedCwpData({
      cwp,
      plan: planLookup[cwp.workout_plan_id] ?? null,
      occurrenceStart: occ?.start_dt ?? null,
      occurrenceEnd: occ?.end_dt ?? null,
    });
  }

  /*  log a workout activity via popup — refresh calories + progress ring  */
  const handleLogWorkoutActivity = async (activityData) => {
    const localDate = getWeekDateForIdx(activeDay);
    await logWorkoutActivityForCwp({ ...activityData, local_date: localDate });
    // Mark this CWP as logged — disables the Log button immediately
    if (activityData.cwp_id != null) {
      setLoggedCwpIds((prev) => new Set([...prev, activityData.cwp_id]));
    }
    // Increment local completed count immediately for the progress ring
    setCompletedCount((prev) => prev + 1);
    // Re-fetch calories so burned total + ring update without a page reload
    try {
      const calories = await fetchCaloriesToday();
      setCaloriesBurned(calories.calories_burned);
      setCaloriesConsumed(calories.calories_consumed);
      if (Number.isFinite(calories.calories_goal) && calories.calories_goal > 0) {
        setCaloriesGoal(calories.calories_goal);
      }
    } catch {
      // Non-fatal — ring will update on next full refresh.
    }
  };

  /*  delete a scheduled plan via popup  */
  const handleDeleteCwp = async (cwpId) => {
    await deleteScheduledPlanAsClient(cwpId);
    setSelectedCwpData(null);
    await loadPlansForDay();
  };

  /*  log a meal  */
  const handleLogMeal = async (mealPayload) => {
    // Backend throws if neither id is provided or the id is invalid; surface
    // the failure so the overlay can show it.
    await logMeal(clientId, mealPayload);
  };

  // Refetch meal list + calories card after the overlay logs something.
  // Split from handleLogMeal so the overlay can decide when to call it
  // (e.g. after building+logging a custom meal in two steps).
  const handleAfterMealLog = async () => {
    try {
      // Recompute today's-only YYYY-MM-DD here too — `Date` resolves locally
      // so a refresh just before midnight still rolls over correctly.
      const d = new Date();
      const todayIso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const [refreshed, telemetry] = await Promise.all([
        fetchMealsToday(clientId, { onDate: todayIso }),
        fetchTelemetryToday(clientId),
      ]);
      setPrescribedMeals(refreshed);
      setCaloriesConsumed(telemetry.calories_consumed);
    } catch {
      // Non-fatal — next mount picks it up.
    }
  };

  const handleTerminateRelationship = async () => {
    if (!relationshipId || terminatingRelationship) return;
    if (!window.confirm("End your coaching relationship with this coach?")) return;

    setRequestStatusError("");
    setRequestStatusMessage("");
    setTerminatingRelationship(true);
    setCoach(null);
    setRelationshipId(null);
    setApprovedCoachRequest(null);
    try {
      await terminateRelationship(relationshipId);
      rememberTerminatedRelationshipId(relationshipId);
      if (coach?.coach_id != null) {
        rememberTerminatedCoachId(coach.coach_id);
      }
      await refreshCoachRelationshipState();
      setRequestStatusMessage("Coaching relationship ended.");
    } catch (error) {
      await refreshCoachRelationshipState();
      setRequestStatusError(error?.message || "Unable to end this relationship.");
    } finally {
      setTerminatingRelationship(false);
    }
  };

  const handleCancelCoachRequest = async () => {
    if (!pendingCoachRequest?.request_id) return;
    if (!window.confirm("Cancel your pending coach request?")) return;

    try {
      await deleteCoachRequest(pendingCoachRequest.request_id);
      await refreshCoachRelationshipState();
    } catch (error) {
      setRequestStatusError(error?.message || "Unable to cancel this coach request.");
    }
  };

  const handleOpenCoachChat = async () => {
    if (!coach?.coach_id || !relationshipId) return;
    setRequestStatusError("");
    setOpeningCoachChat(true);
    try {
      const coachAccountId = coach.account_id ?? coach.accountId ?? coach.id ?? null;
      await getConversationWithAccount(coachAccountId, {
        id: coach.coach_id,
        account_id: coachAccountId,
        name: coach.name || `Coach #${coach.coach_id}`,
        role: "coach",
      });
      navigate(
        coachAccountId
          ? `/client/messages?account=${coachAccountId}`
          : `/client/messages?client=${coach.coach_id}`
      );
    } catch (error) {
      setRequestStatusError(error.message || "Unable to open coach chat.");
    } finally {
      setOpeningCoachChat(false);
    }
  };


  /*  derived values  */
  const totalCount = todayPlans.reduce((sum, cwp) => sum + (planLookup[cwp.workout_plan_id]?.activities?.length ?? 0), 0);
  // completedCount is incremented locally on each handleLogWorkoutActivity call.
  // It resets to 0 when the day tab changes (different day = fresh state).
  const stepsGoal = account?.daily_steps_goal ?? 10000;
  const stepsPercent = pct(stepCount ?? 0, stepsGoal);
  // Net calories = consumed − burned. This is what counts toward the goal:
  // the more you burn, the more you can eat; the ring reflects the delta.
  // Nulls fall through to 0 so the ring renders even before data lands.
  const consumedSafe = caloriesConsumed ?? 0;
  const burnedSafe = caloriesBurned ?? 0;
  const netCalories = consumedSafe - burnedSafe;
  const calPercent = pct(Math.max(0, netCalories), caloriesGoal || 1);
  const workoutPercent = pct(completedCount, totalCount || 1);
  const hasActiveCoach = Boolean(coach?.coach_id && relationshipId);

  /*  greeting based on time of day  */
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";

  /*  loading skeleton  */
  if (loading) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: "#080D19" }}>
        <Navbar role={role} userName="?" />
        <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
          <div className="h-5 w-48 bg-white/5 rounded animate-pulse" />
          <div className="grid grid-cols-4 gap-4">
            <SkeletonGreeting />
            <div className="flex flex-col gap-4">
              <SkeletonStatCard />
              <SkeletonStatCard />
            </div>
            <div className="rounded-2xl border border-white/6 bg-[#0F1729] p-5 flex flex-col items-center justify-center">
              <SkeletonRing size={120} />
            </div>
            <div className="rounded-2xl border border-white/6 bg-[#0F1729] p-5 flex flex-col items-center justify-center">
              <SkeletonRing size={120} />
            </div>
          </div>
          <div className="h-5 w-48 bg-white/5 rounded animate-pulse" />
          <div className="grid grid-cols-3 gap-4">
            <SkeletonDashCard rows={4} />
            <SkeletonDashCard rows={3} />
            <SkeletonAvailability />
          </div>
          <div className="h-5 w-48 bg-white/5 rounded animate-pulse" />
          <SkeletonDashCard rows={3} />
        </div>
      </div>
    );
  }

  /*  split name for greeting card  */
  const nameParts = (account?.name ?? "").split(" ");
  const firstName = nameParts[0] || "—";
  const lastName = nameParts.slice(1).join(" ") || "";

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#080D19" }}>
      <Navbar
        role={role}
        switchOptions={[
          ...(canSwitchToCoach ? [{ label: "Coach", to: "/coach" }] : []),
          ...(canSwitchToAdmin ? [{ label: "Admin", to: "/admin" }] : []),
        ]}
        userName={
          account?.name
            ? account.name.split(" ").map((n) => n[0]).join("").toUpperCase()
            : "?"
        }
      />

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/*  DAILY CHECK-IN BANNER  */}
        <DailyCheckInBanner
          status={surveyStatus}
          onOpen={() => setOverlay("survey")}
        />

        {/*  FITNESS & NUTRITION  */}
        <SectionHeader label="FITNESS & NUTRITION" role={role} />

        <div className="grid grid-cols-4 gap-4">
          <DashboardCard role={role} className="min-h-50">
            <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">
              {greeting}
            </p>
            <h2 className="text-4xl font-bold text-white leading-tight">
              {firstName}
              {lastName && <><br />{lastName}</>}
            </h2>
          </DashboardCard>

          <div className="flex flex-col gap-4">
            <StatCard
              role={role}
              label="STEPS TODAY"
              value={stepCount !== null ? stepCount.toLocaleString() : "—"}
              sub={
                surveyStatus?.steps === null
                  ? "Survey offline"
                  : surveyStatus?.steps?.is_finished
                    ? `Logged · ${stepsPercent}% of ${stepsGoal.toLocaleString()} goal`
                    : stepCount !== null
                      ? `Tap to log · ${stepsPercent}% of ${stepsGoal.toLocaleString()} goal`
                      : "Tap to log today's steps"
              }
              progress={stepsPercent}
              action={
                surveyStatus?.steps?.is_finished
                  ? "Done ✓"
                  : surveyStatus?.steps === null
                    ? null
                    : "Log"
              }
              onClick={() => setOverlay("steps")}
            />
            {/* Random past gratitude entry from the client's mood-survey
                history. Fallback copy handles "loading" + "no entries yet"
                so the card never shows blank or "undefined". */}
            <AppreciationCard appreciation={appreciation} />
          </div>

          <DashboardCard role={role} className="items-center">
            <p className="text-white font-semibold text-base text-center w-full">Calories</p>
            <ProgressRing
              role={role}
              percent={calPercent}
              size={120}
              label={
                caloriesConsumed === null && caloriesBurned === null
                  ? "—"
                  : netCalories.toString()
              }
              sublabel={`of ${caloriesGoal} kcal`}
            />
            <div className="w-full bg-[#0A1020] rounded-xl px-4 py-2 space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500 pr-3 uppercase tracking-widest text-[10px]">Consumed</span>
                <span className="text-white font-semibold">
                  {caloriesConsumed !== null ? `${caloriesConsumed} kcal` : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500 uppercase tracking-widest text-[10px]">Burned</span>
                <span className="text-white font-semibold">
                  {caloriesBurned !== null ? `${caloriesBurned} kcal` : "—"}
                </span>
              </div>
            </div>
          </DashboardCard>

          <DashboardCard role={role} className="items-center">
            <p className="text-white font-semibold text-base text-center w-full">Progress</p>
            <ProgressRing
              role={role}
              percent={workoutPercent}
              size={120}
              label={`${workoutPercent}%`}
              sublabel="weekly goal"
            />
            <div className="w-full bg-[#0A1020] rounded-xl px-4 py-2 text-center">
              <p className="text-[10px] text-gray-500 uppercase tracking-widest">
                Workouts
              </p>
              <p className="text-white font-bold text-lg">
                {completedCount}/{totalCount}
              </p>
            </div>
          </DashboardCard>
        </div>

        {/*  WORKOUT & COACH  */}
        <SectionHeader label="WORKOUT & COACH" role={role} />

        {requestStatusError ? (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {requestStatusError}
          </div>
        ) : null}
        {requestStatusMessage ? (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
            {requestStatusMessage}
          </div>
        ) : null}

        {pendingCoachRequest ? (
          <DashboardCard role={role} title="Coach Request Status">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-white font-semibold">
                  {pendingCoachRequest.coach_name || "Coach request pending"}
                </p>
                <p className="mt-1 text-sm text-amber-300">Pending request</p>
                <p className="mt-1 text-xs text-gray-500">
                  Your request is waiting for the coach to review it.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigate(`/coaches/${pendingCoachRequest.coach_id}?from=dashboard`)}
                  className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm font-medium text-amber-300"
                >
                  View Request
                </button>
                <button
                  onClick={handleCancelCoachRequest}
                  className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-300"
                >
                  Cancel Request
                </button>
              </div>
            </div>
          </DashboardCard>
        ) : null}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
          {/* Today's Workout */}
          <DashboardCard
            role={role}
            title="Today's Workout"
            footer={
              <button
                onClick={() => navigate("/plan-my-week?role=client")}
                className="w-full py-2 rounded-xl border border-blue-500/30 text-blue-400 text-xs font-semibold hover:bg-blue-500/10 transition-colors"
              >
                Plan My Week
              </button>
            }
          >
            <DayTabs
              days={WEEKDAYS}
              activeIndex={activeDay}
              onSelect={setActiveDay}
              role={role}
            />

            <div className="mt-3 space-y-2">
              {todayPlans.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-4">
                  No workouts scheduled for this day
                </p>
              ) : (
                todayPlans.map((cwp) => {
                  const plan = planLookup[cwp.workout_plan_id];
                  const occ = (cwp.occurrences ?? [])[0];
                  const timeLabel = occ
                    ? `${new Date(occ.start_dt).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })} – ${new Date(occ.end_dt).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`
                    : "";
                  return (
                    <ListRow
                      key={cwp.id}
                      label={plan?.strata_name || `Plan #${cwp.workout_plan_id}`}
                      sub={timeLabel}
                      right={
                        activeDay === TODAY_IDX ? (
                          loggedCwpIds.has(cwp.id) ? (
                            <span className="text-[10px] px-3 py-1.5 rounded-full border border-green-500/30 text-green-400">
                              Done ✓
                            </span>
                          ) : (
                            <button
                              className={`text-xs border rounded-full px-3 py-1 transition-colors ${crudReady
                                  ? "text-blue-400 border-blue-500/50 hover:bg-blue-500/10 cursor-pointer"
                                  : "text-gray-600 border-gray-700 opacity-50 cursor-not-allowed"
                                }`}
                              onClick={crudReady ? () => openCwpPopup(cwp) : undefined}
                              disabled={!crudReady}
                            >
                              Log →
                            </button>
                          )
                        ) : null
                      }
                    />
                  );
                })
              )}
            </div>
          </DashboardCard>

          {/* My Coach */}
          {hasActiveCoach ? (
            <DashboardCard
              role={role}
              title="My Coach"
              action={{
                label: "View Profile",
                onClick: () => navigate(`/coaches/${coach.coach_id}`),
              }}
              footer={
                <div className="flex gap-2">
                  <button
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-2 text-sm font-medium transition-colors"
                    onClick={handleOpenCoachChat}
                    disabled={openingCoachChat || !relationshipId}
                  >
                    {openingCoachChat ? "Opening..." : "💬 Message"}
                  </button>
                  {relationshipId ? (
                    <button
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-xl py-2 text-sm font-medium transition-colors"
                      onClick={handleTerminateRelationship}
                      disabled={terminatingRelationship}
                    >
                      {terminatingRelationship ? "Ending..." : "End Relationship"}
                    </button>
                  ) : null}
                </div>
              }
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-blue-900/40 flex items-center justify-center text-blue-400 font-bold shrink-0">
                  {coach.name
                    ?.split(" ")
                    .map((n) => n[0])
                    .join("") ?? "?"}
                </div>
                <div>
                  <p className="text-white font-bold">{coach.name}</p>
                  <p className="text-gray-400 text-xs">{coach.specialty}</p>
                  <p className="text-yellow-400 text-xs mt-0.5">
                    {coachRating
                      ? `★ ${coachRating.avg} · ${coachRating.review_count} reviews`
                      : "—"}
                  </p>
                </div>
              </div>
            </DashboardCard>
          ) : (
            /*  No Coach — Find a Coach CTA  */
            <DashboardCard
              role={role}
              title="Find Coach"
              action={{
                label: "Browse coaches",
                onClick: () => navigate("/find-coach"),
              }}
            >
              <div className="flex flex-col items-center justify-center py-4 text-center">
                <div className="w-16 h-16 rounded-full bg-blue-900/20 flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-blue-400/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                </div>
                <p className="text-white font-semibold text-sm mb-1">
                  No coach yet
                </p>
                <p className="text-gray-500 text-xs leading-relaxed mb-4 max-w-[200px]">
                  Get paired with a certified coach to unlock personalized workouts, nutrition plans, and 1-on-1 sessions.
                </p>
                <button
                  onClick={() => navigate("/find-coach")}
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-6 py-2.5 text-sm font-medium transition-colors shadow-[0_0_20px_rgba(59,130,246,0.2)]"
                >
                  Find a Coach
                </button>
              </div>
            </DashboardCard>
          )}

        </div>

        {/*  NUTRITION DETAIL  */}
        <SectionHeader label="NUTRITION DETAIL" role={role} />

        {/* Today's Meals card — at-a-glance summary of what's been logged
            grouped by meal kind, with a calorie-progress footer that mirrors
            the calories ring at the top of the dashboard. The bigger
            tracker (logging, building, plan-from-coach) lives in the
            overlay; this card is just the quick view + entry point. */}
        <DashboardCard
          role={role}
          title="Today's Meals"
          action={{
            label: "Open Tracker",
            onClick: () => setOverlay("meals"),
          }}
          footer={
            <div className="pt-3 border-t border-white/5 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-500 uppercase tracking-widest">
                  Today's Calories
                </span>
                <span className="text-white font-semibold">
                  <span className="text-blue-400">
                    {Math.round(caloriesConsumed ?? 0)}
                  </span>
                  <span className="text-gray-500"> / {caloriesGoal} kcal</span>
                </span>
              </div>
              <div className="h-1.5 bg-[#0A1020] rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-blue-400 transition-all duration-700"
                  style={{
                    width: `${Math.min(100, Math.round(((caloriesConsumed ?? 0) / Math.max(1, caloriesGoal)) * 100))}%`,
                  }}
                />
              </div>
            </div>
          }
        >
          {prescribedMeals.length === 0 ? (
            <button
              onClick={() => setOverlay("meals")}
              className="w-full border border-dashed border-blue-500/30 text-blue-400 rounded-xl py-6 text-sm font-medium hover:bg-blue-500/5 transition-colors"
            >
              + Log your first meal of the day
            </button>
          ) : (
            <MealsByKind meals={prescribedMeals} />
          )}
        </DashboardCard>

      </div>

      {/* ═══════════════════════════════════════════════════════════════
          OVERLAYS — rendered on top of the dashboard
          ═══════════════════════════════════════════════════════════════ */}

      {/* Workout Plan Popup */}
      {selectedCwpData && (
        <WorkoutPlanPopup
          cwp={selectedCwpData.cwp}
          plan={selectedCwpData.plan}
          occurrenceStart={selectedCwpData.occurrenceStart}
          occurrenceEnd={selectedCwpData.occurrenceEnd}
          isToday={activeDay === TODAY_IDX}
          localDate={getWeekDateForIdx(activeDay)}
          onDelete={() => handleDeleteCwp(selectedCwpData.cwp.id)}
          onLog={handleLogWorkoutActivity}
          onClose={() => setSelectedCwpData(null)}
        />
      )}

      {/* Meals */}
      <Overlay
        open={overlay === "meals"}
        onClose={closeOverlay}
        title="Meal Log"
      >
        <MealDetail
          meals={prescribedMeals}
          onLogMeal={handleLogMeal}
          onAfterLog={handleAfterMealLog}
        />
      </Overlay>

      {/* Daily Survey */}
      <Overlay
        open={overlay === "survey"}
        onClose={closeOverlay}
        title="Daily Check-in"
        wide
      >
        <DailySurvey clientId={clientId} onCompleted={refreshSurveyStatus} />

      </Overlay>

      {/* Steps Log */}
      <Overlay
        open={overlay === "steps"}
        onClose={closeOverlay}
        title="Log Today's Steps"
      >
        <StepsLog
          status={surveyStatus.steps}
          recent={stepsRecent}
          onSubmitted={(_response, updatedRecent) => {
            if (Array.isArray(updatedRecent)) {
              setStepsRecent(updatedRecent);
              const latest = updatedRecent[0];
              if (latest && isFromToday(latest) && Number.isFinite(Number(latest.step_count))) {
                setStepCount(Number(latest.step_count));
              }
            }
            refreshStepsOnly();
            closeOverlay();
          }}
        />
      </Overlay>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   MEALS BY KIND — compact today's-meals breakdown for the dashboard card.
   Groups logged meals into Breakfast/Lunch/Dinner/Snack rows so the user
   sees structure at a glance instead of one long flat list.
   ═══════════════════════════════════════════════════════════════════════ */

const MEAL_KIND_ORDER = ["breakfast", "lunch", "dinner", "snack"];
const MEAL_KIND_ICON = {
  breakfast: "🍳",
  lunch: "🥗",
  dinner: "🍽️",
  snack: "🍎",
  anytime: "🍴",
};

function MealsByKind({ meals }) {
  // Bucket logs by kind; meals without a tag drop into "anytime".
  const grouped = MEAL_KIND_ORDER.reduce((acc, k) => ({ ...acc, [k]: [] }), { anytime: [] });
  for (const m of meals) {
    const k = m.meal_kind && grouped[m.meal_kind] ? m.meal_kind : "anytime";
    grouped[k].push(m);
  }
  // Render only the kinds that actually have rows so empty sections don't
  // pad the card.
  const visibleKinds = [...MEAL_KIND_ORDER, "anytime"].filter((k) => grouped[k].length > 0);

  return (
    <div className="space-y-3">
      {visibleKinds.map((kind) => {
        const items = grouped[kind];
        const sumKcal = items.reduce((acc, m) => acc + (m.calories || 0), 0);
        return (
          <div key={kind} className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-widest text-gray-400 flex items-center gap-1.5">
                <span className="text-sm">{MEAL_KIND_ICON[kind]}</span>
                {kind}
              </span>
              <span className="text-[10px] text-orange-400 font-semibold">
                {Math.round(sumKcal)} kcal
              </span>
            </div>
            {items.map((meal) => (
              <div
                key={meal.id}
                className="flex items-center justify-between rounded-lg bg-[#0A1020] border border-white/5 px-3 py-2"
              >
                <span className="text-white text-sm truncate flex-1">
                  {meal.meal_name || "Unnamed meal"}
                </span>
                <span className="text-gray-500 text-[10px] mx-2 whitespace-nowrap">
                  P {Math.round(meal.protein_g || 0)}g · C {Math.round(meal.carbs_g || 0)}g · F {Math.round(meal.fat_g || 0)}g
                </span>
                <span className="text-orange-400 text-xs font-bold whitespace-nowrap">
                  {Math.round(meal.calories || 0)} kcal
                </span>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   DAILY CHECK-IN BANNER — compact summary card with progress + open button
   ═══════════════════════════════════════════════════════════════════════ */

/* ═══════════════════════════════════════════════════════════════════════
   APPRECIATION CARD — random past gratitude entry, shown under steps card.
   Distinguishes three states so the card always has copy:
     - null             → still loading
     - "" (empty)       → no past appreciation logged yet
     - "<text>"         → real entry to display in italic quotes
   ═══════════════════════════════════════════════════════════════════════ */

function AppreciationCard({ appreciation }) {
  const isLoading = appreciation === null;
  const isEmpty = appreciation === "";
  return (
    <div className="rounded-2xl border border-white/6 bg-[#0F1729] p-4 flex flex-col justify-between min-h-[80px]">
      <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-2">
        Something to remember
      </p>
      {isLoading ? (
        <p className="text-xs text-gray-600 italic">Loading…</p>
      ) : isEmpty ? (
        <p className="text-xs text-gray-600 italic leading-relaxed">
          Nothing logged yet. Fill in today&apos;s mood check-in to start
          building a list of things you&apos;re grateful for.
        </p>
      ) : (
        <p className="text-sm text-white leading-relaxed italic">
          &ldquo;{appreciation}&rdquo;
        </p>
      )}
    </div>
  );
}

function DailyCheckInBanner({ status, onOpen }) {
  // Steps has its own dashboard card and isn't part of the check-in overlay,
  // so the banner only counts the three things the overlay actually drives:
  // mood, body metrics, progress picture.
  const sections = [
    { key: "mood", label: "Mood" },
    { key: "body_metrics", label: "Body" },
    { key: "progress_pic", label: "Photo" },
  ];
  const availableSections = sections.filter((s) => status?.[s.key] !== null);
  const completed = availableSections.filter((s) => status?.[s.key]?.is_finished).length;
  const allDone = availableSections.length > 0 && completed === availableSections.length;
  const allUnavailable = availableSections.length === 0;

  return (
    <div className="rounded-2xl border border-white/10 bg-gradient-to-r from-blue-500/10 via-blue-500/5 to-transparent px-5 py-4 flex items-center justify-between gap-4 flex-wrap">
      <div className="flex items-center gap-4 min-w-0">
        <span className="text-2xl">{allUnavailable ? "⚠" : allDone ? "✓" : "📋"}</span>
        <div className="min-w-0">
          <p className="text-white font-bold text-sm">
            {allUnavailable
              ? "Daily check-in offline"
              : allDone
                ? "Daily check-in complete"
                : "Daily check-in"}
          </p>
          <p className="text-gray-400 text-xs mt-0.5">
            {allUnavailable
              ? "Survey endpoints aren't reachable right now."
              : allDone
                ? "Nice work — see you tomorrow."
                : `${completed} of ${availableSections.length} done · log your day`}
          </p>
          <div className="flex gap-1.5 mt-2">
            {sections.map((section) => {
              const sectionStatus = status?.[section.key];
              const unavailable = sectionStatus === null;
              const done = sectionStatus?.is_finished;
              const className = unavailable
                ? "bg-red-500/15 text-red-400"
                : done
                  ? "bg-green-500/15 text-green-400"
                  : "bg-white/5 text-gray-400";
              return (
                <span
                  key={section.key}
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold ${className}`}
                  title={unavailable ? "Unavailable" : done ? "Submitted" : "Pending"}
                >
                  {section.label}
                </span>
              );
            })}
          </div>
        </div>
      </div>
      <button
        onClick={onOpen}
        className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-500 transition-colors shrink-0"
      >
        {allUnavailable ? "View" : allDone ? "Review" : completed > 0 ? "Continue" : "Open Check-in"}
      </button>
    </div>
  );
}
