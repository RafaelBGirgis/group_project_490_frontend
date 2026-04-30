import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Navbar } from "../components/navbar";
import {
  buildClientInformationPayload,
  deactivateAccount,
  deleteAccount,
  extractUploadedAssetUrl,
  fetchClientProfile,
  fetchMe,
  updateAccount,
  updateClientInformation,
  uploadProfilePicture,
} from "../api/client";
import TelemetryCharts from "../components/overlays/telemetry_charts";
import { loadProfileDraft, saveOnboardingDraft } from "../utils/profileDrafts";
import { readCoachRequestResolution, clearCoachRequestResolution } from "../utils/coachRequests";
import {
  buildCoachInformationPayload,
  deactivateCoachAccount,
  deleteCoachAccount,
  fetchCoachProfile,
  updateCoachInformation,
} from "../api/coach";
import { getCoachAccessState } from "../utils/roleAccess";
import { resolveRoleState } from "../utils/sessionAuth";

const PRIMARY_GOALS = [
  "Weight Loss",
  "Maintenance",
  "Muscle Gain",
];

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

const buildAccountUpdatePayload = ({ age, email, bio, pfp_url, gender }) => {
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
  if (pfp_url) {
    payload.pfp_url = pfp_url;
  }
  if (gender) {
    payload.gender = gender;
  }

  return payload;
};

const normalizeCoachProfileSeed = (requestData) => {
  if (!requestData || typeof requestData !== "object") {
    return null;
  }

  const certifications = Array.isArray(requestData.certifications)
    ? requestData.certifications.map((item, index) => ({
        id: item?.id || `cert-${index}-${Date.now()}`,
        title: item?.title || item?.certification_name || "",
        issuer: item?.issuer || item?.certification_organization || "",
        year: item?.year || item?.certification_date || "",
        description: item?.description || item?.certification_score || "",
      }))
    : [];

  const experiences = Array.isArray(requestData.experiences)
    ? requestData.experiences.map((item, index) => ({
        id: item?.id || `exp-${index}-${Date.now()}`,
        title: item?.title || item?.experience_title || item?.experience_name || "",
        issuer: item?.issuer || item?.organization || item?.experience_name || "",
        year: item?.year || item?.experience_start || "",
        description: item?.description || item?.experience_description || "",
      }))
    : [];

  const specializations = Array.isArray(requestData.specializations)
    ? requestData.specializations.filter(Boolean)
    : [];

  if (!certifications.length && !experiences.length && !specializations.length) {
    return null;
  }

  return {
    certifications,
    experiences,
    specializations,
    pricingInterval: requestData?.paymentInterval || requestData?.payment_interval || "",
    amount:
      requestData?.amount != null
        ? String(requestData.amount)
        : requestData?.priceCents != null
          ? String(Number(requestData.priceCents) / 100)
          : requestData?.price_cents != null
            ? String(Number(requestData.price_cents) / 100)
            : "",
  };
};

