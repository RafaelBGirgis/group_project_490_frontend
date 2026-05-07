import {
  forgetTerminatedRelationshipId,
  isRelationshipTerminatedInSession,
} from "./terminatedRelationships";

const APPROVED_REQUEST_STATUSES = new Set(["approved", "accepted", "active"]);
const PENDING_REQUEST_STATUSES = new Set(["pending", "requested"]);

export function isApprovedCoachRequest(item) {
  if (!item) return false;
  if (item.is_accepted === true) return true;
  return APPROVED_REQUEST_STATUSES.has(String(item.status || "").toLowerCase());
}

export function isPendingCoachRequest(item) {
  if (!item) return false;
  if (item.is_accepted === null) return true;
  return PENDING_REQUEST_STATUSES.has(String(item.status || "").toLowerCase());
}

export function pickPreferredCoachRequest(
  current,
  candidate,
  activeCoachId = null,
  activeRelationshipId = null
) {
  if (!current) return candidate;
  if (!candidate) return current;

  const currentIsActive =
    activeCoachId != null &&
    activeRelationshipId != null &&
    Number(current.coach_id) === Number(activeCoachId) &&
    Number(current.relationship_id) === Number(activeRelationshipId);
  const candidateIsActive =
    activeCoachId != null &&
    activeRelationshipId != null &&
    Number(candidate.coach_id) === Number(activeCoachId) &&
    Number(candidate.relationship_id) === Number(activeRelationshipId);

  if (candidateIsActive && !currentIsActive) return candidate;
  if (currentIsActive && !candidateIsActive) return current;

  const currentUpdated = new Date(current.updated_at || 0).getTime();
  const candidateUpdated = new Date(candidate.updated_at || 0).getTime();

  if (candidateUpdated !== currentUpdated) {
    return candidateUpdated > currentUpdated ? candidate : current;
  }

  if (isApprovedCoachRequest(candidate) && !isApprovedCoachRequest(current)) {
    return candidate;
  }
  if (isPendingCoachRequest(candidate) && !isPendingCoachRequest(current)) {
    return candidate;
  }

  return current;
}

export function reduceCoachRequestsByCoach(
  requests,
  { activeCoachId = null, activeRelationshipId = null } = {}
) {
  return (Array.isArray(requests) ? requests : []).reduce((acc, item) => {
    if (!item?.coach_id) return acc;
    acc[item.coach_id] = pickPreferredCoachRequest(
      acc[item.coach_id],
      item,
      activeCoachId,
      activeRelationshipId
    );
    return acc;
  }, {});
}

export function resolveActiveCoachRelationship(myCoach, requests) {
  const activeCoachId =
    myCoach?.coach_id != null ? Number(myCoach.coach_id) : null;
  const activeRelationshipId =
    myCoach?.relationship_id != null ? Number(myCoach.relationship_id) : null;
  const byCoachId = reduceCoachRequestsByCoach(requests, {
    activeCoachId,
    activeRelationshipId,
  });

  if (!myCoach || activeCoachId == null || activeRelationshipId == null) {
    return { activeCoach: null, byCoachId };
  }

  if (!Array.isArray(requests) || requests.length === 0) {
    if (isRelationshipTerminatedInSession(activeRelationshipId)) {
      return { activeCoach: null, byCoachId };
    }
    return { activeCoach: myCoach, byCoachId };
  }

  const matchingRequest = byCoachId[activeCoachId];
  const requestSupportsRelationship = Boolean(
    matchingRequest &&
    isApprovedCoachRequest(matchingRequest) &&
    (
      matchingRequest.relationship_id == null ||
      Number(matchingRequest.relationship_id) === activeRelationshipId
    )
  );

  if (requestSupportsRelationship) {
    forgetTerminatedRelationshipId(activeRelationshipId);
    return { activeCoach: myCoach, byCoachId };
  }

  if (isRelationshipTerminatedInSession(activeRelationshipId)) {
    return { activeCoach: null, byCoachId };
  }

  return {
    activeCoach: myCoach,
    byCoachId,
  };
}
