import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Navbar, Overlay } from "../components";
import { ROLE_THEMES } from "../components/theme";
import { fetchMe } from "../api/client";
import { fetchMyClients } from "../api/coach";
import { getCoachAccessState } from "../utils/roleAccess";
import { resolveRoleState } from "../utils/sessionAuth";
import {
  PlanBuilderProvider,
  usePlanBuilder,
} from "../contexts/PlanBuilderContext";
import {
  searchWorkouts,
  listWorkoutActivities,
  searchWorkoutPlans,
  saveWorkoutPlan,
  assignPlanToSelf,
  prescribePlanToClient,
  listMyScheduledPlans,
  deleteScheduledPlanAsClient,
  deleteScheduledPlanAsCoach,
  createWorkout,
  createEquipment,
  listSupportedEquipment,
  getClientAvailabilityAsCoach,
  getClientPlansAsCoach,
} from "../api/plan";

const TABS = [
  { key: "build", label: "Build Plan" },
  { key: "browse", label: "Browse Plans" },
  { key: "current", label: "My Current Plans" },
];

export default function PlanPageRoot() {
  return (
    <PlanBuilderProvider>
      <PlanPage />
    </PlanBuilderProvider>
  );
}

function PlanPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const roleFromUrl = searchParams.get("role");

  const [account, setAccount] = useState(null);
  const [role, setRole] = useState(roleFromUrl || "client");
  const [tab, setTab] = useState("build");
  const [overlay, setOverlay] = useState(null);
  const [equipmentOptions, setEquipmentOptions] = useState([]);
  const { selectedClient, setSelectedClient } = usePlanBuilder();

  const theme = ROLE_THEMES[role] ?? ROLE_THEMES.client;
  const isCoach = role === "coach";

  useEffect(() => {
    (async () => {
      try {
        const me = await fetchMe();
        setAccount(me);
        const roleState = await resolveRoleState();
        const coachAccess = await getCoachAccessState(me, roleState);
        let resolved = "client";
        if (roleFromUrl === "coach" && coachAccess.canAccessCoach) resolved = "coach";
        else if (coachAccess.canAccessCoach && roleFromUrl !== "client") resolved = "coach";
        setRole(resolved);
      } catch {
        navigate("/login");
      }
    })();
  }, [navigate, roleFromUrl]);

  useEffect(() => {
    listSupportedEquipment().then((rows) => setEquipmentOptions(Array.isArray(rows) ? rows : []))
      .catch(() => setEquipmentOptions([]));
  }, []);

  const initials = account?.name
    ? account.name.split(" ").map((n) => n[0]).join("").toUpperCase()
    : "?";

  const showClientGate = isCoach && !selectedClient;

  return (
    <div className="min-h-screen bg-[#080D19]">
      <Navbar role={role} userName={initials} />
      <div className="mx-auto max-w-6xl px-6 py-8">
        <header className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">
              {isCoach ? "Prescribe Plans" : "Plan My Week"}
            </h1>
            <p className="text-gray-400 text-sm mt-1">
              {isCoach
                ? selectedClient
                  ? `Planning for ${selectedClient.name}`
                  : "Pick a client to start prescribing."
                : "Build a workout plan, schedule it on your availability, or browse plans created by others."}
            </p>
          </div>
          {isCoach && selectedClient && (
            <button
              onClick={() => setOverlay("client_picker")}
              className="px-4 py-2 rounded-xl text-xs font-semibold border"
              style={{ borderColor: `${theme.accent}40`, color: theme.accentText }}
            >
              Switch Client
            </button>
          )}
        </header>

        {showClientGate ? (
          <ClientGate onPick={() => setOverlay("client_picker")} theme={theme} />
        ) : (
          <>
            <div className="flex gap-1 bg-[#0A1020] rounded-xl p-1 mb-6">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                    tab === t.key ? "text-white" : "text-gray-400 hover:text-gray-200"
                  }`}
                  style={tab === t.key ? { backgroundColor: `${theme.accent}30`, color: theme.accentText } : {}}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {tab === "build" && (
              <BuildPlanTab
                role={role}
                theme={theme}
                onPickWorkout={() => setOverlay("workout_picker")}
                onSchedule={() => setOverlay("schedule")}
              />
            )}
            {tab === "browse" && (
              <BrowsePlansTab theme={theme} onSchedule={() => setOverlay("schedule")} />
            )}
            {tab === "current" && (
              <CurrentPlansTab role={role} theme={theme} />
            )}
          </>
        )}
      </div>

      {/* Overlays */}
      <Overlay open={overlay === "client_picker"} onClose={() => setOverlay(null)} title="Pick a Client" wide>
        <ClientPickerOverlay
          theme={theme}
          onPicked={(c) => { setSelectedClient(c); setOverlay(null); }}
        />
      </Overlay>

      <Overlay open={overlay === "workout_picker"} onClose={() => setOverlay(null)} title="Add a Workout to Plan" wide>
        <WorkoutPickerOverlay
          theme={theme}
          isCoach={isCoach}
          onCreate={() => setOverlay("workout_creator")}
          onConfigure={(workout) => setOverlay({ kind: "configure", workout })}
        />
      </Overlay>

      <Overlay
        open={typeof overlay === "object" && overlay?.kind === "configure"}
        onClose={() => setOverlay(null)}
        title={overlay?.workout ? `Configure ${overlay.workout.name}` : "Configure"}
        wide
      >
        {overlay?.workout && (
          <ActivityConfiguratorOverlay
            workout={overlay.workout}
            theme={theme}
            onAdded={() => setOverlay(null)}
          />
        )}
      </Overlay>

      <Overlay open={overlay === "workout_creator"} onClose={() => setOverlay(null)} title="Create a Workout" wide>
        <WorkoutCreatorOverlay
          theme={theme}
          equipmentOptions={equipmentOptions}
          onCreated={() => setOverlay("workout_picker")}
          refreshEquipment={() => listSupportedEquipment().then(setEquipmentOptions).catch(() => {})}
        />
      </Overlay>

      <Overlay open={overlay === "schedule"} onClose={() => setOverlay(null)} title="Schedule Plan" wide>
        <SchedulePlanOverlay
          role={role}
          theme={theme}
          onDone={() => { setOverlay(null); setTab("current"); }}
        />
      </Overlay>
    </div>
  );
}

/* ─── Client Gate ─── */

function ClientGate({ onPick, theme }) {
  return (
    <div className="rounded-2xl border border-white/5 bg-[#0D1424] p-10 text-center">
      <p className="text-gray-300 mb-4">Pick a client to begin prescribing a plan.</p>
      <button
        onClick={onPick}
        className="px-6 py-3 rounded-xl text-sm font-bold text-white"
        style={{ backgroundColor: theme.accent }}
      >
        Choose Client
      </button>
    </div>
  );
}

/* ─── Client Picker (coach) ─── */

function ClientPickerOverlay({ onPicked, theme }) {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const me = await fetchMe();
        const list = await fetchMyClients(me.coach_id);
        setClients(list.filter((c) => c.status === "active"));
      } catch {
        setClients([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = clients.filter((c) =>
    !search || (c.name || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-3">
      <input
        type="text"
        placeholder="Search clients..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full bg-[#0A1020] border border-white/10 rounded-xl px-4 py-3 text-sm text-white"
      />
      {loading ? (
        <p className="text-gray-500 text-sm py-6 text-center">Loading clients...</p>
      ) : filtered.length === 0 ? (
        <p className="text-gray-500 text-sm py-6 text-center">No clients yet.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {filtered.map((c) => (
            <button
              key={c.id}
              onClick={() => onPicked(c)}
              className="text-left bg-[#0A1020] border border-white/5 rounded-xl px-4 py-3 hover:border-white/15 transition-colors"
            >
              <p className="text-white font-semibold text-sm">{c.name}</p>
              <p className="text-xs text-gray-500">{c.goal || "Active client"}</p>
              <p className="text-[10px]" style={{ color: theme.accentText }}>Choose →</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Build Plan Tab ─── */

function BuildPlanTab({ role, theme, onPickWorkout, onSchedule }) {
  const { draftPlan, setName, removeActivity } = usePlanBuilder();
  const totalCalories = draftPlan.activities.reduce((s, a) => s + (Number(a.estimated_calories) || 0), 0);

  return (
    <div className="space-y-5">
      <div className="bg-[#0D1424] border border-white/5 rounded-2xl p-5">
        <label className="block text-xs text-gray-500 uppercase tracking-widest mb-2">Plan Name</label>
        <input
          type="text"
          placeholder="e.g. Push/Pull A"
          value={draftPlan.strata_name}
          onChange={(e) => setName(e.target.value)}
          className="w-full bg-[#0A1020] border border-white/10 rounded-xl px-4 py-3 text-sm text-white"
        />
      </div>

      <div className="bg-[#0D1424] border border-white/5 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold">
            Activities ({draftPlan.activities.length})
          </p>
          <p className="text-xs text-orange-400">~{Math.round(totalCalories)} kcal total</p>
        </div>

        {draftPlan.activities.length === 0 ? (
          <p className="text-gray-500 text-sm py-6 text-center">No activities yet — add one below.</p>
        ) : (
          <div className="space-y-2">
            {draftPlan.activities.map((a) => (
              <div key={a._key} className="bg-[#0A1020] border border-white/5 rounded-xl px-4 py-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-white font-semibold text-sm">{a.workout_name}</p>
                  <div className="flex flex-wrap gap-2 mt-1 text-xs text-gray-400">
                    <span>{a.intensity_value} {a.intensity_measure}</span>
                    {a.workout_type === "duration"
                      ? <span>{a.planned_duration}s</span>
                      : <span>{a.planned_sets}×{a.planned_reps}</span>}
                    <span className="text-orange-400">~{Math.round(Number(a.estimated_calories) || 0)} kcal</span>
                  </div>
                </div>
                <button
                  onClick={() => removeActivity(a._key)}
                  className="text-red-400/60 hover:text-red-400 text-sm"
                  title="Remove"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={onPickWorkout}
          className="mt-4 w-full py-3 rounded-xl border border-dashed text-sm transition-colors"
          style={{ borderColor: `${theme.accent}40`, color: theme.accentText }}
        >
          + Add Activity
        </button>
      </div>

      <div className="flex gap-2">
        <button
          disabled={!draftPlan.strata_name.trim() || draftPlan.activities.length === 0}
          onClick={onSchedule}
          className="flex-1 py-3 rounded-xl text-sm font-bold text-white transition-colors disabled:opacity-30"
          style={{ backgroundColor: theme.accent }}
        >
          {role === "coach" ? "Save & Prescribe" : "Save & Schedule"}
        </button>
      </div>
    </div>
  );
}

/* ─── Browse Plans Tab ─── */

function BrowsePlansTab({ theme, onSchedule }) {
  const { loadPlan } = usePlanBuilder();
  const [items, setItems] = useState([]);
  const [text, setText] = useState("");
  const [skip, setSkip] = useState(0);
  const [loading, setLoading] = useState(false);
  const limit = 12;

  const fetchPage = async (currentSkip, currentText) => {
    setLoading(true);
    try {
      const data = await searchWorkoutPlans({ text: currentText, skip: currentSkip, limit });
      setItems(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPage(0, ""); }, []);

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Search plans by name..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="flex-1 bg-[#0A1020] border border-white/10 rounded-xl px-4 py-3 text-sm text-white"
        />
        <button
          onClick={() => { setSkip(0); fetchPage(0, text); }}
          className="px-5 rounded-xl text-sm font-semibold text-white"
          style={{ backgroundColor: theme.accent }}
        >
          Search
        </button>
      </div>

      {loading ? (
        <p className="text-gray-500 text-sm py-6 text-center">Loading...</p>
      ) : items.length === 0 ? (
        <p className="text-gray-500 text-sm py-6 text-center">No plans found.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {items.map((p) => (
            <div key={p.id} className="bg-[#0D1424] border border-white/5 rounded-2xl p-4">
              <p className="text-white font-bold">{p.strata_name}</p>
              <p className="text-xs text-gray-500 mt-1">{p.activities?.length ?? 0} activities</p>
              <ul className="mt-2 space-y-1">
                {(p.activities ?? []).slice(0, 3).map((a) => (
                  <li key={a.id} className="text-xs text-gray-400">
                    {a.workout_name} — {a.planned_duration ? `${a.planned_duration}s` : `${a.planned_sets}×${a.planned_reps}`}
                  </li>
                ))}
                {(p.activities ?? []).length > 3 && (
                  <li className="text-xs text-gray-600">+{p.activities.length - 3} more</li>
                )}
              </ul>
              <button
                onClick={() => {
                  loadPlan({
                    id: p.id,
                    strata_name: p.strata_name,
                    activities: (p.activities || []).map((a) => ({
                      _key: `loaded-${a.id}`,
                      workout_id: a.workout_id,
                      workout_name: a.workout_name,
                      workout_activity_id: a.workout_activity_id,
                      intensity_measure: a.intensity_measure,
                      intensity_value: a.intensity_value,
                      planned_reps: a.planned_reps,
                      planned_sets: a.planned_sets,
                      planned_duration: a.planned_duration,
                      estimated_calories: a.estimated_calories,
                      workout_type: a.planned_duration ? "duration" : "rep",
                    })),
                  });
                  onSchedule();
                }}
                className="mt-3 w-full py-2 rounded-xl text-xs font-bold text-white"
                style={{ backgroundColor: theme.accent }}
              >
                Schedule This Plan
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-between">
        <button
          disabled={skip === 0}
          onClick={() => { const ns = Math.max(0, skip - limit); setSkip(ns); fetchPage(ns, text); }}
          className="px-4 py-2 rounded-lg text-xs text-gray-400 border border-white/10 disabled:opacity-30"
        >
          ← Prev
        </button>
        <button
          disabled={items.length < limit}
          onClick={() => { const ns = skip + limit; setSkip(ns); fetchPage(ns, text); }}
          className="px-4 py-2 rounded-lg text-xs text-gray-400 border border-white/10 disabled:opacity-30"
        >
          Next →
        </button>
      </div>
    </div>
  );
}

/* ─── Current Plans Tab ─── */

const WEEKDAYS_FULL = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function CurrentPlansTab({ role, theme }) {
  const { selectedClient } = usePlanBuilder();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = role === "coach" && selectedClient
        ? await getClientPlansAsCoach(selectedClient.id)
        : await listMyScheduledPlans();
      setPlans(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e?.message || "Failed to load plans");
    } finally {
      setLoading(false);
    }
  }, [role, selectedClient]);

  useEffect(() => { refresh(); }, [refresh]);

  const grouped = useMemo(() => {
    const map = Object.fromEntries(WEEKDAYS_FULL.map((d) => [d, []]));
    plans.forEach((p) => {
      const start = new Date(p.start_time);
      const dayIdx = (start.getDay() + 6) % 7; // Mon=0
      const key = WEEKDAYS_FULL[dayIdx];
      map[key].push(p);
    });
    return map;
  }, [plans]);

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this scheduled plan and free your availability?")) return;
    try {
      if (role === "coach") await deleteScheduledPlanAsCoach(id);
      else await deleteScheduledPlanAsClient(id);
      await refresh();
    } catch (e) {
      setError(e?.message || "Failed to delete");
    }
  };

  if (loading) return <p className="text-gray-500 text-sm py-6 text-center">Loading...</p>;
  if (error) return <p className="text-red-400 text-sm py-6 text-center">{error}</p>;

  return (
    <div className="space-y-3">
      {WEEKDAYS_FULL.map((day) => (
        <div key={day} className="bg-[#0D1424] border border-white/5 rounded-2xl p-4">
          <p className="text-xs uppercase tracking-widest font-semibold mb-2" style={{ color: theme.accentText }}>{day}</p>
          {grouped[day].length === 0 ? (
            <p className="text-gray-600 text-xs">No plans scheduled.</p>
          ) : (
            <div className="space-y-2">
              {grouped[day].map((p) => (
                <div key={p.id} className="bg-[#0A1020] border border-white/5 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-white text-sm font-medium">Plan #{p.workout_plan_id}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(p.start_time).toLocaleString()} — {new Date(p.end_time).toLocaleString()}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(p.id)}
                    className="text-red-400/70 hover:text-red-300 text-xs"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ─── Workout Picker Overlay ─── */

function WorkoutPickerOverlay({ theme, isCoach, onCreate, onConfigure }) {
  const [text, setText] = useState("");
  const [workoutType, setWorkoutType] = useState("");
  const [equiptmentId, setEquiptmentId] = useState("");
  const [equipment, setEquipment] = useState([]);
  const [items, setItems] = useState([]);
  const [skip, setSkip] = useState(0);
  const [loading, setLoading] = useState(false);
  const limit = 12;

  useEffect(() => {
    listSupportedEquipment().then(setEquipment).catch(() => setEquipment([]));
  }, []);

  const fetchPage = useCallback(async (currentSkip) => {
    setLoading(true);
    try {
      const data = await searchWorkouts({
        text,
        workout_type: workoutType || undefined,
        equiptment_id: equiptmentId || undefined,
        skip: currentSkip,
        limit,
      });
      setItems(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }, [text, workoutType, equiptmentId]);

  useEffect(() => { fetchPage(0); }, [fetchPage]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <input
          type="text"
          placeholder="Search by name..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="flex-1 min-w-40 bg-[#0A1020] border border-white/10 rounded-xl px-3 py-2 text-sm text-white"
        />
        <select
          value={workoutType}
          onChange={(e) => setWorkoutType(e.target.value)}
          className="bg-[#0A1020] border border-white/10 rounded-xl px-3 py-2 text-sm text-gray-300"
        >
          <option value="">All types</option>
          <option value="rep">Rep-based</option>
          <option value="duration">Duration-based</option>
        </select>
        <select
          value={equiptmentId}
          onChange={(e) => setEquiptmentId(e.target.value)}
          className="bg-[#0A1020] border border-white/10 rounded-xl px-3 py-2 text-sm text-gray-300"
        >
          <option value="">All equipment</option>
          {equipment.map((eq) => (
            <option key={eq.id} value={eq.id}>{eq.name}</option>
          ))}
        </select>
        <button
          onClick={() => { setSkip(0); fetchPage(0); }}
          className="px-4 rounded-xl text-sm font-semibold text-white"
          style={{ backgroundColor: theme.accent }}
        >
          Search
        </button>
        {isCoach && (
          <button
            onClick={onCreate}
            className="px-4 rounded-xl text-sm font-semibold border"
            style={{ borderColor: `${theme.accent}40`, color: theme.accentText }}
          >
            + New Workout
          </button>
        )}
      </div>

      {loading ? (
        <p className="text-gray-500 text-sm py-6 text-center">Loading...</p>
      ) : items.length === 0 ? (
        <p className="text-gray-500 text-sm py-6 text-center">No workouts found.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {items.map((w) => (
            <button
              key={w.id}
              onClick={() => onConfigure(w)}
              className="text-left bg-[#0A1020] border border-white/5 rounded-xl px-4 py-3 hover:border-white/15 transition-colors"
            >
              <p className="text-white font-semibold text-sm">{w.name}</p>
              <p className="text-[11px] text-gray-500">{w.workout_type === "duration" ? "Duration-based" : "Rep-based"}</p>
              {w.description && (
                <p className="text-xs text-gray-500 mt-1 line-clamp-2">{w.description}</p>
              )}
              <p className="text-[10px] mt-2" style={{ color: theme.accentText }}>Configure →</p>
            </button>
          ))}
        </div>
      )}

      <div className="flex justify-between">
        <button
          disabled={skip === 0}
          onClick={() => { const ns = Math.max(0, skip - limit); setSkip(ns); fetchPage(ns); }}
          className="px-4 py-2 rounded-lg text-xs text-gray-400 border border-white/10 disabled:opacity-30"
        >
          ← Prev
        </button>
        <button
          disabled={items.length < limit}
          onClick={() => { const ns = skip + limit; setSkip(ns); fetchPage(ns); }}
          className="px-4 py-2 rounded-lg text-xs text-gray-400 border border-white/10 disabled:opacity-30"
        >
          Next →
        </button>
      </div>
    </div>
  );
}

/* ─── Activity Configurator ─── */

function ActivityConfiguratorOverlay({ workout, theme, onAdded }) {
  const { addActivity } = usePlanBuilder();
  const [activities, setActivities] = useState([]);
  const [activityId, setActivityId] = useState("");
  const [reps, setReps] = useState("");
  const [sets, setSets] = useState("");
  const [duration, setDuration] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listWorkoutActivities(workout.id)
      .then((rows) => {
        const list = Array.isArray(rows) ? rows : [];
        setActivities(list);
        if (list[0]) setActivityId(String(list[0].id));
      })
      .finally(() => setLoading(false));
  }, [workout.id]);

  const isDuration = workout.workout_type === "duration";
  const selected = activities.find((a) => String(a.id) === String(activityId));

  const estimatedCal = useMemo(() => {
    if (!selected) return 0;
    const cal = Number(selected.estimated_calories_per_unit_frequency || 0);
    if (isDuration) return cal * (Number(duration) || 0);
    return cal * (Number(reps) || 0) * (Number(sets) || 0);
  }, [selected, isDuration, reps, sets, duration]);

  const canAdd = selected && (isDuration ? Number(duration) > 0 : Number(reps) > 0 && Number(sets) > 0);

  const handleAdd = () => {
    if (!canAdd) return;
    addActivity({
      workout_id: workout.id,
      workout_name: workout.name,
      workout_type: workout.workout_type,
      workout_activity_id: selected.id,
      intensity_measure: selected.intensity_measure,
      intensity_value: selected.intensity_value,
      estimated_calories_per_unit_frequency: Number(selected.estimated_calories_per_unit_frequency),
      planned_reps: isDuration ? null : Number(reps),
      planned_sets: isDuration ? null : Number(sets),
      planned_duration: isDuration ? Number(duration) : null,
      estimated_calories: estimatedCal,
    });
    onAdded();
  };

  if (loading) return <p className="text-gray-500 text-sm py-6 text-center">Loading intensities...</p>;
  if (activities.length === 0) {
    return <p className="text-gray-500 text-sm py-6 text-center">This workout has no intensity tiers configured yet.</p>;
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs text-gray-500 uppercase tracking-widest mb-1">Intensity Tier</label>
        <select
          value={activityId}
          onChange={(e) => setActivityId(e.target.value)}
          className="w-full bg-[#0A1020] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white"
        >
          {activities.map((a) => (
            <option key={a.id} value={a.id}>
              {a.intensity_value} {a.intensity_measure} — {Number(a.estimated_calories_per_unit_frequency).toFixed(2)} kcal/unit
            </option>
          ))}
        </select>
      </div>

      {isDuration ? (
        <div>
          <label className="block text-xs text-gray-500 uppercase tracking-widest mb-1">Duration (seconds)</label>
          <input
            type="number" min="1"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            className="w-full bg-[#0A1020] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white"
          />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-500 uppercase tracking-widest mb-1">Sets</label>
            <input type="number" min="1" value={sets} onChange={(e) => setSets(e.target.value)}
              className="w-full bg-[#0A1020] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 uppercase tracking-widest mb-1">Reps</label>
            <input type="number" min="1" value={reps} onChange={(e) => setReps(e.target.value)}
              className="w-full bg-[#0A1020] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white" />
          </div>
        </div>
      )}

      <p className="text-xs text-orange-400">~{Math.round(estimatedCal)} kcal estimated</p>

      <button
        disabled={!canAdd}
        onClick={handleAdd}
        className="w-full py-3 rounded-xl text-sm font-bold text-white disabled:opacity-30"
        style={{ backgroundColor: theme.accent }}
      >
        Add to Plan
      </button>
    </div>
  );
}

/* ─── Workout Creator (coach) ─── */

function WorkoutCreatorOverlay({ theme, equipmentOptions, onCreated, refreshEquipment }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [instructions, setInstructions] = useState("");
  const [workoutType, setWorkoutType] = useState("rep");
  const [intensityMeasure, setIntensityMeasure] = useState("lbs");
  const [tiers, setTiers] = useState([
    { intensity_value: "", calories: "" },
    { intensity_value: "", calories: "" },
    { intensity_value: "", calories: "" },
  ]);
  const [equipmentIds, setEquipmentIds] = useState([]);
  const [newEqName, setNewEqName] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setError("");
    if (!name.trim()) return setError("Name is required");
    const values = tiers.map((t) => Number(t.intensity_value));
    if (values.some((v) => !Number.isFinite(v) || v <= 0)) {
      return setError("All 3 intensity values must be positive numbers.");
    }
    if (new Set(values).size !== 3) {
      return setError("The 3 intensity values must be distinct.");
    }
    if (tiers.some((t) => Number(t.calories) <= 0)) {
      return setError("All 3 calorie estimates must be positive numbers.");
    }
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        description: description.trim(),
        instructions: instructions.trim(),
        workout_type: workoutType,
        intensity_measure: intensityMeasure,
        activity_tiers: tiers.map((t) => ({
          intensity_value: Number(t.intensity_value),
          estimated_calories_per_unit_frequency: Number(t.calories),
        })),
        equipment: equipmentIds.map((id) => ({
          equiptment_id: Number(id),
          is_required: true,
          is_recommended: true,
        })),
      };
      await createWorkout(payload);
      onCreated();
    } catch (e) {
      setError(e?.message || "Failed to create workout");
    } finally {
      setSaving(false);
    }
  };

  const handleCreateEquipment = async () => {
    if (!newEqName.trim()) return;
    try {
      const result = await createEquipment({ name: newEqName.trim() });
      setNewEqName("");
      await refreshEquipment();
      if (result?.equiptment_id) {
        setEquipmentIds((prev) => Array.from(new Set([...prev, String(result.equiptment_id)])));
      }
    } catch (e) {
      setError(e?.message || "Failed to add equipment");
    }
  };

  return (
    <div className="space-y-4">
      <input
        type="text" placeholder="Workout name"
        value={name} onChange={(e) => setName(e.target.value)}
        className="w-full bg-[#0A1020] border border-white/10 rounded-xl px-4 py-3 text-sm text-white"
      />
      <textarea
        placeholder="Description"
        value={description} onChange={(e) => setDescription(e.target.value)}
        rows={2}
        className="w-full bg-[#0A1020] border border-white/10 rounded-xl px-4 py-3 text-sm text-white resize-none"
      />
      <textarea
        placeholder="Instructions"
        value={instructions} onChange={(e) => setInstructions(e.target.value)}
        rows={2}
        className="w-full bg-[#0A1020] border border-white/10 rounded-xl px-4 py-3 text-sm text-white resize-none"
      />

      <div className="grid grid-cols-2 gap-3">
        <select value={workoutType} onChange={(e) => setWorkoutType(e.target.value)}
          className="bg-[#0A1020] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-gray-300">
          <option value="rep">Rep-based</option>
          <option value="duration">Duration-based</option>
        </select>
        <input
          type="text" placeholder="Intensity measure (lbs, kg, sec...)"
          value={intensityMeasure} onChange={(e) => setIntensityMeasure(e.target.value)}
          className="bg-[#0A1020] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white"
        />
      </div>

      <div className="space-y-2">
        <p className="text-xs text-gray-500 uppercase tracking-widest">3 Intensity × Calorie Tiers</p>
        {tiers.map((t, idx) => (
          <div key={idx} className="grid grid-cols-2 gap-2">
            <input
              type="number" placeholder={`Intensity #${idx + 1}`}
              value={t.intensity_value}
              onChange={(e) => {
                const next = [...tiers];
                next[idx] = { ...next[idx], intensity_value: e.target.value };
                setTiers(next);
              }}
              className="bg-[#0A1020] border border-white/10 rounded-xl px-3 py-2 text-sm text-white"
            />
            <input
              type="number" step="0.01" placeholder="kcal/unit"
              value={t.calories}
              onChange={(e) => {
                const next = [...tiers];
                next[idx] = { ...next[idx], calories: e.target.value };
                setTiers(next);
              }}
              className="bg-[#0A1020] border border-white/10 rounded-xl px-3 py-2 text-sm text-white"
            />
          </div>
        ))}
      </div>

      <div>
        <p className="text-xs text-gray-500 uppercase tracking-widest mb-2">Equipment</p>
        <div className="flex flex-wrap gap-2 mb-2">
          {equipmentOptions.map((eq) => {
            const selected = equipmentIds.includes(String(eq.id));
            return (
              <button
                key={eq.id}
                onClick={() => {
                  setEquipmentIds((prev) =>
                    selected ? prev.filter((id) => id !== String(eq.id)) : [...prev, String(eq.id)]
                  );
                }}
                className={`px-3 py-1.5 rounded-full text-xs ${selected ? "text-white" : "text-gray-400 border border-white/10"}`}
                style={selected ? { backgroundColor: theme.accent } : {}}
              >
                {eq.name}
              </button>
            );
          })}
        </div>
        <div className="flex gap-2">
          <input
            type="text" placeholder="New equipment name..."
            value={newEqName} onChange={(e) => setNewEqName(e.target.value)}
            className="flex-1 bg-[#0A1020] border border-white/10 rounded-xl px-3 py-2 text-sm text-white"
          />
          <button
            onClick={handleCreateEquipment}
            className="px-4 rounded-xl text-xs font-semibold border"
            style={{ borderColor: `${theme.accent}40`, color: theme.accentText }}
          >
            Add
          </button>
        </div>
      </div>

      {error && <p className="text-amber-300 text-xs">{error}</p>}

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full py-3 rounded-xl text-sm font-bold text-white disabled:opacity-30"
        style={{ backgroundColor: theme.accent }}
      >
        {saving ? "Saving..." : "Create Workout"}
      </button>
    </div>
  );
}

