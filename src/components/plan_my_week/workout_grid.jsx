import { useEffect, useState } from "react";
import {
  createWorkout,
  listEquipment,
  searchWorkouts,
} from "../../api/plan_my_week";

const PAGE_SIZE = 12;
const TYPE_OPTIONS = [
  { value: "", label: "Any type" },
  { value: "rep", label: "Rep-based" },
  { value: "duration", label: "Duration-based" },
];

export default function WorkoutGrid({ onClose, onPick, allowCreate }) {
  const [text, setText] = useState("");
  const [type, setType] = useState("");
  const [equipmentId, setEquipmentId] = useState("");
  const [equipmentList, setEquipmentList] = useState([]);
  const [skip, setSkip] = useState(0);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    listEquipment().then(setEquipmentList).catch(() => {});
  }, []);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError("");
    searchWorkouts({
      text: text.trim() || undefined,
      workout_type: type || undefined,
      equiptment_id: equipmentId || undefined,
      skip,
      limit: PAGE_SIZE,
    })
      .then((rows) => {
        if (alive) setItems(rows);
      })
      .catch((e) => alive && setError(e?.message || "Failed to load workouts"))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [text, type, equipmentId, skip]);

  return (
    <Backdrop onClose={onClose}>
      <div className="bg-[#0F1729] rounded-2xl border border-white/10 max-w-4xl w-full max-h-[85vh] overflow-hidden flex flex-col">
        <header className="px-5 py-4 flex items-center justify-between border-b border-white/10">
          <h3 className="text-lg font-bold">Pick a workout</h3>
          <div className="flex items-center gap-2">
            {allowCreate ? (
              <button
                onClick={() => setCreateOpen(true)}
                className="px-3 py-1.5 rounded-lg bg-orange-500 text-white text-xs font-semibold hover:bg-orange-400"
              >
                + New workout
              </button>
            ) : null}
            <button onClick={onClose} className="text-gray-400 hover:text-white text-xl leading-none">×</button>
          </div>
        </header>

        <div className="px-5 py-3 border-b border-white/5 grid grid-cols-1 md:grid-cols-3 gap-2">
          <input
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setSkip(0);
            }}
            placeholder="Search by name or description"
            className="bg-[#0A1020] border border-white/10 rounded-lg px-3 py-2 text-sm"
          />
          <select
            value={type}
            onChange={(e) => {
              setType(e.target.value);
              setSkip(0);
            }}
            className="bg-[#0A1020] border border-white/10 rounded-lg px-3 py-2 text-sm"
          >
            {TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <select
            value={equipmentId}
            onChange={(e) => {
              setEquipmentId(e.target.value);
              setSkip(0);
            }}
            className="bg-[#0A1020] border border-white/10 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">Any equipment</option>
            {equipmentList.map((eq) => (
              <option key={eq.id} value={eq.id}>{eq.name}</option>
            ))}
          </select>
        </div>

        <div className="flex-1 overflow-auto px-5 py-4">
          {error ? (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300 mb-3">{error}</div>
          ) : null}
          {loading ? (
            <p className="text-sm text-gray-500 py-8 text-center">Loading…</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-gray-500 py-8 text-center">No workouts match.</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {items.map((w) => (
                <button
                  key={w.id}
                  onClick={() => onPick({ id: w.id, name: w.name, workout_type: w.workout_type, description: w.description })}
                  className="text-left rounded-lg border border-white/10 bg-[#0A1020] hover:bg-[#13192A] p-3"
                >
                  <p className="font-semibold text-white text-sm">{w.name}</p>
                  <p className="text-[10px] uppercase tracking-widest text-gray-500 mt-0.5">{w.workout_type}</p>
                  {w.description ? (
                    <p className="text-xs text-gray-400 mt-1 line-clamp-2">{w.description}</p>
                  ) : null}
                </button>
              ))}
            </div>
          )}
        </div>

        <footer className="px-5 py-3 border-t border-white/10 flex items-center justify-between text-xs text-gray-400">
          <span>
            {skip + 1}–{skip + items.length} (page {Math.floor(skip / PAGE_SIZE) + 1})
          </span>
          <div className="flex gap-2">
            <button
              disabled={skip === 0}
              onClick={() => setSkip(Math.max(0, skip - PAGE_SIZE))}
              className="px-3 py-1 rounded border border-white/10 disabled:opacity-30"
            >
              ← Prev
            </button>
            <button
              disabled={items.length < PAGE_SIZE}
              onClick={() => setSkip(skip + PAGE_SIZE)}
              className="px-3 py-1 rounded border border-white/10 disabled:opacity-30"
            >
              Next →
            </button>
          </div>
        </footer>
      </div>

      {createOpen ? (
        <CreateWorkout
          equipmentList={equipmentList}
          onClose={() => setCreateOpen(false)}
          onCreated={() => {
            setCreateOpen(false);
            // refresh list — bump skip back to 0 by reapplying the same filters
            setSkip(0);
            // trigger refetch by toggling text (cheap; preserves user input)
            setText((t) => t);
          }}
        />
      ) : null}
    </Backdrop>
  );
}

function Backdrop({ onClose, children }) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {children}
    </div>
  );
}

/* ─── Coach-only: create a new Workout with 3 intensity tiers + equipment ─ */

