import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Navbar } from "../components/navbar";

const SPECIALIZATION_OPTIONS = [
  "Strength Training",
  "Muscle Building",
  "Weight Loss",
  "Athletic Performance",
  "Cardio & Endurance",
  "Flexibility & Mobility",
  "Nutrition Planning",
  "Powerlifting",
  "CrossFit",
  "Rehabilitation",
];

function CoachRequestFormPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";
  const mode = searchParams.get("mode") || "create";
  const isViewMode = mode === "view";
  const isEditMode = mode === "edit";
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitMessage, setSubmitMessage] = useState("");
  const [requestStorageKey, setRequestStorageKey] = useState("");

  const [form, setForm] = useState({
    name: "",
    requestedDate: new Date().toISOString().slice(0, 10),
    yearsExperience: "",
    reason: "",
    specializations: [],
  });

  const initials = useMemo(() => {
    const parts = form.name.trim().split(/\s+/).filter(Boolean);
    const first = parts[0]?.[0] || "";
    const second = parts[1]?.[0] || "";
    return `${first}${second}`.toUpperCase() || "?";
  }, [form.name]);

  useEffect(() => {
    const token = localStorage.getItem("jwt");
    if (!token) {
      navigate("/login");
      return;
    }

    const loadNameFromSession = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/me`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          throw new Error("Failed to load your account session.");
        }

        const data = await res.json();
        const key = `coachRequest:${data.id || data.email || "current"}`;
        setRequestStorageKey(key);

        const existingRaw =
          localStorage.getItem(key) || localStorage.getItem("coachRequestDraft");
        let existing = null;
        if (existingRaw) {
          try {
            existing = JSON.parse(existingRaw);
          } catch {
            existing = null;
          }
        }

        setForm((prev) => ({
          ...prev,
          name: data.name || "",
          requestedDate: existing?.requestedDate || prev.requestedDate,
          yearsExperience:
            existing?.yearsExperience != null ? String(existing.yearsExperience) : prev.yearsExperience,
          reason: existing?.reason || prev.reason,
          specializations: Array.isArray(existing?.specializations)
            ? existing.specializations
            : prev.specializations,
        }));
      } catch (err) {
        setError(err.message || "Failed to load your account session.");
      } finally {
        setLoading(false);
      }
    };

    loadNameFromSession();
  }, [API_BASE_URL, navigate]);

  const toggleSpecialization = (item) => {
    if (isViewMode) return;
    setForm((prev) => ({
      ...prev,
      specializations: prev.specializations.includes(item)
        ? prev.specializations.filter((x) => x !== item)
        : [...prev.specializations, item],
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitMessage("");

    if (!form.name.trim()) {
      setError("Name is required.");
      return;
    }
    if (!form.requestedDate) {
      setError("Date is required.");
      return;
    }
    if (!form.yearsExperience || Number(form.yearsExperience) < 0) {
      setError("Please enter valid years of experience.");
      return;
    }
    if (form.specializations.length === 0) {
      setError("Select at least one specialization.");
      return;
    }
    if (!form.reason.trim()) {
      setError("Please explain why you want to be a coach.");
      return;
    }

    setError("");
    const payload = {
      ...form,
      yearsExperience: Number(form.yearsExperience),
      status: "submitted",
      submittedAt: new Date().toISOString(),
    };
    const key = requestStorageKey || "coachRequestDraft";
    localStorage.setItem(key, JSON.stringify(payload));
    setSubmitMessage(isEditMode ? "Coach request updated." : "Coach request form submitted.");
  };

  return (
    <div className="min-h-screen bg-[#080D19] text-white">
      <Navbar role="client" userName={initials} onSwitch={() => navigate("/coach")} />

      <main className="mx-auto w-full max-w-4xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Coach Request Form</h1>
          <Link
            to="/profile"
            className="rounded-lg border border-white/10 bg-white/[0.03] px-4 py-2 text-xs font-medium text-slate-300"
          >
            Back to Profile
          </Link>
        </div>

        {loading && (
          <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-300">
            Loading session...
          </div>
        )}

        {!loading && (
          <form
            onSubmit={handleSubmit}
            className="space-y-5 rounded-2xl border border-white/8 bg-[#0B1120] p-6 shadow-[0_0_30px_rgba(0,0,0,0.25)]"
          >
            {error && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            )}
            {submitMessage && (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
                {submitMessage}
              </div>
            )}

            <div>
              <label className="mb-2 block text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                Name
              </label>
              <input
                value={form.name}
                readOnly
                className="w-full rounded-lg border border-white/6 bg-[#0F172A] px-4 py-3 text-sm text-slate-300 outline-none"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                  Date
                </label>
                <input
                  type="date"
                  value={form.requestedDate}
                  onChange={(e) => setForm((prev) => ({ ...prev, requestedDate: e.target.value }))}
                  className="w-full rounded-lg border border-white/6 bg-[#0F172A] px-4 py-3 text-sm text-white outline-none"
                  disabled={isViewMode}
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                  Years Of Experience
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={form.yearsExperience}
                  onChange={(e) => setForm((prev) => ({ ...prev, yearsExperience: e.target.value }))}
                  placeholder="e.g. 3"
                  className="w-full rounded-lg border border-white/6 bg-[#0F172A] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600"
                  disabled={isViewMode}
                  required
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                Specialties
              </label>
              <div className="flex flex-wrap gap-2">
                {SPECIALIZATION_OPTIONS.map((item) => {
                  const selected = form.specializations.includes(item);
                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() => toggleSpecialization(item)}
                      className="rounded-full border px-3 py-1 text-xs transition"
                      style={{
                        borderColor: selected ? "#3B82F6" : "rgba(255,255,255,0.08)",
                        backgroundColor: selected ? "rgba(59,130,246,0.12)" : "rgba(255,255,255,0.03)",
                        color: selected ? "#3B82F6" : "#94A3B8",
                      }}
                    >
                      {item}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                Why Do You Want To Be A Coach?
              </label>
                <textarea
                value={form.reason}
                onChange={(e) => setForm((prev) => ({ ...prev, reason: e.target.value }))}
                rows={4}
                maxLength={350}
                placeholder="Write a short explanation of your motivation, coaching goals, and relevant background."
                className="w-full rounded-lg border border-white/6 bg-[#0F172A] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600"
                disabled={isViewMode}
                required
              />
              <p className="mt-2 text-right text-[11px] text-slate-500">{form.reason.length}/350</p>
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => navigate("/profile")}
                className="rounded-xl border border-white/10 bg-white/[0.03] px-5 py-3 text-sm font-medium text-slate-300"
              >
                Cancel
              </button>
              {isViewMode ? (
                <button
                  type="button"
                  onClick={() => navigate("/coach-request?mode=edit")}
                  className="rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-400 px-5 py-3 text-sm font-semibold text-white"
                >
                  Edit Request
                </button>
              ) : (
                <button
                  type="submit"
                  className="rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-400 px-5 py-3 text-sm font-semibold text-white"
                >
                  {isEditMode ? "Save Request" : "Submit Request"}
                </button>
              )}
            </div>
          </form>
        )}
      </main>
    </div>
  );
}

export default CoachRequestFormPage;
