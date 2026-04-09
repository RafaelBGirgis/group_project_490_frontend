import { useState, useEffect } from "react";
import {
  Navbar,
  StatCard,
  DashboardCard,
  ProgressRing,
  DayTabs,
  ListRow,
  StatusBadge,
  SectionHeader,
} from "../components";

const role = "client";
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const TODAY_IDX = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;

const pct = (val, max) => Math.min(100, Math.round((val / max) * 100));

const SlotCell = ({ status, time }) => {
  const base = "rounded py-1 text-center text-[10px] font-medium transition-colors";
  if (status === "booked")
    return <div className={`${base} bg-orange-900/60 text-orange-300`}>{time}</div>;
  if (status === "available")
    return <div className={`${base} bg-blue-900/60 text-blue-300`}>{time}</div>;
  return <div className={`${base} bg-[#0A1020] text-gray-700`}>—</div>;
};

export default function ClientDash() {
  const [activeDay, setActiveDay] = useState(TODAY_IDX);

  
  const [account, setAccount] = useState(null);
  useEffect(() => {
    // TODO: GET /api/account/:id
    // setAccount(data)
    setAccount({ first_name: "John", last_name: "Doe" });
  }, []);

  
  const [stepCount, setStepCount] = useState(null);
  useEffect(() => {
    // TODO: GET /api/client/:id/telemetry/today → step_count.count
    // setStepCount(data.count)
    setStepCount(8241);
  }, []);

  
  const [caloriesBurned, setCaloriesBurned] = useState(null);
  useEffect(() => {
    // TODO: GET /api/client/:id/telemetry/today → SUM(calories_burned)
    // setCaloriesBurned(data.total)
    setCaloriesBurned(540);
  }, []);

  
  const [caloriesConsumed, setCaloriesConsumed] = useState(null);
  useEffect(() => {
    // TODO: GET /api/client/:id/telemetry/today → SUM(meal.calories)
    // setCaloriesConsumed(data.total)
    setCaloriesConsumed(1438);
  }, []);
  const caloriesGoal = 2000;

  
  const [workoutPlan, setWorkoutPlan] = useState(null);
  const [workoutActivities, setWorkoutActivities] = useState([]);
  useEffect(() => {
    // TODO: GET /api/client/:id/workout-plan?day=:weekday_id
    // setWorkoutPlan(data.plan)
    // setWorkoutActivities(data.activities)
    setWorkoutPlan({ strata_name: "Push Day" });
    setWorkoutActivities([
      { id: 1, name: "Bench Press",           suggested_sets: 4, suggested_reps: 6,  intensity_value: 185, intensity_measure: "lbs", logged: true  },
      { id: 2, name: "Incline Dumbbell Press", suggested_sets: 3, suggested_reps: 10, intensity_value: 60,  intensity_measure: "lbs", logged: false },
      { id: 3, name: "Tricep Pushdown",        suggested_sets: 3, suggested_reps: 12, intensity_value: 50,  intensity_measure: "lbs", logged: false },
      { id: 4, name: "Lateral Raises",         suggested_sets: 4, suggested_reps: 15, intensity_value: 25,  intensity_measure: "lbs", logged: false },
    ]);
  }, [activeDay]);

  const completedCount = workoutActivities.filter((a) => a.logged).length;
  const totalCount = workoutActivities.length;

  
  const [coach, setCoach] = useState(null);
  useEffect(() => {
    // TODO: GET /api/client/:id/coach
    // setCoach(data)
    setCoach({ name: "Rafael Girgis", specialty: "Strength & Conditioning" });
  }, []);

  
  const [coachRating, setCoachRating] = useState(null);
  useEffect(() => {
    // TODO: GET /api/coach/:coachId/rating → AVG(rating_value), COUNT(*)
    // setCoachRating(data)
    setCoachRating({ avg: 4.9, review_count: 47 });
  }, [coach]);

  
  const [nextSession, setNextSession] = useState(null);
  useEffect(() => {
    // TODO: GET /api/client/:id/coach/next-session
    // setNextSession(data)
    setNextSession({ weekday: "Monday", start_time: "9:00 AM" });
  }, []);

  
  const [availabilitySlots, setAvailabilitySlots] = useState([]);
  useEffect(() => {
    // TODO: GET /api/client/:id/availability
    // setAvailabilitySlots(data)
    setAvailabilitySlots([
      { time: "9AM",  slots: ["booked","booked","available","booked","booked",null,null] },
      { time: "10AM", slots: ["booked","booked","booked",  "booked","booked",null,null] },
      { time: "11AM", slots: ["booked","booked","booked",  "booked","booked",null,null] },
      { time: "12PM", slots: ["booked","booked","booked",  "booked","booked",null,null] },
      { time: "1PM",  slots: ["booked","booked","booked",  "booked","booked",null,null] },
      { time: "2PM",  slots: ["booked","booked","booked",  "booked","booked",null,null] },
      { time: "3PM", slots: ["booked","booked","booked",  "booked","booked",null,null] },
      { time: "4PM",  slots: ["booked","booked","booked",  "booked","booked",null,null] },
    ]);
  }, []);

  
  const [prescribedMeals, setPrescribedMeals] = useState([]);
  useEffect(() => {
    // TODO: GET /api/client/:id/meals/today
    // setPrescribedMeals(data)
    setPrescribedMeals([
      { id: 1, meal_type: "Breakfast", meal_name: "Oats",        calories: 380 },
      { id: 2, meal_type: "Lunch",     meal_name: "Chicken Rice", calories: 620 },
      { id: 3, meal_type: "Snack",     meal_name: "Protein Bar",  calories: 220 },
    ]);
  }, []);

  const stepsPercent   = pct(stepCount ?? 0, 10000);
  const calPercent     = pct(caloriesConsumed ?? 0, caloriesGoal);
  const workoutPercent = pct(completedCount, totalCount || 1);

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#080D19" }}>
      <Navbar role={role} />

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">

        {/*FITNESS & NUTRITION*/}
        <SectionHeader label="FITNESS & NUTRITION" role={role} />

        <div className="grid grid-cols-4 gap-4">

          
          <DashboardCard role={role} className="min-h-50">
            <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">
              Good Morning
            </p>
            <h2 className="text-4xl font-bold text-white leading-tight">
              {account?.first_name ?? "—"}
              <br />
              {account?.last_name ?? "—"}
            </h2>
          </DashboardCard>

          <div className="flex flex-col gap-4">
            <StatCard
              role={role}
              label="STEPS TODAY"
              value={stepCount !== null ? stepCount.toLocaleString() : "—"}
              sub={stepCount !== null ? `↑ ${stepsPercent}% of daily goal` : "Loading..."}
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
                label={caloriesConsumed !== null ? caloriesConsumed.toString() : "—"}
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
              <p className="text-[10px] text-gray-500 uppercase tracking-widest">Workouts</p>
              <p className="text-white font-bold text-lg">{completedCount}/{totalCount}</p>
            </div>
          </DashboardCard>

        </div>

        <SectionHeader label="WORKOUT & COACH" role={role} />

        <div className="grid grid-cols-3 gap-4 items-stretch">

          <DashboardCard
            role={role}
            title={`Today's Workout: ${workoutPlan?.strata_name ?? "—"}`}
            action={{ label: "View all", onClick: () => {
              // TODO: navigate to /client/plan
            }}}
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
                          onClick={() => {
                            // TODO: POST /api/client/:id/workout-log
                            // body: { workout_plan_activity_id: activity.id, client_telemetry_id }
                          }}
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

          <DashboardCard
            role={role}
            title="My Coach"
            action={{ label: "View Profile", onClick: () => {
              // TODO: navigate to /client/coach-profile
            }}}
            footer={
              <div className="flex gap-2">
                <button
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-2 text-sm font-medium transition-colors"
                  onClick={() => {
                    // TODO: navigate to /client/messages
                    // chat_message table: filter by chat_id between client + coach
                  }}
                >
                  💬 Message
                </button>
                <button
                  className="flex-1 border border-gray-700 text-gray-300 hover:bg-gray-800 rounded-xl py-2 text-sm transition-colors"
                  onClick={() => {
                    // TODO: navigate to /client/plan
                  }}
                >
                  📋 View Plan
                </button>
              </div>
            }
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-blue-900/40 flex items-center justify-center text-blue-400 font-bold shrink-0">
                {coach?.name?.split(" ").map((n) => n[0]).join("") ?? "?"}
              </div>
              <div>
                <p className="text-white font-bold">{coach?.name ?? "—"}</p>
                <p className="text-gray-400 text-xs">{coach?.specialty ?? "—"}</p>
                {/* rating table */}
                <p className="text-yellow-400 text-xs mt-0.5">
                  {coachRating ? `★ ${coachRating.avg} · ${coachRating.review_count} reviews` : "—"}
                </p>
              </div>
            </div>

            <div className="bg-[#0A1020] rounded-xl p-3">
              <p className="text-[10px] text-gray-500 uppercase tracking-widest">
                Next Session
              </p>
              <div className="flex justify-between items-center mt-1">
                <p className="text-white text-sm font-medium">
                  {nextSession ? `${nextSession.weekday} · ${nextSession.start_time}` : "—"}
                </p>
                <StatusBadge label="Upcoming" variant="warning" />
              </div>
            </div>
          </DashboardCard>

          <DashboardCard
            role={role}
            title="Availability"
            action={{ label: "Edit Schedule", onClick: () => {
              // TODO: navigate to /client/schedule
              // POST/PUT /api/client/:id/availability
            }}}
          >
            <div className="grid grid-cols-8 gap-1 mb-2">
              <div />
              {WEEKDAYS.map((d) => (
                <div key={d} className="text-[10px] text-gray-500 text-center font-medium">
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
                  <div className="text-[10px] text-gray-500 flex items-center">{time}</div>
                  {slots.map((status, i) => (
                    <SlotCell key={i} status={status} time={time} />
                  ))}
                </div>
              ))
            )}

            <div className="flex gap-4 mt-3">
              {[
                { color: "bg-blue-400",   label: "Available"   },
                { color: "bg-orange-400", label: "Booked"      },
                { color: "bg-gray-600",   label: "Unavailable" },
              ].map(({ color, label }) => (
                <span key={label} className="flex items-center gap-1.5 text-[10px] text-gray-400">
                  <span className={`w-2 h-2 rounded-full ${color}`} />
                  {label}
                </span>
              ))}
            </div>
          </DashboardCard>

        </div>

        <SectionHeader label="NUTRITION DETAIL" role={role} />

        <DashboardCard
          role={role}
          title="Today's Meals"
          action={{ label: "Log Meal +", onClick: () => {
            // TODO: open log meal modal
            // POST /api/client/:id/meal-log
            // body: { on_demand_meal_id or client_prescribed_meal_id, client_telemetry_id }
          }}}
          footer={
            <div className="pt-3 border-t border-white/5 flex justify-between items-center">
              <span className="text-xs text-gray-500 uppercase tracking-widest">Total Consumed</span>
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
    </div>
  );
}