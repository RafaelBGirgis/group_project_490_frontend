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
import CoachProfile from "../components/overlays/coach_profile";
import AvailabilityDetail from "../components/overlays/availability_detail";
import MealDetail from "../components/overlays/meal_detail";
import {
  fetchMe,
  fetchClientProfile,
  fetchTelemetryToday,
  fetchWorkoutPlan,
  logWorkoutActivity,
  fetchCoachInfo,
  fetchCoachRating,
  fetchNextSession,
  fetchAvailability,
  saveAvailability,
  fetchMealsToday,
  logMeal,
} from "../api/client";

const role = "client";
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const TODAY_IDX = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;
const pct = (val, max) => Math.min(100, Math.round((val / max) * 100));

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

  /* ── auth guard ──────────────────────────────────────────────────── */
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("jwt");
    if (!token) {
      navigate("/login");
      return;
    }
    setAuthed(true);
  }, [navigate]);

  /* ── overlay state ──────────────────────────────────────────────── */
  const [overlay, setOverlay] = useState(null); // "workout" | "coach" | "availability" | "meals" | null
  const closeOverlay = () => setOverlay(null);

  /* ── core state ──────────────────────────────────────────────────── */
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
  const [nextSession, setNextSession]   = useState(null);
  const [availabilitySlots, setAvailabilitySlots] = useState([]);
  const [prescribedMeals, setPrescribedMeals] = useState([]);
  const [loading, setLoading]           = useState(true);

  /* ── load account + client profile ──────────────────────────────── */
  useEffect(() => {
    if (!authed) return;

    (async () => {
      try {
        const me = await fetchMe();
        setAccount(me);

        if (me.client_id) {
          setClientId(me.client_id);
          try {
            await fetchClientProfile();
          } catch { /* profile fetch optional */ }
        }
      } catch {
        // fetchMe will redirect on 401
      } finally {
        setLoading(false);
      }
    })();
  }, [authed]);

  /* ── load dashboard data once we have a clientId ────────────────── */
  useEffect(() => {
    if (!clientId) return;

    (async () => {
      const [telemetry, coachInfo, session, availability, meals] =
        await Promise.all([
          fetchTelemetryToday(clientId),
          fetchCoachInfo(clientId),
          fetchNextSession(clientId),
          fetchAvailability(clientId),
          fetchMealsToday(clientId),
        ]);

      setStepCount(telemetry.step_count);
      setCaloriesBurned(telemetry.calories_burned);
      setCaloriesConsumed(telemetry.calories_consumed);
      if (telemetry.calories_goal) setCaloriesGoal(telemetry.calories_goal);

      setCoach(coachInfo);
      setNextSession(session);
      setAvailabilitySlots(availability);
      setPrescribedMeals(meals);
    })();
  }, [clientId]);

  /* ── load coach rating when coach is known ──────────────────────── */
  useEffect(() => {
    if (!coach?.coach_id) return;
    fetchCoachRating(coach.coach_id).then(setCoachRating);
  }, [coach]);

  /* ── load workout plan when day changes ─────────────────────────── */
  const loadWorkouts = useCallback(async () => {
    if (!clientId) return;
    const data = await fetchWorkoutPlan(clientId, activeDay);
    setWorkoutPlan({ strata_name: data.strata_name });
    setWorkoutActivities(data.activities ?? []);
  }, [clientId, activeDay]);

  useEffect(() => { loadWorkouts(); }, [loadWorkouts]);

  /* ── log a workout activity ─────────────────────────────────────── */
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

  /* ── log a meal ─────────────────────────────────────────────────── */
  const handleLogMeal = async (mealPayload) => {
    const newMeal = {
      id: Date.now(),
      meal_type: mealPayload.meal_type,
      meal_name: mealPayload.meal_name,
      calories: mealPayload.calories,
    };
    setPrescribedMeals((prev) => [...prev, newMeal]);
    setCaloriesConsumed((prev) => (prev ?? 0) + mealPayload.calories);
    try {
      await logMeal(clientId, mealPayload);
    } catch {
      setPrescribedMeals((prev) => prev.filter((m) => m.id !== newMeal.id));
      setCaloriesConsumed((prev) => (prev ?? 0) - mealPayload.calories);
    }
  };

  /* ── derived values ─────────────────────────────────────────────── */
  const completedCount = workoutActivities.filter((a) => a.logged).length;
  const totalCount     = workoutActivities.length;
  const stepsPercent   = pct(stepCount ?? 0, 10000);
  const calPercent     = pct(caloriesConsumed ?? 0, caloriesGoal);
  const workoutPercent = pct(completedCount, totalCount || 1);

  /* ── greeting based on time of day ──────────────────────────────── */
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";

  /* ── loading skeleton ────────────────────────────────────────────── */
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

  /* ── split name for greeting card ───────────────────────────────── */
  const nameParts = (account?.name ?? "").split(" ");
  const firstName = nameParts[0] || "—";
  const lastName  = nameParts.slice(1).join(" ") || "";

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#080D19" }}>
      <Navbar
        role={role}
        userName={
          account?.name
            ? account.name.split(" ").map((n) => n[0]).join("").toUpperCase()
            : "?"
        }
      />

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* ─── FITNESS & NUTRITION ────────────────────────────────── */}
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
                stepCount !== null
                  ? `↑ ${stepsPercent}% of daily goal`
                  : "Loading..."
              }
              progress={stepsPercent}
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

        {/* ─── WORKOUT & COACH ────────────────────────────────────── */}
        <SectionHeader label="WORKOUT & COACH" role={role} />

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
                onClick={() => navigate("/workouts?role=client")}
                className="w-full py-2 rounded-xl border border-blue-500/30 text-blue-400 text-xs font-semibold hover:bg-blue-500/10 transition-colors"
              >
                Browse & Build Workouts
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
          {coach ? (
            <DashboardCard
              role={role}
              title="My Coach"
              action={{
                label: "View Profile",
                onClick: () => setOverlay("coach"),
              }}
              footer={
                <div className="flex gap-2">
                  <button
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-2 text-sm font-medium transition-colors"
                    onClick={() => navigate("/chat")}
                  >
                    💬 Message
                  </button>
                  <button
                    className="flex-1 border border-gray-700 text-gray-300 hover:bg-gray-800 rounded-xl py-2 text-sm transition-colors"
                    onClick={() => setOverlay("workout")}
                  >
                    📋 View Plan
                  </button>
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

              <div className="bg-[#0A1020] rounded-xl p-3">
                <p className="text-[10px] text-gray-500 uppercase tracking-widest">
                  Next Session
                </p>
                <div className="flex justify-between items-center mt-1">
                  <p className="text-white text-sm font-medium">
                    {nextSession
                      ? `${nextSession.weekday} · ${nextSession.start_time}`
                      : "—"}
                  </p>
                  <StatusBadge label="Upcoming" variant="warning" />
                </div>
              </div>
            </DashboardCard>
          ) : (
            /* ── No Coach — Find a Coach CTA ─────────────────────── */
            <DashboardCard role={role} title="My Coach">
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

        {/* ─── NUTRITION DETAIL ───────────────────────────────────── */}
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
                Total Consumed
              </span>
              <span className="text-white font-bold">
                {prescribedMeals.reduce((s, m) => s + m.calories, 0)} kcal
              </span>
            </div>
          }
        >
          {prescribedMeals.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-4">
              No meals prescribed for today
            </p>
          ) : (
            <div className="space-y-2">
              {prescribedMeals.map((meal) => (
                <ListRow
                  key={meal.id}
                  label={`${meal.meal_type} — ${meal.meal_name}`}
                  right={
                    <span className="text-orange-400 font-semibold text-sm">
                      {meal.calories} kcal
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
      <Overlay
        open={overlay === "coach"}
        onClose={closeOverlay}
        title="Coach Profile"
      >
        <CoachProfile
          coach={coach}
          rating={coachRating}
          nextSession={nextSession}
          onMessage={() => {
            closeOverlay();
            // future: open messaging overlay or navigate
          }}
        />
      </Overlay>

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
            await saveAvailability(account.client_id, updatedSlots);
            setAvailabilitySlots(updatedSlots);
          }}
        />
      </Overlay>

      {/* Meals */}
      <Overlay
        open={overlay === "meals"}
        onClose={closeOverlay}
        title="Today's Nutrition"
      >
        <MealDetail
          meals={prescribedMeals}
          onLogMeal={handleLogMeal}
          caloriesConsumed={caloriesConsumed}
          caloriesGoal={caloriesGoal}
        />
      </Overlay>
    </div>
  );
}
