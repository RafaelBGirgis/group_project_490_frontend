import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Navbar } from "../components/navbar";
import {
  buildClientInformationPayload,
  deactivateAccount,
  deleteAccount,
  extractUploadedAssetUrl,
  fetchMe,
  fetchUnifiedProfile,
  updateAccount,
  updateClientInformation,
  uploadProfilePicture,
  payInvoice,
} from "../api/client";
import TelemetryCharts from "../components/overlays/telemetry_charts";
import {
  buildCoachInformationPayload,
  deactivateCoachAccount,
  deleteCoachAccount,
  fetchCoachProfile,
  updateCoachInformation,
} from "../api/coach";
import { getCoachAccessState } from "../utils/roleAccess";
import { resolveRoleState } from "../utils/sessionAuth";
import { clearAuth } from "../api/auth";

const PRIMARY_GOALS = [
  "Weight Loss",
  "Maintenance",
  "Muscle Gain",
];

const normalizePrimaryGoal = (value) => {
  const normalized = String(value || "").trim().toLowerCase().replaceAll("_", " ");
  if (normalized === "weight loss") return "Weight Loss";
  if (normalized === "maintenance" || normalized === "maintenence") return "Maintenance";
  if (normalized === "muscle gain") return "Muscle Gain";
  return "";
};

const resolveClientPrimaryGoal = (clientDetails) => {
  const apiGoal =
    clientDetails?.primary_goal ||
    clientDetails?.primaryGoal ||
    clientDetails?.goal ||
    clientDetails?.fitness_goal;
  const tableGoal = Array.isArray(clientDetails?.fitness_goals)
    ? clientDetails.fitness_goals[0]
    : "";
  return normalizePrimaryGoal(apiGoal || tableGoal);
};

const PROFILE_CACHE_VERSION = 1;

const getProfileCacheKey = (role) => `profile:${role}:route-cache:v${PROFILE_CACHE_VERSION}`;

