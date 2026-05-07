import { describe, it, expect, vi } from "vitest";
import {
  acceptClientRequest,
  buildCoachInformationPayload,
  buildCoachRequestPayload,
  buildCoachWorkoutActivities,
  buildCoachWorkoutPayload,
  createCoachRequest,
  denyClientRequest,
  fetchCoachAvailability,
  fetchCoachProfile,
  fetchCoachReviews,
  fetchClientRequests,
  fetchMyClients,
  saveCoachAvailability,
  terminateRelationship,
  updateCoachInformation,
} from "../api/coach";

function mockFetchOk(data) {
  global.fetch = vi.fn(() =>
    Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(data) })
  );
}

describe("fetchCoachProfile", () => {
  it("posts to /roles/coach/me", async () => {
    mockFetchOk({ coach_account: { id: 7 } });
    await fetchCoachProfile();
    const [url, opts] = global.fetch.mock.calls[0];
    expect(url).toContain("/roles/coach/me");
    expect(opts.method).toBe("POST");
  });
});

describe("createCoachRequest", () => {
  it("posts to the real coach creation route", async () => {
    mockFetchOk({ coach_request_id: 2, coach_id: 7 });
    const payload = {
      availabilities: [],
      experiences: [],
      certifications: [],
      specialties: ["Strength Training"],
    };
    await createCoachRequest(payload);
    const [url, opts] = global.fetch.mock.calls[0];
    expect(url).toContain("/roles/coach/request_coach_creation");
    expect(opts.method).toBe("POST");
    expect(JSON.parse(opts.body)).toEqual(payload);
  });
});

describe("updateCoachInformation", () => {
  it("patches /roles/coach/information", async () => {
    mockFetchOk({ coach_id: 7 });
    await updateCoachInformation({ specialties: ["Powerlifting"] });
    const [url, opts] = global.fetch.mock.calls[0];
    expect(url).toContain("/roles/coach/information");
    expect(opts.method).toBe("PATCH");
    expect(JSON.parse(opts.body)).toEqual({ specialties: ["Powerlifting"] });
  });
});

describe("coach request actions", () => {
  it("posts accept without a JSON body", async () => {
    mockFetchOk({ relationship_id: 11 });
    await acceptClientRequest(11);
    const [url, opts] = global.fetch.mock.calls[0];
    expect(url).toContain("/roles/coach/accept_client/11");
    expect(opts.method).toBe("POST");
    expect(opts.body).toBeUndefined();
  });

  it("posts deny without a JSON body", async () => {
    mockFetchOk({ relationship_id: 11 });
    await denyClientRequest(11);
    const [url, opts] = global.fetch.mock.calls[0];
    expect(url).toContain("/roles/coach/deny_client/11");
    expect(opts.method).toBe("POST");
    expect(opts.body).toBeUndefined();
  });

  it("falls back to the shared delete route when deny is unavailable", async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 404,
        headers: { get: () => "application/json" },
        json: () => Promise.resolve({ detail: "missing" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: { get: () => "application/json" },
        json: () => Promise.resolve({ success: true }),
      });

    await denyClientRequest(11);

    const [fallbackUrl, fallbackOpts] = global.fetch.mock.calls[1];
    expect(fallbackUrl).toContain("/roles/shared/client_coach_relationship/delete_coach_request/11");
    expect(fallbackOpts.method).toBe("DELETE");
  });

  it("posts the shared terminate relationship route with an empty JSON body", async () => {
    mockFetchOk({ success: true });
    await terminateRelationship(11);
    const [url, opts] = global.fetch.mock.calls[0];
    expect(url).toContain("/roles/shared/client_coach_relationship/terminate_relationship/11");
    expect(opts.method).toBe("POST");
    expect(opts.body).toBe("{}");
  });
});

describe("fetchClientRequests", () => {
  it("normalizes request rows for dashboard/profile rendering", async () => {
    mockFetchOk([
      {
        id: 3,
        client_id: 21,
        name: "Jamie Client",
        age: 29,
        gender: "female",
        pfp_url: "https://example.com/jamie.jpg",
        fitness_goals: [{ goal_enum: "weight loss" }],
      },
    ]);

    const result = await fetchClientRequests();

    expect(result).toEqual([
      expect.objectContaining({
        request_id: 3,
        client_id: 21,
        name: "Jamie Client",
        age: 29,
        gender: "female",
        pfp_url: "https://example.com/jamie.jpg",
        goal: "weight loss",
      }),
    ]);
  });
});

