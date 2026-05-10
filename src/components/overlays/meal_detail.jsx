import { useState, useEffect, useMemo } from "react";
import { fetchMyPrescribedMeals, createMeal } from "../../api/meals";
import { searchFoods, fetchFoodDetail } from "../../api/foods";
import { updateLoggedMeal, deleteLoggedMeal } from "../../api/client";

const MEAL_KINDS = ["breakfast", "lunch", "dinner", "snack"];

function todayIso() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Client meal-detail overlay.
 *
 * Shows a single day's worth of meals organized into three sections:
 *
 *   1. Today's plan from the coach — prescribed meals scheduled for today,
 *      grouped by meal kind (breakfast/lunch/dinner). Each row has a Log
 *      button that submits a CompletedMealActivity with the matching kind.
 *
 *   2. Today's logged meals — what the client has already logged today,
 *      with computed calories/macros pulled from the backend.
 *
 *   3. Add a custom meal — search USDA, build a meal, save & log it for
 *      a chosen meal kind. Used when the client wants to track something
 *      a coach hasn't prescribed.
 *
 * Calorie totals are computed server-side from food.kcal_per_100g; this UI
 * just displays what the API returns.
 *
 * Props:
 *   meals      – [{id, meal_name, meal_kind, calories, protein_g, carbs_g, fat_g, logged_at}]
 *                Today's logged meals (from fetchMealsToday).
 *   onLogMeal  – ({on_demand_meal_id, client_prescribed_meal_id, meal_kind}) => Promise
 *                Logs the chosen meal via the daily-survey flow.
 *   onAfterLog – () => void   Called after a successful log so the parent
 *                can refresh state (calories card, history, etc.).
 */
export default function MealDetail({ meals = [], onLogMeal, onAfterLog }) {
  const [todayPrescribed, setTodayPrescribed] = useState([]);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);

  // Refresh prescribed meals (today + standing recipes) on mount and after
  // every successful log so the "already logged" indicator updates live.
  const reloadPrescribed = async () => {
    try {
      const items = await fetchMyPrescribedMeals({ onDate: todayIso(), includeStanding: true });
      setTodayPrescribed(items);
    } catch {
      setTodayPrescribed([]);
    }
  };
  useEffect(() => { reloadPrescribed(); }, []);

  // Group both prescribed and logged by meal kind so we can render the
  // breakfast/lunch/dinner sections even when the user only filled one.
  const prescribedByKind = useMemo(() => groupByKind(todayPrescribed, (p) => p.meal_kind), [todayPrescribed]);
  const loggedByKind = useMemo(() => groupByKind(meals, (m) => m.meal_kind), [meals]);

  const totalCalories = meals.reduce((acc, m) => acc + (m.calories || 0), 0);
  const totalProtein = meals.reduce((acc, m) => acc + (m.protein_g || 0), 0);

  const handleLog = async (payload, kindForButton) => {
    setBusyId(kindForButton + "|" + (payload.client_prescribed_meal_id ?? payload.on_demand_meal_id));
    setError("");
    try {
      await onLogMeal?.({ ...payload, meal_kind: payload.meal_kind ?? kindForButton ?? null });
      await onAfterLog?.();
      await reloadPrescribed();
    } catch (e) {
      setError(e?.message || "Couldn't log that meal.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Daily totals header — mirrors the calories card */}
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Logged" value={meals.length} accent="text-blue-400" />
        <Stat label="kcal" value={Math.round(totalCalories)} accent="text-orange-400" />
        <Stat label="Protein g" value={Math.round(totalProtein)} accent="text-green-400" />
      </div>

      {error && (
        <p className="text-red-400 text-xs bg-red-500/10 rounded-lg px-3 py-2">{error}</p>
      )}

      {/* Today's plan, grouped by kind */}
      <div className="space-y-3">
        <p className="text-xs text-gray-500 uppercase tracking-widest">Today's Plan</p>

        {todayPrescribed.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-4">
            Your coach hasn't prescribed any meals yet. Build a custom meal below
            to track what you ate.
          </p>
        ) : (
          MEAL_KINDS.map((kind) => {
            const items = prescribedByKind[kind] || [];
            if (items.length === 0) return null;
            const loggedThisKind = (loggedByKind[kind] || []).length;
            return (
              <KindSection key={kind} kind={kind} loggedCount={loggedThisKind}>
                {items.map((p) => (
                  <PrescribedRow
                    key={p.id}
                    prescribed={p}
                    onLog={() => handleLog({ client_prescribed_meal_id: p.id }, p.meal_kind || kind)}
                    busy={busyId === (p.meal_kind || kind) + "|" + p.id}
                  />
                ))}
              </KindSection>
            );
          })
        )}

        {/* Standing recipes (no scheduled_date or kind) — show separately */}
        {(() => {
          const standing = todayPrescribed.filter((p) => !p.scheduled_date || !p.meal_kind);
          if (!standing.length) return null;
          return (
            <KindSection kind="anytime" loggedCount={null}>
              {standing.map((p) => (
                <PrescribedRow
                  key={p.id}
                  prescribed={p}
                  onLog={() => handleLog({ client_prescribed_meal_id: p.id }, "snack")}
                  busy={busyId === "snack|" + p.id}
                />
              ))}
            </KindSection>
          );
        })()}
      </div>

      {/* Already-logged meals today — each row supports inline edit (kind)
          + delete. Both actions refresh the parent state via onAfterLog so
          the calories card and meal list stay consistent. */}
      <div className="space-y-2 border-t border-white/5 pt-4">
        <p className="text-xs text-gray-500 uppercase tracking-widest">Logged Today</p>
        {meals.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-4">
            Nothing logged yet today.
          </p>
        ) : (
          meals.map((m) => (
            <LoggedRow
              key={m.id}
              meal={m}
              onChanged={async () => { await onAfterLog?.(); }}
              onError={setError}
            />
          ))
        )}
      </div>

      {/* Build & log custom */}
      <div className="border-t border-white/5 pt-4">
        <BuildCustomTab
          onLogMeal={async (payload) => {
            await onLogMeal?.(payload);
            await onAfterLog?.();
            await reloadPrescribed();
          }}
          onError={setError}
        />
      </div>
    </div>
  );
}