/* ─── Schedule Plan Overlay ─── */

function SchedulePlanOverlay({ role, theme, onDone }) {
  const { draftPlan, selectedClient, reset } = usePlanBuilder();
  const [startDt, setStartDt] = useState(draftPlan.start_dt || "");
  const [endDt, setEndDt] = useState(draftPlan.end_dt || "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [availability, setAvailability] = useState([]);

  useEffect(() => {
    if (role !== "coach" || !selectedClient) return;
    getClientAvailabilityAsCoach(selectedClient.id)
      .then((rows) => setAvailability(Array.isArray(rows) ? rows : []))
      .catch(() => setAvailability([]));
  }, [role, selectedClient]);

  const handleSubmit = async () => {
    setError("");
    if (!startDt || !endDt) return setError("Pick a start and end datetime.");
    if (new Date(startDt) >= new Date(endDt)) return setError("End must be after start.");
    setSaving(true);
    try {
      let workoutPlanId = draftPlan.id;
      if (!workoutPlanId) {
        const planPayload = {
          strata_name: draftPlan.strata_name,
          activities: draftPlan.activities.map((a) => ({
            workout_activity_id: a.workout_activity_id,
            planned_reps: a.planned_reps ?? undefined,
            planned_sets: a.planned_sets ?? undefined,
            planned_duration: a.planned_duration ?? undefined,
          })),
        };
        const res = await saveWorkoutPlan(planPayload);
        workoutPlanId = res?.workout_plan_id;
        if (!workoutPlanId) throw new Error("Plan save returned no id.");
      }

      if (role === "coach") {
        if (!selectedClient) throw new Error("No client selected.");
        await prescribePlanToClient({
          workout_plan_id: workoutPlanId,
          client_id: selectedClient.id,
          start_dt: startDt,
          end_dt: endDt,
        });
      } else {
        await assignPlanToSelf({
          workout_plan_id: workoutPlanId,
          start_dt: startDt,
          end_dt: endDt,
        });
      }
      reset();
      onDone();
    } catch (e) {
      setError(e?.message || "Failed to schedule plan");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs text-gray-500 uppercase tracking-widest mb-1">Start</label>
        <input
          type="datetime-local"
          value={startDt}
          onChange={(e) => setStartDt(e.target.value)}
          className="w-full bg-[#0A1020] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white"
        />
      </div>
      <div>
        <label className="block text-xs text-gray-500 uppercase tracking-widest mb-1">End</label>
        <input
          type="datetime-local"
          value={endDt}
          onChange={(e) => setEndDt(e.target.value)}
          className="w-full bg-[#0A1020] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white"
        />
      </div>

      {role === "coach" && availability.length > 0 && (
        <div className="bg-[#0A1020] border border-white/5 rounded-xl p-3">
          <p className="text-xs text-gray-500 uppercase tracking-widest mb-2">Client Availability (recurring)</p>
          <div className="grid grid-cols-2 gap-1 text-xs text-gray-300">
            {availability.map((a) => (
              <div key={a.id} className={a.is_blocked ? "opacity-40" : ""}>
                {a.weekday} {a.start_time}–{a.end_time} {a.is_blocked ? "· booked" : ""}
              </div>
            ))}
          </div>
        </div>
      )}

      {error && <p className="text-amber-300 text-xs">{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={saving}
        className="w-full py-3 rounded-xl text-sm font-bold text-white disabled:opacity-30"
        style={{ backgroundColor: theme.accent }}
      >
        {saving ? "Scheduling..." : role === "coach" ? "Prescribe Plan" : "Schedule on My Calendar"}
      </button>
    </div>
  );
}