const readProfileCache = (role) => {
  try {
    const raw = localStorage.getItem(getProfileCacheKey(role));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const writeProfileCache = (role, value) => {
  try {
    localStorage.setItem(
      getProfileCacheKey(role),
      JSON.stringify({ ...value, cachedAt: new Date().toISOString() })
    );
  } catch {
    // Cache writes are best-effort only.
  }
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

const buildAccountUpdatePayload = ({ name, age, email, bio, pfp_url, gender }) => {
  const payload = {};

  if (name) {
    payload.name = name;
  }
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
  if (pfp_url) {
    payload.pfp_url = pfp_url;
  }
  if (gender) {
    payload.gender = gender;
  }

  return payload;
};

const buildCachedProfileState = ({
  role,
  profile,
  unifiedData,
  coachProfileData,
  specializations,
  certifications,
  experiences,
  paymentMethod,
}) => ({
  role,
  profile: {
    ...profile,
    profilePicture: typeof profile.profilePicture === "string" ? profile.profilePicture : null,
  },
  unifiedData,
  coachProfileData,
  specializations,
  certifications,
  experiences,
  paymentMethod,
});

function ProfilePage({ role = "client" }) {
  const navigate = useNavigate();
  const location = useLocation();
  const isCoach = role === "coach";

  const accent = isCoach ? "#F59E0B" : "#3B82F6";
  const accentSoft = isCoach ? "rgba(245, 158, 11, 0.12)" : "rgba(59, 130, 246, 0.12)";
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saveMessage, setSaveMessage] = useState("");
  const [saveError, setSaveError] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [coachProfileData, setCoachProfileData] = useState(null);

  const [profile, setProfile] = useState({
    firstName: "",
    lastName: "",
    email: "",
    bio: "",
    age: "",
    gender: "",
    primaryGoal: "",
    profilePicture: null,
    pricingInterval: "",
    amount: "",
  });

  // Unified profile data from API
  const [unifiedData, setUnifiedData] = useState(null);

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

  const [paymentMethod, setPaymentMethod] = useState(null);

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

  const [newPaymentMethod, setNewPaymentMethod] = useState({
    type: "",
    ccnum: "",
    cv: "",
    exp_date: "",
  });
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [canSwitchToCoach, setCanSwitchToCoach] = useState(false);
  const [canSwitchToAdmin, setCanSwitchToAdmin] = useState(false);
  const [hasCoachStatus, setHasCoachStatus] = useState(false);
  const [progressPicPage, setProgressPicPage] = useState(0);
  const PICS_PER_PAGE = 6;
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentLoading, setPaymentLoading] = useState(false);
  const profileInputsDisabled = loadingProfile || savingProfile;

  const fullName = useMemo(
    () => `${profile.firstName} ${profile.lastName}`.trim(),
    [profile.firstName, profile.lastName]
  );

  const profilePicturePreviewUrl = useMemo(() => {
    if (typeof profile.profilePicture === "string") {
      return profile.profilePicture || "";
    }
    if (profile.profilePicture instanceof File) {
      return URL.createObjectURL(profile.profilePicture);
    }
    return "";
  }, [profile.profilePicture]);

  const initials = useMemo(() => {
    const f = profile.firstName?.[0] || "";
    const l = profile.lastName?.[0] || "";
    return `${f}${l}`.toUpperCase() || "?";
  }, [profile.firstName, profile.lastName]);


  useEffect(() => {
    if (!location.state?.coachRequestSubmitted) return;
    setSaveMessage(location.state.successMessage || "Application successfully sent.");
    navigate(location.pathname, { replace: true, state: {} });
  }, [location.pathname, location.state, navigate]);

  useEffect(() => {
    if (!(profile.profilePicture instanceof File) || !profilePicturePreviewUrl) {
      return undefined;
    }

    return () => {
      URL.revokeObjectURL(profilePicturePreviewUrl);
    };
  }, [profile.profilePicture, profilePicturePreviewUrl]);

  useEffect(() => {
    const token = localStorage.getItem("jwt");
    if (!token) {
      setLoadError("You are not logged in.");
      setLoadingProfile(false);
      navigate("/login");
      return;
    }

    const loadProfile = async () => {
      const cached = readProfileCache(role);
      if (cached?.profile) {
        setProfile((prev) => ({ ...prev, ...cached.profile }));
        setUnifiedData(cached.unifiedData || null);
        setCoachProfileData(cached.coachProfileData || null);
        setSpecializations(Array.isArray(cached.specializations) ? cached.specializations : []);
        setCertifications(Array.isArray(cached.certifications) ? cached.certifications : []);
        setExperiences(Array.isArray(cached.experiences) ? cached.experiences : []);
        setPaymentMethod(cached.paymentMethod || null);
      }

      try {
        // Single unified API call for all profile data
        const [meData, unified, roleState] = await Promise.all([
          fetchMe(),
          fetchUnifiedProfile().catch(() => null),
          resolveRoleState().catch(() => null),
        ]);
        const data = meData;
        const coachAccess = await getCoachAccessState(data);
        setCanSwitchToAdmin(Boolean(roleState?.hasAdminRole));
        setCanSwitchToCoach(coachAccess.canAccessCoach);
        setHasCoachStatus(coachAccess.hasCoachRecord);
        if (isCoach && !coachAccess.canAccessCoach) {
          navigate("/profile");
          return;
        }

        setUnifiedData(unified);
        let nextUnifiedData = unified;
        let nextCoachProfileData = null;
        let nextSpecializations = [];
        let nextCertifications = [];
        let nextExperiences = [];
        let nextPaymentMethod = null;

        // Populate profile from unified API data (account-level fields)
        const acct = unified?.account || data;
        const resolvedName = acct.name || "";
        const [firstName = "", ...rest] = resolvedName.trim().split(/\s+/);
        const lastName = rest.join(" ");

        const clientDetails = unified?.client_details;
        const coachDetails = unified?.coach_details;

        const nextProfile = {
          ...profile,
          firstName,
          lastName,
          email: acct.email || "",
          age: acct.age != null ? String(acct.age) : "",
          gender: normalizeGenderToSignupValue(acct.gender || ""),
          bio: acct.bio || "",
          primaryGoal: resolveClientPrimaryGoal(clientDetails),
          profilePicture: acct.pfp_url || null,
        };

        setProfile((prev) => ({ ...prev, ...nextProfile }));

        // Client-specific: payment info from API
        if (!isCoach && clientDetails) {
          const pi = clientDetails.payment_information;
          if (pi) {
            nextPaymentMethod = {
              id: pi.id || Date.now(),
              type: "credit",
              lastFour: pi.last_four || String(pi.ccnum || "").slice(-4),
              expiryMonth: String(pi.exp_date || "").slice(5, 7),
              expiryYear: String(pi.exp_date || "").slice(0, 4),
              ccnum: pi.ccnum || "",
              cv: pi.cv || "",
              exp_date: pi.exp_date || "",
            };
            setPaymentMethod(nextPaymentMethod);
          }
        }

        // Coach-specific: populate from API data
        if (isCoach && coachDetails) {
          nextCoachProfileData = {
            coach_account: {
              id: coachDetails.id,
              verified: coachDetails.verified,
              specialties: (coachDetails.specialties || []).join(","),
            },
          };
          setCoachProfileData(nextCoachProfileData);

          nextSpecializations = Array.isArray(coachDetails.specialties)
            ? coachDetails.specialties.filter(Boolean)
            : [];
          setSpecializations(nextSpecializations);

          nextCertifications = Array.isArray(coachDetails.certifications)
            ? coachDetails.certifications.map((c, i) => ({
                  id: c.id || `cert-${i}`,
                  title: c.certification_name || "",
                  issuer: c.certification_organization || "",
                  year: c.certification_date || "",
                  description: c.certification_score || "",
                }))
            : [];
          setCertifications(nextCertifications);

          nextExperiences = Array.isArray(coachDetails.experiences)
            ? coachDetails.experiences.map((e, i) => ({
                  id: e.id || `exp-${i}`,
                  title: e.experience_title || "",
                  issuer: e.experience_name || "",
                  year: e.experience_start || "",
                  description: e.experience_description || "",
                }))
            : [];
          setExperiences(nextExperiences);

          const pricing = coachDetails.pricing;
          nextProfile.pricingInterval = pricing?.payment_interval || "";
          nextProfile.amount = pricing?.price_cents != null ? String(pricing.price_cents / 100) : "";
          setProfile((prev) => ({
            ...prev,
            pricingInterval: pricing?.payment_interval || "",
            amount: pricing?.price_cents != null ? String(pricing.price_cents / 100) : "",
          }));
        } else if (isCoach) {
          // Fallback to legacy fetchCoachProfile
          try {
            const coachProfile = await fetchCoachProfile();
            nextCoachProfileData = coachProfile;
            setCoachProfileData(coachProfile);
            nextSpecializations = String(coachProfile?.coach_account?.specialties || "")
                .split(",")
                .map((item) => item.trim())
                .filter(Boolean);
            setSpecializations(nextSpecializations);
          } catch {
            setCoachProfileData(null);
            nextCoachProfileData = null;
          }
        }

        writeProfileCache(
          role,
          buildCachedProfileState({
            role,
            profile: nextProfile,
            unifiedData: nextUnifiedData,
            coachProfileData: nextCoachProfileData,
            specializations: nextSpecializations,
            certifications: nextCertifications,
            experiences: nextExperiences,
            paymentMethod: nextPaymentMethod,
          })
        );
      } catch (err) {
        setLoadError(err.message || "Failed to load profile.");
      } finally {
        setLoadingProfile(false);
      }
    };

    loadProfile();
  }, [isCoach, navigate, role]);

  const handleProfileChange = (field, value) => {
    if (profileInputsDisabled) return;
    setProfile((prev) => ({ ...prev, [field]: value }));
  };

  const persistCurrentProfileCache = (profileOverride = profile) => {
    writeProfileCache(
      role,
      buildCachedProfileState({
        role,
        profile: profileOverride,
        unifiedData,
        coachProfileData,
        specializations,
        certifications,
        experiences,
        paymentMethod,
      })
    );
  };

  const handleSaveClientProfile = async () => {
    if (loadingProfile) return;
    setSaveMessage("");
    setSaveError("");
    setSavingProfile(true);

    try {
      let profilePictureUrl =
        typeof profile.profilePicture === "string" ? profile.profilePicture : null;

      if (profile.profilePicture instanceof File) {
        const upload = await uploadProfilePicture(profile.profilePicture);
        profilePictureUrl = extractUploadedAssetUrl(upload) || profilePictureUrl;
        setProfile((prev) => ({
          ...prev,
          profilePicture: profilePictureUrl || prev.profilePicture,
        }));
      }

      const latestPayment = paymentMethod
        ? {
            ccnum: paymentMethod.ccnum || "",
            cv: paymentMethod.cv || "",
            exp_date:
              paymentMethod.exp_date ||
              `${paymentMethod.expiryYear}-${paymentMethod.expiryMonth}-01`,
          }
        : null;

      const payload = buildClientInformationPayload({
        primaryGoal: profile.primaryGoal,
        paymentMethod: latestPayment,
      });

      if (Object.keys(payload).length > 0) {
        await updateClientInformation(payload);
      }

      const accountPayload = buildAccountUpdatePayload({
        name: `${profile.firstName} ${profile.lastName}`.trim(),
        age: profile.age,
        email: profile.email,
        bio: profile.bio,
        pfp_url: profilePictureUrl,
        gender: profile.gender,
      });
      if (Object.keys(accountPayload).length > 0) {
        await updateAccount(accountPayload);
      }

      persistCurrentProfileCache({ ...profile, profilePicture: profilePictureUrl });
      setSaveMessage("Client profile changes saved.");
    } catch (error) {
      setSaveError(error.message || "Unable to save your client profile.");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSaveCoachProfile = async () => {
    if (loadingProfile) return;
    setSaveMessage("");
    setSaveError("");
    setSavingProfile(true);

    try {
      let profilePictureUrl =
        typeof profile.profilePicture === "string" ? profile.profilePicture : null;

      if (profile.profilePicture instanceof File) {
        const upload = await uploadProfilePicture(profile.profilePicture);
        profilePictureUrl = extractUploadedAssetUrl(upload) || profilePictureUrl;
        setProfile((prev) => ({
          ...prev,
          profilePicture: profilePictureUrl || prev.profilePicture,
        }));
      }

      const payload = buildCoachInformationPayload({
        availability: null,
        certifications,
        experiences,
        specializations,
      });

      // Add pricing plan to payload if set
      if (profile.pricingInterval && profile.amount) {
        payload.pricing_plan = {
          payment_interval: profile.pricingInterval,
          price_cents: Math.round(Number(profile.amount) * 100),
        };
      }

      if (Object.keys(payload).length > 0) {
        await updateCoachInformation(payload);
      }

      const accountPayload = buildAccountUpdatePayload({
        name: `${profile.firstName} ${profile.lastName}`.trim(),
        age: profile.age,
        email: profile.email,
        bio: profile.bio,
        pfp_url: profilePictureUrl,
        gender: profile.gender,
      });
      if (Object.keys(accountPayload).length > 0) {
        await updateAccount(accountPayload);
      }

      persistCurrentProfileCache({ ...profile, profilePicture: profilePictureUrl });
      setSaveMessage("Coach profile changes saved.");
    } catch (error) {
      setSaveError(error.message || "Unable to save your coach profile.");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleDeleteAccountRequest = async () => {
    if (window.confirm("Are you sure you want to request deletion of your account? This action cannot be undone.")) {
      try {
        await deleteAccount();
        alert("Account deletion requested successfully.");
        clearAuth();
        navigate("/login");
      } catch {
        alert("Failed to request account deletion. Please try again.");
      }
    }
  };

  const handleDeactivateAccount = async () => {
    if (window.confirm("Are you sure you want to deactivate your account? You can reactivate it later.")) {
      try {
        await deactivateAccount();
        alert("Account deactivated successfully. You will see the reactivation screen now.");
        window.location.href = "/deactivated";
      } catch {
        alert("Failed to deactivate account. Please try again.");
      }
    }
  };

  const handleDeactivateCoachAccount = async () => {
    if (window.confirm("Are you sure you want to deactivate your coach account? This action cannot be undone.")) {
      try {
        await deactivateCoachAccount();
        alert("Coach account deactivated successfully.");
        clearAuth();
        navigate("/login");
      } catch {
        alert("Failed to deactivate coach account. Please try again.");
      }
    }
  };

  const handleDeleteCoachAccount = async () => {
    if (window.confirm("Are you sure you want to request deletion of your coach account? This action cannot be undone.")) {
      try {
        await deleteCoachAccount();
        alert("Coach account deletion requested successfully.");
        localStorage.removeItem("jwt");
        navigate("/login");
      } catch {
        alert("Failed to request coach account deletion. Please try again.");
      }
    }
  };

  const handleLogout = () => {
    clearAuth();
    window.location.href = "/login";
  };

  const handlePayInvoice = async () => {
    if (!selectedInvoiceForPayment || !paymentAmount) return;

    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      setSaveError("Payment amount must be greater than 0");
      return;
    }

    if (amount > selectedInvoiceForPayment.outstanding_balance) {
      setSaveError(`Payment amount exceeds outstanding balance of $${selectedInvoiceForPayment.outstanding_balance.toFixed(2)}`);
      return;
    }

    setPaymentLoading(true);
    setSaveError("");

    try {
      await payInvoice(selectedInvoiceForPayment.invoice_id, amount);

      setSaveMessage("Payment processed successfully!");
      setShowPaymentDialog(false);
      setSelectedInvoiceForPayment(null);
      setPaymentAmount("");

      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      setSaveError(error.message || "Failed to process payment");
    } finally {
      setPaymentLoading(false);
    }
  };

  const toggleSpecialization = (item) => {
    if (profileInputsDisabled) return;
    setSpecializations((prev) =>
      prev.includes(item) ? prev.filter((x) => x !== item) : [...prev, item]
    );
  };

  const addCertification = () => {
    if (profileInputsDisabled) return;
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
    if (profileInputsDisabled) return;
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

  const addPaymentMethod = () => {
    if (profileInputsDisabled) return;
    if (!newPaymentMethod.type || !newPaymentMethod.ccnum || !newPaymentMethod.cv || !newPaymentMethod.exp_date) return;
    setPaymentMethod({
      id: Date.now(),
      ...newPaymentMethod,
      lastFour: String(newPaymentMethod.ccnum).slice(-4),
      expiryMonth: String(newPaymentMethod.exp_date).slice(5, 7),
      expiryYear: String(newPaymentMethod.exp_date).slice(0, 4),
    });
    setNewPaymentMethod({ type: "", ccnum: "", cv: "", exp_date: "" });
    setShowPaymentForm(false);
  };

  const deleteItem = (setter, id) => {
    if (profileInputsDisabled) return;
    setter((prev) => prev.filter((item) => item.id !== id));
  };

  const toggleEditItem = (setter, id) => {
    if (profileInputsDisabled) return;
    setter((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, editing: !item.editing } : { ...item, editing: false }
      )
    );
  };

  const updateItemField = (setter, id, field, value) => {
    if (profileInputsDisabled) return;
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
        userAvatar={profilePicturePreviewUrl}
        switchOptions={[
          ...(!isCoach && canSwitchToCoach ? [{ label: "Coach", to: "/coach" }] : []),
          ...(isCoach ? [{ label: "Client", to: "/profile" }] : []),
          ...(canSwitchToAdmin ? [{ label: "Admin", to: "/admin" }] : []),
        ]}
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

        {!loadingProfile && saveError && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {saveError}
          </div>
        )}

        {!loadingProfile && saveMessage && (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
            {saveMessage}
          </div>
        )}

        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{isCoach ? "Edit Profile" : "Profile Settings"}</h1>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-5">
          <div className="space-y-4">
            <SidebarCard>
              <div className="flex flex-col items-center text-center">
                <div
                  className="relative flex h-24 w-24 items-center justify-center rounded-full text-3xl font-bold text-white shadow-lg"
                  style={{ backgroundColor: accent }}
                >
                  {profilePicturePreviewUrl ? (
                    <img
                      src={profilePicturePreviewUrl}
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
                  {isCoach
                    ? `Coach · ${coachProfileData?.coach_account?.verified ? "Verified" : "Pending"}`
                    : "Client"}
                </p>

                <label className={`mt-5 w-full rounded-xl border border-white/10 bg-[rgba(255,255,255,0.03)] px-4 py-3 text-sm font-medium text-slate-200 hover:bg-[rgba(255,255,255,0.05)] ${profileInputsDisabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}>
                    Upload / Change Profile Picture
                    <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    disabled={profileInputsDisabled}
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
                  <StatBox label="Verified" value={unifiedData?.coach_details?.verified ? "Yes" : "No"} />
                  <StatBox label="Clients" value={unifiedData?.coach_details?.client_count ?? "--"} />
                  <StatBox label="Earnings" value={unifiedData?.coach_details?.total_earnings != null ? `$${unifiedData.coach_details.total_earnings.toFixed(2)}` : "--"} />
                  <StatBox label="Rating" value={unifiedData?.coach_details?.avg_rating ? `${unifiedData.coach_details.avg_rating} (${unifiedData.coach_details.review_count})` : "--"} />
                </div>
                {unifiedData?.coach_details?.joined_date && (
                  <p className="mt-3 text-center text-[10px] uppercase tracking-widest text-slate-500">
                    Joined {new Date(unifiedData.coach_details.joined_date).toLocaleDateString()}
                  </p>
                )}
              </SidebarCard>
            )}

            {isCoach && (
              <SidebarCard title="Account Actions">
                <div className="space-y-3">
                  <button
                    onClick={handleDeleteCoachAccount}
                    className="w-full rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-300"
                  >
                    Delete Coach Account
                  </button>

                  <button
                    onClick={handleDeactivateCoachAccount}
                    className="w-full rounded-xl border border-orange-500/30 bg-orange-500/10 px-4 py-3 text-sm font-semibold text-orange-300"
                  >
                    Deactivate Coach Account
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
            )}

            {!isCoach && (
              <>
                <SidebarCard title="Account Actions">
                  <div className="space-y-3">
                    {!hasCoachStatus && (
                      <button
                        onClick={() => navigate("/coach-request")}
                        className="w-full rounded-xl px-4 py-3 text-sm font-semibold text-white"
                        style={{ backgroundColor: "#F59E0B" }}
                      >
                        Become Coach
                      </button>
                    )}

                    <button
                      onClick={handleDeactivateAccount}
                      className="w-full rounded-xl border border-orange-500/30 bg-orange-500/10 px-4 py-3 text-sm font-semibold text-orange-300"
                    >
                      Deactivate Account
                    </button>

                    <button
                      onClick={handleDeleteAccountRequest}
                      className="w-full rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-300"
                    >
                      Delete Account
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
              </>
            )}
          </div>

          <div className="xl:col-span-3 space-y-4">
            <Panel title={isCoach ? "Personal Information" : "Edit Profile Information"} accent={accent}>
              {isCoach ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input label="Full Name" value={fullName} onChange={(v) => {
                      const parts = v.split(" ");
                      handleProfileChange("firstName", parts[0] || "");
                      handleProfileChange("lastName", parts.slice(1).join(" "));
                    }} disabled={profileInputsDisabled} />
                    <Input label="Email" value={profile.email} onChange={(v) => handleProfileChange("email", v)} disabled={profileInputsDisabled} />
                    <Input label="Age" value={profile.age} onChange={(v) => handleProfileChange("age", v)} disabled={profileInputsDisabled} />
                    <div>
                      <label className="mb-2 block text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                        Gender
                      </label>
                      <select
                        value={normalizeGenderToSignupValue(profile.gender)}
                        onChange={(e) => handleProfileChange("gender", e.target.value)}
                        disabled={profileInputsDisabled}
                        className="w-full rounded-lg border border-white/6 bg-[#0F172A] px-4 py-3 text-sm text-white outline-none disabled:cursor-not-allowed disabled:opacity-60"
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
                      disabled={profileInputsDisabled}
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
                    }} disabled={profileInputsDisabled} />
                    <Input label="Email" value={profile.email} onChange={(v) => handleProfileChange("email", v)} disabled={profileInputsDisabled} />
                    <Input label="Age" value={profile.age} onChange={(v) => handleProfileChange("age", v)} disabled={profileInputsDisabled} />
                    <div>
                      <label className="mb-2 block text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                        Gender
                      </label>
                      <select
                        value={normalizeGenderToSignupValue(profile.gender)}
                        onChange={(e) => handleProfileChange("gender", e.target.value)}
                        disabled={profileInputsDisabled}
                        className="w-full rounded-lg border border-white/6 bg-[#0F172A] px-4 py-3 text-sm text-white outline-none disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <option value="">Select gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Non-Binary">Non-binary</option>
                        <option value="Prefer_Not_to_Say">Prefer not to say</option>
                      </select>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="mb-2 block text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                        Primary Goal
                      </label>
                      <select
                        value={profile.primaryGoal}
                        onChange={(e) => handleProfileChange("primaryGoal", e.target.value)}
                        disabled={profileInputsDisabled}
                        className="w-full rounded-lg border border-white/6 bg-[#0F172A] px-4 py-3 text-sm text-white outline-none disabled:cursor-not-allowed disabled:opacity-60"
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
                      disabled={profileInputsDisabled}
                    />
                  </div>

                </>
              )}
            </Panel>

            {!isCoach && (
              <Panel title="Progress &amp; Telemetry" accent={accent}>
                <TelemetryCharts accent={accent} />

                {/* Progress Pictures */}
                {(() => {
                  const pics = unifiedData?.client_details?.progress_pictures || [];
                  if (pics.length === 0) return (
                    <div className="mt-5 pt-4 border-t border-white/5">
                      <p className="text-xs font-semibold text-white mb-2">Progress Pictures</p>
                      <p className="text-xs text-slate-500">No progress pictures yet. Upload one from the daily check-in to get started.</p>
                    </div>
                  );
                  const totalPages = Math.ceil(pics.length / PICS_PER_PAGE);
                  const pagePics = pics.slice(progressPicPage * PICS_PER_PAGE, (progressPicPage + 1) * PICS_PER_PAGE);
                  return (
                    <div className="mt-5 pt-4 border-t border-white/5">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-xs font-semibold text-white">Progress Pictures ({pics.length})</p>
                        {totalPages > 1 && (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setProgressPicPage((p) => Math.max(0, p - 1))}
                              disabled={progressPicPage === 0}
                              className="rounded-lg border border-white/10 px-2 py-1 text-[10px] text-slate-400 disabled:opacity-30"
                            >
                              Prev
                            </button>
                            <span className="text-[10px] text-slate-500">{progressPicPage + 1}/{totalPages}</span>
                            <button
                              onClick={() => setProgressPicPage((p) => Math.min(totalPages - 1, p + 1))}
                              disabled={progressPicPage >= totalPages - 1}
                              className="rounded-lg border border-white/10 px-2 py-1 text-[10px] text-slate-400 disabled:opacity-30"
                            >
                              Next
                            </button>
                          </div>
                        )}
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        {pagePics.map((pic) => (
                          <div key={pic.id} className="rounded-xl border border-white/6 bg-[#101827] overflow-hidden">
                            <img src={pic.url} alt="Progress" className="w-full h-32 object-cover" />
                            <p className="px-2 py-1.5 text-[10px] text-slate-500 text-center">
                              {pic.date ? new Date(String(pic.date).slice(0, 10) + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : ""}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </Panel>
            )}

            {!isCoach && (
              <Panel title="Payment Method" accent={accent}>
                <div className="space-y-3">
                  {paymentMethod && (
                    <div
                      key={paymentMethod.id}
                      className="rounded-xl border border-white/6 bg-[#101827] px-4 py-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                            Card
                          </div>
                          <div>
                            <h3 className="text-sm font-semibold text-white">
                              {paymentMethod.type.charAt(0).toUpperCase() + paymentMethod.type.slice(1)} Card
                            </h3>
                            <p className="text-xs text-slate-400">
                              **** **** **** {paymentMethod.lastFour}
                            </p>
                            <p className="text-xs text-slate-500">
                              Expires {paymentMethod.expiryMonth}/{paymentMethod.expiryYear}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            if (profileInputsDisabled) return;
                            setPaymentMethod(null);
                            setShowPaymentForm(false);
                          }}
                          disabled={profileInputsDisabled}
                          className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-300"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  )}

                  {!paymentMethod && !showPaymentForm ? (
                    <button
                      onClick={() => !profileInputsDisabled && setShowPaymentForm(true)}
                      disabled={profileInputsDisabled}
                      className="w-full rounded-xl border border-dashed px-4 py-3 text-sm font-semibold transition"
                      style={{ borderColor: `${accent}55`, color: accent, backgroundColor: `${accent}08` }}
                    >
                      + Add Payment Method
                    </button>
                  ) : !paymentMethod && showPaymentForm ? (
                    <div className="rounded-xl border border-white/6 bg-[#101827] p-4 space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="mb-2 block text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                            Card Type
                          </label>
                          <select
                            value={newPaymentMethod.type}
                            onChange={(e) => !profileInputsDisabled && setNewPaymentMethod((prev) => ({ ...prev, type: e.target.value }))}
                            disabled={profileInputsDisabled}
                            className="w-full rounded-lg border border-white/6 bg-[#0F172A] px-4 py-3 text-sm text-white outline-none disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <option value="">Select card type</option>
                            <option value="credit">Credit Card</option>
                            <option value="debit">Debit Card</option>
                          </select>
                        </div>
                        <Input
                          label="Card Number"
                          value={newPaymentMethod.ccnum}
                          onChange={(v) => !profileInputsDisabled && setNewPaymentMethod((prev) => ({ ...prev, ccnum: v }))}
                          placeholder="4111111111111111"
                          disabled={profileInputsDisabled}
                        />
                        <Input
                          label="CVV"
                          value={newPaymentMethod.cv}
                          onChange={(v) => !profileInputsDisabled && setNewPaymentMethod((prev) => ({ ...prev, cv: v }))}
                          placeholder="123"
                          disabled={profileInputsDisabled}
                        />
                        <Input
                          label="Expiry Date"
                          value={newPaymentMethod.exp_date}
                          onChange={(v) => !profileInputsDisabled && setNewPaymentMethod((prev) => ({ ...prev, exp_date: v }))}
                          placeholder="2027-12-01"
                          disabled={profileInputsDisabled}
                        />
                      </div>

                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => !profileInputsDisabled && setShowPaymentForm(false)}
                          disabled={profileInputsDisabled}
                          className="rounded-lg border border-white/10 bg-[rgba(255,255,255,0.03)] px-3 py-2 text-xs font-medium text-slate-300"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={addPaymentMethod}
                          disabled={profileInputsDisabled}
                          className="rounded-lg px-3 py-2 text-xs font-semibold text-white"
                          style={{ backgroundColor: accent }}
                        >
                          Add Payment Method
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              </Panel>
            )}

            {!isCoach && (
              <Panel title="Subscription" accent={accent}>
                {(() => {
                  const subs = unifiedData?.client_details?.subscriptions || [];
                  const invoices = unifiedData?.client_details?.invoices || [];
                  const cycles = unifiedData?.client_details?.billing_cycles || [];
                  const activeSub = subs.find((s) => s.status === "active");
                  const activeCoachId =
                    activeSub?.coach_id ?? activeSub?.coachId ?? activeSub?.coach?.id ?? activeSub?.cid;

                  return (
                    <div className="space-y-4">
                      {/* Current subscription */}

                      {/* Next billing cycle */}
                      {(() => {
                        if (cycles.length === 0) return null;
                        const outstandingInvoiceForCycle = invoices.find(
                          inv => inv.coach_name === cycles[0].coach_name && inv.outstanding_balance > 0
                        );
                        const amountDue = outstandingInvoiceForCycle?.outstanding_balance ?? (cycles[0].price_cents / 100);
                        return (
                          <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 px-4 py-3">
                            <p className="text-xs font-semibold text-blue-300">
                              ${amountDue.toFixed(2)} is due by {new Date(cycles[0].end_date).toLocaleDateString()} by 12am
                            </p>
                            <p className="text-[10px] text-slate-500 mt-0.5">
                              {cycles[0].coach_name} &middot; {cycles[0].payment_interval}
                            </p>
                          </div>
                        );
                      })()}
                      
                      {activeSub ? (
                        <div className="rounded-xl border border-white/6 bg-[#101827] px-4 py-3">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex-1">
                              <p className="text-sm font-semibold text-white">{activeSub.coach_name}</p>
                              <p className="text-xs text-slate-400 mt-0.5">
                                {activeSub.payment_interval} &middot; ${(activeSub.price_cents / 100).toFixed(2)}
                              </p>
                              <p className="text-[10px] text-slate-500 mt-0.5">Since {activeSub.start_date}</p>
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                              <span className="rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-green-500/15 text-green-400">
                                Active
                              </span>
                              {(() => {
                                const outstandingInvoice = invoices.find(
                                  inv => inv.coach_name === activeSub.coach_name && inv.outstanding_balance > 0
                                );
                                return outstandingInvoice ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedInvoiceForPayment(outstandingInvoice);
                                      setPaymentAmount("");
                                      setShowPaymentDialog(true);
                                    }}
                                    className="rounded-lg bg-blue-600 hover:bg-blue-700 px-3 py-2 text-xs font-medium text-white transition"
                                  >
                                    Pay
                                  </button>
                                ) : null;
                              })()}
                              {activeCoachId && (
                                <button
                                  type="button"
                                  onClick={() => navigate(`/coaches/${activeCoachId}`)}
                                  className="rounded-lg border border-white/10 bg-[rgba(255,255,255,0.03)] px-3 py-2 text-xs font-medium text-slate-300 transition hover:bg-[rgba(255,255,255,0.06)] hover:text-white"
                                >
                                  View Coach
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500">No active subscription.</p>
                      )}

                      {/* Invoices */}
                      {invoices.length > 0 && (
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-2">Invoices</p>
                          <div className="space-y-2 max-h-48 overflow-y-auto">
                            {invoices.map((inv) => (
                              <div key={inv.invoice_id} className="flex items-center justify-between rounded-lg bg-[#101827] px-3 py-2">
                                <div>
                                  <p className="text-xs text-white">{inv.coach_name}</p>
                                  <p className="text-[10px] text-slate-500">{inv.entry_date} - {inv.end_date}</p>
                                </div>
                                <p className="text-xs font-semibold text-white">${inv.amount.toFixed(2)}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {subs.length === 0 && invoices.length === 0 && cycles.length === 0 && (
                        <p className="text-xs text-slate-500">No subscription or billing history yet. Hire a coach to get started.</p>
                      )}
                    </div>
                  );
                })()}
              </Panel>
            )}

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
                          disabled={profileInputsDisabled}
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
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-400">Payment Interval</label>
                      <select
                        value={profile.pricingInterval}
                        onChange={(event) => handleProfileChange("pricingInterval", event.target.value)}
                        disabled={profileInputsDisabled}
                        className="h-12 w-full rounded-xl border border-white/8 bg-[#101827] px-4 text-sm text-white outline-none transition focus:border-orange-400/50 focus:ring-2 focus:ring-orange-400/10 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <option value="">Select interval</option>
                        <option value="monthly">Monthly</option>
                        <option value="yearly">Yearly</option>
                      </select>
                    </div>
                    <Input
                      label="Amount"
                      value={profile.amount}
                      onChange={(v) => handleProfileChange("amount", v)}
                      placeholder="160.00"
                      disabled={profileInputsDisabled}
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
                  onToggleEdit={(id) => toggleEditItem(setCertifications, id)}
                  onUpdateField={(id, field, value) => updateItemField(setCertifications, id, field, value)}
                  accent={accent}
                  addLabel="+ Add Certification"
                  disabled={profileInputsDisabled}
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
                  onToggleEdit={(id) => toggleEditItem(setExperiences, id)}
                  onUpdateField={(id, field, value) => updateItemField(setExperiences, id, field, value)}
                  accent={accent}
                  addLabel="+ Add Experience"
                  disabled={profileInputsDisabled}
                />
              </>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button className="rounded-xl border border-white/10 bg-[rgba(255,255,255,0.03)] px-5 py-3 text-sm font-medium text-slate-300">
                Discard
              </button>
              <button
                onClick={isCoach ? handleSaveCoachProfile : handleSaveClientProfile}
                disabled={profileInputsDisabled}
                className="rounded-xl px-5 py-3 text-sm font-semibold text-white shadow-lg"
                style={{ backgroundColor: accent }}
              >
                {loadingProfile ? "Refreshing..." : savingProfile ? "Saving..." : "Save Changes"}
              </button>
            </div>

          </div>
        </div>
      </div>

      {showPaymentDialog && selectedInvoiceForPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="rounded-xl border border-white/10 bg-[#0B1120] p-6 shadow-2xl max-w-sm w-full mx-4">
            <h3 className="text-lg font-bold text-white mb-4">Make a Payment</h3>

            <div className="space-y-4">
              <div className="rounded-lg bg-[#101827] p-3">
                <p className="text-xs text-slate-500 uppercase tracking-widest">Outstanding Balance</p>
                <p className="text-2xl font-bold text-white mt-1">
                  ${selectedInvoiceForPayment.outstanding_balance.toFixed(2)}
                </p>
              </div>

              <div>
                <label className="mb-2 block text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                  Payment Amount
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max={selectedInvoiceForPayment.outstanding_balance}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  disabled={paymentLoading}
                  placeholder={`Max: $${selectedInvoiceForPayment.outstanding_balance.toFixed(2)}`}
                  className="w-full rounded-lg border border-white/6 bg-[#0F172A] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 disabled:cursor-not-allowed disabled:opacity-60"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => {
                    setShowPaymentDialog(false);
                    setSelectedInvoiceForPayment(null);
                    setPaymentAmount("");
                  }}
                  disabled={paymentLoading}
                  className="rounded-lg border border-white/10 bg-[rgba(255,255,255,0.03)] px-4 py-2 text-xs font-medium text-slate-300 disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePayInvoice}
                  disabled={paymentLoading || !paymentAmount}
                  className="rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 px-4 py-2 text-xs font-semibold text-white"
                >
                  {paymentLoading ? "Processing..." : "Pay Now"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
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

function Input({ label, value, onChange, placeholder = "", disabled = false }) {
  return (
    <div>
      <label className="mb-2 block text-[10px] font-semibold uppercase tracking-widest text-slate-500">
        {label}
      </label>
      <input
        value={value}
        onChange={(e) => !disabled && onChange(e.target.value)}
        disabled={disabled}
        placeholder={placeholder}
        className="w-full rounded-lg border border-white/6 bg-[#0F172A] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 disabled:cursor-not-allowed disabled:opacity-60"
      />
    </div>
  );
}

function TextArea({ label, value, onChange, rows = 4, placeholder = "", disabled = false }) {
  return (
    <div>
      <label className="mb-2 block text-[10px] font-semibold uppercase tracking-widest text-slate-500">
        {label}
      </label>
      <textarea
        value={value}
        onChange={(e) => !disabled && onChange(e.target.value)}
        disabled={disabled}
        rows={rows}
        placeholder={placeholder}
        className="w-full rounded-lg border border-white/6 bg-[#0F172A] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 disabled:cursor-not-allowed disabled:opacity-60"
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
  disabled = false,
}) {
  return (
    <Panel title={title} accent={accent}>
      <div className="space-y-3">
        {items.map((item) => (
          <div
            key={item.id}
            className="rounded-xl border border-white/6 bg-[#101827] px-4 py-3"
          >
            {item.editing ? (
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Input
                    label="Title"
                    value={item.title}
                    onChange={(v) => onUpdateField(item.id, "title", v)}
                    placeholder="Title"
                    disabled={disabled}
                  />
                  <Input
                    label="Issuer"
                    value={item.issuer}
                    onChange={(v) => onUpdateField(item.id, "issuer", v)}
                    placeholder="Issuer"
                    disabled={disabled}
                  />
                  <Input
                    label="Year"
                    value={item.year}
                    onChange={(v) => onUpdateField(item.id, "year", v)}
                    placeholder="Year"
                    disabled={disabled}
                  />
                </div>
                <TextArea
                  label="Description"
                  value={item.description}
                  onChange={(v) => onUpdateField(item.id, "description", v)}
                  rows={4}
                  placeholder="Description"
                  disabled={disabled}
                />
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => onToggleEdit(item.id)}
                    disabled={disabled}
                    className="rounded-lg border border-white/10 bg-[rgba(255,255,255,0.03)] px-3 py-2 text-xs font-medium text-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => onToggleEdit(item.id)}
                    disabled={disabled}
                    className="rounded-lg px-3 py-2 text-xs font-semibold text-white"
                    style={{ backgroundColor: accent }}
                  >
                    Save
                  </button>
                </div>
              </div>
            ) : (
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
                <div className="flex gap-2">
                  <button
                    onClick={() => onToggleEdit(item.id)}
                    disabled={disabled}
                    className="rounded-lg border border-white/10 bg-[rgba(255,255,255,0.03)] px-3 py-2 text-xs font-medium text-slate-300"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => onDelete(item.id)}
                    disabled={disabled}
                    className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-300"
                  >
                    Remove
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}

        {!showForm ? (
          <button
            onClick={() => setShowForm(true)}
            disabled={disabled}
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
                onChange={(v) => !disabled && setNewItem((prev) => ({ ...prev, title: v }))}
                placeholder="Title"
                disabled={disabled}
              />
              <Input
                label="Issuer"
                value={newItem.issuer}
                onChange={(v) => !disabled && setNewItem((prev) => ({ ...prev, issuer: v }))}
                placeholder="Issuer"
                disabled={disabled}
              />
              <Input
                label="Year"
                value={newItem.year}
                onChange={(v) => !disabled && setNewItem((prev) => ({ ...prev, year: v }))}
                placeholder="Year"
                disabled={disabled}
              />
            </div>
            <TextArea
              label="Description"
              value={newItem.description}
              onChange={(v) => !disabled && setNewItem((prev) => ({ ...prev, description: v }))}
              rows={4}
              placeholder="Description"
              disabled={disabled}
            />

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowForm(false)}
                disabled={disabled}
                className="rounded-lg border border-white/10 bg-[rgba(255,255,255,0.03)] px-3 py-2 text-xs font-medium text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={onAdd}
                disabled={disabled}
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