function ProfilePage({ role = "client" }) {
  const navigate = useNavigate();
  const location = useLocation();
  const isCoach = role === "coach";

  const accent = isCoach ? "#F59E0B" : "#3B82F6";
  const accentSoft = isCoach ? "rgba(245, 158, 11, 0.12)" : "rgba(59, 130, 246, 0.12)";
  const accentBorder = isCoach ? "rgba(245, 158, 11, 0.30)" : "rgba(59, 130, 246, 0.30)";
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saveMessage, setSaveMessage] = useState("");
  const [saveError, setSaveError] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [coachProfileData, setCoachProfileData] = useState(null);
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
    weight: "",
    height: "",
    profilePicture: null,
    pricingInterval: "",
    amount: "",
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

  const [paymentMethods, setPaymentMethods] = useState([]);

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
    const loadProfile = async () => {
      try {
        const data = await fetchMe();
        const roleState = await resolveRoleState();
        const coachAccess = await getCoachAccessState(data);
        setCanSwitchToCoach(coachAccess.canAccessCoach);
        if (isCoach && !coachAccess.canAccessCoach) {
          navigate("/profile");
          return;
        }
        let clientProfile = null;
        let coachProfile = null;
        if (!isCoach && roleState.hasClientRole) {
          try {
            clientProfile = await fetchClientProfile();
          } catch {
            clientProfile = null;
          }
        }
        if (isCoach && roleState.hasCoachRole) {
          try {
            coachProfile = await fetchCoachProfile();
            setCoachProfileData(coachProfile);
          } catch {
            coachProfile = null;
            setCoachProfileData(null);
          }
        }
        const draftData = loadProfileDraft(data.email);
        const resolvedName = data.name || draftData?.name || "";
        const [firstName = "", ...rest] = resolvedName.trim().split(/\s+/);
        const lastName = rest.join(" ");
        const onboardingData = draftData;
        const requestKey = `coachRequest:${data.id || data.email || "current"}`;
        setCoachRequestStorageKey(requestKey);

        const savedRequestRaw =
          localStorage.getItem(requestKey) || localStorage.getItem("coachRequestDraft");
        if (savedRequestRaw) {
          try {
            const parsedRequest = JSON.parse(savedRequestRaw);
            const resolution = readCoachRequestResolution(parsedRequest?.coach_request_id);
            const isResolved =
              coachAccess.canAccessCoach || resolution?.status === "approved" || resolution?.status === "rejected";

            if (isResolved) {
              const coachProfileSeed = normalizeCoachProfileSeed(parsedRequest);
              const coachStorageKey = `coach_profile:${data.coach_id || data.id || "current"}`;
              const hasStoredCoachProfile = Boolean(localStorage.getItem(coachStorageKey));
              if (coachProfileSeed && !hasStoredCoachProfile) {
                localStorage.setItem(coachStorageKey, JSON.stringify(coachProfileSeed));
              }
            }

            if (isResolved) {
              localStorage.removeItem(requestKey);
              localStorage.removeItem("coachRequestDraft");
              clearCoachRequestResolution(parsedRequest?.coach_request_id);
              setCoachRequest(null);
            } else {
              setCoachRequest(parsedRequest);
            }
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
          profilePicture: data.pfp_url || onboardingData?.profilePicture || null,
        }));

        if (!isCoach) {
          const paymentInfo = clientProfile?.client_account?.payment_information;
          const fallbackPaymentInfo =
            !paymentInfo && onboardingData?.cardNumber
              ? {
                  id: Date.now(),
                  ccnum: onboardingData.cardNumber,
                  cv: onboardingData.cardCvv || "",
                  exp_date: onboardingData.cardExpiry || "",
                }
              : null;
          const resolvedPaymentInfo = paymentInfo || fallbackPaymentInfo;

          if (resolvedPaymentInfo) {
            setPaymentMethods([
              {
                id: resolvedPaymentInfo.id || Date.now(),
                type: "credit",
                lastFour: String(resolvedPaymentInfo.ccnum || "").slice(-4),
                expiryMonth: String(resolvedPaymentInfo.exp_date || "").slice(5, 7),
                expiryYear: String(resolvedPaymentInfo.exp_date || "").slice(0, 4),
                ccnum: resolvedPaymentInfo.ccnum || "",
                cv: resolvedPaymentInfo.cv || "",
                exp_date: resolvedPaymentInfo.exp_date || "",
              },
            ]);
          }

        }

        if (isCoach) {
          const coachStorageKey = `coach_profile:${data.coach_id || data.id || "current"}`;
          const coachStoredRaw = localStorage.getItem(coachStorageKey);
          let coachStored = null;
          if (coachStoredRaw) {
            try {
              coachStored = JSON.parse(coachStoredRaw);
            } catch {
              coachStored = null;
            }
          }

          if (!coachStored) {
            const requestSeedRaw =
              localStorage.getItem(requestKey) || localStorage.getItem("coachRequestDraft");
            if (requestSeedRaw) {
              try {
                coachStored = normalizeCoachProfileSeed(JSON.parse(requestSeedRaw));
              } catch {
                coachStored = null;
              }
            }
          }

          setSpecializations(
            coachStored?.specializations ||
            String(coachProfile?.coach_account?.specialties || "")
              .split(",")
              .map((item) => item.trim())
              .filter(Boolean)
          );
          setCertifications(Array.isArray(coachStored?.certifications) ? coachStored.certifications : []);
          setExperiences(Array.isArray(coachStored?.experiences) ? coachStored.experiences : []);
          setProfile((prev) => ({
            ...prev,
            pricingInterval: coachStored?.pricingInterval || "",
            amount: coachStored?.amount || "",
          }));
        }
      } catch (err) {
        setLoadError(err.message || "Failed to load profile.");
      } finally {
        setLoadingProfile(false);
      }
    };

    loadProfile();
  }, [isCoach, navigate]);

  const handleProfileChange = (field, value) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveClientProfile = async () => {
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

      const latestPayment = paymentMethods[0]
        ? {
            ccnum: paymentMethods[0].ccnum || "",
            cv: paymentMethods[0].cv || "",
            exp_date:
              paymentMethods[0].exp_date ||
              `${paymentMethods[0].expiryYear}-${paymentMethods[0].expiryMonth}-01`,
          }
        : null;

      const payload = buildClientInformationPayload({
        primaryGoal: profile.primaryGoal,
        weight: profile.weight,
        paymentMethod: latestPayment,
      });

      if (Object.keys(payload).length > 0) {
        await updateClientInformation(payload);
      }

      const accountPayload = buildAccountUpdatePayload({
        age: profile.age,
        email: profile.email,
        bio: profile.bio,
        pfp_url: profilePictureUrl,
        gender: profile.gender,
      });
      if (Object.keys(accountPayload).length > 0) {
        await updateAccount(accountPayload);
      }

      saveOnboardingDraft({
        ...loadProfileDraft(profile.email),
        name: `${profile.firstName} ${profile.lastName}`.trim(),
        email: profile.email,
        primaryGoal: profile.primaryGoal,
        weight: profile.weight,
        height: profile.height,
        age: profile.age,
        gender: profile.gender,
        bio: profile.bio,
        profilePicture: profilePictureUrl,
        cardNumber: latestPayment?.ccnum || "",
        cardCvv: latestPayment?.cv || "",
        cardExpiry: latestPayment?.exp_date || "",
      });

      setSaveMessage("Client profile changes saved.");
    } catch (error) {
      setSaveError(error.message || "Unable to save your client profile.");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSaveCoachProfile = async () => {
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

      if (Object.keys(payload).length > 0) {
        await updateCoachInformation(payload);
      }

      const accountPayload = buildAccountUpdatePayload({
        age: profile.age,
        email: profile.email,
        bio: profile.bio,
        pfp_url: profilePictureUrl,
        gender: profile.gender,
      });
      if (Object.keys(accountPayload).length > 0) {
        await updateAccount(accountPayload);
      }

      const coachId = coachProfileData?.coach_account?.id || "current";
      localStorage.setItem(
        `coach_profile:${coachId}`,
        JSON.stringify({
          certifications,
          experiences,
          specializations,
          pricingInterval: profile.pricingInterval,
          amount: profile.amount,
        })
      );

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
        localStorage.removeItem("jwt");
        navigate("/login");
      } catch (error) {
        alert("Failed to request account deletion. Please try again.");
      }
    }
  };

  const handleDeactivateAccount = async () => {
    if (window.confirm("Are you sure you want to deactivate your account? This action cannot be undone.")) {
      try {
        await deactivateAccount();
        alert("Account deactivated successfully.");
        localStorage.removeItem("jwt");
        navigate("/login");
      } catch (error) {
        alert("Failed to deactivate account. Please try again.");
      }
    }
  };

  const handleDeactivateCoachAccount = async () => {
    if (window.confirm("Are you sure you want to deactivate your coach account? This action cannot be undone.")) {
      try {
        await deactivateCoachAccount();
        alert("Coach account deactivated successfully.");
        localStorage.removeItem("jwt");
        navigate("/login");
      } catch (error) {
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
      } catch (error) {
        alert("Failed to request coach account deletion. Please try again.");
      }
    }
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

  const addPaymentMethod = () => {
    if (!newPaymentMethod.type || !newPaymentMethod.ccnum || !newPaymentMethod.cv || !newPaymentMethod.exp_date) return;
    setPaymentMethods((prev) => [
      ...prev,
      {
        id: Date.now(),
        ...newPaymentMethod,
        lastFour: String(newPaymentMethod.ccnum).slice(-4),
        expiryMonth: String(newPaymentMethod.exp_date).slice(5, 7),
        expiryYear: String(newPaymentMethod.exp_date).slice(0, 4),
      },
    ]);
    setNewPaymentMethod({ type: "", ccnum: "", cv: "", exp_date: "" });
    setShowPaymentForm(false);
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
        canSwitchToCoach={!isCoach && canSwitchToCoach}
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
          {isCoach && (
            <button
              onClick={() => {
                if (coachProfileData?.coach_account?.id) {
                  navigate(`/coaches/${coachProfileData.coach_account.id}?preview=1`);
                }
              }}
              disabled={!coachProfileData?.coach_account?.id}
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
                  <StatBox label="Coach ID" value={coachProfileData?.coach_account?.id ?? "--"} />
                  <StatBox label="Verified" value={coachProfileData?.coach_account?.verified ? "Yes" : "No"} />
                  <StatBox label="Specialties" value={specializations.length || "--"} />
                  <StatBox label="Certs" value={certifications.length || "--"} />
                </div>
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
                    <button
                      onClick={() => navigate("/coach-request")}
                      className="w-full rounded-xl px-4 py-3 text-sm font-semibold text-white"
                      style={{ backgroundColor: "#F59E0B" }}
                    >
                      Become Coach
                    </button>

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

            {!isCoach && (
              <Panel title="Progress &amp; Telemetry" accent={accent}>
                <TelemetryCharts accent={accent} />
              </Panel>
            )}

            {!isCoach && (
              <Panel title="Payment Methods" accent={accent}>
                <div className="space-y-3">
                  {paymentMethods.map((method) => (
                    <div
                      key={method.id}
                      className="rounded-xl border border-white/6 bg-[#101827] px-4 py-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="text-2xl">
                            {method.type === "credit" ? "💳" : method.type === "debit" ? "💳" : "🏦"}
                          </div>
                          <div>
                            <h3 className="text-sm font-semibold text-white">
                              {method.type.charAt(0).toUpperCase() + method.type.slice(1)} Card
                            </h3>
                            <p className="text-xs text-slate-400">
                              **** **** **** {method.lastFour}
                            </p>
                            <p className="text-xs text-slate-500">
                              Expires {method.expiryMonth}/{method.expiryYear}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => deleteItem(setPaymentMethods, method.id)}
                          className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-300"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}

                  {!showPaymentForm ? (
                    <button
                      onClick={() => setShowPaymentForm(true)}
                      className="w-full rounded-xl border border-dashed px-4 py-3 text-sm font-semibold transition"
                      style={{ borderColor: `${accent}55`, color: accent, backgroundColor: `${accent}08` }}
                    >
                      + Add Payment Method
                    </button>
                  ) : (
                    <div className="rounded-xl border border-white/6 bg-[#101827] p-4 space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="mb-2 block text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                            Card Type
                          </label>
                          <select
                            value={newPaymentMethod.type}
                            onChange={(e) => setNewPaymentMethod((prev) => ({ ...prev, type: e.target.value }))}
                            className="w-full rounded-lg border border-white/6 bg-[#0F172A] px-4 py-3 text-sm text-white outline-none"
                          >
                            <option value="">Select card type</option>
                            <option value="credit">Credit Card</option>
                            <option value="debit">Debit Card</option>
                          </select>
                        </div>
                        <Input
                          label="Card Number"
                          value={newPaymentMethod.ccnum}
                          onChange={(v) => setNewPaymentMethod((prev) => ({ ...prev, ccnum: v }))}
                          placeholder="4111111111111111"
                        />
                        <Input
                          label="CVV"
                          value={newPaymentMethod.cv}
                          onChange={(v) => setNewPaymentMethod((prev) => ({ ...prev, cv: v }))}
                          placeholder="123"
                        />
                        <Input
                          label="Expiry Date"
                          value={newPaymentMethod.exp_date}
                          onChange={(v) => setNewPaymentMethod((prev) => ({ ...prev, exp_date: v }))}
                          placeholder="2027-12-01"
                        />
                      </div>

                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setShowPaymentForm(false)}
                          className="rounded-lg border border-white/10 bg-[rgba(255,255,255,0.03)] px-3 py-2 text-xs font-medium text-slate-300"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={addPaymentMethod}
                          className="rounded-lg px-3 py-2 text-xs font-semibold text-white"
                          style={{ backgroundColor: accent }}
                        >
                          Add Payment Method
                        </button>
                      </div>
                    </div>
                  )}
                </div>
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
                        className="h-12 w-full rounded-xl border border-white/8 bg-[#101827] px-4 text-sm text-white outline-none transition focus:border-orange-400/50 focus:ring-2 focus:ring-orange-400/10"
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
                />
              </>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button className="rounded-xl border border-white/10 bg-[rgba(255,255,255,0.03)] px-5 py-3 text-sm font-medium text-slate-300">
                Discard
              </button>
              <button
                onClick={isCoach ? handleSaveCoachProfile : handleSaveClientProfile}
                disabled={savingProfile}
                className="rounded-xl px-5 py-3 text-sm font-semibold text-white shadow-lg"
                style={{ backgroundColor: accent }}
              >
                {savingProfile ? "Saving..." : "Save Changes"}
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
                  />
                  <Input
                    label="Issuer"
                    value={item.issuer}
                    onChange={(v) => onUpdateField(item.id, "issuer", v)}
                    placeholder="Issuer"
                  />
                  <Input
                    label="Year"
                    value={item.year}
                    onChange={(v) => onUpdateField(item.id, "year", v)}
                    placeholder="Year"
                  />
                </div>
                <TextArea
                  label="Description"
                  value={item.description}
                  onChange={(v) => onUpdateField(item.id, "description", v)}
                  rows={4}
                  placeholder="Description"
                />
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => onToggleEdit(item.id)}
                    className="rounded-lg border border-white/10 bg-[rgba(255,255,255,0.03)] px-3 py-2 text-xs font-medium text-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => onToggleEdit(item.id)}
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
                    className="rounded-lg border border-white/10 bg-[rgba(255,255,255,0.03)] px-3 py-2 text-xs font-medium text-slate-300"
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




