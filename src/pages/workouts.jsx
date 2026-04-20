import { useNavigate, useSearchParams } from "react-router-dom";
import { useState, useEffect, useMemo } from "react";
import { Navbar, Overlay, SkeletonDashCard } from "../components";
import { ROLE_THEMES } from "../components/theme";
import { fetchMe } from "../api/client";
import {
  fetchPresetWorkouts,
  fetchMyWorkouts,
  createWorkout,
  updateWorkout,
  deleteWorkout,
  duplicatePreset,
  assignWorkout,
  fetchAssignableClients,
  fetchAssignedWorkouts,
  EXERCISE_DATABASE,
  MUSCLE_GROUPS,
} from "../api/workouts";

/* ─── constants ──────────────────────────────────────────────────────── */

const DIFFICULTY_COLORS = {
  Beginner:     "text-green-400 bg-green-500/15",
  Intermediate: "text-yellow-400 bg-yellow-500/15",
  Advanced:     "text-red-400 bg-red-500/15",
};

const CATEGORY_ICONS = {
  Strength: "🏋️",
  Cardio:   "🏃",
  Recovery: "🧘",
  General:  "💪",
};

const EMPTY_EXERCISE = {
  name: "", sets: 3, reps: 10, weight: 0, intensity_measure: "lbs", rest_seconds: 60, notes: "",
};

/* ─── page ───────────────────────────────────────────────────────────── */

