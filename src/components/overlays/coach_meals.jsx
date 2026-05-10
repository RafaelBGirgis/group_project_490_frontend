import { useEffect, useMemo, useState } from "react";
import StatusBadge from "../status_badge";
import {
  fetchMealLibrary,
  createMeal,
  deleteMeal,
  prescribeMealToClient,
  fetchPrescribedMealsByClient,
  unprescribeMeal,
} from "../../api/meals";
import { searchFoods, fetchFoodDetail } from "../../api/foods";

// Days are Mon→Sun for the weekly planner grid; meal kinds match the
// backend's MealKind literal so the strings round-trip cleanly.
const WEEKDAYS = [
  ["Mon", 0],
  ["Tue", 1],
  ["Wed", 2],
  ["Thu", 3],
  ["Fri", 4],
  ["Sat", 5],
  ["Sun", 6],
];
const MEAL_KINDS = ["breakfast", "lunch", "dinner"];

function mondayOf(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  // getDay: Sun=0..Sat=6 → shift so Mon=0
  const dow = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - dow);
  return d;
}

function isoDate(d) {
  // YYYY-MM-DD in local time. Used to key planner cells and send to the API.
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Coach Meals overlay — full meal management for coaches.
 *
 * Three tabs in one overlay:
 *   1. Library — meals I've created (or seeded ones I can prescribe)
 *   2. Build  — search USDA, add foods with grams, save as a new meal
 *   3. Prescribed — meals I've assigned to a specific client (set via prop)
 *
 * Calorie/macro totals are computed server-side from food.kcal_per_100g and
 * the grams stored in meal_food, so this UI only renders what the backend
 * returns — never computes calories on its own.
 *
 * Props:
 *   clients   – [{id, name}]  list of coach's clients (for "prescribe to" picker)
 *   onClose   – ()
 */
export default function CoachMealsOverlay({ clients = [], onClose }) {
  const [tab, setTab] = useState("plan"); // "plan" | "library" | "build"
  const [library, setLibrary] = useState([]);
  const [loadingLib, setLoadingLib] = useState(false);
  const [error, setError] = useState("");

  const reloadLibrary = async () => {
    setLoadingLib(true);
    try {
      setLibrary(await fetchMealLibrary({ limit: 100 }));
    } finally {
      setLoadingLib(false);
    }
  };

  useEffect(() => { reloadLibrary(); }, []);

  return (
    <div className="space-y-4">
      {/* Tabs — Plan first because that's the primary coach workflow now */}
      <div className="flex gap-1 bg-[#0A1020] rounded-lg p-0.5 w-fit">
        {[
          ["plan", "Weekly Plan"],
          ["library", `Library (${library.length})`],
          ["build", "Build New Meal"],
        ].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-colors ${
              tab === key
                ? "bg-orange-500/20 text-orange-400"
                : "text-gray-500 hover:text-gray-300"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {error && (
        <p className="text-red-400 text-xs bg-red-500/10 rounded-lg px-3 py-2">{error}</p>
      )}

      {tab === "plan" && (
        <PlanTab
          clients={clients}
          library={library}
          onError={setError}
        />
      )}

      {tab === "library" && (
        <LibraryTab
          library={library}
          loading={loadingLib}
          onDelete={async (mealId) => {
            if (!window.confirm("Delete this meal? It will also be removed from any clients you prescribed it to.")) return;
            try {
              await deleteMeal(mealId);
              await reloadLibrary();
            } catch (e) {
              setError(e?.message || "Failed to delete meal.");
            }
          }}
        />
      )}

      {tab === "build" && (
        <BuildMealTab
          onSaved={async () => {
            await reloadLibrary();
            setTab("library");
          }}
          onError={setError}
        />
      )}

      {onClose && (
        <div className="pt-2">
          <button
            onClick={onClose}
            className="text-xs text-gray-400 hover:text-gray-200"
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   PLAN TAB — pick a client, see/edit the weekly meal grid (7 days × 3 slots)
   ═══════════════════════════════════════════════════════════════════════════ */

function PlanTab({ clients, library, onError }) {
  const [clientId, setClientId] = useState(clients[0]?.id ?? "");
  const [weekStart, setWeekStart] = useState(() => mondayOf(new Date()));
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(false);

  const weekStartIso = useMemo(() => isoDate(weekStart), [weekStart]);

  // Load this client's prescriptions for the visible week. Each cell on the
  // grid is keyed by `${date}|${kind}`; we precompute an index for O(1)
  // lookup when rendering.
  const loadPlan = async (cId, ws) => {
    if (!cId) { setPrescriptions([]); return; }
    setLoading(true);
    try {
      const items = await fetchPrescribedMealsByClient(cId, { weekStart: ws });
      setPrescriptions(items);
    } catch (e) {
      onError(e?.message || "Failed to load meal plan.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadPlan(clientId, weekStartIso); }, [clientId, weekStartIso]);

  const indexed = useMemo(() => {
    const map = {};
    for (const p of prescriptions) {
      if (p.scheduled_date && p.meal_kind) {
        map[`${p.scheduled_date}|${p.meal_kind}`] = p;
      }
    }
    return map;
  }, [prescriptions]);

  const shiftWeek = (delta) => {
    const next = new Date(weekStart);
    next.setDate(next.getDate() + delta * 7);
    setWeekStart(next);
  };

  const handleAssign = async (date, kind, mealId) => {
    if (!clientId || !mealId) return;
    try {
      await prescribeMealToClient(Number(clientId), Number(mealId), {
        scheduledDate: date,
        mealKind: kind,
      });
      await loadPlan(clientId, weekStartIso);
    } catch (e) {
      onError(e?.message || "Failed to assign meal.");
    }
  };

  const handleClear = async (prescriptionId) => {
    try {
      await unprescribeMeal(prescriptionId);
      await loadPlan(clientId, weekStartIso);
    } catch (e) {
      onError(e?.message || "Failed to clear cell.");
    }
  };

  if (!clients?.length) {
    return (
      <p className="text-gray-500 text-sm text-center py-8">
        You don't have any active clients yet. Once a client is matched with you,
        they'll show up here so you can build their meal plan.
      </p>
    );
  }

  // Generate the 7 day-headers from the visible week start.
  const dayDates = WEEKDAYS.map(([_, idx]) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + idx);
    return d;
  });

  return (
    <div className="space-y-3">
      {/* Toolbar: client picker + week navigator */}
      <div className="flex items-center gap-3 flex-wrap">
        <select
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
          className="bg-[#0A1020] border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none"
        >
          {clients.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        <div className="flex items-center gap-1">
          <button
            onClick={() => shiftWeek(-1)}
            className="px-2 py-1.5 rounded-lg border border-white/10 text-gray-300 text-xs hover:bg-white/5"
          >
            ← Prev
          </button>
          <span className="text-xs text-gray-400 px-2">
            Week of {weekStart.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
          </span>
          <button
            onClick={() => shiftWeek(1)}
            className="px-2 py-1.5 rounded-lg border border-white/10 text-gray-300 text-xs hover:bg-white/5"
          >
            Next →
          </button>
          <button
            onClick={() => setWeekStart(mondayOf(new Date()))}
            className="px-2 py-1.5 rounded-lg border border-orange-500/30 text-orange-400 text-xs hover:bg-orange-500/10"
          >
            This Week
          </button>
        </div>
      </div>

      {loading && <p className="text-gray-500 text-xs">Loading plan…</p>}

      {/* Grid: 8 cols (1 label + 7 days) × 4 rows (1 header + 3 meal kinds).
          Cells empty = "+ assign" picker; cells filled = meal name + Clear. */}
      <div className="overflow-x-auto">
        <div className="grid grid-cols-8 gap-1 min-w-[700px]">
          {/* Header row */}
          <div className="text-[10px] uppercase tracking-widest text-gray-500 px-2 py-2">Slot</div>
          {WEEKDAYS.map(([label, idx]) => (
            <div key={label} className="text-[10px] uppercase tracking-widest text-gray-500 text-center py-2">
              {label}
              <div className="text-gray-600 text-[9px] font-normal normal-case">
                {dayDates[idx].toLocaleDateString(undefined, { month: "short", day: "numeric" })}
              </div>
            </div>
          ))}

          {/* Meal-kind rows */}
          {MEAL_KINDS.map((kind) => (
            <PlanRow
              key={kind}
              kind={kind}
              dayDates={dayDates}
              indexed={indexed}
              library={library}
              onAssign={handleAssign}
              onClear={handleClear}
            />
          ))}
        </div>
      </div>

      {!library.length && (
        <p className="text-gray-500 text-xs text-center pt-2">
          No meals in your library yet. Switch to "Build New Meal" to create one,
          then come back to assign it.
        </p>
      )}
    </div>
  );
}

function PlanRow({ kind, dayDates, indexed, library, onAssign, onClear }) {
  return (
    <>
      <div className="text-[10px] uppercase tracking-widest text-gray-300 self-center px-2 py-3">
        {kind}
      </div>
      {dayDates.map((d) => {
        const dateIso = isoDate(d);
        const filled = indexed[`${dateIso}|${kind}`];
        return (
          <div key={dateIso + kind} className="bg-[#0A1020] border border-white/5 rounded-lg p-2 min-h-[72px] flex flex-col justify-between">
            {filled ? (
              <>
                <div>
                  <p className="text-white text-[11px] font-medium leading-tight line-clamp-2">
                    {filled.meal.meal_name}
                  </p>
                  <p className="text-orange-400 text-[10px] mt-0.5">
                    {Math.round(filled.meal.totals?.calories || 0)} kcal
                  </p>
                </div>
                <button
                  onClick={() => onClear(filled.id)}
                  className="self-end text-[9px] text-gray-500 hover:text-red-400 mt-1"
                >
                  Clear
                </button>
              </>
            ) : (
              <select
                defaultValue=""
                onChange={(e) => onAssign(dateIso, kind, e.target.value)}
                className="w-full bg-[#080D19] border border-white/10 rounded text-[10px] text-gray-300 px-1 py-1 focus:outline-none"
              >
                <option value="">+ Add meal…</option>
                {library.map((m) => (
                  <option key={m.id} value={m.id}>{m.meal_name}</option>
                ))}
              </select>
            )}
          </div>
        );
      })}
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   LIBRARY TAB — list of meals + "Prescribe to client" picker per row
   ═══════════════════════════════════════════════════════════════════════════ */

function LibraryTab({ library, loading, onDelete }) {
  const [openMealId, setOpenMealId] = useState(null);

  if (loading) {
    return <p className="text-gray-500 text-sm text-center py-8">Loading…</p>;
  }
  if (library.length === 0) {
    return (
      <p className="text-gray-500 text-sm text-center py-8">
        No meals in your library yet. Click "Build New Meal" to create one.
      </p>
    );
  }
  return (
    <div className="space-y-2">
      <p className="text-gray-500 text-xs">
        These are the meals you've built. Use the <span className="text-orange-400">Weekly Plan</span> tab
        to schedule them onto specific days for a client.
      </p>
      {library.map((m) => (
        <div
          key={m.id}
          className="rounded-xl bg-[#0A1020] border border-white/5 p-4 space-y-2"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <p className="text-white font-semibold text-sm">{m.meal_name}</p>
              <p className="text-gray-500 text-xs mt-0.5">
                by {m.created_by_name || `account #${m.created_by_account_id}`}
              </p>
            </div>
            <div className="text-right">
              <p className="text-orange-400 font-bold text-sm">
                {Math.round(m.totals?.calories || 0)} kcal
              </p>
              <p className="text-gray-500 text-[10px]">
                P {Math.round(m.totals?.protein_g || 0)}g · C {Math.round(m.totals?.carbs_g || 0)}g · F {Math.round(m.totals?.fat_g || 0)}g
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => onDelete(m.id)}
              className="text-[10px] px-3 py-1.5 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors"
            >
              Delete
            </button>
            <button
              onClick={() => setOpenMealId(openMealId === m.id ? null : m.id)}
              className="text-[10px] px-3 py-1.5 rounded-lg border border-white/10 text-gray-300 hover:bg-white/5 transition-colors"
            >
              {openMealId === m.id ? "Hide" : "Show"} ingredients
            </button>
          </div>

          {openMealId === m.id && <IngredientList mealId={m.id} />}
        </div>
      ))}
    </div>
  );
}

function IngredientList({ mealId }) {
  // Lazy-loads the full meal detail when expanded, so we don't pay the join
  // cost for every row in the library list.
  const [detail, setDetail] = useState(null);
  useEffect(() => {
    let cancelled = false;
    import("../../api/meals").then(({ fetchMealDetail }) => {
      fetchMealDetail(mealId).then((d) => { if (!cancelled) setDetail(d); }).catch(() => {});
    });
    return () => { cancelled = true; };
  }, [mealId]);
  if (!detail) return <p className="text-gray-500 text-[10px]">Loading…</p>;
  return (
    <div className="rounded-lg bg-black/30 px-3 py-2 mt-2">
      <ul className="text-[10px] text-gray-400 space-y-0.5">
        {detail.foods?.map((f, i) => (
          <li key={i}>
            <span className="text-gray-200">{f.food_name}</span>
            {f.grams > 0 ? ` · ${Math.round(f.grams)}g` : ""}
            {" · "}
            {Math.round(f.calories)} kcal
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   BUILD MEAL TAB — search USDA, add foods with grams, save
   ═══════════════════════════════════════════════════════════════════════════ */

function BuildMealTab({ onSaved, onError }) {
  const [name, setName] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [hits, setHits] = useState([]);
  const [searching, setSearching] = useState(false);
  // Items in the meal: each has the food's macros + the chosen grams.
  const [items, setItems] = useState([]); // [{food_id, fdc_id, name, grams, kcal_100g, p_100g, c_100g, f_100g}]
  const [saving, setSaving] = useState(false);

  const totals = useMemo(() => {
    const sum = (key) => items.reduce((acc, it) => acc + (it[key] || 0) * (it.grams || 0) / 100, 0);
    return {
      calories: Math.round(sum("kcal_100g")),
      protein: Math.round(sum("p_100g")),
      carbs: Math.round(sum("c_100g")),
      fat: Math.round(sum("f_100g")),
    };
  }, [items]);

  const handleSearch = async () => {
    if (!searchTerm.trim()) return;
    setSearching(true);
    try {
      setHits(await searchFoods(searchTerm, { pageSize: 15 }));
    } finally {
      setSearching(false);
    }
  };

  const handleAdd = async (hit) => {
    // /api/foods/{fdc_id} caches into our DB and returns the internal `id`
    // we need for meal_food.food_id. The search hit alone isn't enough —
    // it has fdc_id but not our internal id.
    try {
      const detail = await fetchFoodDetail(hit.fdc_id);
      setItems((prev) => [
        ...prev,
        {
          food_id: detail.id,
          fdc_id: detail.fdc_id,
          name: detail.name,
          grams: 100,
          kcal_100g: detail.calories_per_100g,
          p_100g: detail.protein_g_per_100g,
          c_100g: detail.carbs_g_per_100g,
          f_100g: detail.fat_g_per_100g,
        },
      ]);
    } catch (e) {
      onError(e?.message || "Failed to fetch food detail.");
    }
  };

  const updateGrams = (idx, grams) => {
    setItems((prev) => prev.map((it, i) => i === idx ? { ...it, grams: Math.max(0, Number(grams) || 0) } : it));
  };

  const removeItem = (idx) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const canSave = name.trim() && items.length > 0 && items.every((it) => it.grams > 0);

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      await createMeal(
        name.trim(),
        items.map((it) => ({ food_id: it.food_id, grams: Number(it.grams) }))
      );
      // Reset and bounce back to library.
      setName("");
      setItems([]);
      setHits([]);
      setSearchTerm("");
      await onSaved();
    } catch (e) {
      onError(e?.message || "Failed to save meal.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Meal name */}
      <div>
        <label className="text-[10px] text-gray-500 uppercase tracking-widest">Meal Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. High-protein lunch"
          className="w-full bg-[#0A1020] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none mt-1"
        />
      </div>

      {/* Search USDA */}
      <div className="space-y-2">
        <label className="text-[10px] text-gray-500 uppercase tracking-widest">Add Food</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Search USDA — e.g. 'chicken breast'"
            className="flex-1 bg-[#0A1020] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none"
          />
          <button
            onClick={handleSearch}
            disabled={searching}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-orange-600 hover:bg-orange-700 transition-colors disabled:opacity-40"
          >
            {searching ? "…" : "Search"}
          </button>
        </div>

        {hits.length > 0 && (
          <div className="rounded-xl bg-[#0A1020] border border-white/5 max-h-60 overflow-y-auto divide-y divide-white/5">
            {hits.map((h) => (
              <button
                key={h.fdc_id}
                onClick={() => handleAdd(h)}
                className="w-full text-left px-3 py-2 hover:bg-white/5 transition-colors flex items-center justify-between gap-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-white text-xs truncate">{h.name}</p>
                  {h.brand_owner && <p className="text-gray-500 text-[10px] truncate">{h.brand_owner}</p>}
                </div>
                <span className="text-orange-400 text-[10px] whitespace-nowrap">
                  {h.calories_per_100g != null ? `${Math.round(h.calories_per_100g)} kcal/100g` : "—"}
                </span>
                <StatusBadge label="Add" variant="warning" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Selected items */}
      {items.length > 0 && (
        <div className="rounded-xl bg-[#0A1020] border border-white/5 p-3 space-y-2">
          <p className="text-[10px] text-gray-500 uppercase tracking-widest">Ingredients</p>
          {items.map((it, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="flex-1 text-white text-xs truncate">{it.name}</span>
              <input
                type="number"
                value={it.grams}
                onChange={(e) => updateGrams(i, e.target.value)}
                min="0"
                step="1"
                className="w-20 bg-[#080D19] border border-white/10 rounded-lg px-2 py-1 text-xs text-white focus:outline-none"
              />
              <span className="text-gray-500 text-[10px]">g</span>
              <span className="text-orange-400 text-[10px] w-16 text-right">
                {Math.round((it.kcal_100g || 0) * (it.grams || 0) / 100)} kcal
              </span>
              <button
                onClick={() => removeItem(i)}
                className="text-gray-500 hover:text-red-400 text-xs px-1"
                title="Remove"
              >
                ✕
              </button>
            </div>
          ))}
          <div className="border-t border-white/10 pt-2 flex justify-between text-xs">
            <span className="text-gray-400">Total</span>
            <span className="text-orange-400 font-semibold">
              {totals.calories} kcal · P {totals.protein}g · C {totals.carbs}g · F {totals.fat}g
            </span>
          </div>
        </div>
      )}

      {/* Save */}
      <button
        onClick={handleSave}
        disabled={!canSave || saving}
        className="w-full py-3 rounded-xl text-sm font-semibold text-white bg-orange-600 hover:bg-orange-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {saving ? "Saving…" : "Save Meal"}
      </button>
    </div>
  );
}
