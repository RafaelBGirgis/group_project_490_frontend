import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

const PRIMARY_GOALS = [
  "Lose Weight",
  "Build Muscle",
  "Improve Endurance",
  "General Wellness",
];

const TRAINING_EXPERIENCE_OPTIONS = ["Beginner", "Intermediate", "Advanced"];
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const SESSION_DURATIONS = ["30 minutes", "45 minutes", "60 minutes", "75+ minutes"];
const EQUIPMENT_OPTIONS = [
  "No equipment",
  "Dumbbells",
  "Barbell",
  "Resistance bands",
  "Cardio machines",
  "Full gym access",
];
const DIETARY_OPTIONS = [
  "No restrictions",
  "Vegetarian",
  "Vegan",
  "Gluten-free",
  "Dairy-free",
  "Halal",
  "Kosher",
  "Nut allergy",
];
const MEAL_PLAN_OPTIONS = [
  "Use meal library only",
  "Accept coach meal plan",
  "Both library and coach plan",
];
const ACCOUNT_MODE_OPTIONS = [
  { value: "client_only", label: "Client-only mode" },
  { value: "client_and_coach", label: "Client + Coach tools" },
];
const WORKOUT_LIBRARY = [
  "Push Day",
  "Pull Day",
  "Leg Day",
  "Upper Body",
  "Lower Body",
  "HIIT Cardio",
  "Core & Mobility",
  "Full Body Circuit",
];

