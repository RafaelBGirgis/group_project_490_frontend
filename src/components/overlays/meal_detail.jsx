import { useState } from "react";

/**
 * Meal detail overlay.
 *
 * Backend reality:
 *   GET /roles/client/telemetry/query/meals     — returns CompletedMealActivity
 *                                                 rows (ids + timestamps only).
 *   POST /roles/client/fitness/daily-survey/meal/start
 *   POST /roles/client/fitness/daily-survey/meal/submit
 *                                                 — requires either an
 *                                                 on_demand_meal_id or a
 *                                                 client_prescribed_meal_id.
 *
 * There is no backend route to create new Meal rows or look them up by id,
 * so this overlay shows a minimal list (ids + dates) and asks the user for
 * an existing meal id when logging a new one.
 *
 * Props:
 *   meals      – array of { id, on_demand_meal_id, client_prescribed_meal_id, logged_at }
 *   onLogMeal  – (mealPayload) => Promise — receives one of the two id fields
 */
export default function MealDetail({ meals, onLogMeal }) {
  const [showForm, setShowForm] = useState(false);
  const [mealKind, setMealKind] = useState("on_demand"); // "on_demand" | "prescribed"
  const [mealIdInput, setMealIdInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const reset = () => {
    setMealIdInput("");
    setError("");
    setSubmitting(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const idNum = Number(mealIdInput);
    if (!Number.isInteger(idNum) || idNum <= 0) {
      setError("Enter a positive integer meal id.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      const payload =
        mealKind === "prescribed"
          ? { client_prescribed_meal_id: idNum }
          : { on_demand_meal_id: idNum };
      await onLogMeal?.(payload);
      reset();
      setShowForm(false);
    } catch (err) {
      setError(err?.message || "Couldn't log that meal. Try a different id.");
    } finally {
      setSubmitting(false);
    }
  };

  const total = meals.length;

  return (
    <>
      {/* Summary */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[#0A1020] rounded-xl p-3 text-center">
          <p className="text-blue-400 font-bold text-xl">{total}</p>
          <p className="text-gray-500 text-[10px] uppercase tracking-widest mt-0.5">
            Logged
          </p>
        </div>
        <div className="bg-[#0A1020] rounded-xl p-3 text-center">
          <p className="text-orange-400 font-bold text-xl">
            {meals.filter((m) => m.client_prescribed_meal_id != null).length}
          </p>
          <p className="text-gray-500 text-[10px] uppercase tracking-widest mt-0.5">
            From Plan
          </p>
        </div>
      </div>

      {/* Meal list */}
      <div className="space-y-2">
        <p className="text-xs text-gray-500 uppercase tracking-widest">
          Recently Logged
        </p>
        {meals.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-4">
            No meals logged yet.
          </p>
        ) : (
          meals.map((meal) => (
            <div
              key={meal.id}
              className="flex items-center justify-between rounded-xl border border-white/5 bg-[rgba(255,255,255,0.02)] px-4 py-3"
            >
              <div>
                <p className="text-white font-semibold text-sm">
                  {meal.client_prescribed_meal_id != null
                    ? `Prescribed #${meal.client_prescribed_meal_id}`
                    : meal.on_demand_meal_id != null
                      ? `On-demand #${meal.on_demand_meal_id}`
                      : `Entry #${meal.id}`}
                </p>
                <p className="text-gray-400 text-xs mt-0.5">
                  {meal.logged_at ? new Date(meal.logged_at).toLocaleString() : "Recently"}
                </p>
              </div>
              <span className="text-[10px] uppercase tracking-widest text-gray-500">
                #{meal.id}
              </span>
            </div>
          ))
        )}
      </div>

      {/* Log new meal */}
      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="w-full border border-dashed border-blue-500/30 text-blue-400 rounded-xl py-3 text-sm font-medium hover:bg-blue-500/5 transition-colors"
        >
          + Log a Meal
        </button>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-white/10 bg-[rgba(255,255,255,0.02)] p-4 space-y-3"
        >
          <p className="text-xs text-gray-500 uppercase tracking-widest">Log Meal</p>
          <p className="text-[11px] text-gray-500 leading-relaxed">
            The backend submit endpoint takes the id of an existing meal record. Pick
            the source and enter the id.
          </p>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setMealKind("on_demand")}
              className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-colors ${
                mealKind === "on_demand"
                  ? "bg-blue-600 text-white"
                  : "bg-[#0B1220] border border-white/10 text-gray-400"
              }`}
            >
              On-demand
            </button>
            <button
              type="button"
              onClick={() => setMealKind("prescribed")}
              className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-colors ${
                mealKind === "prescribed"
                  ? "bg-blue-600 text-white"
                  : "bg-[#0B1220] border border-white/10 text-gray-400"
              }`}
            >
              From plan
            </button>
          </div>

          <div>
            <label className="text-[10px] text-gray-500 uppercase tracking-widest block mb-1">
              {mealKind === "prescribed" ? "Prescribed Meal ID" : "On-demand Meal ID"}
            </label>
            <input
              type="number"
              min={1}
              value={mealIdInput}
              onChange={(e) => setMealIdInput(e.target.value)}
              placeholder="e.g. 1"
              className="w-full rounded-lg border border-white/10 bg-[#0B1220] px-3 py-2 text-sm text-white outline-none placeholder:text-gray-600 focus:border-blue-400/60"
            />
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2 text-sm font-medium transition-colors disabled:opacity-40"
            >
              {submitting ? "Logging..." : "Log Meal"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                reset();
              }}
              className="flex-1 border border-gray-700 text-gray-300 hover:bg-gray-800 rounded-lg py-2 text-sm transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </>
  );
}
