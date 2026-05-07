import { useNavigate } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";
import {
  Navbar,
  StatCard,
  DashboardCard,
  ProgressRing,
  DayTabs,
  ListRow,
  StatusBadge,
  SectionHeader,
  Overlay,
  SkeletonStatCard,
  SkeletonDashCard,
  SkeletonGreeting,
  SkeletonRing,
  SkeletonAvailability,
} from "../components";
import WorkoutDetail from "../components/overlays/workout_detail";
import AvailabilityDetail from "../components/overlays/availability_detail";
import MealDetail from "../components/overlays/meal_detail";
import DailySurvey from "../components/overlays/daily_survey";
import StepsLog from "../components/overlays/steps_log";
import {
  fetchMe,
  fetchClientProfile,
  fetchTelemetryToday,
  fetchWorkoutPlan,
  logWorkoutActivity,
  fetchMyCoach,
  fetchCoachRating,
  fetchAvailability,
  saveAvailability,
  fetchMealsToday,
  fetchAvailableOnDemandMeals,
  fetchMyCoachRequests,
  logMeal,
  deleteCoachRequest,
  terminateRelationship,
} from "../api/client";
import {
  fetchAllDailySurveys,
  fetchDailyStepsSurvey,
  fetchStepHistory,
} from "../api/survey";
import { getConversationWithAccount } from "../api/chat";
import {
  isApprovedCoachRequest,
  isPendingCoachRequest,
  resolveActiveCoachRelationship,
} from "../utils/coachRequests";
import { rememberTerminatedRelationshipId } from "../utils/terminatedRelationships";
import { getCoachAccessState } from "../utils/roleAccess";
import { resolveRoleState } from "../utils/sessionAuth";

const role = "client";
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const TODAY_IDX = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;
const pct = (val, max) => Math.min(100, Math.round((val / max) * 100));

function summarizeAvailability(rows) {
  const safeRows = Array.isArray(rows) ? rows : [];
  const openSlots = safeRows.reduce(
    (sum, row) => sum + (Array.isArray(row.slots) ? row.slots.filter((slot) => slot === "available").length : 0),
    0
  );
  const bookedSlots = safeRows.reduce(
    (sum, row) => sum + (Array.isArray(row.slots) ? row.slots.filter((slot) => slot === "booked").length : 0),
    0
  );
  const activeDays = WEEKDAYS.reduce(
    (sum, _, dayIdx) => sum + (safeRows.some((row) => row.slots?.[dayIdx] === "available") ? 1 : 0),
    0
  );
  return { openSlots, bookedSlots, activeDays };
}

const SlotCell = ({ status, time }) => {
  const base =
    "rounded py-1 text-center text-[10px] font-medium transition-colors";
  if (status === "booked")
    return (
      <div className={`${base} bg-orange-900/60 text-orange-300`}>{time}</div>
    );
  if (status === "available")
    return <div className={`${base} bg-blue-900/60 text-blue-300`}>{time}</div>;
  return <div className={`${base} bg-[#0A1020] text-gray-700`}>—</div>;
};

