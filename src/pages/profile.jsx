import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "../components/navbar";

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

const normalizeGenderToSignupValue = (value) => {
  const normalized = String(value || "").trim().toLowerCase().replaceAll("_", "-");
  if (normalized === "male") return "Male";
  if (normalized === "female") return "Female";
  if (normalized === "non-binary" || normalized === "nonbinary") return "Non-Binary";
  if (normalized === "prefer-not-to-say" || normalized === "prefer not to say") {
    return "Prefer_Not_to_Say";
  }
  return value || "";
};

function ProfilePage({ role = "client" }) {
  const navigate = useNavigate();
  const isCoach = role === "coach";
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

  const accent = isCoach ? "#F59E0B" : "#3B82F6";
  const accentSoft = isCoach ? "rgba(245, 158, 11, 0.12)" : "rgba(59, 130, 246, 0.12)";
  const accentBorder = isCoach ? "rgba(245, 158, 11, 0.30)" : "rgba(59, 130, 246, 0.30)";
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [coachRequest, setCoachRequest] = useState(null);
  const [coachRequestStorageKey, setCoachRequestStorageKey] = useState("");

  const [profile, setProfile] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    location: "",
    bio: "",
    age: "",
    gender: "",
    primaryGoal: "",
    trainingAvailability: { ...EMPTY_TRAINING_AVAILABILITY },
    weight: "",
    height: "",
    profilePicture: null,
    pricingInterval: "",
    amount: "",
    openToNewClients: "",
  });

  const [selectedAvailability, setSelectedAvailability] = useState(null);
  const [selectedClientAvailability, setSelectedClientAvailability] = useState(null);

  const [availability, setAvailability] = useState({
    Mon: [],
    Tue: [],
    Wed: [],
    Thu: [],
    Fri: [],
    Sat: [],
    Sun: [],
  });

  const [specializations, setSpecializations] = useState([]);

  const specializationOptions = [
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

  const [certifications, setCertifications] = useState([]);

  const [experiences, setExperiences] = useState([]);

  const [newCertification, setNewCertification] = useState({
    title: "",
    issuer: "",
    year: "",
    description: "",
  });

  const [newExperience, setNewExperience] = useState({
    title: "",
    issuer: "",
    year: "",
    description: "",
  });

  const [showCertForm, setShowCertForm] = useState(false);
  const [showExpForm, setShowExpForm] = useState(false);

  const fullName = useMemo(
    () => `${profile.firstName} ${profile.lastName}`.trim(),
    [profile.firstName, profile.lastName]
  );

  const initials = useMemo(() => {
    const f = profile.firstName?.[0] || "";
    const l = profile.lastName?.[0] || "";
    return `${f}${l}`.toUpperCase() || "?";
  }, [profile.firstName, profile.lastName]);

  useEffect(() => {
    const token = localStorage.getItem("jwt");
    if (!token) {
      setLoadError("You are not logged in.");
      setLoadingProfile(false);
      navigate("/login");
      return;
    }

    const loadProfile = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/me`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          throw new Error("Failed to load profile.");
        }

        const data = await res.json();
        const [firstName = "", ...rest] = (data.name || "").trim().split(/\s+/);
        const lastName = rest.join(" ");
        const onboardingKey = data.email
          ? `onboarding:${String(data.email).trim().toLowerCase()}`
          : "onboarding:current";
        let onboardingData = null;
        const onboardingRaw = localStorage.getItem(onboardingKey);
        if (onboardingRaw) {
          try {
            onboardingData = JSON.parse(onboardingRaw);
          } catch {
            onboardingData = null;
          }
        }
        const requestKey = `coachRequest:${data.id || data.email || "current"}`;
        setCoachRequestStorageKey(requestKey);

        const savedRequestRaw =
          localStorage.getItem(requestKey) || localStorage.getItem("coachRequestDraft");
        if (savedRequestRaw) {
          try {
            setCoachRequest(JSON.parse(savedRequestRaw));
          } catch {
            setCoachRequest(null);
          }
        } else {
          setCoachRequest(null);
        }

        setProfile((prev) => ({
          ...prev,
          firstName,
          lastName,
          email: data.email || "",
          age:
            data.age != null
              ? String(data.age)
              : onboardingData?.age != null
                ? String(onboardingData.age)
                : "",
          gender: normalizeGenderToSignupValue(data.gender || onboardingData?.gender || ""),
          bio: data.bio || onboardingData?.bio || "",
          weight: onboardingData?.weight || "",
          height: onboardingData?.height || "",
          primaryGoal: onboardingData?.primaryGoal || "",
          trainingAvailability: normalizeTrainingAvailability(
            onboardingData?.trainingAvailability,
            onboardingData?.availableDays
          ),
          profilePicture: data.pfp_url || null,
        }));
      } catch (err) {
        setLoadError(err.message || "Failed to load profile.");
      } finally {
        setLoadingProfile(false);
      }
    };

    loadProfile();
  }, [API_BASE_URL, navigate]);

  const handleProfileChange = (field, value) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
  };

  const handleDeleteAccountRequest = () => {
    alert("Account deletion request submitted.");
  };

  const handleCancelCoachRequest = () => {
    const key = coachRequestStorageKey || "coachRequestDraft";
    localStorage.removeItem(key);
    localStorage.removeItem("coachRequestDraft");
    setCoachRequest(null);
  };

  const handleLogout = () => {
    localStorage.removeItem("jwt");
    navigate("/login");
  };

  const toggleAvailabilitySlot = (day, time) => {
    setSelectedAvailability(`${day}-${time}`);
  };

  const addAvailabilitySlot = (day) => {
    const time = prompt(`Add a time slot for ${day} (example: 7PM)`);
    if (!time) return;
    setAvailability((prev) => ({
      ...prev,
      [day]: [...prev[day], time],
    }));
  };

  const removeAvailabilitySlot = (day, time) => {
    setAvailability((prev) => ({
      ...prev,
      [day]: prev[day].filter((slot) => slot !== time),
    }));
    if (selectedAvailability === `${day}-${time}`) {
      setSelectedAvailability(null);
    }
  };

  const toggleClientAvailabilitySlot = (day, time) => {
    setSelectedClientAvailability(`${day}-${time}`);
  };

  const addClientAvailabilitySlot = (day) => {
    const time = prompt(`Add a time slot for ${day} (example: 7PM)`);
    if (!time) return;

    setProfile((prev) => {
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

  const removeClientAvailabilitySlot = (day, time) => {
    setProfile((prev) => ({
      ...prev,
      trainingAvailability: {
        ...prev.trainingAvailability,
        [day]: (prev.trainingAvailability[day] || []).filter((slot) => slot !== time),
      },
    }));
    if (selectedClientAvailability === `${day}-${time}`) {
      setSelectedClientAvailability(null);
    }
  };

  const toggleSpecialization = (item) => {
    setSpecializations((prev) =>
      prev.includes(item) ? prev.filter((x) => x !== item) : [...prev, item]
    );
  };

  const addCertification = () => {
    if (!newCertification.title || !newCertification.issuer || !newCertification.year) return;
    setCertifications((prev) => [
      ...prev,
      {
        id: Date.now(),
        ...newCertification,
        editing: false,
      },
    ]);
    setNewCertification({ title: "", issuer: "", year: "", description: "" });
    setShowCertForm(false);
  };

  const addExperience = () => {
    if (!newExperience.title || !newExperience.issuer || !newExperience.year) return;
    setExperiences((prev) => [
      ...prev,
      {
        id: Date.now(),
        ...newExperience,
        editing: false,
      },
    ]);
    setNewExperience({ title: "", issuer: "", year: "", description: "" });
    setShowExpForm(false);
  };

  const deleteItem = (setter, id) => {
    setter((prev) => prev.filter((item) => item.id !== id));
  };

  const toggleEditItem = (setter, id) => {
    setter((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, editing: !item.editing } : { ...item, editing: false }
      )
    );
  };

  const updateItemField = (setter, id, field, value) => {
    setter((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const toTitleCase = (value) =>
    String(value)
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");

  return (
    <div className="min-h-screen bg-[#080D19] text-white">
      <Navbar
        role={role}
        userName={initials}
        onSwitch={() => navigate(role === "coach" ? "/client" : "/coach")}
      />

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 space-y-6">
        {loadingProfile && (
          <div className="rounded-xl border border-white/10 bg-[rgba(255,255,255,0.03)] px-4 py-3 text-sm text-slate-300">
            Loading profile...
          </div>
        )}

        {!loadingProfile && loadError && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {loadError}
          </div>
        )}

        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{isCoach ? "Edit Profile" : "Profile Settings"}</h1>
          {isCoach && (
            <button
              className="rounded-lg border px-4 py-2 text-xs font-medium text-slate-300"
              style={{ borderColor: accentBorder, backgroundColor: accentSoft }}
            >
              Preview Public Profile
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-5">
          <div className="space-y-4">
            <SidebarCard>
              <div className="flex flex-col items-center text-center">
                <div
                  className="relative flex h-24 w-24 items-center justify-center rounded-full text-3xl font-bold text-white shadow-lg"
                  style={{ backgroundColor: accent }}
                >
                  {typeof profile.profilePicture === "string" && profile.profilePicture ? (
                    <img
                      src={profile.profilePicture}
                      alt={fullName}
                      className="h-full w-full rounded-full object-cover"
                    />
                  ) : (
                    initials
                  )}
                  <span className="absolute bottom-0 right-0 h-5 w-5 rounded-full border-2 border-[#111827]" style={{ backgroundColor: "#FBBF24" }} />
                </div>

                <h2 className="mt-4 text-xl font-bold">{fullName}</h2>
                <p className="text-sm" style={{ color: accent }}>
                  {isCoach ? "Coach · Verified" : "Client"}
                </p>

                <label className="mt-5 w-full cursor-pointer rounded-xl border border-white/10 bg-[rgba(255,255,255,0.03)] px-4 py-3 text-sm font-medium text-slate-200 hover:bg-[rgba(255,255,255,0.05)]">
                    Upload / Change Profile Picture
                    <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={(e) =>
                        handleProfileChange("profilePicture", e.target.files?.[0] || null)
                    }
                    />
                </label>
              </div>
            </SidebarCard>

            {isCoach && (
              <SidebarCard title="Account Stats">
                <div className="grid grid-cols-2 gap-3">
                  <StatBox label="Clients" value="--" />
                  <StatBox label="Rating" value="--" />
                  <StatBox label="Reviews" value="--" />
                  <StatBox label="Coach Since" value="--" />
                </div>
              </SidebarCard>
            )}

            {isCoach && (
              <SidebarCard title="Availability">
                <div className="grid grid-cols-7 gap-1 text-center">
                  {Object.entries(availability).map(([day, slots]) => (
                    <div key={day}>
                      <div className="mb-2 text-[10px] font-semibold uppercase text-slate-500">
                        {day}
                      </div>

                      <div className="space-y-1">
                        {slots.length === 0 ? (
                          <div className="rounded-md border border-white/5 bg-[rgba(255,255,255,0.02)] px-1 py-1 text-[10px] text-slate-600">
                            —
                          </div>
                        ) : (
                          slots.map((time) => {
                            const active = selectedAvailability === `${day}-${time}`;
                            return (
                              <button
                                key={`${day}-${time}`}
                                onClick={() => toggleAvailabilitySlot(day, time)}
                                className="w-full rounded-md border px-1 py-1 text-[10px] transition"
                                style={{
                                  borderColor: active ? accent : "rgba(255,255,255,0.06)",
                                  backgroundColor: active
                                    ? accentSoft
                                    : "rgba(255,255,255,0.02)",
                                  color: active ? "#fff" : "#94A3B8",
                                }}
                                title={`${day} ${time}`}
                              >
                                {time}
                              </button>
                            );
                          })
                        )}

                        <button
                          onClick={() => addAvailabilitySlot(day)}
                          className="w-full rounded-md border border-dashed px-1 py-1 text-[10px] text-slate-500 hover:text-white"
                          style={{ borderColor: accentBorder }}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {selectedAvailability && (
                  <div className="mt-3 flex justify-end">
                    <button
                      onClick={() => {
                        const [day, time] = selectedAvailability.split("-");
                        removeAvailabilitySlot(day, time);
                      }}
                      className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-300"
                    >
                      Remove Selected Slot
                    </button>
                  </div>
                )}
              </SidebarCard>
            )}

            {!isCoach && (
              <>
                <SidebarCard title="Account Actions">
                  <div className="space-y-3">
                    <button
                      onClick={() => navigate("/coach-request")}
                      className="w-full rounded-xl px-4 py-3 text-sm font-semibold text-white"
                      style={{ backgroundColor: "#F59E0B" }}
                    >
                      Become Coach
                    </button>

                    <button
                      onClick={handleDeleteAccountRequest}
                      className="w-full rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-300"
                    >
                      Request Account Deletion
                    </button>

                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full rounded-xl border border-white/10 bg-[rgba(255,255,255,0.03)] px-4 py-3 text-sm font-medium text-slate-300"
                    >
                      Log Out
                    </button>
                  </div>
                </SidebarCard>

                <SidebarCard title="Availability">
                  <div className="grid grid-cols-7 gap-1 text-center">
                    {Object.entries(profile.trainingAvailability).map(([day, slots]) => (
                      <div key={day}>
                        <div className="mb-2 text-[10px] font-semibold uppercase text-slate-500">
                          {day}
                        </div>

                        <div className="space-y-1">
                          {slots.length === 0 ? (
                            <div className="rounded-md border border-white/5 bg-[rgba(255,255,255,0.02)] px-1 py-1 text-[10px] text-slate-600">
                              -
                            </div>
                          ) : (
                            slots.map((time) => {
                              const active = selectedClientAvailability === `${day}-${time}`;
                              return (
                                <button
                                  key={`${day}-${time}`}
                                  type="button"
                                  onClick={() => toggleClientAvailabilitySlot(day, time)}
                                  className="w-full rounded-md border px-1 py-1 text-[10px] transition"
                                  style={{
                                    borderColor: active ? "#3B82F6" : "rgba(255,255,255,0.06)",
                                    backgroundColor: active
                                      ? "rgba(59, 130, 246, 0.12)"
                                      : "rgba(255,255,255,0.02)",
                                    color: active ? "#fff" : "#94A3B8",
                                  }}
                                  title={`${day} ${time}`}
                                >
                                  {time}
                                </button>
                              );
                            })
                          )}

                          <button
                            type="button"
                            onClick={() => addClientAvailabilitySlot(day)}
                            className="w-full rounded-md border border-dashed px-1 py-1 text-[10px] text-slate-500 hover:text-white"
                            style={{ borderColor: "rgba(59, 130, 246, 0.30)" }}
                          >
                            +
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {selectedClientAvailability && (
                    <div className="mt-3 flex justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          const [day, time] = selectedClientAvailability.split("-");
                          removeClientAvailabilitySlot(day, time);
                        }}
                        className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-300"
                      >
                        Remove Selected Slot
                      </button>
                    </div>
                  )}
                </SidebarCard>

                {coachRequest && (
                  <SidebarCard title="Coach Request">
                    <div className="rounded-xl border border-yellow-400/20 bg-yellow-500/10 p-3">
                      <p className="text-xs font-semibold uppercase tracking-widest text-yellow-300">
                        Submitted
                      </p>
                      <p className="mt-2 text-xs text-slate-300">
                        Date: {coachRequest.requestedDate || "-"}
                      </p>
                      <p className="text-xs text-slate-300">
                        Years Experience: {coachRequest.yearsExperience ?? "-"}
                      </p>
                      <p className="text-xs text-slate-300">
                        Specialties:{" "}
                        {Array.isArray(coachRequest.specializations) &&
                        coachRequest.specializations.length > 0
                          ? coachRequest.specializations.join(", ")
                          : "-"}
                      </p>

                      <div className="mt-3 flex gap-2">
                        <button
                          type="button"
                          onClick={() => navigate("/coach-request?mode=view")}
                          className="rounded-lg border border-white/10 bg-[rgba(255,255,255,0.03)] px-3 py-2 text-xs font-medium text-slate-300"
                        >
                          View Request
                        </button>
                        <button
                          type="button"
                          onClick={() => navigate("/coach-request?mode=edit")}
                          className="rounded-lg border border-white/10 bg-[rgba(255,255,255,0.03)] px-3 py-2 text-xs font-medium text-slate-300"
                        >
                          Edit Request
                        </button>
                        <button
                          type="button"
                          onClick={handleCancelCoachRequest}
                          className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-300"
                        >
                          Cancel Request
                        </button>
                      </div>
                    </div>
                  </SidebarCard>
                )}
              </>
            )}
          </div>

          <div className="xl:col-span-3 space-y-4">
            <Panel title={isCoach ? "Personal Information" : "Edit Profile Information"} accent={accent}>
              {isCoach ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input label="First Name" value={profile.firstName} onChange={(v) => handleProfileChange("firstName", v)} />
                    <Input label="Last Name" value={profile.lastName} onChange={(v) => handleProfileChange("lastName", v)} />
                    <Input label="Email" value={profile.email} onChange={(v) => handleProfileChange("email", v)} />
                    <Input
                      label="Phone"
                      value={profile.phone}
                      onChange={(v) => handleProfileChange("phone", v)}
                      placeholder="555-123-4567"
                    />
                    <Input
                      label="Location"
                      value={profile.location}
                      onChange={(v) => handleProfileChange("location", v)}
                      placeholder="Boston, MA"
                    />
                    <div>
                      <label className="mb-2 block text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                        Gender
                      </label>
                      <select
                        value={normalizeGenderToSignupValue(profile.gender)}
                        onChange={(e) => handleProfileChange("gender", e.target.value)}
                        className="w-full rounded-lg border border-white/6 bg-[#0F172A] px-4 py-3 text-sm text-white outline-none"
                      >
                        <option value="">Select gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Non-Binary">Non-binary</option>
                        <option value="Prefer_Not_to_Say">Prefer not to say</option>
                      </select>
                    </div>
                  </div>

                  <div className="mt-4">
                    <TextArea
                      label="Bio"
                      value={profile.bio}
                      onChange={(v) => handleProfileChange("bio", v)}
                      rows={4}
                      placeholder="Example: Strength coach focused on hypertrophy and mobility."
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input label="Full Name" value={fullName} onChange={(v) => {
                      const parts = v.split(" ");
                      handleProfileChange("firstName", parts[0] || "");
                      handleProfileChange("lastName", parts.slice(1).join(" "));
                    }} />
                    <Input label="Email" value={profile.email} onChange={(v) => handleProfileChange("email", v)} />
                    <Input label="Age" value={profile.age} onChange={(v) => handleProfileChange("age", v)} />
                    <div>
                      <label className="mb-2 block text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                        Gender
                      </label>
                      <select
                        value={normalizeGenderToSignupValue(profile.gender)}
                        onChange={(e) => handleProfileChange("gender", e.target.value)}
                        className="w-full rounded-lg border border-white/6 bg-[#0F172A] px-4 py-3 text-sm text-white outline-none"
                      >
                        <option value="">Select gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Non-Binary">Non-binary</option>
                        <option value="Prefer_Not_to_Say">Prefer not to say</option>
                      </select>
                    </div>
                    <Input
                      label="Weight"
                      value={profile.weight}
                      onChange={(v) => handleProfileChange("weight", v)}
                      placeholder="165 lbs"
                    />
                    <Input
                      label="Height"
                      value={profile.height}
                      onChange={(v) => handleProfileChange("height", v)}
                      placeholder="5 ft 10 in"
                    />
                  </div>

                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="mb-2 block text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                        Primary Goal
                      </label>
                      <select
                        value={profile.primaryGoal}
                        onChange={(e) => handleProfileChange("primaryGoal", e.target.value)}
                        className="w-full rounded-lg border border-white/6 bg-[#0F172A] px-4 py-3 text-sm text-white outline-none"
                      >
                        <option value="">Select a primary goal</option>
                        {PRIMARY_GOALS.map((goal) => (
                          <option key={goal} value={goal}>
                            {toTitleCase(goal)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="mt-4">
                    <TextArea
                      label="Bio"
                      value={profile.bio}
                      onChange={(v) => handleProfileChange("bio", v)}
                      rows={4}
                      placeholder="Example: Training 4x/week and aiming for a half marathon."
                    />
                  </div>

                </>
              )}
            </Panel>

            {isCoach && (
              <>
                <Panel title="Specialisations" accent={accent}>
                  <div className="flex flex-wrap gap-2">
                    {specializationOptions.map((item) => {
                      const selected = specializations.includes(item);
                      return (
                        <button
                          key={item}
                          onClick={() => toggleSpecialization(item)}
                          className="rounded-full border px-3 py-1 text-xs transition"
                          style={{
                            borderColor: selected ? accent : "rgba(255,255,255,0.08)",
                            backgroundColor: selected ? accentSoft : "rgba(255,255,255,0.03)",
                            color: selected ? accent : "#94A3B8",
                          }}
                        >
                          {item}
                        </button>
                      );
                    })}
                  </div>
                </Panel>

                <Panel title="Pricing Plan" accent={accent}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Payment Interval"
                      value={profile.pricingInterval}
                      onChange={(v) => handleProfileChange("pricingInterval", v)}
                      placeholder="Monthly"
                    />
                    <Input
                      label="Amount"
                      value={profile.amount}
                      onChange={(v) => handleProfileChange("amount", v)}
                      placeholder="$160.00"
                    />
                  </div>

                  <div className="mt-4">
                    <Input
                      label="Open to New Clients"
                      value={profile.openToNewClients}
                      onChange={(v) => handleProfileChange("openToNewClients", v)}
                      placeholder="Yes - accepting clients"
                    />
                  </div>
                </Panel>

                <EditableMetadataSection
                  title="Certifications"
                  items={certifications}
                  newItem={newCertification}
                  setNewItem={setNewCertification}
                  showForm={showCertForm}
                  setShowForm={setShowCertForm}
                  onAdd={addCertification}
                  onDelete={(id) => deleteItem(setCertifications, id)}
                  accent={accent}
                  addLabel="+ Add Certification"
                />

                <EditableMetadataSection
                  title="Experience"
                  items={experiences}
                  newItem={newExperience}
                  setNewItem={setNewExperience}
                  showForm={showExpForm}
                  setShowForm={setShowExpForm}
                  onAdd={addExperience}
                  onDelete={(id) => deleteItem(setExperiences, id)}
                  accent={accent}
                  addLabel="+ Add Experience"
                />
              </>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button className="rounded-xl border border-white/10 bg-[rgba(255,255,255,0.03)] px-5 py-3 text-sm font-medium text-slate-300">
                Discard
              </button>
              <button
                className="rounded-xl px-5 py-3 text-sm font-semibold text-white shadow-lg"
                style={{ backgroundColor: accent }}
              >
                Save Changes
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

function SidebarCard({ title, children }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-[#0B1120] p-4 shadow-[0_0_30px_rgba(0,0,0,0.25)]">
      {title && <h3 className="mb-3 text-sm font-bold text-white">{title}</h3>}
      {children}
    </div>
  );
}

function Panel({ title, children, accent }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-[#0B1120] p-5 shadow-[0_0_30px_rgba(0,0,0,0.2)]">
      {title && (
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-bold text-white">{title}</h2>
          <div
            className="h-[1px] flex-1 ml-4"
            style={{ background: `linear-gradient(to right, ${accent}40, transparent)` }}
          />
        </div>
      )}
      {children}
    </div>
  );
}

function Input({ label, value, onChange, placeholder = "" }) {
  return (
    <div>
      <label className="mb-2 block text-[10px] font-semibold uppercase tracking-widest text-slate-500">
        {label}
      </label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-white/6 bg-[#0F172A] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600"
      />
    </div>
  );
}

function TextArea({ label, value, onChange, rows = 4, placeholder = "" }) {
  return (
    <div>
      <label className="mb-2 block text-[10px] font-semibold uppercase tracking-widest text-slate-500">
        {label}
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        placeholder={placeholder}
        className="w-full rounded-lg border border-white/6 bg-[#0F172A] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600"
      />
    </div>
  );
}

function StatBox({ label, value }) {
  return (
    <div className="rounded-xl border border-white/6 bg-[#111827] px-3 py-4 text-center">
      <div className="text-lg font-bold text-white">{value}</div>
      <div className="mt-1 text-[10px] uppercase tracking-widest text-slate-500">{label}</div>
    </div>
  );
}

function EditableMetadataSection({
  title,
  items,
  newItem,
  setNewItem,
  showForm,
  setShowForm,
  onAdd,
  onDelete,
  accent,
  addLabel,
}) {
  return (
    <Panel title={title} accent={accent}>
      <div className="space-y-3">
        {items.map((item) => (
          <div
            key={item.id}
            className="rounded-xl border border-white/6 bg-[#101827] px-4 py-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-white">{item.title}</h3>
                <p className="mt-1 text-xs" style={{ color: accent }}>
                  {item.issuer}
                </p>
                <p className="mt-1 text-[11px] text-slate-500">{item.year}</p>
                {item.description && (
                  <p className="mt-2 text-xs text-slate-300">{item.description}</p>
                )}
              </div>
              <button
                onClick={() => onDelete(item.id)}
                className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-300"
              >
                Remove
              </button>
            </div>
          </div>
        ))}

        {!showForm ? (
          <button
            onClick={() => setShowForm(true)}
            className="w-full rounded-xl border border-dashed px-4 py-3 text-sm font-semibold transition"
            style={{ borderColor: `${accent}55`, color: accent, backgroundColor: `${accent}08` }}
          >
            {addLabel}
          </button>
        ) : (
          <div className="rounded-xl border border-white/6 bg-[#101827] p-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Input
                label="Title"
                value={newItem.title}
                onChange={(v) => setNewItem((prev) => ({ ...prev, title: v }))}
                placeholder="Title"
              />
              <Input
                label="Issuer"
                value={newItem.issuer}
                onChange={(v) => setNewItem((prev) => ({ ...prev, issuer: v }))}
                placeholder="Issuer"
              />
              <Input
                label="Year"
                value={newItem.year}
                onChange={(v) => setNewItem((prev) => ({ ...prev, year: v }))}
                placeholder="Year"
              />
            </div>
            <TextArea
              label="Description"
              value={newItem.description}
              onChange={(v) => setNewItem((prev) => ({ ...prev, description: v }))}
              rows={4}
              placeholder="Description"
            />

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowForm(false)}
                className="rounded-lg border border-white/10 bg-[rgba(255,255,255,0.03)] px-3 py-2 text-xs font-medium text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={onAdd}
                className="rounded-lg px-3 py-2 text-xs font-semibold text-white"
                style={{ backgroundColor: accent }}
              >
                Save
              </button>
            </div>
          </div>
        )}
      </div>
    </Panel>
  );
}

export default ProfilePage;




