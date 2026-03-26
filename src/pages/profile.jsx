import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "../components/navbar";

function ProfilePage({ role = "client" }) {
  const navigate = useNavigate();
  const isCoach = role === "coach";

  const accent = isCoach ? "#F59E0B" : "#3B82F6";
  const accentSoft = isCoach ? "rgba(245, 158, 11, 0.12)" : "rgba(59, 130, 246, 0.12)";
  const accentBorder = isCoach ? "rgba(245, 158, 11, 0.30)" : "rgba(59, 130, 246, 0.30)";

  const [profile, setProfile] = useState({
    firstName: "John",
    lastName: "Doe",
    email: "johndoe@gmail.com",
    phone: "+1 (555) 000-0000",
    location: "City, Country",
    bio: "Certified strength & conditioning coach with 8 years experience. Specializing in muscle building and athletic performance for intermediate to advanced athletes.",
    age: "24",
    gender: "Male",
    goals: "Build strength and improve endurance",
    weight: "165",
    height: "5'10",
    profilePicture: null,
    pricingInterval: "Monthly",
    amount: "160.00",
    openToNewClients: "Yes — accepting clients",
  });

  const [coachRequestStatus, setCoachRequestStatus] = useState("not_requested");
  const [coachRequestReason, setCoachRequestReason] = useState("");

  const [selectedAvailability, setSelectedAvailability] = useState(null);

  const [availability, setAvailability] = useState({
    Mon: ["9AM", "10AM", "12PM", "5PM"],
    Tue: ["8AM", "1PM", "6PM"],
    Wed: ["10AM", "2PM", "3PM"],
    Thu: ["9AM", "11AM", "4PM"],
    Fri: ["1PM", "2PM", "4PM"],
    Sat: ["10AM"],
    Sun: [],
  });

  const [specializations, setSpecializations] = useState([
    "Strength Training",
    "Muscle Building",
    "Athletic Performance",
  ]);

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

  const [certifications, setCertifications] = useState([
    {
      id: 1,
      title: "NSCA - CSCS",
      issuer: "National Strength & Conditioning Association",
      year: "2021",
      description: "Certified Strength and Conditioning Specialist",
      editing: false,
    },
    {
      id: 2,
      title: "CPR / AED Certified",
      issuer: "American Red Cross",
      year: "2024",
      description: "Emergency response certification",
      editing: false,
    },
  ]);

  const [experiences, setExperiences] = useState([
    {
      id: 1,
      title: "Head Coach — FitLife Gym",
      issuer: "FitLife Gym",
      year: "Jan 2021 – Present",
      description: "Lead a team of coaches and manage 120+ clients across multiple fitness programs.",
      editing: false,
    },
    {
      id: 2,
      title: "Personal Trainer — Equinox",
      issuer: "Equinox",
      year: "Jun 2019 – Dec 2020",
      description: "1-on-1 training focused on strength and body composition.",
      editing: false,
    },
  ]);

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
    return `${f}${l}`.toUpperCase() || "RG";
  }, [profile.firstName, profile.lastName]);

  const handleProfileChange = (field, value) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
  };

  const handleRequestCoachRole = (e) => {
    e.preventDefault();
    if (!coachRequestReason.trim()) return;
    setCoachRequestStatus("pending");
  };

  const handleCancelCoachRequest = () => {
    setCoachRequestStatus("not_requested");
    setCoachRequestReason("");
  };

  const handleDeleteAccountRequest = () => {
    alert("Account deletion request submitted.");
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

  return (
    <div className="min-h-screen bg-[#080D19] text-white">
      <Navbar
        role={role}
        userName={initials}
        onSwitch={() => navigate(role === "coach" ? "/client" : "/coach")}
      />

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 space-y-6">
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
                  {initials}
                  <span className="absolute bottom-0 right-0 h-5 w-5 rounded-full border-2 border-[#111827]" style={{ backgroundColor: "#FBBF24" }} />
                </div>

                <h2 className="mt-4 text-xl font-bold">{fullName}</h2>
                <p className="text-sm" style={{ color: accent }}>
                  {isCoach ? "Coach · Verified" : "Client"}
                </p>

                <label className="mt-5 w-full cursor-pointer rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-medium text-slate-200 hover:bg-white/[0.05]">
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
                  <StatBox label="Clients" value="24" />
                  <StatBox label="Rating" value="4.9 ★" />
                  <StatBox label="Reviews" value="47" />
                  <StatBox label="Coach Since" value="2023" />
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
                          <div className="rounded-md border border-white/5 bg-white/[0.02] px-1 py-1 text-[10px] text-slate-600">
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
                      className="w-full rounded-xl px-4 py-3 text-sm font-semibold text-white"
                      style={{ backgroundColor: accent }}
                    >
                      Become Coach
                    </button>

                    <button
                      onClick={handleDeleteAccountRequest}
                      className="w-full rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-300"
                    >
                      Request Account Deletion
                    </button>
                  </div>
                </SidebarCard>

                <SidebarCard title="Coach Role Request Status">
                  {coachRequestStatus === "not_requested" && (
                    <p className="text-sm text-slate-400">
                      No coach-role request has been submitted yet.
                    </p>
                  )}

                  {coachRequestStatus === "pending" && (
                    <div className="space-y-3">
                      <span className="inline-flex rounded-full border border-yellow-400/20 bg-yellow-500/10 px-3 py-1 text-xs font-semibold text-yellow-300">
                        Pending Review
                      </span>
                      <p className="text-sm text-slate-400">
                        Your request is currently under review.
                      </p>
                      <button
                        onClick={handleCancelCoachRequest}
                        className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-medium"
                      >
                        Cancel Request
                      </button>
                    </div>
                  )}
                </SidebarCard>
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
                    <Input label="Phone" value={profile.phone} onChange={(v) => handleProfileChange("phone", v)} />
                    <Input label="Location" value={profile.location} onChange={(v) => handleProfileChange("location", v)} />
                    <Input label="Gender" value={profile.gender} onChange={(v) => handleProfileChange("gender", v)} />
                  </div>

                  <div className="mt-4">
                    <TextArea
                      label="Bio"
                      value={profile.bio}
                      onChange={(v) => handleProfileChange("bio", v)}
                      rows={4}
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
                    <Input label="Gender" value={profile.gender} onChange={(v) => handleProfileChange("gender", v)} />
                    <Input label="Weight" value={profile.weight} onChange={(v) => handleProfileChange("weight", v)} />
                    <Input label="Height" value={profile.height} onChange={(v) => handleProfileChange("height", v)} />
                  </div>

                  <div className="mt-4">
                    <TextArea
                      label="Goals"
                      value={profile.goals}
                      onChange={(v) => handleProfileChange("goals", v)}
                      rows={3}
                    />
                  </div>

                  <div className="mt-4">
                    <TextArea
                      label="Bio"
                      value={profile.bio}
                      onChange={(v) => handleProfileChange("bio", v)}
                      rows={4}
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
                    />
                    <Input
                      label="Amount"
                      value={profile.amount}
                      onChange={(v) => handleProfileChange("amount", v)}
                    />
                  </div>

                  <div className="mt-4">
                    <Input
                      label="Open to New Clients"
                      value={profile.openToNewClients}
                      onChange={(v) => handleProfileChange("openToNewClients", v)}
                    />
                  </div>
                </Panel>

                <EditableMetadataSection
                  title="Certifications"
                  items={certifications}
                  setter={setCertifications}
                  newItem={newCertification}
                  setNewItem={setNewCertification}
                  showForm={showCertForm}
                  setShowForm={setShowCertForm}
                  onAdd={addCertification}
                  onDelete={(id) => deleteItem(setCertifications, id)}
                  onToggleEdit={(id) => toggleEditItem(setCertifications, id)}
                  onUpdateField={(id, field, value) =>
                    updateItemField(setCertifications, id, field, value)
                  }
                  accent={accent}
                  addLabel="+ Add Certification"
                />

                <EditableMetadataSection
                  title="Experience"
                  items={experiences}
                  setter={setExperiences}
                  newItem={newExperience}
                  setNewItem={setNewExperience}
                  showForm={showExpForm}
                  setShowForm={setShowExpForm}
                  onAdd={addExperience}
                  onDelete={(id) => deleteItem(setExperiences, id)}
                  onToggleEdit={(id) => toggleEditItem(setExperiences, id)}
                  onUpdateField={(id, field, value) =>
                    updateItemField(setExperiences, id, field, value)
                  }
                  accent={accent}
                  addLabel="+ Add Experience"
                />
              </>
            )}

            {!isCoach && (
              <Panel title="Request Coach Role" accent={accent}>
                <p className="text-sm text-slate-400 mb-4">
                  Submit a form to request coach access.
                </p>

                <form onSubmit={handleRequestCoachRole} className="space-y-4">
                  <TextArea
                    label="Why do you want to become a coach?"
                    value={coachRequestReason}
                    onChange={setCoachRequestReason}
                    rows={4}
                    placeholder="Describe your experience, certifications, or motivation..."
                  />

                  <div className="flex gap-3">
                    <button
                      type="submit"
                      className="rounded-xl px-5 py-3 text-sm font-semibold text-white"
                      style={{ backgroundColor: accent }}
                    >
                      Submit Request
                    </button>
                    <button
                      type="button"
                      onClick={() => setCoachRequestReason("")}
                      className="rounded-xl border border-white/10 bg-white/[0.03] px-5 py-3 text-sm font-medium"
                    >
                      Clear
                    </button>
                  </div>
                </form>
              </Panel>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button className="rounded-xl border border-white/10 bg-white/[0.03] px-5 py-3 text-sm font-medium text-slate-300">
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
  onToggleEdit,
  onUpdateField,
  accent,
  addLabel,
}) {
  return (
    <Panel title={title} accent={accent}>
      <div className="space-y-3">
        {items.map((item) => (
          <div
            key={item.id}
            className="rounded-xl border border-white/6 bg-[#101827] px-4 py-4"
          >
            {!item.editing ? (
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-white">{item.title}</h3>
                  <p className="text-xs mt-1" style={{ color: accent }}>
                    {item.issuer}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">{item.year}</p>
                  <p className="text-sm text-slate-300 mt-2">{item.description}</p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => onToggleEdit(item.id)}
                    className="rounded-lg border px-3 py-2 text-xs font-semibold text-slate-200"
                    style={{ borderColor: `${accent}55`, backgroundColor: `${accent}12` }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => onDelete(item.id)}
                    className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-300"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Input
                    label="Title"
                    value={item.title}
                    onChange={(v) => onUpdateField(item.id, "title", v)}
                  />
                  <Input
                    label="Issuer / Organization"
                    value={item.issuer}
                    onChange={(v) => onUpdateField(item.id, "issuer", v)}
                  />
                  <Input
                    label="Year / Date"
                    value={item.year}
                    onChange={(v) => onUpdateField(item.id, "year", v)}
                  />
                  <Input
                    label="Description"
                    value={item.description}
                    onChange={(v) => onUpdateField(item.id, "description", v)}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => onToggleEdit(item.id)}
                    className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-medium text-slate-300"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input
                label="Title"
                value={newItem.title}
                onChange={(v) => setNewItem((prev) => ({ ...prev, title: v }))}
              />
              <Input
                label="Issuer / Organization"
                value={newItem.issuer}
                onChange={(v) => setNewItem((prev) => ({ ...prev, issuer: v }))}
              />
              <Input
                label="Year / Date"
                value={newItem.year}
                onChange={(v) => setNewItem((prev) => ({ ...prev, year: v }))}
              />
              <Input
                label="Description"
                value={newItem.description}
                onChange={(v) => setNewItem((prev) => ({ ...prev, description: v }))}
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowForm(false)}
                className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-medium text-slate-300"
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