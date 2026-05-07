import { describe, expect, it } from "vitest";
import { isApprovedCoachRequest, reduceCoachRequestsByCoach } from "../utils/coachRequests";

describe("coachRequests helpers", () => {
  it("treats accepted requests as approved", () => {
    expect(isApprovedCoachRequest({ status: "accepted" })).toBe(true);
    expect(isApprovedCoachRequest({ status: "approved" })).toBe(true);
  });

  it("prefers the active relationship when reducing requests by coach", () => {
    const reduced = reduceCoachRequestsByCoach(
      [
        {
          coach_id: 9,
          request_id: 41,
          status: "pending",
          relationship_id: null,
          updated_at: "2026-05-06T12:00:00.000Z",
        },
        {
          coach_id: 9,
          request_id: 41,
          status: "accepted",
          relationship_id: 77,
          updated_at: "2026-05-06T11:00:00.000Z",
        },
      ],
      { activeCoachId: 9, activeRelationshipId: 77 }
    );

    expect(reduced[9]).toEqual(
      expect.objectContaining({
        coach_id: 9,
        request_id: 41,
        status: "accepted",
        relationship_id: 77,
      })
    );
  });
});
