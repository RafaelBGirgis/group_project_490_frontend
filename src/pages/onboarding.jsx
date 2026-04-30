import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AvailabilityDetail from "../components/overlays/availability_detail";
import { buildInitialSurveyPayload, createClientInitialSurvey, fetchMe } from "../api/client";
import { getOnboardingStorageKey, loadProfileDraft, saveOnboardingDraft } from "../utils/profileDrafts";

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

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

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

// Convert from { Mon: ["9AM", "10AM"], ... } to [{ time, slots: [...] }, ...]
const convertToSlotsFormat = (trainingAvailability) => {
  const allTimes = new Set();
  Object.values(trainingAvailability).forEach(slots => {
    slots.forEach(time => allTimes.add(time));
  });

  const sortedTimes = Array.from(allTimes).sort((a, b) => {
    const timeOrder = ["5AM","6AM","7AM","8AM","9AM","10AM","11AM","12PM","1PM","2PM","3PM","4PM","5PM","6PM","7PM","8PM","9PM"];
    return timeOrder.indexOf(a) - timeOrder.indexOf(b);
  });

  return sortedTimes.map(time => ({
    time,
    slots: WEEKDAYS.map(day => trainingAvailability[day].includes(time) ? "available" : null)
  }));
};

// Convert from [{ time, slots: [...] }, ...] to { Mon: ["9AM", "10AM"], ... }
const convertFromSlotsFormat = (slots) => {
  const result = { ...EMPTY_TRAINING_AVAILABILITY };
  slots.forEach(({ time, slots: daySlots }) => {
    daySlots.forEach((status, dayIndex) => {
      if (status === "available") {
        result[WEEKDAYS[dayIndex]].push(time);
      }
    });
  });
  return result;
};

function OnboardingPage() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
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
    cardNumber: "",
    cardCvv: "",
    cardExpiry: "",
  });

  const onboardingKey = useMemo(() => {
    return getOnboardingStorageKey(form.email);
  }, [form.email]);

  const isFormValid = useMemo(() => {
    return Boolean(
      form.primaryGoal &&
        form.weight &&
        form.height &&
        form.age &&
        form.gender &&
        form.cardNumber &&
        form.cardCvv &&
        form.cardExpiry &&
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
        const account = await fetchMe();
        const email = (account.email || localStorage.getItem("active_user_email") || "")
          .trim()
          .toLowerCase();

        localStorage.setItem("active_user_email", email);
        const savedData = loadProfileDraft(email);

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
          cardNumber: savedData?.cardNumber || prev.cardNumber,
          cardCvv: savedData?.cardCvv || prev.cardCvv,
          cardExpiry: savedData?.cardExpiry || prev.cardExpiry,
          profilePicture: savedData?.profilePicture || prev.profilePicture,
        }));
      } catch (err) {
        setError(err.message || "Failed to initialize onboarding.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [navigate]);

  useEffect(() => {
    if (loading || !form.email) {
      return;
    }

    saveOnboardingDraft(form);
  }, [form, loading]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isFormValid) {
      setError("Please complete all required onboarding fields before continuing.");
      return;
    }

    setError("");
    const localPayload = {
      ...form,
      age: Number(form.age),
      completedAt: new Date().toISOString(),
    };

    try {
      setSubmitting(true);
      const surveyPayload = buildInitialSurveyPayload(form);
      const response = await createClientInitialSurvey(surveyPayload);

      saveOnboardingDraft(localPayload);
      if (form.email) {
        localStorage.setItem(`onboarding_complete:${form.email}`, "true");
        localStorage.setItem("active_user_email", form.email);
      }
      if (response?.client_id) {
        localStorage.setItem("active_client_id", String(response.client_id));
      }

      navigate("/client");
    } catch (err) {
      setError(err.message || "Unable to create your client profile.");
    } finally {
      setSubmitting(false);
    }
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
              <p className="text-xs text-slate-500">Set your available training time slots</p>
              <AvailabilityDetail
                slots={convertToSlotsFormat(form.trainingAvailability)}
                weekdays={WEEKDAYS}
                onSave={(updatedSlots) => {
                  setForm((prev) => ({
                    ...prev,
                    trainingAvailability: convertFromSlotsFormat(updatedSlots)
                  }));
                }}
                role="client"
              />
            </section>

            <section className="space-y-3">
              <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400">
                Payment Information
              </h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <input
                  value={form.cardNumber}
                  onChange={(e) => setForm((prev) => ({ ...prev, cardNumber: e.target.value }))}
                  className="rounded-lg border border-white/10 bg-[#0F172A] px-4 py-3 text-sm text-white outline-none"
                  placeholder="Card number"
                  required
                />
                <input
                  value={form.cardCvv}
                  onChange={(e) => setForm((prev) => ({ ...prev, cardCvv: e.target.value }))}
                  className="rounded-lg border border-white/10 bg-[#0F172A] px-4 py-3 text-sm text-white outline-none"
                  placeholder="CVV"
                  required
                />
                <input
                  type="date"
                  value={form.cardExpiry}
                  onChange={(e) => setForm((prev) => ({ ...prev, cardExpiry: e.target.value }))}
                  className="rounded-lg border border-white/10 bg-[#0F172A] px-4 py-3 text-sm text-white outline-none"
                  required
                />
              </div>
            </section>

            <div className="flex justify-end">
              <button
                type="submit"
                className="rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-400 px-6 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!isFormValid || submitting}
              >
                {submitting ? "Creating Profile..." : "Complete Onboarding"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default OnboardingPage;