function CreateWorkout({ equipmentList, onClose, onCreated }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [instructions, setInstructions] = useState("");
  const [workoutType, setWorkoutType] = useState("rep");
  const [intensityMeasure, setIntensityMeasure] = useState("lbs");
  const [tiers, setTiers] = useState([
    { intensity_value: "", estimated_calories_per_unit_frequency: "" },
    { intensity_value: "", estimated_calories_per_unit_frequency: "" },
    { intensity_value: "", estimated_calories_per_unit_frequency: "" },
  ]);
  const [selectedEquipment, setSelectedEquipment] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  function patchTier(i, patch) {
    setTiers((t) => t.map((tt, idx) => (idx === i ? { ...tt, ...patch } : tt)));
  }

  function toggleEquipment(eqId) {
    setSelectedEquipment((prev) =>
      prev.includes(eqId) ? prev.filter((x) => x !== eqId) : [...prev, eqId]
    );
  }

  async function handleSubmit() {
    setError("");
    if (!name.trim()) return setError("Name is required.");
    if (!description.trim()) return setError("Description is required.");
    if (!instructions.trim()) return setError("Instructions are required.");
    const values = tiers.map((t) => Number(t.intensity_value));
    const cals = tiers.map((t) => Number(t.estimated_calories_per_unit_frequency));
    if (values.some((v) => !Number.isFinite(v) || v <= 0)) {
      return setError("All 3 intensity values must be positive numbers.");
    }
    if (cals.some((c) => !Number.isFinite(c) || c < 0)) {
      return setError("All 3 calories-per-unit values must be non-negative numbers.");
    }
    if (new Set(values).size !== 3) {
      return setError("The 3 intensity values must be distinct.");
    }

    setSubmitting(true);
    try {
      await createWorkout({
        name: name.trim(),
        description: description.trim(),
        instructions: instructions.trim(),
        workout_type: workoutType,
        intensity_measure: intensityMeasure.trim(),
        activity_tiers: tiers.map((t) => ({
          intensity_value: Number(t.intensity_value),
          estimated_calories_per_unit_frequency: Number(t.estimated_calories_per_unit_frequency),
        })),
        equipment: selectedEquipment.map((id) => ({
          equiptment_id: id,
          is_required: true,
          is_recommended: true,
        })),
      });
      onCreated();
    } catch (e) {
      setError(e?.message || "Failed to create workout.");
    } finally {
      setSubmitting(false);
    }
  }

  // Default unit suggestions vary by type
  const unitSuggestions =
    workoutType === "duration" ? ["sec", "min"] : ["lbs", "kg", ""];

  return (
    <Backdrop onClose={onClose}>
      <div className="bg-[#0F1729] rounded-2xl border border-white/10 max-w-2xl w-full max-h-[85vh] overflow-auto p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold">New workout</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl leading-none">×</button>
        </div>

        <Field label="Name">
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
        </Field>
        <Field label="Description">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className={inputCls}
          />
        </Field>
        <Field label="Instructions">
          <textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            rows={3}
            className={inputCls}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Workout type">
            <select
              value={workoutType}
              onChange={(e) => {
                setWorkoutType(e.target.value);
                setIntensityMeasure(e.target.value === "duration" ? "sec" : "lbs");
              }}
              className={inputCls}
            >
              <option value="rep">Rep-based</option>
              <option value="duration">Duration-based</option>
            </select>
          </Field>
          <Field label="Intensity unit">
            <input
              value={intensityMeasure}
              onChange={(e) => setIntensityMeasure(e.target.value)}
              placeholder={workoutType === "duration" ? "sec / min" : "lbs / kg"}
              className={inputCls}
              list="unit-suggestions"
            />
            <datalist id="unit-suggestions">
              {unitSuggestions.map((u) => <option key={u} value={u} />)}
            </datalist>
          </Field>
        </div>

        <div>
          <p className="text-xs uppercase tracking-widest text-gray-500 mb-2">3 intensity tiers</p>
          <div className="space-y-2">
            {tiers.map((t, i) => (
              <div key={i} className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  placeholder={`Intensity ${i + 1} (${intensityMeasure || "no unit"})`}
                  value={t.intensity_value}
                  onChange={(e) => patchTier(i, { intensity_value: e.target.value })}
                  className={inputCls}
                />
                <input
                  type="number"
                  step="0.0001"
                  placeholder="Calories per unit"
                  value={t.estimated_calories_per_unit_frequency}
                  onChange={(e) => patchTier(i, { estimated_calories_per_unit_frequency: e.target.value })}
                  className={inputCls}
                />
              </div>
            ))}
          </div>
          <p className="text-[11px] text-gray-500 mt-1">
            "calories per unit" applies per rep (rep-based) or per second (duration-based).
          </p>
        </div>

        <div>
          <p className="text-xs uppercase tracking-widest text-gray-500 mb-2">Equipment</p>
          {equipmentList.length === 0 ? (
            <p className="text-xs text-gray-500">No equipment defined yet.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {equipmentList.map((eq) => (
                <button
                  key={eq.id}
                  onClick={() => toggleEquipment(eq.id)}
                  className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                    selectedEquipment.includes(eq.id)
                      ? "bg-orange-500 border-orange-500 text-white"
                      : "border-white/10 text-gray-300 hover:border-orange-400"
                  }`}
                >
                  {eq.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {error ? (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-2 text-sm text-red-300">{error}</div>
        ) : null}

        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-white/10 rounded-lg">Cancel</button>
          <button
            disabled={submitting}
            onClick={handleSubmit}
            className="px-4 py-2 text-sm bg-orange-500 hover:bg-orange-400 disabled:bg-orange-900/40 rounded-lg font-semibold"
          >
            {submitting ? "Saving…" : "Create workout"}
          </button>
        </div>
      </div>
    </Backdrop>
  );
}

const inputCls =
  "w-full bg-[#0A1020] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600";

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="block text-xs uppercase tracking-widest text-gray-500 mb-1">{label}</span>
      {children}
    </label>
  );
}