describe("fetchMyClients", () => {
  it("loads accepted clients from the documented coach clients route", async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: { get: () => "application/json" },
        json: () => Promise.resolve([
          { relationship_id: 90, client_id: 21, request_id: 3 },
        ]),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: { get: () => "application/json" },
        json: () => Promise.resolve({
          base_account: { id: 5, name: "Jamie Client" },
          fitness_goals: [{ goal_enum: "weight loss" }],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: { get: () => "application/json" },
        json: () => Promise.resolve([]),
      });

    const result = await fetchMyClients(7);

    expect(global.fetch).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("/roles/coach/clients"),
      expect.objectContaining({
        headers: expect.objectContaining({ "Content-Type": "application/json" }),
      })
    );
    expect(result).toEqual([
      expect.objectContaining({
        id: 21,
        request_id: 3,
        relationship_id: 90,
        status: "active",
        name: "Jamie Client",
        goal: "weight loss",
      }),
    ]);
  });
});

describe("saveCoachAvailability", () => {
  it("uses the coach information patch route", async () => {
    mockFetchOk({ coach_id: 7 });
    await saveCoachAvailability(7, [{ time: "9AM", slots: Array(7).fill("available") }]);
    const [url, opts] = global.fetch.mock.calls[0];
    expect(url).toContain("/roles/coach/information");
    expect(opts.method).toBe("PATCH");
    expect(JSON.parse(opts.body).availabilities.length).toBeGreaterThan(0);
  });
});

describe("fetchCoachAvailability", () => {
  it("returns an empty array when no backend or saved availability exists", async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}) })
    );
    localStorage.clear();
    const result = await fetchCoachAvailability(7);
    expect(result).toEqual([]);
  });
});

describe("fetchCoachReviews", () => {
  it("reads coach reviews from the backend review route and normalizes them", async () => {
    mockFetchOk({
      reviews: [
        {
          id: 1,
          client_id: 21,
          rating: 4.4,
          review_text: "Great coach",
          last_updated: "2026-04-28T14:00:00.000Z",
        },
      ],
    });
    const result = await fetchCoachReviews(7);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/roles/client/review/7"),
      expect.objectContaining({
        headers: expect.objectContaining({ "Content-Type": "application/json" }),
      })
    );
    expect(result[0]).toMatchObject({
      id: 1,
      client_id: 21,
      client_name: "Client #21",
      rating: 4,
      comment: "Great coach",
    });
  });
});

describe("coach payload builders", () => {
  it("maps coach request form data to backend models", () => {
    const payload = buildCoachRequestPayload(
      {
        certifications: [{ title: "CSCS", issuer: "NSCA", year: "2024", description: "Passed" }],
        experiences: [{ title: "Head Coach", organization: "Iron Gym", year: "2020-2024", description: "Led strength programs" }],
        specializations: ["Strength Training"],
      },
      { Mon: ["9AM"], Tue: [], Wed: [], Thu: [], Fri: [], Sat: [], Sun: [] }
    );
    expect(payload.availabilities[0].weekday).toBe("monday");
    expect(payload.certifications[0].certification_name).toBe("CSCS");
    expect(payload.experiences[0].experience_name).toBe("Iron Gym");
  });

  it("maps coach profile updates to backend models", () => {
    const payload = buildCoachInformationPayload({
      availability: { Mon: ["9AM"], Tue: [], Wed: [], Thu: [], Fri: [], Sat: [], Sun: [] },
      certifications: [{ title: "NASM CPT", issuer: "NASM", year: "2025", description: "" }],
      experiences: [{ title: "Trainer", organization: "Studio", year: "2023", description: "Coached clients" }],
      specializations: ["Weight Loss"],
    });
    expect(payload.specialties).toEqual(["Weight Loss"]);
    expect(payload.certifications[0].certification_organization).toBe("NASM");
    expect(payload.experiences[0].experience_title).toBe("Trainer");
  });

  it("builds coach workout payloads and activities", () => {
    const workoutPayload = buildCoachWorkoutPayload({
      name: "Push Day",
      description: "Upper push",
      exercises: [{ name: "Bench Press", notes: "Heavy", equipment: "Barbell", intensity_measure: "lbs" }],
    });
    const activityPayloads = buildCoachWorkoutActivities(10, [
      { name: "Bench Press", weight: 185, intensity_measure: "lbs", estimated_calories_per_unit_frequency: 8 },
    ]);

    expect(workoutPayload.name).toBe("Push Day");
    expect(workoutPayload.workout_type).toBe("rep");
    expect(activityPayloads[0].workout_id).toBe(10);
    expect(activityPayloads[0].intensity_value).toBe(185);
  });
});
