function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function readJson(key) {
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function writeJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function getOnboardingStorageKey(email) {
  const normalizedEmail = normalizeEmail(email);
  return normalizedEmail ? `onboarding:${normalizedEmail}` : "onboarding:current";
}

export function getSignupPrefillKey(email) {
  const normalizedEmail = normalizeEmail(email);
  return normalizedEmail ? `signup_prefill:${normalizedEmail}` : "signup_prefill:current";
}

export function saveSignupPrefill(prefill) {
  const normalizedEmail = normalizeEmail(prefill?.email);
  const payload = {
    name: prefill?.name || "",
    email: normalizedEmail,
    age: prefill?.age != null ? String(prefill.age) : "",
    gender: prefill?.gender || "",
    bio: prefill?.bio || "",
    profilePicture: prefill?.pfpUrl || "",
  };

  writeJson(getSignupPrefillKey(normalizedEmail), payload);

  const onboardingKey = getOnboardingStorageKey(normalizedEmail);
  const existingOnboarding = readJson(onboardingKey) || {};
  writeJson(onboardingKey, {
    ...payload,
    ...existingOnboarding,
    email: normalizedEmail || existingOnboarding.email || "",
  });

  if (normalizedEmail) {
    localStorage.setItem("active_user_email", normalizedEmail);
  }
}

export function loadProfileDraft(email) {
  const normalizedEmail = normalizeEmail(email || localStorage.getItem("active_user_email"));
  const signupPrefill = readJson(getSignupPrefillKey(normalizedEmail)) || {};
  const onboardingDraft = readJson(getOnboardingStorageKey(normalizedEmail)) || {};

  return {
    ...signupPrefill,
    ...onboardingDraft,
    email: normalizedEmail || onboardingDraft.email || signupPrefill.email || "",
  };
}

export function saveOnboardingDraft(form) {
  const normalizedEmail = normalizeEmail(form?.email || localStorage.getItem("active_user_email"));
  const payload = {
    ...form,
    email: normalizedEmail,
  };

  writeJson(getOnboardingStorageKey(normalizedEmail), payload);
  writeJson("onboarding:current", payload);

  if (normalizedEmail) {
    localStorage.setItem("active_user_email", normalizedEmail);
  }

  return payload;
}
