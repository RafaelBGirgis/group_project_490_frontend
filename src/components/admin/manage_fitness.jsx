import { useEffect, useState } from "react";
import {
  // workouts
  listAdminWorkouts, createAdminWorkout, updateAdminWorkout,
  deleteAdminWorkout, unhideAdminWorkout,
  // activities
  listAdminActivities, createAdminActivity, updateAdminActivity, deleteAdminActivity, unhideAdminActivity,
  // equipment
  listAdminEquipment, createAdminEquipment, updateAdminEquipment, deleteAdminEquipment,
  // plans
  listAdminPlans, updateAdminPlan, deleteAdminPlan, unhideAdminPlan,
} from "../../api/admin";

const TABS = [
  { key: "workouts", label: "Workouts" },
  { key: "activities", label: "Activities" },
  { key: "equipment", label: "Equipment" },
  { key: "plans", label: "Plans" },
];

export default function ManageFitness() {
  const [active, setActive] = useState("workouts");

  return (
    <div className="bg-[#0E1628] rounded-2xl border border-white/5 overflow-hidden">
      <div className="flex gap-1 border-b border-white/5 p-1.5 bg-[#0A1020]">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setActive(t.key)}
            className={`px-4 py-2 text-xs uppercase tracking-widest rounded-lg transition-colors ${
              active === t.key
                ? "bg-red-500/10 text-red-400 border border-red-500/30"
                : "text-gray-500 hover:text-gray-300"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="p-5">
        {active === "workouts" && <WorkoutsTab />}
        {active === "activities" && <ActivitiesTab />}
        {active === "equipment" && <EquipmentTab />}
        {active === "plans" && <PlansTab />}
      </div>
    </div>
  );
}

// ─── shared atoms ────────────────────────────────────────────────────────────
function HiddenBadge() {
  return <span className="px-2 py-0.5 rounded text-[9px] uppercase tracking-widest bg-amber-500/10 text-amber-400">hidden</span>;
}
function PrimaryBtn({ children, ...p }) {
  return (
    <button
      {...p}
      className={`px-4 py-2 rounded-lg text-sm font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors disabled:opacity-40 ${p.className || ""}`}
    >
      {children}
    </button>
  );
}
function GhostBtn({ children, ...p }) {
  return (
    <button
      {...p}
      className={`px-3 py-1.5 rounded-lg text-[11px] border border-white/10 text-gray-300 hover:bg-white/5 transition-colors ${p.className || ""}`}
    >
      {children}
    </button>
  );
}
function DangerBtn({ children, ...p }) {
  return (
    <button
      {...p}
      className={`px-3 py-1.5 rounded-lg text-[11px] border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors ${p.className || ""}`}
    >
      {children}
    </button>
  );
}
function SectionToolbar({ children }) {
  return <div className="flex flex-wrap gap-3 items-center mb-4">{children}</div>;
}
function Input(props) {
  return (
    <input
      {...props}
      className={`bg-[#0A1020] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none ${props.className || ""}`}
    />
  );
}
function Select(props) {
  return (
    <select
      {...props}
      className={`bg-[#0A1020] border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none ${props.className || ""}`}
    />
  );
}
function Modal({ title, onClose, children, footer }) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-[#0F1729] rounded-2xl border border-white/10 w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
        <div className="flex items-start justify-between p-5 border-b border-white/10 shrink-0">
          <h3 className="text-lg font-bold text-white">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl leading-none">×</button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-3">{children}</div>
        {footer && <div className="p-5 border-t border-white/10 shrink-0">{footer}</div>}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// WORKOUTS TAB
// ═══════════════════════════════════════════════════════════════════════════
function WorkoutsTab() {
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState("");
  const [type, setType] = useState("all");
  const [showHidden, setShowHidden] = useState(true);
  const [editing, setEditing] = useState(null); // workout obj or null
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function refresh() {
    setBusy(true);
    setError("");
    try {
      const data = await listAdminWorkouts({
        text: search || undefined,
        workout_type: type === "all" ? undefined : type,
        include_hidden: showHidden,
        limit: 200,
      });
      setRows(data);
    } catch (e) {
      setError(e?.message || "Failed to load workouts");
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [type, showHidden]);
  useEffect(() => {
    const id = setTimeout(refresh, 250);
    return () => clearTimeout(id);
    // eslint-disable-next-line
  }, [search]);

  async function handleDelete(w) {
    if (!window.confirm(`Hide "${w.name}"? It stays accessible to logged history but disappears from coach pickers.`)) return;
    await deleteAdminWorkout(w.id);
    refresh();
  }
  async function handleUnhide(w) {
    await unhideAdminWorkout(w.id);
    refresh();
  }

  return (
    <div>
      <SectionToolbar>
        <Input placeholder="Search workouts..." value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1 min-w-[200px]" />
        <Select value={type} onChange={(e) => setType(e.target.value)}>
          <option value="all">All types</option>
          <option value="rep">Rep-based</option>
          <option value="duration">Duration-based</option>
        </Select>
        <label className="flex items-center gap-2 text-xs text-gray-400">
          <input type="checkbox" checked={showHidden} onChange={(e) => setShowHidden(e.target.checked)} className="accent-red-500" />
          Show hidden
        </label>
        <PrimaryBtn onClick={() => setCreating(true)}>+ New Workout</PrimaryBtn>
      </SectionToolbar>

      {error && <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300 mb-3">{error}</div>}

      <div className="divide-y divide-white/5">
        <div className="grid grid-cols-12 gap-4 px-3 py-2 text-[10px] text-gray-500 uppercase tracking-widest">
          <span className="col-span-4">Name</span>
          <span className="col-span-2">Type</span>
          <span className="col-span-2">Activities</span>
          <span className="col-span-2">Equipment</span>
          <span className="col-span-2 text-right">Actions</span>
        </div>
        {busy && rows.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-6">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-6">No workouts</p>
        ) : (
          rows.map((w) => (
            <div key={w.id} className="grid grid-cols-12 gap-4 px-3 py-3 items-center hover:bg-white/[0.02]">
              <div className="col-span-4 flex items-center gap-2">
                <span className="text-white text-sm">{w.name}</span>
                {w.is_hidden && <HiddenBadge />}
              </div>
              <span className="col-span-2 text-gray-400 text-xs">{w.workout_type}</span>
              <span className="col-span-2 text-gray-400 text-xs">{w.activities?.length ?? 0}</span>
              <span className="col-span-2 text-gray-400 text-xs">{w.equipment?.length ?? 0}</span>
              <div className="col-span-2 flex justify-end gap-2">
                <GhostBtn onClick={() => setEditing(w)}>Edit</GhostBtn>
                {w.is_hidden ? (
                  <GhostBtn onClick={() => handleUnhide(w)}>Unhide</GhostBtn>
                ) : (
                  <DangerBtn onClick={() => handleDelete(w)}>Hide</DangerBtn>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {creating && (
        <WorkoutFormModal
          onClose={() => setCreating(false)}
          onSubmit={async (payload) => {
            await createAdminWorkout(payload);
            setCreating(false);
            refresh();
          }}
        />
      )}
      {editing && (
        <WorkoutFormModal
          initial={editing}
          editMode
          onClose={() => setEditing(null)}
          onSubmit={async (patch) => {
            await updateAdminWorkout(editing.id, patch);
            setEditing(null);
            refresh();
          }}
        />
      )}
    </div>
  );
}

function WorkoutFormModal({ initial, onClose, onSubmit, editMode = false }) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [instructions, setInstructions] = useState(initial?.instructions ?? "");
  const [workoutType, setWorkoutType] = useState(initial?.workout_type ?? "rep");
  const [intensityMeasure, setIntensityMeasure] = useState("lbs");
  const [tiers, setTiers] = useState([
    { intensity_value: 50, estimated_calories_per_unit_frequency: 2.5 },
    { intensity_value: 75, estimated_calories_per_unit_frequency: 3.5 },
    { intensity_value: 100, estimated_calories_per_unit_frequency: 4.5 },
  ]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function save() {
    setBusy(true);
    setErr("");
    try {
      if (editMode) {
        await onSubmit({ name, description, instructions, workout_type: workoutType });
      } else {
        await onSubmit({
          name, description, instructions, workout_type: workoutType,
          intensity_measure: intensityMeasure,
          activity_tiers: tiers,
          equipment: [],
        });
      }
    } catch (e) {
      setErr(e?.message || "Save failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      title={editMode ? `Edit Workout #${initial?.id}` : "New Workout"}
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
          {err && <p className="text-xs text-red-300 mr-auto">{err}</p>}
          <GhostBtn onClick={onClose}>Cancel</GhostBtn>
          <PrimaryBtn onClick={save} disabled={busy || !name.trim()}>
            {busy ? "Saving…" : editMode ? "Update" : "Create"}
          </PrimaryBtn>
        </div>
      }
    >
      {editMode && initial && (
        <div className="rounded-lg bg-blue-500/5 border border-blue-500/20 p-3 text-xs text-blue-300">
          Edits create a new version (VCS fork) if this workout has been logged or is part of any plan.
          The old version is hidden but preserved for telemetry.
        </div>
      )}
      <Field label="Name"><Input value={name} onChange={(e) => setName(e.target.value)} className="w-full" /></Field>
      <Field label="Description"><Input value={description} onChange={(e) => setDescription(e.target.value)} className="w-full" /></Field>
      <Field label="Instructions">
        <textarea
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          rows={3}
          className="w-full bg-[#0A1020] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
        />
      </Field>
      <Field label="Type">
        <Select value={workoutType} onChange={(e) => setWorkoutType(e.target.value)} className="w-full">
          <option value="rep">Rep-based</option>
          <option value="duration">Duration-based</option>
        </Select>
      </Field>
      {!editMode && (
        <>
          <Field label="Intensity measure (free-text — e.g. lbs, kg, sec, mph)">
            <Input value={intensityMeasure} onChange={(e) => setIntensityMeasure(e.target.value)} className="w-full" />
          </Field>
          <Field label="Activity tiers (3 intensity levels)">
            <div className="space-y-2">
              {tiers.map((t, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="value"
                    value={t.intensity_value}
                    onChange={(e) => {
                      const v = [...tiers]; v[i].intensity_value = Number(e.target.value); setTiers(v);
                    }}
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="cal/unit"
                    value={t.estimated_calories_per_unit_frequency}
                    onChange={(e) => {
                      const v = [...tiers]; v[i].estimated_calories_per_unit_frequency = Number(e.target.value); setTiers(v);
                    }}
                    className="flex-1"
                  />
                </div>
              ))}
            </div>
          </Field>
        </>
      )}
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ACTIVITIES TAB
// ═══════════════════════════════════════════════════════════════════════════
const ACTIVITIES_PER_PAGE = 10;

function ActivitiesTab() {
  const [rows, setRows] = useState([]);
  const [workouts, setWorkouts] = useState([]);
  const [filterWorkout, setFilterWorkout] = useState("all");
  // Default off: hidden rows are forked-old VCS versions and the PATCH endpoint
  // 404s if you try to edit one. The "Show hidden" toggle reveals them with
  // an Unhide affordance instead of an Edit button.
  const [showHidden, setShowHidden] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function refresh() {
    setBusy(true);
    setError("");
    try {
      const [acts, wos] = await Promise.all([
        listAdminActivities({
          workout_id: filterWorkout === "all" ? undefined : Number(filterWorkout),
          include_hidden: showHidden,
          limit: 500,
        }),
        listAdminWorkouts({ limit: 500, include_hidden: false }),
      ]);
      setRows(acts);
      setWorkouts(wos);
    } catch (e) {
      setError(e?.message || "Failed to load");
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [filterWorkout, showHidden]);

  // Reset to page 1 whenever the search/filter changes so the user
  // doesn't get stuck on an out-of-range page after narrowing results.
  useEffect(() => { setPage(1); }, [search, filterWorkout, showHidden]);

  async function handleDelete(a) {
    if (!window.confirm("Hide this activity tier? Coach pickers will exclude it; existing logs survive.")) return;
    await deleteAdminActivity(a.id);
    refresh();
  }

  async function handleUnhide(a) {
    await unhideAdminActivity(a.id);
    refresh();
  }

  // Filter client-side by parent workout name + intensity measure so the
  // search field finds activities the same way users think of them.
  const q = search.trim().toLowerCase();
  const filteredRows = q
    ? rows.filter((a) => {
        const name = (a.workout_name || `#${a.workout_id}`).toLowerCase();
        const measure = (a.intensity_measure || "").toLowerCase();
        return name.includes(q) || measure.includes(q);
      })
    : rows;

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / ACTIVITIES_PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const pageRows = filteredRows.slice(
    (safePage - 1) * ACTIVITIES_PER_PAGE,
    safePage * ACTIVITIES_PER_PAGE
  );

  return (
    <div>
      <SectionToolbar>
        <Select value={filterWorkout} onChange={(e) => setFilterWorkout(e.target.value)}>
          <option value="all">All workouts</option>
          {workouts.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
        </Select>
        <label className="flex items-center gap-2 text-xs text-gray-400">
          <input type="checkbox" checked={showHidden} onChange={(e) => setShowHidden(e.target.checked)} className="accent-red-500" />
          Show hidden
        </label>
        {/* Search input shares the toolbar row with + New Activity. flex-1
            lets it stretch to fill the gap between the dropdown/checkbox
            cluster on the left and the create button on the right. */}
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search activities…"
          className="flex-1 min-w-[160px]"
        />
        <PrimaryBtn onClick={() => setCreating(true)} disabled={workouts.length === 0}>+ New Activity</PrimaryBtn>
      </SectionToolbar>

      {error && <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300 mb-3">{error}</div>}

      <div className="divide-y divide-white/5">
        <div className="grid grid-cols-12 gap-4 px-3 py-2 text-[10px] text-gray-500 uppercase tracking-widest">
          <span className="col-span-4">Workout</span>
          <span className="col-span-3">Intensity</span>
          <span className="col-span-3">Cal / unit</span>
          <span className="col-span-2 text-right">Actions</span>
        </div>
        {busy && rows.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-6">Loading…</p>
        ) : pageRows.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-6">
            {filteredRows.length === 0 && rows.length > 0
              ? "No activities match your search."
              : "No activities"}
          </p>
        ) : (
          pageRows.map((a) => (
            <div key={a.id} className="grid grid-cols-12 gap-4 px-3 py-3 items-center hover:bg-white/[0.02]">
              <div className="col-span-4 flex items-center gap-2">
                <span className="text-white text-sm">{a.workout_name || `#${a.workout_id}`}</span>
                {a.is_hidden && <HiddenBadge />}
              </div>
              <span className="col-span-3 text-gray-400 text-xs">
                {a.intensity_value ?? "—"} {a.intensity_measure || ""}
              </span>
              <span className="col-span-3 text-gray-400 text-xs">
                {Number(a.estimated_calories_per_unit_frequency).toFixed(2)}
              </span>
              <div className="col-span-2 flex justify-end gap-2">
                {a.is_hidden ? (
                  <GhostBtn onClick={() => handleUnhide(a)}>Unhide</GhostBtn>
                ) : (
                  <>
                    <GhostBtn onClick={() => setEditing(a)}>Edit</GhostBtn>
                    <DangerBtn onClick={() => handleDelete(a)}>Hide</DangerBtn>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-3 py-3 border-t border-white/5 mt-2">
          <p className="text-gray-500 text-xs">
            Showing {(safePage - 1) * ACTIVITIES_PER_PAGE + 1}–
            {Math.min(safePage * ACTIVITIES_PER_PAGE, filteredRows.length)} of {filteredRows.length}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage === 1}
              className="text-[10px] px-2.5 py-1.5 rounded-lg border border-white/10 text-gray-400 hover:bg-white/5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              ← Prev
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                onClick={() => setPage(n)}
                className={`text-[10px] min-w-[28px] py-1.5 rounded-lg border transition-colors ${
                  n === safePage
                    ? "border-red-500/50 bg-red-500/10 text-red-400"
                    : "border-white/10 text-gray-500 hover:bg-white/5"
                }`}
              >
                {n}
              </button>
            ))}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages}
              className="text-[10px] px-2.5 py-1.5 rounded-lg border border-white/10 text-gray-400 hover:bg-white/5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Next →
            </button>
          </div>
        </div>
      )}

      {creating && (
        <ActivityFormModal
          workouts={workouts}
          onClose={() => setCreating(false)}
          onSubmit={async (payload) => { await createAdminActivity(payload); setCreating(false); refresh(); }}
        />
      )}
      {editing && (
        <ActivityFormModal
          initial={editing}
          editMode
          workouts={workouts}
          onClose={() => setEditing(null)}
          onSubmit={async (patch) => { await updateAdminActivity(editing.id, patch); setEditing(null); refresh(); }}
        />
      )}
    </div>
  );
}

function ActivityFormModal({ initial, workouts, onClose, onSubmit, editMode = false }) {
  const [workoutId, setWorkoutId] = useState(initial?.workout_id ?? workouts?.[0]?.id ?? "");
  const [intensityMeasure, setIntensityMeasure] = useState(initial?.intensity_measure ?? "");
  const [intensityValue, setIntensityValue] = useState(initial?.intensity_value ?? 0);
  const [cpuf, setCpuf] = useState(initial?.estimated_calories_per_unit_frequency ?? 1.0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function save() {
    setBusy(true);
    setErr("");
    try {
      if (editMode) {
        await onSubmit({
          intensity_measure: intensityMeasure,
          intensity_value: Number(intensityValue),
          estimated_calories_per_unit_frequency: Number(cpuf),
        });
      } else {
        await onSubmit({
          workout_id: Number(workoutId),
          intensity_measure: intensityMeasure,
          intensity_value: Number(intensityValue),
          estimated_calories_per_unit_frequency: Number(cpuf),
        });
      }
    } catch (e) {
      setErr(e?.message || "Save failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      title={editMode ? `Edit Activity #${initial?.id}` : "New Activity Tier"}
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
          {err && <p className="text-xs text-red-300 mr-auto">{err}</p>}
          <GhostBtn onClick={onClose}>Cancel</GhostBtn>
          <PrimaryBtn onClick={save} disabled={busy}>
            {busy ? "Saving…" : editMode ? "Update" : "Create"}
          </PrimaryBtn>
        </div>
      }
    >
      {editMode && (
        <div className="rounded-lg bg-blue-500/5 border border-blue-500/20 p-3 text-xs text-blue-300">
          Edits create a new version (VCS fork) if this activity is referenced by telemetry or any plan.
        </div>
      )}
      {!editMode && (
        <Field label="Parent workout">
          <Select value={workoutId} onChange={(e) => setWorkoutId(e.target.value)} className="w-full">
            {workouts.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
          </Select>
        </Field>
      )}
      <Field label="Intensity measure"><Input value={intensityMeasure} onChange={(e) => setIntensityMeasure(e.target.value)} className="w-full" placeholder="lbs, kg, sec…" /></Field>
      <Field label="Intensity value"><Input type="number" value={intensityValue} onChange={(e) => setIntensityValue(e.target.value)} className="w-full" /></Field>
      <Field label="Estimated calories per unit frequency"><Input type="number" step="0.01" value={cpuf} onChange={(e) => setCpuf(e.target.value)} className="w-full" /></Field>
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// EQUIPMENT TAB
// ═══════════════════════════════════════════════════════════════════════════
function EquipmentTab() {
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  async function refresh() {
    setError("");
    try {
      const data = await listAdminEquipment({ text: search || undefined, limit: 500 });
      setRows(data);
    } catch (e) {
      setError(e?.message || "Failed to load");
    }
  }
  useEffect(() => {
    const id = setTimeout(refresh, 250);
    return () => clearTimeout(id);
    // eslint-disable-next-line
  }, [search]);

  async function handleDelete(eq) {
    if (eq.linked_workout_count > 0) {
      if (!window.confirm(`"${eq.name}" is linked to ${eq.linked_workout_count} workout(s). Deleting unlinks it. Continue?`)) return;
    } else if (!window.confirm(`Delete "${eq.name}"?`)) return;
    await deleteAdminEquipment(eq.id);
    refresh();
  }

  return (
    <div>
      <SectionToolbar>
        <Input placeholder="Search equipment..." value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1 min-w-[200px]" />
        <PrimaryBtn onClick={() => setCreating(true)}>+ New Equipment</PrimaryBtn>
      </SectionToolbar>

      {error && <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300 mb-3">{error}</div>}

      <div className="divide-y divide-white/5">
        <div className="grid grid-cols-12 gap-4 px-3 py-2 text-[10px] text-gray-500 uppercase tracking-widest">
          <span className="col-span-4">Name</span>
          <span className="col-span-5">Description</span>
          <span className="col-span-1">Used</span>
          <span className="col-span-2 text-right">Actions</span>
        </div>
        {rows.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-6">No equipment</p>
        ) : (
          rows.map((eq) => (
            <div key={eq.id} className="grid grid-cols-12 gap-4 px-3 py-3 items-center hover:bg-white/[0.02]">
              <span className="col-span-4 text-white text-sm">{eq.name}</span>
              <span className="col-span-5 text-gray-400 text-xs truncate">{eq.description || "—"}</span>
              <span className="col-span-1 text-gray-500 text-xs">{eq.linked_workout_count}</span>
              <div className="col-span-2 flex justify-end gap-2">
                <GhostBtn onClick={() => setEditing(eq)}>Edit</GhostBtn>
                <DangerBtn onClick={() => handleDelete(eq)}>Delete</DangerBtn>
              </div>
            </div>
          ))
        )}
      </div>

      {creating && (
        <EquipmentFormModal
          onClose={() => setCreating(false)}
          onSubmit={async (payload) => { await createAdminEquipment(payload); setCreating(false); refresh(); }}
        />
      )}
      {editing && (
        <EquipmentFormModal
          initial={editing}
          onClose={() => setEditing(null)}
          onSubmit={async (payload) => { await updateAdminEquipment(editing.id, payload); setEditing(null); refresh(); }}
        />
      )}
    </div>
  );
}

function EquipmentFormModal({ initial, onClose, onSubmit }) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function save() {
    setBusy(true); setErr("");
    try { await onSubmit({ name: name.trim(), description: description.trim() || null }); }
    catch (e) { setErr(e?.message || "Save failed"); }
    finally { setBusy(false); }
  }

  return (
    <Modal
      title={initial ? `Edit Equipment #${initial.id}` : "New Equipment"}
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
          {err && <p className="text-xs text-red-300 mr-auto">{err}</p>}
          <GhostBtn onClick={onClose}>Cancel</GhostBtn>
          <PrimaryBtn onClick={save} disabled={busy || !name.trim()}>{busy ? "Saving…" : initial ? "Update" : "Create"}</PrimaryBtn>
        </div>
      }
    >
      <Field label="Name"><Input value={name} onChange={(e) => setName(e.target.value)} className="w-full" /></Field>
      <Field label="Description"><Input value={description} onChange={(e) => setDescription(e.target.value)} className="w-full" /></Field>
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// PLANS TAB
// ═══════════════════════════════════════════════════════════════════════════
function PlansTab() {
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState("");
  const [showHidden, setShowHidden] = useState(true);
  const [publicOnly, setPublicOnly] = useState(false);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState("");

  async function refresh() {
    setError("");
    try {
      const data = await listAdminPlans({
        text: search || undefined,
        include_hidden: showHidden,
        public_only: publicOnly,
        limit: 200,
      });
      setRows(data);
    } catch (e) {
      setError(e?.message || "Failed to load plans");
    }
  }
  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [showHidden, publicOnly]);
  useEffect(() => {
    const id = setTimeout(refresh, 250);
    return () => clearTimeout(id);
    // eslint-disable-next-line
  }, [search]);

  async function handleDelete(p) {
    if (!window.confirm(`Hide plan "${p.strata_name}"? Existing scheduled CWPs continue to resolve.`)) return;
    await deleteAdminPlan(p.id);
    refresh();
  }
  async function handleUnhide(p) {
    await unhideAdminPlan(p.id);
    refresh();
  }
  async function handleTogglePublic(p) {
    await updateAdminPlan(p.id, { is_public: !p.is_public });
    refresh();
  }

  return (
    <div>
      <SectionToolbar>
        <Input placeholder="Search plans..." value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1 min-w-[200px]" />
        <label className="flex items-center gap-2 text-xs text-gray-400">
          <input type="checkbox" checked={showHidden} onChange={(e) => setShowHidden(e.target.checked)} className="accent-red-500" />
          Show hidden
        </label>
        <label className="flex items-center gap-2 text-xs text-gray-400">
          <input type="checkbox" checked={publicOnly} onChange={(e) => setPublicOnly(e.target.checked)} className="accent-red-500" />
          Public only
        </label>
      </SectionToolbar>

      {error && <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300 mb-3">{error}</div>}

      <div className="divide-y divide-white/5">
        <div className="grid grid-cols-12 gap-4 px-3 py-2 text-[10px] text-gray-500 uppercase tracking-widest">
          <span className="col-span-4">Name</span>
          <span className="col-span-2">Owner</span>
          <span className="col-span-2">Activities</span>
          <span className="col-span-1">Public</span>
          <span className="col-span-3 text-right">Actions</span>
        </div>
        {rows.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-6">No plans</p>
        ) : (
          rows.map((p) => (
            <div key={p.id} className="grid grid-cols-12 gap-4 px-3 py-3 items-center hover:bg-white/[0.02]">
              <div className="col-span-4 flex items-center gap-2">
                <span className="text-white text-sm">{p.strata_name}</span>
                {p.is_hidden && <HiddenBadge />}
              </div>
              <span className="col-span-2 text-gray-500 text-xs">acc#{p.created_by_account_id ?? "—"}</span>
              <span className="col-span-2 text-gray-400 text-xs">{p.activities?.length ?? 0}</span>
              <span className="col-span-1 text-xs">
                {p.is_public ? <span className="text-green-400">yes</span> : <span className="text-gray-500">no</span>}
              </span>
              <div className="col-span-3 flex justify-end gap-2">
                <GhostBtn onClick={() => setEditing(p)}>Edit</GhostBtn>
                <GhostBtn onClick={() => handleTogglePublic(p)}>{p.is_public ? "Unpublish" : "Publish"}</GhostBtn>
                {p.is_hidden ? (
                  <GhostBtn onClick={() => handleUnhide(p)}>Unhide</GhostBtn>
                ) : (
                  <DangerBtn onClick={() => handleDelete(p)}>Hide</DangerBtn>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {editing && (
        <PlanEditModal
          plan={editing}
          onClose={() => setEditing(null)}
          onSubmit={async (patch) => { await updateAdminPlan(editing.id, patch); setEditing(null); refresh(); }}
        />
      )}
    </div>
  );
}

function PlanEditModal({ plan, onClose, onSubmit }) {
  const [name, setName] = useState(plan.strata_name ?? "");
  const [isPublic, setIsPublic] = useState(!!plan.is_public);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function save() {
    setBusy(true); setErr("");
    try { await onSubmit({ strata_name: name.trim(), is_public: isPublic }); }
    catch (e) { setErr(e?.message || "Save failed"); }
    finally { setBusy(false); }
  }

  return (
    <Modal
      title={`Edit Plan #${plan.id}`}
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
          {err && <p className="text-xs text-red-300 mr-auto">{err}</p>}
          <GhostBtn onClick={onClose}>Cancel</GhostBtn>
          <PrimaryBtn onClick={save} disabled={busy || !name.trim()}>{busy ? "Saving…" : "Update"}</PrimaryBtn>
        </div>
      }
    >
      <div className="rounded-lg bg-blue-500/5 border border-blue-500/20 p-3 text-xs text-blue-300">
        Plan edits always create a new version (VCS fork). The old version is hidden but stays referenced by any
        scheduled CWPs and existing telemetry.
      </div>
      <Field label="Name"><Input value={name} onChange={(e) => setName(e.target.value)} className="w-full" /></Field>
      <label className="flex items-center gap-2 text-sm text-gray-300">
        <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} className="accent-red-500" />
        Listed publicly in Browse Plans
      </label>
      <div className="text-xs text-gray-500 mt-2">
        <strong className="text-gray-300">Activities ({plan.activities?.length ?? 0}):</strong>
        <ul className="mt-1 space-y-0.5">
          {(plan.activities ?? []).map((a) => (
            <li key={a.id}>• {a.workout_name || `#${a.workout_activity_id}`} — {a.planned_duration ? `${a.planned_duration}s` : `${a.planned_reps}×${a.planned_sets}`}</li>
          ))}
        </ul>
      </div>
    </Modal>
  );
}

// ─── small layout atoms ─────────────────────────────────────────────────────
function Field({ label, children }) {
  return (
    <label className="block">
      <span className="block text-[10px] uppercase tracking-widest text-gray-500 mb-1">{label}</span>
      {children}
    </label>
  );
}
