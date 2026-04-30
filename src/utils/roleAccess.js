import { fetchCoachProfile } from "../api/coach";

export async function getCoachAccessState(account) {
  if (!account?.coach_id) {
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
