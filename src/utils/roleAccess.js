import { fetchCoachProfile } from "../api/coach";
import { resolveRoleState } from "./sessionAuth";

export async function getCoachAccessState(_account, roleState = null) {
  const resolvedRoleState = roleState || await resolveRoleState();

  if (!resolvedRoleState.hasCoachRole) {
    return {
      hasCoachRecord: false,
      canAccessCoach: false,
      coachVerified: false,
      coachProfile: null,
    };
  }

  try {
    const coachProfile = await fetchCoachProfile();
    const coachVerified = Boolean(coachProfile?.coach_account?.verified);

    return {
      hasCoachRecord: true,
      canAccessCoach: coachVerified,
      coachVerified,
      coachProfile,
    };
  } catch {
    return {
      hasCoachRecord: true,
      canAccessCoach: false,
      coachVerified: false,
      coachProfile: null,
    };
  }
}
