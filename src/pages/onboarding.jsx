import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

const PRIMARY_GOALS = [
  "Weight Loss",
  "Maintenance",
  "Muscle Gain",
];

const EMPTY_TRAINING_AVAILABILITY = {
  Mon: [],
  Tue: [],
  Wed: [],
  Thu: [],
  Fri: [],
  Sat: [],
  Sun: [],
};

const normalizeTrainingAvailability = (value, fallbackDays = []) => {
  const base = {
    Mon: [],
    Tue: [],
    Wed: [],
    Thu: [],
    Fri: [],
    Sat: [],
    Sun: [],
  };

  if (!value || typeof value !== "object") {
    fallbackDays.forEach((day) => {
      if (base[day]) base[day] = [];
    });
    return base;
  }

  Object.keys(base).forEach((day) => {
    const slots = value[day];
    base[day] = Array.isArray(slots) ? slots : [];
  });

  return base;
};

function OnboardingPage() {
  const navigate = useNavigate();
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    primaryGoal: "",
    weight: "",
    height: "",
    age: "",
    gender: "",
    bio: "",
    trainingAvailability: { ...EMPTY_TRAINING_AVAILABILITY },
  });

  const onboardingKey = useMemo(() => {
    const email = (form.email || "").trim().toLowerCase();
    return email ? `onboarding:${email}` : "onboarding:current";
  }, [form.email]);

  const isFormValid = useMemo(() => {
    return Boolean(
      form.primaryGoal &&
        form.weight &&
        form.height &&
        form.age &&
        form.gender &&
        Object.values(form.trainingAvailability).some((slots) => slots.length > 0)
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
          trainingAvailability: normalizeTrainingAvailability(
            savedData?.trainingAvailability,
            savedData?.availableDays
          ),
          name: account.name || savedData?.name || prev.name,
          email,
          age: account.age != null ? String(account.age) : savedData?.age || prev.age,
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

  const addTrainingAvailabilitySlot = (day) => {
    const time = prompt(`Add a time slot for ${day} (example: 7PM)`);
    if (!time) return;

    setForm((prev) => {
      const daySlots = prev.trainingAvailability[day] || [];
      if (daySlots.includes(time)) return prev;

      return {
        ...prev,
        trainingAvailability: {
          ...prev.trainingAvailability,
          [day]: [...daySlots, time],
        },
      };
    });
  };

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
                Training Availability
              </h2>
              <p className="text-xs text-slate-500">Add your available training time slots</p>
              <div className="grid grid-cols-7 gap-1 text-center">
                {Object.entries(form.trainingAvailability).map(([day, slots]) => (
                  <div key={day}>
                    <div className="mb-2 text-[10px] font-semibold uppercase text-slate-500">
                      {day}
                    </div>

                    <div className="space-y-1">
                      {slots.map((time) => (
                        <div
                          key={`${day}-${time}`}
                          className="w-full rounded-md border border-white/6 bg-[rgba(255,255,255,0.02)] px-1 py-1 text-[10px] text-slate-300"
                          title={`${day} ${time}`}
                        >
                          {time}
                        </div>
                      ))}

                      <button
                        type="button"
                        onClick={() => addTrainingAvailabilitySlot(day)}
                        className="w-full rounded-md border border-dashed px-1 py-1 text-[10px] text-slate-500 hover:text-white"
                        style={{ borderColor: "rgba(59, 130, 246, 0.30)" }}
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))}
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
