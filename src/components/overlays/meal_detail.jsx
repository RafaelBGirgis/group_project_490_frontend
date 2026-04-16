import { useState } from "react";

/**
 * Meal detail / log overlay — shown when "Log Meal +" is clicked.
 *
 * Props:
 *   meals      – array of { id, meal_type, meal_name, calories }
 *   onLogMeal  – (mealPayload) => void
 *   caloriesConsumed – number
 *   caloriesGoal     – number
 */
export default function MealDetail({ meals, onLogMeal, caloriesConsumed, caloriesGoal }) {
  const [showForm, setShowForm] = useState(false);
  const [mealName, setMealName] = useState("");
  const [mealType, setMealType] = useState("Snack");
  const [calories, setCalories] = useState("");

  const totalPrescribed = meals.reduce((s, m) => s + m.calories, 0);
  const remaining = caloriesGoal - (caloriesConsumed ?? 0);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!mealName.trim() || !calories) return;
    onLogMeal?.({
      meal_name: mealName.trim(),
      meal_type: mealType,
      calories: parseInt(calories, 10),
    });
    setMealName("");
    setCalories("");
    setShowForm(false);
  };

  return (
    <>
      {/* Calorie summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-[#0A1020] rounded-xl p-3 text-center">
          <p className="text-blue-400 font-bold text-xl">
            {caloriesConsumed ?? 0}
          </p>
          <p className="text-gray-500 text-[10px] uppercase tracking-widest mt-0.5">
            Consumed
          </p>
        </div>
        <div className="bg-[#0A1020] rounded-xl p-3 text-center">
          <p className="text-orange-400 font-bold text-xl">{totalPrescribed}</p>
          <p className="text-gray-500 text-[10px] uppercase tracking-widest mt-0.5">
            Prescribed
          </p>
        </div>
        <div className="bg-[#0A1020] rounded-xl p-3 text-center">
          <p
            className={`font-bold text-xl ${
              remaining >= 0 ? "text-green-400" : "text-red-400"
            }`}
          >
            {remaining}
          </p>
          <p className="text-gray-500 text-[10px] uppercase tracking-widest mt-0.5">
            Remaining
          </p>
        </div>
      </div>

      {/* Prescribed meals list */}
      <div className="space-y-2">
        <p className="text-xs text-gray-500 uppercase tracking-widest">
          Prescribed Meals
        </p>
        {meals.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-4">
            No meals prescribed for today
          </p>
        ) : (
          meals.map((meal) => (
            <div
              key={meal.id}
              className="flex items-center justify-between rounded-xl border border-white/5 bg-[rgba(255,255,255,0.02)] px-4 py-3"
            >
              <div>
                <p className="text-white font-semibold text-sm">
                  {meal.meal_name}
                </p>
                <p className="text-gray-400 text-xs mt-0.5">{meal.meal_type}</p>
              </div>
              <span className="text-orange-400 font-semibold text-sm">
                {meal.calories} kcal
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
          + Log a Custom Meal
        </button>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-white/10 bg-[rgba(255,255,255,0.02)] p-4 space-y-3"
        >
          <p className="text-xs text-gray-500 uppercase tracking-widest">
            Log Custom Meal
          </p>

          <div>
            <label className="text-[10px] text-gray-500 uppercase tracking-widest block mb-1">
              Meal Name
            </label>
            <input
              type="text"
              value={mealName}
              onChange={(e) => setMealName(e.target.value)}
              placeholder="e.g. Greek Yogurt"
              className="w-full rounded-lg border border-white/10 bg-[#0B1220] px-3 py-2 text-sm text-white outline-none placeholder:text-gray-600 focus:border-blue-400/60"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-gray-500 uppercase tracking-widest block mb-1">
                Type
              </label>
              <select
                value={mealType}
                onChange={(e) => setMealType(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-[#0B1220] px-3 py-2 text-sm text-white outline-none focus:border-blue-400/60"
              >
                <option>Breakfast</option>
                <option>Lunch</option>
                <option>Dinner</option>
                <option>Snack</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] text-gray-500 uppercase tracking-widest block mb-1">
                Calories
              </label>
              <input
                type="number"
                value={calories}
                onChange={(e) => setCalories(e.target.value)}
                placeholder="kcal"
                className="w-full rounded-lg border border-white/10 bg-[#0B1220] px-3 py-2 text-sm text-white outline-none placeholder:text-gray-600 focus:border-blue-400/60"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2 text-sm font-medium transition-colors"
            >
              Log Meal
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="flex-1 border border-gray-700 text-gray-300 hover:bg-gray-800 rounded-lg py-2 text-sm transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Daily total */}
      <div className="flex justify-between items-center pt-3 border-t border-white/5">
        <span className="text-xs text-gray-500 uppercase tracking-widest">
          Total Prescribed
        </span>
        <span className="text-white font-bold">{totalPrescribed} kcal</span>
      </div>
    </>
  );
}