function OnboardingPage() {
  const navigate = useNavigate();
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    primaryGoal: "",
    trainingExperience: "",
    weight: "",
    height: "",
    age: "",
    gender: "",
    bio: "",
    availableDays: [],
    sessionDuration: "",
    equipmentAccess: [],
    dietaryPreferences: [],
    mealPlanPreference: "",
    accountMode: "",
    starterWorkouts: [],
  });

  const onboardingKey = useMemo(() => {
    const email = (form.email || "").trim().toLowerCase();
    return email ? `onboarding:${email}` : "onboarding:current";
  }, [form.email]);

  const isFormValid = useMemo(() => {
    return Boolean(
      form.primaryGoal &&
        form.trainingExperience &&
        form.weight &&
        form.height &&
        form.age &&
        form.gender &&
        form.availableDays.length > 0 &&
        form.sessionDuration &&
        form.equipmentAccess.length > 0 &&
        form.dietaryPreferences.length > 0 &&
        form.mealPlanPreference &&
        form.accountMode &&
        form.starterWorkouts.length > 0
    );
  }, [form]);

  useEffect(() => {
    const token = localStorage.getItem("jwt");
    if (!token) {
      navigate("/login");
      return;
    }

    const load = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/me`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          throw new Error("Unable to load account session.");
        }

        const account = await res.json();
        const email = (account.email || localStorage.getItem("active_user_email") || "")
          .trim()
          .toLowerCase();

        localStorage.setItem("active_user_email", email);

        const key = email ? `onboarding:${email}` : "onboarding:current";
        const saved = localStorage.getItem(key);
        const savedData = saved ? JSON.parse(saved) : null;

        setForm((prev) => ({
          ...prev,
          ...savedData,
          name: account.name || savedData?.name || prev.name,
          email,
          age:
            account.age != null
              ? String(account.age)
              : savedData?.age || prev.age,
          gender: account.gender || savedData?.gender || prev.gender,
          bio: account.bio || savedData?.bio || prev.bio,
        }));
      } catch (err) {
        setError(err.message || "Failed to initialize onboarding.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [API_BASE_URL, navigate]);

  const toggleFromList = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: prev[field].includes(value)
        ? prev[field].filter((x) => x !== value)
        : [...prev[field], value],
    }));
  };

  const toTitleCase = (value) =>
    String(value)
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isFormValid) {
      setError("Please complete all required onboarding fields before continuing.");
      return;
    }

    setError("");
    const payload = {
      ...form,
      age: Number(form.age),
      completedAt: new Date().toISOString(),
    };

    localStorage.setItem(onboardingKey, JSON.stringify(payload));
    if (form.email) {
      localStorage.setItem(`onboarding_complete:${form.email}`, "true");
      localStorage.setItem("active_user_email", form.email);
    }
    localStorage.setItem("dashboard_role_preference", form.accountMode);

    navigate("/client");
  };

  return (
    <div className="min-h-screen bg-[#080D19] px-4 py-8 text-white">
      <div className="mx-auto w-full max-w-5xl">
        <h1 className="text-3xl font-black">Client Onboarding</h1>
        <p className="mt-2 text-sm text-slate-400">
          Complete all required fields to proceed to your dashboard.
        </p>

        {loading && (
          <div className="mt-6 rounded-xl border border-white/10 bg-[rgba(255,255,255,0.03)] px-4 py-3 text-sm text-slate-300">
            Loading onboarding...
          </div>
        )}

        {!loading && (
          <form
            onSubmit={handleSubmit}
            className="mt-6 space-y-6 rounded-2xl border border-white/10 bg-[rgba(255,255,255,0.03)] p-6"
          >
            {error && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            )}

            <section className="space-y-3">
              <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400">
                Primary Goal
              </h2>
              <select
                value={form.primaryGoal}
                onChange={(e) => setForm((prev) => ({ ...prev, primaryGoal: e.target.value }))}
                className="w-full rounded-lg border border-white/10 bg-[#0F172A] px-4 py-3 text-sm text-white outline-none"
                required
              >
                <option value="">Select a primary goal</option>
                {PRIMARY_GOALS.map((goal) => (
                  <option key={goal} value={goal}>
                    {goal}
                  </option>
                ))}
              </select>
            </section>

            <section className="space-y-3">
              <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400">
                Fitness Level & Baseline Metrics
              </h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <input
                  value={form.name}
                  readOnly
                  className="rounded-lg border border-white/10 bg-[#0F172A] px-4 py-3 text-sm text-slate-300 outline-none"
                  placeholder="Name"
                />
                <input
                  value={form.email}
                  readOnly
                  className="rounded-lg border border-white/10 bg-[#0F172A] px-4 py-3 text-sm text-slate-300 outline-none"
                  placeholder="Email"
                />
                <select
                  value={form.trainingExperience}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, trainingExperience: e.target.value }))
                  }
                  className="rounded-lg border border-white/10 bg-[#0F172A] px-4 py-3 text-sm text-white outline-none"
                  required
                >
                  <option value="">Training experience</option>
                  {TRAINING_EXPERIENCE_OPTIONS.map((level) => (
                    <option key={level} value={level}>
                      {level}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min="1"
                  value={form.age}
                  onChange={(e) => setForm((prev) => ({ ...prev, age: e.target.value }))}
                  className="rounded-lg border border-white/10 bg-[#0F172A] px-4 py-3 text-sm text-white outline-none"
                  placeholder="Age"
                  required
                />
                <input
                  value={form.weight}
                  onChange={(e) => setForm((prev) => ({ ...prev, weight: e.target.value }))}
                  className="rounded-lg border border-white/10 bg-[#0F172A] px-4 py-3 text-sm text-white outline-none"
                  placeholder="Weight (e.g. 165 lbs)"
                  required
                />
                <input
                  value={form.height}
                  onChange={(e) => setForm((prev) => ({ ...prev, height: e.target.value }))}
                  className="rounded-lg border border-white/10 bg-[#0F172A] px-4 py-3 text-sm text-white outline-none"
                  placeholder="Height (e.g. 5 ft 10 in)"
                  required
                />
                <select
                  value={form.gender}
                  onChange={(e) => setForm((prev) => ({ ...prev, gender: e.target.value }))}
                  className="rounded-lg border border-white/10 bg-[#0F172A] px-4 py-3 text-sm text-white outline-none"
                  required
                >
                  <option value="">Gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="non-binary">Non-binary</option>
                  <option value="prefer_not_to_say">Prefer not to say</option>
                </select>
              </div>
              <textarea
                value={form.bio}
                onChange={(e) => setForm((prev) => ({ ...prev, bio: e.target.value }))}
                rows={3}
                className="w-full rounded-lg border border-white/10 bg-[#0F172A] px-4 py-3 text-sm text-white outline-none"
                placeholder="Biography for coach (optional)"
              />
            </section>

            <section className="space-y-3">
              <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400">
                Training Constraints
              </h2>
              <p className="text-xs text-slate-500">Select available days (required)</p>
              <div className="flex flex-wrap gap-2">
                {DAYS.map((day) => {
                  const selected = form.availableDays.includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleFromList("availableDays", day)}
                      className="rounded-full border px-3 py-1 text-xs"
                      style={{
                        borderColor: selected ? "#3B82F6" : "rgba(255,255,255,0.12)",
                        backgroundColor: selected
                          ? "rgba(59,130,246,0.16)"
                          : "rgba(255,255,255,0.03)",
                        color: selected ? "#93C5FD" : "#CBD5E1",
                      }}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <select
                  value={form.sessionDuration}
                  onChange={(e) => setForm((prev) => ({ ...prev, sessionDuration: e.target.value }))}
                  className="rounded-lg border border-white/10 bg-[#0F172A] px-4 py-3 text-sm text-white outline-none"
                  required
                >
                  <option value="">Select Session Duration</option>
                  {SESSION_DURATIONS.map((d) => (
                    <option key={d} value={d}>
                      {toTitleCase(d)}
                    </option>
                  ))}
                </select>
              </div>

              <p className="text-xs text-slate-500">Equipment access (required)</p>
              <div className="flex flex-wrap gap-2">
                {EQUIPMENT_OPTIONS.map((eq) => {
                  const selected = form.equipmentAccess.includes(eq);
                  return (
                    <button
                      key={eq}
                      type="button"
                      onClick={() => toggleFromList("equipmentAccess", eq)}
                      className="rounded-full border px-3 py-1 text-xs"
                      style={{
                        borderColor: selected ? "#3B82F6" : "rgba(255,255,255,0.12)",
                        backgroundColor: selected
                          ? "rgba(59,130,246,0.16)"
                          : "rgba(255,255,255,0.03)",
                        color: selected ? "#93C5FD" : "#CBD5E1",
                      }}
                    >
                      {eq}
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="space-y-3">
              <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400">
                Dietary Preferences
              </h2>
              <p className="text-xs text-slate-500">
                Choose restrictions/preferences for coaches to see (required).
              </p>
              <div className="flex flex-wrap gap-2">
                {DIETARY_OPTIONS.map((item) => {
                  const selected = form.dietaryPreferences.includes(item);
                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() => toggleFromList("dietaryPreferences", item)}
                      className="rounded-full border px-3 py-1 text-xs"
                      style={{
                        borderColor: selected ? "#3B82F6" : "rgba(255,255,255,0.12)",
                        backgroundColor: selected
                          ? "rgba(59,130,246,0.16)"
                          : "rgba(255,255,255,0.03)",
                        color: selected ? "#93C5FD" : "#CBD5E1",
                      }}
                    >
                      {item}
                    </button>
                  );
                })}
              </div>

              <select
                value={form.mealPlanPreference}
                onChange={(e) => setForm((prev) => ({ ...prev, mealPlanPreference: e.target.value }))}
                className="w-full rounded-lg border border-white/10 bg-[#0F172A] px-4 py-3 text-sm text-white outline-none"
                required
              >
                <option value="">Select Meal Plan Preference</option>
                {MEAL_PLAN_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {toTitleCase(option)}
                  </option>
                ))}
              </select>
            </section>

            <section className="space-y-3">
              <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400">
                Coach Tools Interest
              </h2>
              <div className="space-y-2">
                {ACCOUNT_MODE_OPTIONS.map((mode) => (
                  <label key={mode.value} className="flex items-center gap-3 text-sm text-slate-300">
                    <input
                      type="radio"
                      name="accountMode"
                      value={mode.value}
                      checked={form.accountMode === mode.value}
                      onChange={(e) => setForm((prev) => ({ ...prev, accountMode: e.target.value }))}
                      required
                    />
                    {mode.label}
                  </label>
                ))}
              </div>
            </section>

            <section className="space-y-3">
              <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400">
                Starter Workout Catalog
              </h2>
              <p className="text-xs text-slate-500">
                Pick at least one workout to self-index your initial catalog.
              </p>
              <div className="flex flex-wrap gap-2">
                {WORKOUT_LIBRARY.map((workout) => {
                  const selected = form.starterWorkouts.includes(workout);
                  return (
                    <button
                      key={workout}
                      type="button"
                      onClick={() => toggleFromList("starterWorkouts", workout)}
                      className="rounded-full border px-3 py-1 text-xs"
                      style={{
                        borderColor: selected ? "#3B82F6" : "rgba(255,255,255,0.12)",
                        backgroundColor: selected
                          ? "rgba(59,130,246,0.16)"
                          : "rgba(255,255,255,0.03)",
                        color: selected ? "#93C5FD" : "#CBD5E1",
                      }}
                    >
                      {workout}
                    </button>
                  );
                })}
              </div>
            </section>

            <div className="flex justify-end">
              <button
                type="submit"
                className="rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-400 px-6 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!isFormValid}
              >
                Complete Onboarding
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default OnboardingPage;