export default function ClientDash() {
  const navigate = useNavigate();

  /*  auth guard  */
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    setAuthed(true);
  }, [navigate]);

  /*  overlay state  */
  const [overlay, setOverlay] = useState(null); // "workout" | "coach" | "availability" | "meals" | "survey" | "steps" | null
  const closeOverlay = () => setOverlay(null);

  /*  daily survey state  */
  const [surveyStatus, setSurveyStatus] = useState({ mood: null, body_metrics: null, steps: null });
  const [stepsRecent, setStepsRecent] = useState([]);

  const refreshSurveyStatus = useCallback(async () => {
    try {
      const [all, recent] = await Promise.all([
        fetchAllDailySurveys(),
        fetchStepHistory({ limit: 7 }),
      ]);
      setSurveyStatus(all);
      setStepsRecent(recent);
      // If we have a recent step entry from today, surface it on the card.
      const latest = recent?.[0];
      if (latest && Number.isFinite(Number(latest.step_count))) {
        setStepCount(Number(latest.step_count));
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
      if (latest && Number.isFinite(Number(latest.step_count))) {
        setStepCount(Number(latest.step_count));
      }
    } catch {
      // Ignore — card just keeps last known data.
    }
  }, []);

  /*  core state  */
  const [account, setAccount]           = useState(null);
  const [clientId, setClientId]         = useState(null);
  const [activeDay, setActiveDay]       = useState(TODAY_IDX);
  const [stepCount, setStepCount]       = useState(null);
  const [caloriesBurned, setCaloriesBurned] = useState(null);
  const [caloriesConsumed, setCaloriesConsumed] = useState(null);
  const [caloriesGoal, setCaloriesGoal] = useState(2000);
  const [workoutPlan, setWorkoutPlan]   = useState(null);
  const [workoutActivities, setWorkoutActivities] = useState([]);
  const [coach, setCoach]               = useState(null);
  const [coachRating, setCoachRating]   = useState(null);
  const [availabilitySlots, setAvailabilitySlots] = useState([]);
  const [prescribedMeals, setPrescribedMeals] = useState([]);
  const [availableMeals, setAvailableMeals] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [relationshipId, setRelationshipId] = useState(null);
  const [canSwitchToCoach, setCanSwitchToCoach] = useState(false);
  const [canSwitchToAdmin, setCanSwitchToAdmin] = useState(false);
  const [pendingCoachRequest, setPendingCoachRequest] = useState(null);
  const [approvedCoachRequest, setApprovedCoachRequest] = useState(null);
  const [requestStatusError, setRequestStatusError] = useState("");
  const [requestStatusMessage, setRequestStatusMessage] = useState("");
  const [openingCoachChat, setOpeningCoachChat] = useState(false);
  const [terminatingRelationship, setTerminatingRelationship] = useState(false);
  const [availabilityMessage, setAvailabilityMessage] = useState("");

  const refreshCoachRelationshipState = useCallback(async () => {
    const [requestList, myCoach] = await Promise.all([
      fetchMyCoachRequests().catch(() => null),
      fetchMyCoach().catch(() => null),
    ]);
    const { activeCoach, byCoachId } = resolveActiveCoachRelationship(myCoach, requestList);
    const requestValues = Object.values(byCoachId);
    const nextApproved =
      requestValues
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
    return { nextPending, nextApproved, myCoach: nextCoach };
  }, []);

  /*  load account + client profile  */
  useEffect(() => {
    if (!authed) return;

    (async () => {
      try {
        const me = await fetchMe();
        setAccount(me);
        const roleState = await resolveRoleState();
        setCanSwitchToAdmin(roleState.hasAdminRole);
        const coachAccess = await getCoachAccessState(me);
        setCanSwitchToCoach(roleState.hasAdminRole || coachAccess.canAccessCoach);

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
      void refreshCoachRelationshipState();
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

    (async () => {
      try {
        const [telemetry, availability, meals, mealOptions] =
          await Promise.all([
            fetchTelemetryToday(clientId).catch(() => ({
              step_count: 0,
              calories_burned: 0,
              calories_consumed: 0,
              calories_goal: 2000,
            })),
            fetchAvailability(clientId).catch(() => []),
            fetchMealsToday(clientId).catch(() => []),
            fetchAvailableOnDemandMeals(clientId).catch(() => []),
          ]);

        setStepCount(telemetry.step_count);
        setCaloriesBurned(telemetry.calories_burned);
        setCaloriesConsumed(telemetry.calories_consumed);
        if (telemetry.calories_goal) setCaloriesGoal(telemetry.calories_goal);

        setAvailabilitySlots(Array.isArray(availability) ? availability : []);
        setPrescribedMeals(meals);
        setAvailableMeals(mealOptions);
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

  /*  load workout plan when day changes  */
  const loadWorkouts = useCallback(async () => {
    if (!clientId) return;
    const data = await fetchWorkoutPlan(clientId, activeDay);
    setWorkoutPlan({ strata_name: data.strata_name });
    setWorkoutActivities(data.activities ?? []);
  }, [clientId, activeDay]);

  useEffect(() => { loadWorkouts(); }, [loadWorkouts]);

  /*  log a workout activity  */
  const handleLogActivity = async (activityId) => {
    setWorkoutActivities((prev) =>
      prev.map((a) => (a.id === activityId ? { ...a, logged: true } : a))
    );
    try {
      await logWorkoutActivity(clientId, activityId);
    } catch {
      setWorkoutActivities((prev) =>
        prev.map((a) => (a.id === activityId ? { ...a, logged: false } : a))
      );
    }
  };

  /*  log a meal  */
  const handleLogMeal = async (mealPayload) => {
    // Backend throws if neither id is provided or the id is invalid; surface
    // the failure so the overlay can show it. On success, refetch the list
    // from telemetry so the new entry appears with its server id.
    await logMeal(clientId, mealPayload);
    try {
      const refreshed = await fetchMealsToday(clientId);
      setPrescribedMeals(refreshed);
    } catch {
      // Refresh failure is non-fatal — list will pick up the new row on next mount.
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
  const completedCount = workoutActivities.filter((a) => a.logged).length;
  const totalCount     = workoutActivities.length;
  const stepsPercent   = pct(stepCount ?? 0, 10000);
  const calPercent     = pct(caloriesConsumed ?? 0, caloriesGoal);
  const workoutPercent = pct(completedCount, totalCount || 1);
  const availabilitySummary = summarizeAvailability(availabilitySlots);
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
  const lastName  = nameParts.slice(1).join(" ") || "";

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
                    ? `Logged · ${stepsPercent}% of daily goal`
                    : stepCount !== null
                      ? `Tap to log · ${stepsPercent}% of daily goal`
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
            <StatCard
              role={role}
              label="CALORIES BURNED"
              value={caloriesBurned !== null ? `${caloriesBurned} kcal` : "—"}
              sub="from logged workouts"
            />
          </div>

          <DashboardCard role={role} title="Calories" className="items-center">
            <div className="flex justify-center">
              <ProgressRing
                role={role}
                percent={calPercent}
                size={120}
                label={
                  caloriesConsumed !== null ? caloriesConsumed.toString() : "—"
                }
                sublabel={`of ${caloriesGoal} kcal`}
              />
            </div>
          </DashboardCard>

          <DashboardCard role={role} title="Progress" className="items-center">
            <div className="flex justify-center">
              <ProgressRing
                role={role}
                percent={workoutPercent}
                size={120}
                label={`${workoutPercent}%`}
                sublabel="weekly goal"
              />
            </div>
            <div className="w-full bg-[#0A1020] rounded-xl px-4 py-2 text-center mt-2">
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
                  onClick={() => navigate("/find-coach")}
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

        <div className="grid grid-cols-3 gap-4 items-stretch">
          {/* Today's Workout */}
          <DashboardCard
            role={role}
            title={`Today's Workout: ${workoutPlan?.strata_name ?? "—"}`}
            action={{
              label: "View all",
              onClick: () => setOverlay("workout"),
            }}
            footer={
              <button
                onClick={() => navigate("/plan?role=client")}
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
              {workoutActivities.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-4">
                  No activities for this day
                </p>
              ) : (
                workoutActivities.map((activity) => (
                  <ListRow
                    key={activity.id}
                    label={activity.name}
                    sub={`${activity.suggested_sets} sets · ${activity.suggested_reps} reps · ${activity.intensity_value} ${activity.intensity_measure}`}
                    right={
                      activity.logged ? (
                        <StatusBadge label="Logged ✓" variant="success" />
                      ) : (
                        <button
                          className="text-blue-400 text-xs border border-blue-500/50 rounded-full px-3 py-1 hover:bg-blue-500/10 transition-colors"
                          onClick={() => handleLogActivity(activity.id)}
                        >
                          Log →
                        </button>
                      )
                    }
                  />
                ))
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

          {/* Availability */}
          <DashboardCard
            role={role}
            title="Availability"
            action={{
              label: "Edit Schedule",
              onClick: () => setOverlay("availability"),
            }}
          >
            {availabilityMessage ? (
              <div className="mb-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
                {availabilityMessage}
              </div>
            ) : null}
            <div className="mb-3 grid grid-cols-3 gap-2">
              <div className="rounded-lg bg-[#0A1020] px-3 py-2 text-center">
                <p className="text-lg font-bold text-blue-300">{availabilitySummary.openSlots}</p>
                <p className="text-[10px] uppercase tracking-widest text-gray-500">Open Slots</p>
              </div>
              <div className="rounded-lg bg-[#0A1020] px-3 py-2 text-center">
                <p className="text-lg font-bold text-white">{availabilitySummary.activeDays}</p>
                <p className="text-[10px] uppercase tracking-widest text-gray-500">Active Days</p>
              </div>
              <div className="rounded-lg bg-[#0A1020] px-3 py-2 text-center">
                <p className="text-lg font-bold text-orange-300">{availabilitySummary.bookedSlots}</p>
                <p className="text-[10px] uppercase tracking-widest text-gray-500">Booked</p>
              </div>
            </div>
            <p className="mb-3 text-xs text-gray-500">
              Saved as one-hour windows through your client availability route.
            </p>
            <div className="grid grid-cols-8 gap-1 mb-2">
              <div />
              {WEEKDAYS.map((d) => (
                <div
                  key={d}
                  className="text-[10px] text-gray-500 text-center font-medium"
                >
                  {d}
                </div>
              ))}
            </div>

            {availabilitySlots.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-6">
                No availability set
              </p>
            ) : (
              availabilitySlots.map(({ time, slots }) => (
                <div key={time} className="grid grid-cols-8 gap-1 mb-1">
                  <div className="text-[10px] text-gray-500 flex items-center">
                    {time}
                  </div>
                  {slots.map((status, i) => (
                    <SlotCell key={i} status={status} time={time} />
                  ))}
                </div>
              ))
            )}

            <div className="flex gap-4 mt-3">
              {[
                { color: "bg-blue-400", label: "Available" },
                { color: "bg-orange-400", label: "Booked" },
                { color: "bg-gray-600", label: "Unavailable" },
              ].map(({ color, label }) => (
                <span
                  key={label}
                  className="flex items-center gap-1.5 text-[10px] text-gray-400"
                >
                  <span className={`w-2 h-2 rounded-full ${color}`} />
                  {label}
                </span>
              ))}
            </div>
          </DashboardCard>
        </div>

        {/*  NUTRITION DETAIL  */}
        <SectionHeader label="NUTRITION DETAIL" role={role} />

        <DashboardCard
          role={role}
          title="Today's Meals"
          action={{
            label: "Log Meal +",
            onClick: () => setOverlay("meals"),
          }}
          footer={
            <div className="pt-3 border-t border-white/5 flex justify-between items-center">
              <span className="text-xs text-gray-500 uppercase tracking-widest">
                Logged
              </span>
              <span className="text-white font-bold">
                {prescribedMeals.length}
              </span>
            </div>
          }
        >
          {prescribedMeals.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-4">
              No meals logged yet
            </p>
          ) : (
            <div className="space-y-2">
              {prescribedMeals.slice(0, 5).map((meal) => (
                <ListRow
                  key={meal.id}
                  label={meal.meal_name || "Logged Meal"}
                  right={
                    <span className="text-[11px] text-gray-400">
                      {meal.logged_at
                        ? new Date(meal.logged_at).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                          })
                        : ""}
                    </span>
                  }
                />
              ))}
            </div>
          )}
        </DashboardCard>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          OVERLAYS — rendered on top of the dashboard
          ═══════════════════════════════════════════════════════════════ */}

      {/* Workout Detail */}
      <Overlay
        open={overlay === "workout"}
        onClose={closeOverlay}
        title={`Workout Plan — ${workoutPlan?.strata_name ?? "Today"}`}
        wide
      >
        <WorkoutDetail
          planName={workoutPlan?.strata_name}
          activities={workoutActivities}
          weekdays={WEEKDAYS}
          activeDay={activeDay}
          onDayChange={setActiveDay}
          onLog={handleLogActivity}
        />
      </Overlay>

      {/* Coach Profile */}
      {/* Availability */}
      <Overlay
        open={overlay === "availability"}
        onClose={closeOverlay}
        title="Your Availability"
        wide
      >
        <AvailabilityDetail
          slots={availabilitySlots}
          weekdays={WEEKDAYS}
          role="client"
          onSave={async (updatedSlots) => {
            setAvailabilityMessage("");
            const refreshedAvailability = await saveAvailability(clientId, updatedSlots);
            setAvailabilitySlots(Array.isArray(refreshedAvailability) ? refreshedAvailability : []);
            setAvailabilityMessage("Availability saved to your client profile.");
          }}
        />
      </Overlay>

      {/* Meals */}
      <Overlay
        open={overlay === "meals"}
        onClose={closeOverlay}
        title="Meal Log"
      >
        <MealDetail
          meals={prescribedMeals}
          availableMeals={availableMeals}
          onLogMeal={handleLogMeal}
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
              if (latest && Number.isFinite(Number(latest.step_count))) {
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
   DAILY CHECK-IN BANNER — compact summary card with progress + open button
   ═══════════════════════════════════════════════════════════════════════ */

function DailyCheckInBanner({ status, onOpen }) {
  const sections = [
    { key: "mood", label: "Mood" },
    { key: "body_metrics", label: "Body" },
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