function Stat({ label, value, accent }) {
  return (
    <div className="bg-[#0A1020] rounded-xl p-3 text-center">
      <p className={`${accent} font-bold text-xl`}>{value}</p>
      <p className="text-gray-500 text-[10px] uppercase tracking-widest mt-0.5">
        {label}
      </p>
    </div>
  );
}

function KindSection({ kind, loggedCount, children }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-[11px] text-gray-300 uppercase tracking-widest font-semibold">
          {kind}
        </p>
        {loggedCount != null && (
          <span className="text-[10px] text-green-400">
            {loggedCount > 0 ? `${loggedCount} logged` : ""}
          </span>
        )}
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function PrescribedRow({ prescribed, onLog, busy }) {
  const meal = prescribed.meal;
  return (
    <div className="rounded-xl border border-white/5 bg-[rgba(255,255,255,0.02)] px-4 py-3 flex items-center gap-3">
      <div className="min-w-0 flex-1">
        <p className="text-white font-semibold text-sm truncate">{meal.meal_name}</p>
        <p className="text-gray-500 text-[10px] mt-0.5">
          {Math.round(meal.totals?.calories || 0)} kcal · P {Math.round(meal.totals?.protein_g || 0)}g
          · C {Math.round(meal.totals?.carbs_g || 0)}g · F {Math.round(meal.totals?.fat_g || 0)}g
        </p>
        {prescribed.prescribed_by_name && (
          <p className="text-gray-600 text-[10px] mt-0.5">
            from {prescribed.prescribed_by_name}
          </p>
        )}
      </div>
      <button
        onClick={onLog}
        disabled={busy}
        className="text-[10px] px-3 py-1.5 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30 transition-colors disabled:opacity-40"
      >
        {busy ? "Logging…" : "Log"}
      </button>
    </div>
  );
}

function LoggedRow({ meal, onChanged, onError }) {
  // Edit mode toggles a kind picker inline. Keeps the row footprint small
  // — no modal — since the only editable field that matters is meal_kind.
  // Delete pops a confirm and removes the row.
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [kind, setKind] = useState(meal.meal_kind || "snack");

  const saveKind = async () => {
    setBusy(true);
    try {
      await updateLoggedMeal(meal.id, { meal_kind: kind });
      await onChanged?.();
      setEditing(false);
    } catch (e) {
      onError?.(e?.message || "Couldn't update meal.");
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Delete this logged meal (${meal.meal_name || "unnamed"})?`)) return;
    setBusy(true);
    try {
      await deleteLoggedMeal(meal.id);
      await onChanged?.();
    } catch (e) {
      onError?.(e?.message || "Couldn't delete meal.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-xl border border-white/5 bg-[rgba(255,255,255,0.02)] px-4 py-3 space-y-2">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-white font-semibold text-sm truncate">
            {meal.meal_name || "Unnamed meal"}
            {meal.meal_kind && !editing && (
              <span className="ml-2 text-[10px] uppercase text-gray-500 tracking-widest">
                · {meal.meal_kind}
              </span>
            )}
          </p>
          <p className="text-gray-500 text-[10px] mt-0.5">
            {meal.logged_at ? new Date(meal.logged_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Today"}
            {" · "}
            P {Math.round(meal.protein_g || 0)}g · C {Math.round(meal.carbs_g || 0)}g · F {Math.round(meal.fat_g || 0)}g
          </p>
        </div>
        <p className="text-orange-400 font-bold text-sm whitespace-nowrap ml-3">
          {Math.round(meal.calories || 0)} kcal
        </p>
      </div>

      {editing ? (
        <div className="flex items-center gap-2 pt-1">
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value)}
            className="flex-1 bg-[#080D19] border border-white/10 rounded-lg px-2 py-1.5 text-xs text-gray-200 focus:outline-none"
          >
            {MEAL_KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
          <button
            onClick={saveKind}
            disabled={busy}
            className="text-[10px] px-3 py-1.5 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30 disabled:opacity-40"
          >
            {busy ? "…" : "Save"}
          </button>
          <button
            onClick={() => { setEditing(false); setKind(meal.meal_kind || "snack"); }}
            disabled={busy}
            className="text-[10px] px-3 py-1.5 rounded-lg border border-white/10 text-gray-300 hover:bg-white/5"
          >
            Cancel
          </button>
        </div>
      ) : (
        <div className="flex justify-end gap-2">
          <button
            onClick={() => setEditing(true)}
            disabled={busy}
            className="text-[10px] px-3 py-1.5 rounded-lg border border-white/10 text-gray-300 hover:bg-white/5 disabled:opacity-40"
          >
            Edit kind
          </button>
          <button
            onClick={handleDelete}
            disabled={busy}
            className="text-[10px] px-3 py-1.5 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 disabled:opacity-40"
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

// Group an array of items by their meal_kind. `getKind` lets the caller pull
// the kind from different field names (prescribed.meal_kind vs logged.meal_kind).
function groupByKind(items, getKind) {
  const out = {};
  for (const it of items) {
    const k = getKind(it);
    if (!k) continue;
    out[k] = out[k] || [];
    out[k].push(it);
  }
  return out;
}

/* ═══════════════════════════════════════════════════════════════════════════
   BUILD CUSTOM — search USDA, add foods with grams, pick kind, save + log
   ═══════════════════════════════════════════════════════════════════════════ */

function BuildCustomTab({ onLogMeal, onError }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [kind, setKind] = useState("snack");
  const [searchTerm, setSearchTerm] = useState("");
  const [hits, setHits] = useState([]);
  const [searching, setSearching] = useState(false);
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(false);

  const totals = useMemo(() => {
    const sum = (key) => items.reduce((acc, it) => acc + (it[key] || 0) * (it.grams || 0) / 100, 0);
    return {
      calories: Math.round(sum("kcal_100g")),
      protein: Math.round(sum("p_100g")),
      carbs: Math.round(sum("c_100g")),
      fat: Math.round(sum("f_100g")),
    };
  }, [items]);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full border border-dashed border-blue-500/30 text-blue-400 rounded-xl py-3 text-sm font-medium hover:bg-blue-500/5 transition-colors"
      >
        + Add a Custom Meal
      </button>
    );
  }

  const handleSearch = async () => {
    if (!searchTerm.trim()) return;
    setSearching(true);
    try {
      setHits(await searchFoods(searchTerm, { pageSize: 12 }));
    } finally {
      setSearching(false);
    }
  };

  const handleAdd = async (hit) => {
    try {
      const detail = await fetchFoodDetail(hit.fdc_id);
      setItems((prev) => [
        ...prev,
        {
          food_id: detail.id,
          name: detail.name,
          grams: 100,
          kcal_100g: detail.calories_per_100g,
          p_100g: detail.protein_g_per_100g,
          c_100g: detail.carbs_g_per_100g,
          f_100g: detail.fat_g_per_100g,
        },
      ]);
    } catch (e) {
      onError(e?.message || "Couldn't add that food.");
    }
  };

  const updateGrams = (idx, grams) => {
    setItems((prev) => prev.map((it, i) => i === idx ? { ...it, grams: Math.max(0, Number(grams) || 0) } : it));
  };
  const removeItem = (idx) => setItems((prev) => prev.filter((_, i) => i !== idx));

  const canSave = name.trim() && items.length > 0 && items.every((it) => it.grams > 0);

  // Two-step save+log: create the meal, then log a CompletedMealActivity
  // referencing it via on_demand_meal_id (since it's not coach-prescribed).
  const handleSaveAndLog = async () => {
    if (!canSave) return;
    setBusy(true);
    onError("");
    try {
      const created = await createMeal(
        name.trim(),
        items.map((it) => ({ food_id: it.food_id, grams: Number(it.grams) }))
      );
      await onLogMeal({ on_demand_meal_id: created.id, meal_kind: kind });
      setName("");
      setItems([]);
      setHits([]);
      setSearchTerm("");
      setOpen(false);
    } catch (e) {
      onError(e?.message || "Couldn't save and log this meal.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3 rounded-xl border border-white/10 bg-[rgba(255,255,255,0.02)] p-4">
      <div className="flex items-center justify-between">
        <p className="text-[11px] text-gray-300 uppercase tracking-widest font-semibold">
          Custom Meal
        </p>
        <button
          onClick={() => { setOpen(false); setItems([]); setName(""); setHits([]); setSearchTerm(""); }}
          className="text-gray-500 hover:text-gray-300 text-xs"
        >
          ✕
        </button>
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Meal name (e.g. 'Lunch')"
          className="flex-1 bg-[#0A1020] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none"
        />
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value)}
          className="bg-[#0A1020] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-gray-200 focus:outline-none"
        >
          {MEAL_KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
        </select>
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          placeholder="Search USDA — e.g. 'eggs'"
          className="flex-1 bg-[#0A1020] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none"
        />
        <button
          onClick={handleSearch}
          disabled={searching}
          className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-40"
        >
          {searching ? "…" : "Search"}
        </button>
      </div>

      {hits.length > 0 && (
        <div className="rounded-xl bg-[#0A1020] border border-white/5 max-h-48 overflow-y-auto divide-y divide-white/5">
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
              <span className="text-blue-400 text-[10px] whitespace-nowrap">
                {h.calories_per_100g != null ? `${Math.round(h.calories_per_100g)} kcal/100g` : "—"}
              </span>
            </button>
          ))}
        </div>
      )}

      {items.length > 0 && (
        <div className="rounded-xl bg-[#0A1020] border border-white/5 p-3 space-y-2">
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
              <span className="text-blue-400 text-[10px] w-16 text-right">
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
            <span className="text-blue-400 font-semibold">
              {totals.calories} kcal · P {totals.protein}g · C {totals.carbs}g · F {totals.fat}g
            </span>
          </div>
        </div>
      )}

      <button
        onClick={handleSaveAndLog}
        disabled={!canSave || busy}
        className="w-full py-3 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-40"
      >
        {busy ? "Saving…" : "Save & Log Meal"}
      </button>
    </div>
  );
}
