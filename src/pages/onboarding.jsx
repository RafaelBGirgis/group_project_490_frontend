import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AvailabilityCalendar from "../components/availability/AvailabilityCalendar";
import {
  buildClientInformationPayload,
  buildInitialSurveyPayload,
  createClientInitialSurvey,
  fetchMe,
  updateAccount,
  updateClientInformation,
} from "../api/client";
import { getCoachAccessState } from "../utils/roleAccess";
import { resolveRoleState } from "../utils/sessionAuth";

const PRIMARY_GOALS = [
  "Weight Loss",
  "Maintenance",
  "Muscle Gain",
];

const normalizeGenderToOnboardingValue = (value) => {
  const normalized = String(value || "").trim().toLowerCase().replaceAll("_", "-");
  if (normalized === "male") return "male";
  if (normalized === "female") return "female";
  if (normalized === "non-binary" || normalized === "nonbinary") return "non-binary";
  if (normalized === "prefer-not-to-say" || normalized === "prefer not to say") {
    return "prefer_not_to_say";
  }
  return "";
};

const buildAccountUpdatePayload = ({ age, email, bio, gender }) => {
  const payload = {};

  const parsedAge = Number(age);
  if (Number.isFinite(parsedAge) && parsedAge > 0) {
    payload.age = parsedAge;
  }
  if (email) {
    payload.email = email;
  }
  if (typeof bio === "string") {
    payload.bio = bio;
  }
  if (gender) {
    payload.gender = gender;
  }

  return payload;
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
    age: "",
    gender: "",
    bio: "",
    // Daily targets the dashboard's progress rings + calories card use.
    // Defaults match the Client model defaults so a user who skips both
    // fields still ends up with reasonable starting values.
    dailyStepGoal: "10000",
    dailyCalorieGoal: "2000",
    availabilityWindows: [],
    cardNumber: "",
    cardCvv: "",
    cardExpiry: "",
  });

  const isFormValid = useMemo(() => {
    return Boolean(
      form.primaryGoal &&
        form.weight &&
        form.age &&
        form.gender &&
        form.cardNumber &&
        form.cardCvv &&
        form.cardExpiry &&
        form.availabilityWindows.length > 0
    );
  }, [form]);

  useEffect(() => {
    const load = async () => {
      try {
        const account = await fetchMe();
        const roleState = await resolveRoleState();
        const coachAccess = await getCoachAccessState(account, roleState);

        if (roleState.hasAdminRole) {
          navigate("/admin");
          return;
        }
        if (coachAccess.canAccessCoach) {
          navigate("/coach");
          return;
        }
        if (roleState.hasClientRole) {
          navigate("/client");
          return;
        }

        const email = String(account.email || "").trim().toLowerCase();

        setForm((prev) => ({
          ...prev,
          name: account.name || prev.name,
          email,
          age: account.age != null ? String(account.age) : prev.age,
          gender: normalizeGenderToOnboardingValue(account.gender) || prev.gender,
          bio: account.bio || prev.bio,
        }));
      } catch (err) {
        if (err?.status === 401) {
          navigate("/login");
          return;
        }
        setError(err.message || "Failed to initialize onboarding.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isFormValid) {
      setError("Please complete all required onboarding fields before continuing.");
      return;
    }

    setError("");
    try {
      setSubmitting(true);
      const accountPayload = buildAccountUpdatePayload({
        age: form.age,
        email: form.email,
        bio: form.bio,
        gender: form.gender,
      });
      const surveyPayload = buildInitialSurveyPayload(form);

      if (Object.keys(accountPayload).length > 0) {
        await updateAccount(accountPayload);
      }

      try {
        await createClientInitialSurvey(surveyPayload);
      } catch (initialSurveyError) {
        const clientInformationPayload = buildClientInformationPayload({
          primaryGoal: form.primaryGoal,
          weight: form.weight,
          paymentMethod: {
            ccnum: form.cardNumber,
            cv: form.cardCvv,
            exp_date: form.cardExpiry,
          },
        });

        if (Object.keys(clientInformationPayload).length === 0) {
          throw initialSurveyError;
        }

        await updateClientInformation(clientInformationPayload);
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
                {/* Daily targets — bounds match the Client model validators
                    (steps 0–70k, calories 500–6k). Numeric input keeps
                    mobile keyboards numeric and prevents free-text junk. */}
                <input
                  type="number"
                  min="0"
                  max="70000"
                  step="500"
                  value={form.dailyStepGoal}
                  onChange={(e) => setForm((prev) => ({ ...prev, dailyStepGoal: e.target.value }))}
                  className="rounded-lg border border-white/10 bg-[#0F172A] px-4 py-3 text-sm text-white outline-none"
                  placeholder="Daily step goal (default 10,000)"
                />
                <input
                  type="number"
                  min="500"
                  max="6000"
                  step="50"
                  value={form.dailyCalorieGoal}
                  onChange={(e) => setForm((prev) => ({ ...prev, dailyCalorieGoal: e.target.value }))}
                  className="rounded-lg border border-white/10 bg-[#0F172A] px-4 py-3 text-sm text-white outline-none"
                  placeholder="Daily calorie goal (default 2,000)"
                />
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
              <p className="text-xs text-slate-500">Add training windows by date and time. Toggle "Repeat weekly" to roll a slot forward.</p>
              <AvailabilityCalendar
                availabilities={form.availabilityWindows.map((w, i) => ({
                  id: `pending-${i}`,
                  start_dt: w.start_dt,
                  end_dt: w.end_dt,
                  repeats_weekly: w.repeats_weekly,
                  recurrence_end_dt: w.recurrence_end_dt,
                }))}
                busySlots={[]}
                role="client"
                mode="edit"
                onCreate={async (payload) => {
                  setForm((prev) => ({
                    ...prev,
                    availabilityWindows: [...prev.availabilityWindows, payload],
                  }));
                }}
                onDelete={async (id) => {
                  if (typeof id !== "string" || !id.startsWith("pending-")) return;
                  const idx = Number(id.slice("pending-".length));
                  setForm((prev) => ({
                    ...prev,
                    availabilityWindows: prev.availabilityWindows.filter((_, i) => i !== idx),
                  }));
                }}
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
                  type="month"
                  value={form.cardExpiry}
                  onChange={(e) => setForm((prev) => ({ ...prev, cardExpiry: e.target.value }))}
                  className="rounded-lg border border-white/10 bg-[#0F172A] px-4 py-3 text-sm text-white outline-none"
                  placeholder="YYYY-MM"
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