export default function WorkoutsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const roleFromUrl = searchParams.get("role");

  const [account, setAccount] = useState(null);
  const [role, setRole] = useState(roleFromUrl || "client");
  const [loading, setLoading] = useState(true);
  const [initials, setInitials] = useState("??");

  // Data
  const [presets, setPresets] = useState([]);
  const [myWorkouts, setMyWorkouts] = useState([]);
  const [assignedWorkouts, setAssignedWorkouts] = useState([]);
  const [clients, setClients] = useState([]);

  // UI state
  const [tab, setTab] = useState("my"); // "my" | "presets" | "assigned" (coach only)
  const [search, setSearch] = useState("");
  const [filterGroup, setFilterGroup] = useState("All");
  const [filterDifficulty, setFilterDifficulty] = useState("All");

  // Overlays
  const [viewWorkout, setViewWorkout] = useState(null);
  const [editWorkout, setEditWorkout] = useState(null); // null = closed, {} = new, {id,...} = edit
  const [assignOverlay, setAssignOverlay] = useState(null); // workout to assign
  const [selectedClients, setSelectedClients] = useState([]);
  const [assignSent, setAssignSent] = useState(false);

  const theme = ROLE_THEMES[role] ?? ROLE_THEMES.client;
  const roleId = role === "coach" ? account?.coach_id : account?.client_id;

  /* ── auth + data load ──────────────────────────────────────────────── */

  useEffect(() => {
    (async () => {
      try {
        const me = await fetchMe();
        setAccount(me);
        const r = roleFromUrl || (me.coach_id ? "coach" : "client");
        setRole(r);
        const n = me.name?.split(" ").map((w) => w[0]).join("").toUpperCase() || "??";
        setInitials(n);
      } catch {
        navigate("/login");
      }
    })();
  }, []);

  useEffect(() => {
    if (!account) return;
    (async () => {
      setLoading(true);
      const rid = role === "coach" ? account.coach_id : account.client_id;
      const [p, mw] = await Promise.all([
        fetchPresetWorkouts(),
        fetchMyWorkouts(role, rid),
      ]);
      setPresets(p);
      setMyWorkouts(mw);

      if (role === "coach" && account.coach_id) {
        const [aw, cl] = await Promise.all([
          fetchAssignedWorkouts(account.coach_id),
          fetchAssignableClients(account.coach_id),
        ]);
        setAssignedWorkouts(aw);
        setClients(cl);
      }
      setLoading(false);
    })();
  }, [account, role]);

  /* ── filtered lists ────────────────────────────────────────────────── */

  const activeList = tab === "presets" ? presets : myWorkouts;
  const filtered = useMemo(() => {
    return activeList.filter((w) => {
      if (search && !w.name.toLowerCase().includes(search.toLowerCase()) &&
          !w.description?.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterGroup !== "All" && !w.muscle_groups?.includes(filterGroup)) return false;
      if (filterDifficulty !== "All" && w.difficulty !== filterDifficulty) return false;
      return true;
    });
  }, [activeList, search, filterGroup, filterDifficulty]);

  /* ── handlers ──────────────────────────────────────────────────────── */

  const handleDuplicate = async (preset) => {
    const result = await duplicatePreset(role, roleId, preset.id);
    if (result.success) {
      setMyWorkouts((prev) => [
        { ...preset, ...result, type: "custom", name: result.name || `${preset.name} (Copy)` },
        ...prev,
      ]);
      setTab("my");
    }
  };

  const handleDelete = async (workoutId) => {
    await deleteWorkout(role, roleId, workoutId);
    setMyWorkouts((prev) => prev.filter((w) => w.id !== workoutId));
    setViewWorkout(null);
  };

  const handleSaveWorkout = async (workout) => {
    if (workout.id && myWorkouts.some((w) => w.id === workout.id)) {
      // Update existing
      await updateWorkout(role, roleId, workout.id, workout);
      setMyWorkouts((prev) => prev.map((w) => (w.id === workout.id ? { ...w, ...workout } : w)));
    } else {
      // Create new
      const result = await createWorkout(role, roleId, workout);
      const saved = { ...workout, id: result.id || `custom-${Date.now()}`, type: "custom", created_at: new Date().toISOString() };
      setMyWorkouts((prev) => [saved, ...prev]);
    }
    setEditWorkout(null);
  };

  const handleAssign = async () => {
    if (!assignOverlay || selectedClients.length === 0) return;
    await assignWorkout(account.coach_id, assignOverlay.id, selectedClients);
    setAssignSent(true);
    setTimeout(() => {
      setAssignOverlay(null);
      setAssignSent(false);
      setSelectedClients([]);
    }, 1500);
  };

  /* ── render ────────────────────────────────────────────────────────── */

  const tabs = [
    { key: "my",      label: "My Workouts" },
    { key: "presets", label: "Preset Library" },
    ...(role === "coach" ? [{ key: "assigned", label: "Assigned" }] : []),
  ];

  return (
    <div className="min-h-screen bg-[#080D19]">
      <Navbar role={role} userName={initials} />

      <div className="mx-auto max-w-6xl px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Workouts</h1>
            <p className="text-gray-400 text-sm mt-1">
              {role === "coach"
                ? "Create, manage, and assign workout programs to your clients."
                : "Browse presets, build custom workouts, and track your programs."}
            </p>
          </div>
          <button
            onClick={() => setEditWorkout({ exercises: [{ ...EMPTY_EXERCISE }] })}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors"
            style={{ backgroundColor: theme.accent }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Workout
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-[#0A1020] rounded-xl p-1 mb-6">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                tab === t.key
                  ? "text-white"
                  : "text-gray-400 hover:text-gray-200"
              }`}
              style={tab === t.key ? { backgroundColor: `${theme.accent}30`, color: theme.accentText } : {}}
            >
              {t.label}
              {t.key === "my" && myWorkouts.length > 0 && (
                <span className="ml-2 text-xs opacity-60">({myWorkouts.length})</span>
              )}
            </button>
          ))}
        </div>

        {/* Search + Filters (not for assigned tab) */}
        {tab !== "assigned" && (
          <div className="space-y-4 mb-6">
            <input
              type="text"
              placeholder="Search workouts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#0A1020] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-opacity-50 transition-colors"
              style={{ focusBorderColor: theme.accent }}
            />
            <div className="flex flex-wrap gap-2">
              {["All", ...MUSCLE_GROUPS].map((g) => (
                <button
                  key={g}
                  onClick={() => setFilterGroup(g)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    filterGroup === g
                      ? "text-white"
                      : "bg-white/5 text-gray-400 hover:bg-white/10"
                  }`}
                  style={filterGroup === g ? { backgroundColor: `${theme.accent}40`, color: theme.accentText } : {}}
                >
                  {g}
                </button>
              ))}
              <div className="ml-auto">
                <select
                  value={filterDifficulty}
                  onChange={(e) => setFilterDifficulty(e.target.value)}
                  className="bg-[#0A1020] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-gray-300 focus:outline-none"
                >
                  <option value="All">All Levels</option>
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonDashCard key={i} />
            ))}
          </div>
        ) : tab === "assigned" ? (
          /* ── Assigned workouts tab (coach only) ────────────────── */
          <div className="space-y-4">
            {assignedWorkouts.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-gray-500 text-sm">No workouts assigned yet.</p>
                <p className="text-gray-600 text-xs mt-2">Create or duplicate a workout, then assign it to your clients.</p>
              </div>
            ) : (
              assignedWorkouts.map((aw) => (
                <div key={aw.workout_id} className="bg-[#0D1424] border border-white/5 rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-white font-bold">{aw.workout_name}</p>
                    <span className="text-xs text-gray-500">{aw.assigned_to.length} client{aw.assigned_to.length !== 1 ? "s" : ""}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {aw.assigned_to.map((c) => (
                      <span key={c.client_id} className="px-3 py-1 rounded-full text-xs font-medium bg-white/5 text-gray-300">
                        {c.name}
                      </span>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          /* ── Workout grid ──────────────────────────────────────── */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.length === 0 ? (
              <div className="col-span-full text-center py-16">
                <p className="text-gray-500 text-sm">
                  {tab === "my"
                    ? "No custom workouts yet — create one or duplicate a preset!"
                    : "No workouts match your filters."}
                </p>
              </div>
            ) : (
              filtered.map((w) => (
                <WorkoutCard
                  key={w.id}
                  workout={w}
                  theme={theme}
                  role={role}
                  onView={() => setViewWorkout(w)}
                  onEdit={() => setEditWorkout({ ...w })}
                  onDuplicate={tab === "presets" ? () => handleDuplicate(w) : undefined}
                  onAssign={role === "coach" ? () => { setAssignOverlay(w); setSelectedClients([]); setAssignSent(false); } : undefined}
                />
              ))
            )}
          </div>
        )}
      </div>

      {/* ─── View Workout Overlay ───────────────────────────────────── */}
      <Overlay open={!!viewWorkout} onClose={() => setViewWorkout(null)} title={viewWorkout?.name ?? "Workout"} wide>
        {viewWorkout && (
          <WorkoutView
            workout={viewWorkout}
            theme={theme}
            role={role}
            onEdit={() => { setEditWorkout({ ...viewWorkout }); setViewWorkout(null); }}
            onDelete={viewWorkout.type === "custom" ? () => handleDelete(viewWorkout.id) : undefined}
            onDuplicate={viewWorkout.type === "preset" ? () => { handleDuplicate(viewWorkout); setViewWorkout(null); } : undefined}
            onAssign={role === "coach" ? () => { setAssignOverlay(viewWorkout); setSelectedClients([]); setAssignSent(false); setViewWorkout(null); } : undefined}
          />
        )}
      </Overlay>

      {/* ─── Create / Edit Workout Overlay ──────────────────────────── */}
      <Overlay
        open={!!editWorkout}
        onClose={() => setEditWorkout(null)}
        title={editWorkout?.id ? "Edit Workout" : "New Workout"}
        wide
      >
        {editWorkout && (
          <WorkoutBuilder
            initial={editWorkout}
            theme={theme}
            onSave={handleSaveWorkout}
            onCancel={() => setEditWorkout(null)}
          />
        )}
      </Overlay>

      {/* ─── Assign Overlay (coach) ─────────────────────────────────── */}
      <Overlay open={!!assignOverlay} onClose={() => setAssignOverlay(null)} title={`Assign: ${assignOverlay?.name ?? ""}`}>
        {assignOverlay && (
          <div className="space-y-4">
            <p className="text-gray-400 text-sm">Select clients to assign this workout to:</p>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {clients.map((c) => (
                <label
                  key={c.id}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-colors ${
                    selectedClients.includes(c.id)
                      ? "border-opacity-50 bg-opacity-10"
                      : "border-white/5 bg-white/[0.02] hover:bg-white/[0.04]"
                  }`}
                  style={selectedClients.includes(c.id) ? { borderColor: `${theme.accent}60`, backgroundColor: `${theme.accent}10` } : {}}
                >
                  <input
                    type="checkbox"
                    checked={selectedClients.includes(c.id)}
                    onChange={() =>
                      setSelectedClients((prev) =>
                        prev.includes(c.id) ? prev.filter((x) => x !== c.id) : [...prev, c.id]
                      )
                    }
                    className="accent-blue-500"
                  />
                  <div>
                    <p className="text-white text-sm font-medium">{c.name}</p>
                    <p className="text-gray-500 text-xs">{c.goal}</p>
                  </div>
                </label>
              ))}
            </div>
            <button
              onClick={handleAssign}
              disabled={selectedClients.length === 0 || assignSent}
              className="w-full py-3 rounded-xl text-sm font-bold text-white transition-colors disabled:opacity-40"
              style={{ backgroundColor: assignSent ? "#22c55e" : theme.accent }}
            >
              {assignSent ? "Assigned!" : `Assign to ${selectedClients.length} Client${selectedClients.length !== 1 ? "s" : ""}`}
            </button>
          </div>
        )}
      </Overlay>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   WORKOUT CARD — grid card for each workout
   ═══════════════════════════════════════════════════════════════════════ */

function WorkoutCard({ workout, theme, role, onView, onEdit, onDuplicate, onAssign }) {
  const w = workout;
  return (
    <div
      className="bg-[#0D1424] border border-white/5 rounded-2xl p-5 flex flex-col justify-between hover:border-white/10 transition-colors cursor-pointer"
      onClick={onView}
    >
      {/* Top row: category icon + difficulty badge */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-lg">{CATEGORY_ICONS[w.category] ?? "💪"}</span>
          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${DIFFICULTY_COLORS[w.difficulty] ?? "text-gray-400 bg-white/5"}`}>
            {w.difficulty}
          </span>
        </div>

        <h3 className="text-white font-bold text-base mb-1">{w.name}</h3>
        <p className="text-gray-400 text-xs leading-relaxed line-clamp-2 mb-3">{w.description}</p>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {(w.muscle_groups ?? []).map((g) => (
            <span key={g} className="px-2 py-0.5 rounded text-[10px] font-medium" style={{ backgroundColor: `${theme.accent}15`, color: theme.accentText }}>
              {g}
            </span>
          ))}
        </div>

        {/* Stats row */}
        <div className="flex gap-4 text-xs text-gray-500 mb-4">
          <span>{w.exercises?.length ?? 0} exercises</span>
          <span>{w.est_duration_min ?? "—"} min</span>
          {w.type === "custom" && <span className="ml-auto text-gray-600">Custom</span>}
          {w.type === "preset" && <span className="ml-auto text-gray-600">Preset</span>}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
        {w.type === "custom" && (
          <button
            onClick={onEdit}
            className="flex-1 py-2 rounded-lg text-xs font-semibold border transition-colors"
            style={{ borderColor: `${theme.accent}40`, color: theme.accentText }}
          >
            Edit
          </button>
        )}
        {onDuplicate && (
          <button
            onClick={onDuplicate}
            className="flex-1 py-2 rounded-lg text-xs font-semibold border border-white/10 text-gray-300 hover:bg-white/5 transition-colors"
          >
            + My Library
          </button>
        )}
        {onAssign && (
          <button
            onClick={onAssign}
            className="flex-1 py-2 rounded-lg text-xs font-semibold text-white transition-colors"
            style={{ backgroundColor: theme.accent }}
          >
            Assign
          </button>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   WORKOUT VIEW — overlay detail view
   ═══════════════════════════════════════════════════════════════════════ */

function WorkoutView({ workout, theme, onEdit, onDelete, onDuplicate, onAssign }) {
  const w = workout;
  const totalVolume = (w.exercises ?? []).reduce((sum, e) => sum + e.sets * e.reps * (e.weight || 0), 0);
  const totalSets = (w.exercises ?? []).reduce((sum, e) => sum + e.sets, 0);

  return (
    <div className="space-y-5">
      {/* Meta */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className={`px-2.5 py-1 rounded text-xs font-bold uppercase ${DIFFICULTY_COLORS[w.difficulty] ?? "text-gray-400 bg-white/5"}`}>
          {w.difficulty}
        </span>
        <span className="text-xs text-gray-500">{w.est_duration_min} min</span>
        <span className="text-xs text-gray-500">{totalSets} total sets</span>
        {totalVolume > 0 && <span className="text-xs text-gray-500">{totalVolume.toLocaleString()} lbs volume</span>}
      </div>

      <p className="text-gray-300 text-sm leading-relaxed">{w.description}</p>

      {/* Muscle groups */}
      <div className="flex flex-wrap gap-2">
        {(w.muscle_groups ?? []).map((g) => (
          <span key={g} className="px-3 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: `${theme.accent}15`, color: theme.accentText }}>
            {g}
          </span>
        ))}
      </div>

      {/* Exercise list */}
      <div className="space-y-2">
        <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold">Exercises</p>
        {(w.exercises ?? []).map((ex, i) => (
          <div key={i} className="flex items-center justify-between bg-[#0A1020] rounded-xl px-4 py-3 border border-white/5">
            <div className="flex-1 min-w-0">
              <p className="text-white font-semibold text-sm">{ex.name}</p>
              <div className="flex gap-3 mt-1 text-xs text-gray-400">
                <span>{ex.sets} sets</span>
                <span>{ex.reps} reps</span>
                {ex.weight > 0 && <span style={{ color: theme.accentText }}>{ex.weight} {ex.intensity_measure}</span>}
                {ex.rest_seconds > 0 && <span>{ex.rest_seconds}s rest</span>}
              </div>
              {ex.notes && <p className="text-gray-600 text-xs mt-1 italic">{ex.notes}</p>}
            </div>
            <span className="text-gray-600 text-xs font-bold ml-3">#{i + 1}</span>
          </div>
        ))}
      </div>

      {/* Action bar */}
      <div className="flex gap-3 pt-3 border-t border-white/5">
        {w.type === "custom" && (
          <button
            onClick={onEdit}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-colors"
            style={{ backgroundColor: theme.accent }}
          >
            Edit Workout
          </button>
        )}
        {onDuplicate && (
          <button
            onClick={onDuplicate}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold border transition-colors"
            style={{ borderColor: `${theme.accent}40`, color: theme.accentText }}
          >
            Copy to My Library
          </button>
        )}
        {onAssign && (
          <button
            onClick={onAssign}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-colors"
            style={{ backgroundColor: theme.accent }}
          >
            Assign to Client
          </button>
        )}
        {onDelete && (
          <button
            onClick={onDelete}
            className="px-4 py-2.5 rounded-xl text-sm font-bold text-red-400 border border-red-500/30 hover:bg-red-500/10 transition-colors"
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   WORKOUT BUILDER — create / edit a workout
   ═══════════════════════════════════════════════════════════════════════ */

function WorkoutBuilder({ initial, theme, onSave, onCancel }) {
  const [name, setName] = useState(initial.name ?? "");
  const [description, setDescription] = useState(initial.description ?? "");
  const [category, setCategory] = useState(initial.category ?? "Strength");
  const [difficulty, setDifficulty] = useState(initial.difficulty ?? "Intermediate");
  const [duration, setDuration] = useState(initial.est_duration_min ?? 45);
  const [exercises, setExercises] = useState(
    initial.exercises?.length ? initial.exercises.map((e, i) => ({ ...e, _key: i })) : [{ ...EMPTY_EXERCISE, _key: 0 }]
  );
  const [showExerciseSearch, setShowExerciseSearch] = useState(null); // index or null
  const [exSearch, setExSearch] = useState("");
  const [saving, setSaving] = useState(false);

  const muscleGroups = useMemo(() => {
    const groups = new Set();
    exercises.forEach((e) => {
      const match = EXERCISE_DATABASE.find((db) => db.name === e.name);
      if (match) groups.add(match.muscle_group);
    });
    return [...groups];
  }, [exercises]);

  const updateExercise = (idx, field, value) => {
    setExercises((prev) => prev.map((e, i) => (i === idx ? { ...e, [field]: value } : e)));
  };

  const addExercise = () => {
    setExercises((prev) => [...prev, { ...EMPTY_EXERCISE, _key: Date.now() }]);
  };

  const removeExercise = (idx) => {
    setExercises((prev) => prev.filter((_, i) => i !== idx));
  };

  const moveExercise = (idx, dir) => {
    setExercises((prev) => {
      const arr = [...prev];
      const target = idx + dir;
      if (target < 0 || target >= arr.length) return arr;
      [arr[idx], arr[target]] = [arr[target], arr[idx]];
      return arr;
    });
  };

  const pickExercise = (idx, dbExercise) => {
    updateExercise(idx, "name", dbExercise.name);
    setShowExerciseSearch(null);
    setExSearch("");
  };

  const filteredDb = exSearch
    ? EXERCISE_DATABASE.filter((e) =>
        e.name.toLowerCase().includes(exSearch.toLowerCase()) ||
        e.muscle_group.toLowerCase().includes(exSearch.toLowerCase())
      )
    : EXERCISE_DATABASE;

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    const cleaned = exercises
      .filter((e) => e.name.trim())
      .map(({ _key, ...rest }) => rest);
    await onSave({
      ...initial,
      name: name.trim(),
      description: description.trim(),
      category,
      difficulty,
      est_duration_min: Number(duration),
      muscle_groups: muscleGroups,
      exercises: cleaned,
      type: "custom",
    });
    setSaving(false);
  };

  return (
    <div className="space-y-5">
      {/* Workout info */}
      <div className="space-y-3">
        <input
          type="text"
          placeholder="Workout Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full bg-[#0A1020] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none"
        />
        <textarea
          placeholder="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="w-full bg-[#0A1020] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none resize-none"
        />
        <div className="grid grid-cols-3 gap-3">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="bg-[#0A1020] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-gray-300 focus:outline-none"
          >
            <option value="Strength">Strength</option>
            <option value="Cardio">Cardio</option>
            <option value="Recovery">Recovery</option>
            <option value="General">General</option>
          </select>
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
            className="bg-[#0A1020] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-gray-300 focus:outline-none"
          >
            <option value="Beginner">Beginner</option>
            <option value="Intermediate">Intermediate</option>
            <option value="Advanced">Advanced</option>
          </select>
          <div className="flex items-center gap-2 bg-[#0A1020] border border-white/10 rounded-xl px-3 py-2.5">
            <input
              type="number"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="w-full bg-transparent text-sm text-white focus:outline-none"
              min={1}
            />
            <span className="text-gray-500 text-xs shrink-0">min</span>
          </div>
        </div>
      </div>

      {/* Detected muscle groups */}
      {muscleGroups.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {muscleGroups.map((g) => (
            <span key={g} className="px-2 py-0.5 rounded text-[10px] font-medium" style={{ backgroundColor: `${theme.accent}15`, color: theme.accentText }}>
              {g}
            </span>
          ))}
        </div>
      )}

      {/* Exercise list */}
      <div className="space-y-3">
        <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold">Exercises ({exercises.length})</p>

        {exercises.map((ex, idx) => (
          <div key={ex._key} className="bg-[#0A1020] border border-white/5 rounded-xl p-4 space-y-3">
            {/* Exercise header */}
            <div className="flex items-center gap-2">
              <span className="text-gray-600 text-xs font-bold w-6">#{idx + 1}</span>

              {/* Name with search */}
              <div className="flex-1 relative">
                <input
                  type="text"
                  placeholder="Exercise name"
                  value={ex.name}
                  onChange={(e) => updateExercise(idx, "name", e.target.value)}
                  onFocus={() => setShowExerciseSearch(idx)}
                  className="w-full bg-[#080D19] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none"
                />
                {showExerciseSearch === idx && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-[#0D1424] border border-white/10 rounded-xl shadow-xl max-h-48 overflow-y-auto z-20">
                    <input
                      type="text"
                      placeholder="Search exercises..."
                      value={exSearch}
                      onChange={(e) => setExSearch(e.target.value)}
                      className="w-full bg-transparent border-b border-white/5 px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none"
                      autoFocus
                    />
                    {filteredDb.slice(0, 15).map((dbEx) => (
                      <button
                        key={dbEx.name}
                        onClick={() => pickExercise(idx, dbEx)}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-white/5 transition-colors flex justify-between"
                      >
                        <span className="text-white">{dbEx.name}</span>
                        <span className="text-gray-500">{dbEx.muscle_group} · {dbEx.equipment}</span>
                      </button>
                    ))}
                    <button
                      onClick={() => { setShowExerciseSearch(null); setExSearch(""); }}
                      className="w-full text-center py-2 text-xs text-gray-500 hover:text-gray-300 border-t border-white/5"
                    >
                      Close
                    </button>
                  </div>
                )}
              </div>

              {/* Reorder & delete */}
              <button onClick={() => moveExercise(idx, -1)} disabled={idx === 0} className="text-gray-500 hover:text-white disabled:opacity-20 text-xs">▲</button>
              <button onClick={() => moveExercise(idx, 1)} disabled={idx === exercises.length - 1} className="text-gray-500 hover:text-white disabled:opacity-20 text-xs">▼</button>
              <button onClick={() => removeExercise(idx)} className="text-red-400/60 hover:text-red-400 text-sm">×</button>
            </div>

            {/* Sets / Reps / Weight / Rest */}
            <div className="grid grid-cols-4 gap-2">
              <div>
                <label className="text-[10px] text-gray-600 uppercase">Sets</label>
                <input
                  type="number"
                  value={ex.sets}
                  onChange={(e) => updateExercise(idx, "sets", Number(e.target.value))}
                  className="w-full bg-[#080D19] border border-white/10 rounded-lg px-2 py-1.5 text-sm text-white focus:outline-none"
                  min={1}
                />
              </div>
              <div>
                <label className="text-[10px] text-gray-600 uppercase">Reps</label>
                <input
                  type="number"
                  value={ex.reps}
                  onChange={(e) => updateExercise(idx, "reps", Number(e.target.value))}
                  className="w-full bg-[#080D19] border border-white/10 rounded-lg px-2 py-1.5 text-sm text-white focus:outline-none"
                  min={1}
                />
              </div>
              <div>
                <label className="text-[10px] text-gray-600 uppercase">Weight</label>
                <div className="flex">
                  <input
                    type="number"
                    value={ex.weight}
                    onChange={(e) => updateExercise(idx, "weight", Number(e.target.value))}
                    className="w-full bg-[#080D19] border border-white/10 rounded-l-lg px-2 py-1.5 text-sm text-white focus:outline-none"
                    min={0}
                  />
                  <select
                    value={ex.intensity_measure}
                    onChange={(e) => updateExercise(idx, "intensity_measure", e.target.value)}
                    className="bg-[#080D19] border border-white/10 border-l-0 rounded-r-lg px-1 py-1.5 text-[10px] text-gray-400 focus:outline-none"
                  >
                    <option value="lbs">lbs</option>
                    <option value="kg">kg</option>
                    <option value="bw">bw</option>
                    <option value="sec">sec</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[10px] text-gray-600 uppercase">Rest (s)</label>
                <input
                  type="number"
                  value={ex.rest_seconds}
                  onChange={(e) => updateExercise(idx, "rest_seconds", Number(e.target.value))}
                  className="w-full bg-[#080D19] border border-white/10 rounded-lg px-2 py-1.5 text-sm text-white focus:outline-none"
                  min={0}
                  step={15}
                />
              </div>
            </div>

            {/* Notes */}
            <input
              type="text"
              placeholder="Notes (optional)"
              value={ex.notes}
              onChange={(e) => updateExercise(idx, "notes", e.target.value)}
              className="w-full bg-[#080D19] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-gray-300 placeholder-gray-600 focus:outline-none"
            />
          </div>
        ))}

        <button
          onClick={addExercise}
          className="w-full py-3 rounded-xl border border-dashed border-white/10 text-sm text-gray-400 hover:border-white/20 hover:text-gray-300 transition-colors"
        >
          + Add Exercise
        </button>
      </div>

      {/* Save / Cancel */}
      <div className="flex gap-3 pt-3 border-t border-white/5">
        <button
          onClick={onCancel}
          className="flex-1 py-3 rounded-xl text-sm font-semibold border border-white/10 text-gray-400 hover:bg-white/5 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={!name.trim() || exercises.filter((e) => e.name.trim()).length === 0 || saving}
          className="flex-1 py-3 rounded-xl text-sm font-bold text-white transition-colors disabled:opacity-40"
          style={{ backgroundColor: theme.accent }}
        >
          {saving ? "Saving..." : initial.id ? "Save Changes" : "Create Workout"}
        </button>
      </div>
    </div>
  );
}
