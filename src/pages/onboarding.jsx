import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AvailabilityDetail from "../components/overlays/availability_detail";
import {
  buildClientInformationPayload,
  buildInitialSurveyPayload,
  createClientInitialSurvey,
  fetchMe,
  updateAccount,
  updateClientInformation,
} from "../api/client";
import {
  convertGridToTrainingAvailability,
  convertTrainingAvailabilityToGrid,
  EMPTY_TRAINING_AVAILABILITY,
} from "../utils/availabilityModel";
import { getCoachAccessState } from "../utils/roleAccess";
import { resolveRoleState } from "../utils/sessionAuth";

const PRIMARY_GOALS = [
  "Weight Loss",
  "Maintenance",
  "Muscle Gain",
];

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

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
          trainingAvailability: normalizeTrainingAvailability(
            prev.trainingAvailability,
            []
          ),
          name: account.name || prev.name,
          email,
          age: account.age != null ? String(account.age) : prev.age,
          gender: account.gender || prev.gender,
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

      let response = null;

      try {
        response = await createClientInitialSurvey(surveyPayload);
      } catch (initialSurveyError) {
        const clientInformationPayload = buildClientInformationPayload({
          primaryGoal: form.primaryGoal,
          weight: form.weight,
          trainingAvailability: form.trainingAvailability,
          paymentMethod: {
            ccnum: form.cardNumber,
            cv: form.cardCvv,
            exp_date: form.cardExpiry,
          },
        });

        if (Object.keys(clientInformationPayload).length === 0) {
          throw initialSurveyError;
        }

        response = await updateClientInformation(clientInformationPayload);
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
                slots={convertTrainingAvailabilityToGrid(form.trainingAvailability)}
                weekdays={WEEKDAYS}
                onSave={(updatedSlots) => {
                  setForm((prev) => ({
                    ...prev,
                    trainingAvailability: convertGridToTrainingAvailability(updatedSlots),
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
