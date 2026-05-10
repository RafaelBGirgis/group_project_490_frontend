import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Navbar } from "../components/navbar";
import { fetchMe } from "../api/client";
import { buildCoachRequestPayload, createCoachRequest, fetchCoachProfile } from "../api/coach";
import AvailabilityCalendar from "../components/availability/AvailabilityCalendar";

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
  const mode = searchParams.get("mode") || "create";
  const isViewMode = mode === "view";
  const isEditMode = mode === "edit";
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitMessage, setSubmitMessage] = useState("");

  const [form, setForm] = useState({
    name: "",
    reason: "",
    specializations: [],
    certifications: [],
    experiences: [],
    paymentInterval: "monthly",
    priceDollars: "",
  });
  const [newCertification, setNewCertification] = useState({
    title: "",
    issuer: "",
    year: "",
    description: "",
  });
  const [newExperience, setNewExperience] = useState({
    title: "",
    organization: "",
    year: "",
    description: "",
  });
  const [editingCertification, setEditingCertification] = useState(null);
  const [editingExperience, setEditingExperience] = useState(null);
  const [showCertForm, setShowCertForm] = useState(false);
  const [showExpForm, setShowExpForm] = useState(false);
  const [availabilityWindows, setAvailabilityWindows] = useState([]);

  const initials = useMemo(() => {
    const parts = form.name.trim().split(/\s+/).filter(Boolean);
    const first = parts[0]?.[0] || "";
    const second = parts[1]?.[0] || "";
    return `${first}${second}`.toUpperCase() || "?";
  }, [form.name]);

  useEffect(() => {
    const loadNameFromSession = async () => {
      try {
        const data = await fetchMe();
        const existingCoachProfile = await fetchCoachProfile().catch(() => null);
        const existingSpecialties = String(existingCoachProfile?.coach_account?.specialties || "")
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean);

        const existingPricing =
          existingCoachProfile?.pricing
          ?? existingCoachProfile?.coach_account?.pricing
          ?? null;
        const existingInterval = existingPricing?.payment_interval || "monthly";
        const existingPriceDollars =
          existingPricing?.price_cents != null
            ? String(Number(existingPricing.price_cents) / 100)
            : "";

        setForm((prev) => ({
          ...prev,
          name: data.name || "",
          paymentInterval: existingInterval,
          priceDollars: existingPriceDollars || prev.priceDollars,
          specializations: existingSpecialties.length > 0 ? existingSpecialties : prev.specializations,
          certifications: Array.isArray(existingCoachProfile?.certifications)
            ? existingCoachProfile.certifications.map((cert, index) => ({
                id: cert.id || `cert-${index}`,
                title: cert.certification_name || "",
                issuer: cert.certification_organization || "",
                year: cert.certification_date || "",
                description: cert.certification_score || "",
              }))
            : prev.certifications,
          experiences: Array.isArray(existingCoachProfile?.experiences)
            ? existingCoachProfile.experiences.map((exp, index) => ({
                id: exp.id || `exp-${index}`,
                title: exp.experience_title || "",
                organization: exp.experience_name || "",
                year: exp.experience_start || "",
                description: exp.experience_description || "",
              }))
            : prev.experiences,
        }));
        setAvailabilityWindows([]);

        if ((isViewMode || isEditMode) && !existingCoachProfile?.coach_account) {
          setSubmitMessage(
            "Pending coach application details are not available from the backend yet. The frontend needs a read route for the current coach application to support view/edit status without local storage."
          );
        }
      } catch (err) {
        setError(err.message || "Failed to load your account session.");
      } finally {
        setLoading(false);
      }
    };

    loadNameFromSession();
  }, [navigate]);

  const toggleSpecialization = (item) => {
    if (isViewMode) return;
    setForm((prev) => ({
      ...prev,
      specializations: prev.specializations.includes(item)
        ? prev.specializations.filter((x) => x !== item)
        : [...prev.specializations, item],
    }));
  };

  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitMessage("");

    if (!form.name.trim()) {
      setError("Name is required.");
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
    if (availabilityWindows.length === 0) {
      setError("Add at least one availability slot.");
      return;
    }
    const priceNum = Number(form.priceDollars);
    if (!form.priceDollars || !Number.isFinite(priceNum) || priceNum <= 0) {
      setError("Enter a desired rate greater than $0.");
      return;
    }
    // Realistic bounds: $5 floor (under that and the platform can't make
    // money on the cut), $1000 ceiling (above is almost certainly a typo —
    // the highest legit personal-trainer rates top out around $300/mo).
    if (priceNum < 5 || priceNum > 1000) {
      setError("Desired rate must be between $5 and $1000.");
      return;
    }
    if (!form.paymentInterval) {
      setError("Choose a billing interval.");
      return;
    }
    if (!["monthly", "yearly"].includes(form.paymentInterval)) {
      setError("Billing interval must be monthly or yearly.");
      return;
    }
    // Year fields on certifications/experiences validated at add-time, but
    // re-check on submit too in case a row was edited inline.
    const currentYear = new Date().getFullYear();
    const badYear = (y) => {
      const n = Number(y);
      return !Number.isFinite(n) || n < 1900 || n > currentYear;
    };
    if (form.certifications.some((c) => badYear(c.year))) {
      setError(`Certification years must be between 1900 and ${currentYear}.`);
      return;
    }
    if (form.experiences.some((e) => badYear(e.year))) {
      setError(`Experience years must be between 1900 and ${currentYear}.`);
      return;
    }

    setError("");
    setSubmitting(true);

    const backendPayload = buildCoachRequestPayload(
      { ...form, priceCents: Math.round(priceNum * 100) },
      availabilityWindows,
    );

    try {
      await createCoachRequest(backendPayload);
      setSubmitMessage(isEditMode ? "Coach request updated." : "Coach request submitted successfully! An admin will review your application.");
    } catch (err) {
      setError(err.message || "Failed to submit coach request. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const addCertification = () => {
    if (isViewMode) return;
    if (!newCertification.title || !newCertification.issuer || !newCertification.year) return;

    // Reject obviously-wrong years (typos like "20223" or future dates).
    // Same bounds the submit handler enforces — keep the error fast/inline.
    const yearNum = Number(newCertification.year);
    const currentYear = new Date().getFullYear();
    if (!Number.isFinite(yearNum) || yearNum < 1900 || yearNum > currentYear) {
      setError(`Certification year must be between 1900 and ${currentYear}.`);
      return;
    }
    setError("");

    if (editingCertification) {
      // Update existing certification
      setForm((prev) => ({
        ...prev,
        certifications: prev.certifications.map((cert) =>
          cert.id === editingCertification.id ? { ...cert, ...newCertification } : cert
        ),
      }));
      setEditingCertification(null);
    } else {
      // Add new certification
      setForm((prev) => ({
        ...prev,
        certifications: [...prev.certifications, { id: Date.now(), ...newCertification }],
      }));
    }
    
    setNewCertification({ title: "", issuer: "", year: "", description: "" });
    setShowCertForm(false);
  };

  const addExperience = () => {
    if (isViewMode) return;
    if (!newExperience.title || !newExperience.organization || !newExperience.year) return;

    const yearNum = Number(newExperience.year);
    const currentYear = new Date().getFullYear();
    if (!Number.isFinite(yearNum) || yearNum < 1900 || yearNum > currentYear) {
      setError(`Experience year must be between 1900 and ${currentYear}.`);
      return;
    }
    setError("");

    if (editingExperience) {
      // Update existing experience
      setForm((prev) => ({
        ...prev,
        experiences: prev.experiences.map((exp) =>
          exp.id === editingExperience.id ? { ...exp, ...newExperience } : exp
        ),
      }));
      setEditingExperience(null);
    } else {
      // Add new experience
      setForm((prev) => ({
        ...prev,
        experiences: [...prev.experiences, { id: Date.now(), ...newExperience }],
      }));
    }
    
    setNewExperience({ title: "", organization: "", year: "", description: "" });
    setShowExpForm(false);
  };

  const removeItem = (field, id) => {
    if (isViewMode) return;
    setForm((prev) => ({
      ...prev,
      [field]: prev[field].filter((item) => item.id !== id),
    }));
  };

  const startEditingCertification = (cert) => {
    setEditingCertification(cert);
    setNewCertification({
      title: cert.title,
      issuer: cert.issuer,
      year: cert.year,
      description: cert.description || "",
    });
    setShowCertForm(true);
  };

  const startEditingExperience = (exp) => {
    setEditingExperience(exp);
    setNewExperience({
      title: exp.title,
      organization: exp.organization,
      year: exp.year,
      description: exp.description || "",
    });
    setShowExpForm(true);
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
                        borderColor: selected ? "#F59E0B" : "rgba(255,255,255,0.08)",
                        backgroundColor: selected ? "rgba(245,158,11,0.18)" : "rgba(255,255,255,0.03)",
                        color: selected ? "#FBBF24" : "#94A3B8",
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
                Availability
              </label>
              <div className="rounded-xl border border-white/6 bg-[#101827] p-4">
                <AvailabilityCalendar
                  availabilities={availabilityWindows.map((w, i) => ({
                    id: `pending-${i}`,
                    start_dt: w.start_dt,
                    end_dt: w.end_dt,
                    repeats_weekly: w.repeats_weekly,
                    recurrence_end_dt: w.recurrence_end_dt,
                  }))}
                  busySlots={[]}
                  role="coach"
                  mode={isViewMode ? "view" : "edit"}
                  onCreate={async (payload) => {
                    setAvailabilityWindows((prev) => [...prev, payload]);
                  }}
                  onDelete={async (id) => {
                    if (typeof id !== "string" || !id.startsWith("pending-")) return;
                    const idx = Number(id.slice("pending-".length));
                    setAvailabilityWindows((prev) => prev.filter((_, i) => i !== idx));
                  }}
                />
              </div>
            </div>

            <div className="space-y-3">
              <label className="mb-2 block text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                Certifications
              </label>
              {form.certifications.length > 0 && (
                <div className="space-y-2">
                  {form.certifications.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-xl border border-white/6 bg-[#101827] px-4 py-3"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-1">
                          <h3 className="text-sm font-semibold text-white">{item.title}</h3>
                          <p className="mt-1 text-xs text-amber-300">{item.issuer}</p>
                          <p className="mt-1 text-[11px] text-slate-500">{item.year}</p>
                          {item.description && (
                            <p className="mt-2 text-xs text-slate-300">{item.description}</p>
                          )}
                        </div>
                        {!isViewMode && (
                          <div className="flex flex-col gap-2">
                            <button
                              type="button"
                              onClick={() => startEditingCertification(item)}
                              className="rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-xs font-semibold text-blue-300"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => removeItem("certifications", item.id)}
                              className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-300"
                            >
                              Remove
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {!isViewMode && !showCertForm && (
                <button
                  type="button"
                  onClick={() => setShowCertForm(true)}
                  className="w-full rounded-xl border border-dashed border-[#F59E0B]/50 bg-[#F59E0B]/10 px-4 py-3 text-sm font-semibold text-[#FBBF24]"
                >
                  + Add Certification
                </button>
              )}

              {!isViewMode && showCertForm && (
                <div className="rounded-xl border border-white/6 bg-[#101827] p-4 space-y-3">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                    <input
                      value={newCertification.title}
                      onChange={(e) =>
                        setNewCertification((prev) => ({ ...prev, title: e.target.value }))
                      }
                      placeholder="Certification Title"
                      className="rounded-lg border border-white/6 bg-[#0F172A] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
                    />
                    <input
                      value={newCertification.issuer}
                      onChange={(e) =>
                        setNewCertification((prev) => ({ ...prev, issuer: e.target.value }))
                      }
                      placeholder="Issuer"
                      className="rounded-lg border border-white/6 bg-[#0F172A] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
                    />
                    <input
                      type="number"
                      min="1900"
                      max={new Date().getFullYear()}
                      step="1"
                      value={newCertification.year}
                      onChange={(e) =>
                        setNewCertification((prev) => ({ ...prev, year: e.target.value }))
                      }
                      placeholder={`Year (1900–${new Date().getFullYear()})`}
                      className="rounded-lg border border-white/6 bg-[#0F172A] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
                    />
                  </div>
                  <textarea
                    value={newCertification.description}
                    onChange={(e) =>
                      setNewCertification((prev) => ({ ...prev, description: e.target.value }))
                    }
                    rows={4}
                    placeholder="Description"
                    className="w-full rounded-lg border border-white/6 bg-[#0F172A] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowCertForm(false);
                        setEditingCertification(null);
                        setNewCertification({ title: "", issuer: "", year: "", description: "" });
                      }}
                      className="rounded-lg border border-white/10 bg-[rgba(255,255,255,0.03)] px-3 py-2 text-xs font-medium text-slate-300"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={addCertification}
                      className="rounded-lg bg-gradient-to-r from-amber-500 to-orange-400 px-3 py-2 text-xs font-semibold text-white"
                    >
                      Save
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <label className="mb-2 block text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                Experiences
              </label>
              {form.experiences.length > 0 && (
                <div className="space-y-2">
                  {form.experiences.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-xl border border-white/6 bg-[#101827] px-4 py-3"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-1">
                          <h3 className="text-sm font-semibold text-white">{item.title}</h3>
                          <p className="mt-1 text-xs text-amber-300">{item.organization}</p>
                          <p className="mt-1 text-[11px] text-slate-500">{item.year}</p>
                          {item.description && (
                            <p className="mt-2 text-xs text-slate-300">{item.description}</p>
                          )}
                        </div>
                        {!isViewMode && (
                          <div className="flex flex-col gap-2">
                            <button
                              type="button"
                              onClick={() => startEditingExperience(item)}
                              className="rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-xs font-semibold text-blue-300"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => removeItem("experiences", item.id)}
                              className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-300"
                            >
                              Remove
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {!isViewMode && !showExpForm && (
                <button
                  type="button"
                  onClick={() => setShowExpForm(true)}
                  className="w-full rounded-xl border border-dashed border-[#F59E0B]/50 bg-[#F59E0B]/10 px-4 py-3 text-sm font-semibold text-[#FBBF24]"
                >
                  + Add Experience
                </button>
              )}

              {!isViewMode && showExpForm && (
                <div className="rounded-xl border border-white/6 bg-[#101827] p-4 space-y-3">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                    <input
                      value={newExperience.title}
                      onChange={(e) =>
                        setNewExperience((prev) => ({ ...prev, title: e.target.value }))
                      }
                      placeholder="Role Title"
                      className="rounded-lg border border-white/6 bg-[#0F172A] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
                    />
                    <input
                      value={newExperience.organization}
                      onChange={(e) =>
                        setNewExperience((prev) => ({ ...prev, organization: e.target.value }))
                      }
                      placeholder="Organization"
                      className="rounded-lg border border-white/6 bg-[#0F172A] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
                    />
                    <input
                      type="number"
                      min="1900"
                      max={new Date().getFullYear()}
                      step="1"
                      value={newExperience.year}
                      onChange={(e) =>
                        setNewExperience((prev) => ({ ...prev, year: e.target.value }))
                      }
                      placeholder={`Year (1900–${new Date().getFullYear()})`}
                      className="rounded-lg border border-white/6 bg-[#0F172A] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
                    />
                  </div>
                  <textarea
                    value={newExperience.description}
                    onChange={(e) =>
                      setNewExperience((prev) => ({ ...prev, description: e.target.value }))
                    }
                    rows={4}
                    placeholder="Description"
                    className="w-full rounded-lg border border-white/6 bg-[#0F172A] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowExpForm(false);
                        setEditingExperience(null);
                        setNewExperience({ title: "", organization: "", year: "", description: "" });
                      }}
                      className="rounded-lg border border-white/10 bg-[rgba(255,255,255,0.03)] px-3 py-2 text-xs font-medium text-slate-300"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={addExperience}
                      className="rounded-lg bg-gradient-to-r from-amber-500 to-orange-400 px-3 py-2 text-xs font-semibold text-white"
                    >
                      Save
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="mb-2 block text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                Desired Rate
              </label>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div>
                  <div className="flex items-center rounded-lg border border-white/6 bg-[#0F172A] px-3 focus-within:border-amber-500/50">
                    <span className="text-sm text-slate-400">$</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      min="5"
                      max="1000"
                      value={form.priceDollars}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, priceDollars: e.target.value }))
                      }
                      placeholder="50 (range: $5–$1000)"
                      disabled={isViewMode}
                      className="w-full bg-transparent px-2 py-3 text-sm text-white outline-none placeholder:text-slate-500 disabled:cursor-not-allowed"
                      required
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500">
                    Amount you want to charge each client per billing cycle.
                  </p>
                </div>
                <div>
                  <select
                    value={form.paymentInterval}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, paymentInterval: e.target.value }))
                    }
                    disabled={isViewMode}
                    className="w-full rounded-lg border border-white/6 bg-[#0F172A] px-4 py-3 text-sm text-white outline-none disabled:cursor-not-allowed"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                  <p className="mt-1 text-[11px] text-slate-500">
                    Billing cadence shown to potential clients.
                  </p>
                </div>
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
                  className="rounded-xl bg-gradient-to-r from-amber-500 to-orange-400 px-5 py-3 text-sm font-semibold text-white"
                >
                  Edit Request
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-gradient-to-r from-amber-500 to-orange-400 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? "Submitting..." : isEditMode ? "Save Request" : "Submit Request"}
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
