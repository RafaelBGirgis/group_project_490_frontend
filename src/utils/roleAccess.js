import { fetchCoachProfile } from "../api/coach";
import { resolveRoleState } from "./sessionAuth";
import { cacheCoachAccessState, getCachedCoachAccessState } from "./sessionCache";

export async function getCoachAccessState(_account, roleState = null) {
  const resolvedRoleState = roleState || await resolveRoleState();

  if (!resolvedRoleState.hasCoachRole) {
    return cacheCoachAccessState({
      hasCoachRecord: false,
      canAccessCoach: false,
      coachVerified: false,
      coachProfile: null,
    });
  }

  try {
    const coachProfile = await fetchCoachProfile();
    const coachVerified = Boolean(coachProfile?.coach_account?.verified);

    return cacheCoachAccessState({
      hasCoachRecord: true,
      canAccessCoach: coachVerified,
      coachVerified,
      coachProfile,
    });
  } catch {
    return cacheCoachAccessState({
      hasCoachRecord: true,
      canAccessCoach: false,
      coachVerified: false,
      coachProfile: null,
    });
  }
}

export function getImmediateCoachAccessState() {
  return getCachedCoachAccessState() || {
    hasCoachRecord: false,
    canAccessCoach: false,
    coachVerified: false,
    coachProfile: null,
  };
}
