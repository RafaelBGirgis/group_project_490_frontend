/**
 * Tests for src/api/client.js
 *
 * Validates: auth (fetchMe), workout plan loading, activity logging,
 * coach info, availability, and meals.
 */

import { describe, it, expect, vi } from "vitest";
import {
  assignWorkoutPlanToClient,
  buildClientInformationPayload,
  buildInitialSurveyPayload,
  createClientInitialSurvey,
  deleteAccount,
  deleteCoachRequest,
  extractUploadedAssetUrl,
  fetchMe,
  fetchUnifiedProfile,
  fetchTelemetryToday,
  fetchCoachInfo,
  fetchCoachRating,
  fetchNextSession,
  listClientAvailability,
  createClientAvailability,
  deleteClientAvailability,
  fetchMealsToday,
  logMeal,
  fetchAvailableCoaches,
  fetchMyCoachRequests,
  requestCoach,
  uploadProgressPicture,
} from "../api/client";

/*  helpers  */

function mockFetchOk(data) {
  global.fetch = vi.fn(() =>
    Promise.resolve({
      ok: true,
      status: 200,
      headers: { get: () => "application/json" },
      json: () => Promise.resolve(data),
      text: () => Promise.resolve(typeof data === "string" ? data : JSON.stringify(data)),
    })
  );
}

function mockFetchFail(status = 500) {
  global.fetch = vi.fn(() =>
    Promise.resolve({
      ok: false,
      status,
      headers: { get: () => "application/json" },
      json: () => Promise.resolve({ detail: "err" }),
    })
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   AUTH & PROFILE
   ═══════════════════════════════════════════════════════════════════════ */

describe("fetchMe", () => {
  it("sends GET /me with JWT header", async () => {
    const me = { name: "Test User", client_id: 1 };
    mockFetchOk(me);
    localStorage.setItem("jwt", "abc123");
    const result = await fetchMe();
    expect(result).toEqual(me);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/me"),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer abc123",
        }),
      })
    );
  });

  it("redirects to /login on 401", async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({ ok: false, status: 401, json: () => Promise.resolve({}) })
    );
    localStorage.setItem("jwt", "expired");
    await expect(fetchMe()).rejects.toThrow("Unauthorized");
    expect(localStorage.getItem("jwt")).toBeNull();
  });
});

describe("createClientInitialSurvey", () => {
  it("posts to the real initial survey route", async () => {
    mockFetchOk({ client_id: 12 });
    const payload = {
      fitness_goals: { client_id: 0, goal_enum: "weight loss" },
      payment_information: { ccnum: "4111111111111111", cv: "123", exp_date: "2027-12-01" },
      availabilities: [],
      initial_health_metric: { weight: 165, client_telemetry_id: 0 },
    };
    await createClientInitialSurvey(payload);
    const [url, opts] = global.fetch.mock.calls[0];
    expect(url).toContain("/roles/client/initial_survey");
    expect(opts.method).toBe("POST");
    expect(JSON.parse(opts.body)).toEqual(payload);
  });
});

describe("fetchUnifiedProfile", () => {
  it("uses the shared full-profile route when available", async () => {
    mockFetchOk({
      account: { id: 1, name: "Test User" },
      roles: ["client"],
      client_details: { primary_goal: "weight loss" },
      coach_details: null,
    });
    const result = await fetchUnifiedProfile();
    const [url] = global.fetch.mock.calls[0];
    expect(url).toContain("/roles/shared/account/me");
    expect(result.account.name).toBe("Test User");
    expect(result.roles).toEqual(["client"]);
  });
});

describe("deleteAccount", () => {
  it("uses the shared account deletion route", async () => {
    mockFetchOk({ deleted: true });
    await deleteAccount();
    const [url, opts] = global.fetch.mock.calls[0];
    expect(url).toContain("/roles/shared/account/delete");
    expect(opts.method).toBe("DELETE");
  });
});

describe("assignWorkoutPlanToClient", () => {
  it("posts to the client assign-plan route", async () => {
    mockFetchOk({ client_workout_plan_id: 44 });
    await assignWorkoutPlanToClient(12, "2026-05-06T00:00:00.000Z", "2026-05-12T23:59:59.999Z");
    const [url, opts] = global.fetch.mock.calls[0];
    expect(url).toContain("/roles/client/assign_plan");
    expect(opts.method).toBe("POST");
    expect(JSON.parse(opts.body)).toMatchObject({
      workout_plan_id: 12,
    });
  });
});

/* ═══════════════════════════════════════════════════════════════════════
   TELEMETRY
   ═══════════════════════════════════════════════════════════════════════ */

describe("fetchTelemetryToday", () => {
  it("returns mock telemetry on API failure", async () => {
    mockFetchFail();
    const data = await fetchTelemetryToday(1);
    expect(data.step_count).toBeDefined();
    expect(data.calories_burned).toBeDefined();
    expect(data.calories_consumed).toBeDefined();
    expect(data.calories_goal).toBeDefined();
  });

  it("returns the route-only fallback shape when no telemetry is available", async () => {
    const result = await fetchTelemetryToday(1);
    expect(result).toEqual({
      step_count: 0,
      calories_burned: 0,
      calories_consumed: 0,
      calories_goal: 2000,
    });
  });
});

/* ═══════════════════════════════════════════════════════════════════════
   COACH INFO
   ═══════════════════════════════════════════════════════════════════════ */

describe("fetchCoachInfo", () => {
  it("returns null when no coach assigned (API failure)", async () => {
    mockFetchFail(404);
    const result = await fetchCoachInfo(1);
    expect(result).toBeNull();
  });

  it("returns coach object when API succeeds", async () => {
    const coach = {
      coach_id: 5,
      relationship_id: 12,
      name: "Coach A",
      specialty: "Strength",
    };
    mockFetchOk(coach);
    const result = await fetchCoachInfo(1);
    expect(result).toMatchObject(coach);
  });

  it("normalizes nested my_coach payloads with relationship and account info", async () => {
    mockFetchOk({
      coach_account: {
        id: 5,
        specialties: "Strength",
        base_account: {
          id: 88,
          name: "Coach A",
        },
      },
      client_coach_relationship: {
        id: 12,
        coach_id: 5,
      },
    });
    const result = await fetchCoachInfo(1);
    expect(result).toMatchObject({
      coach_id: 5,
      relationship_id: 12,
      account_id: 88,
      name: "Coach A",
      specialty: "Strength",
    });
  });
});

describe("fetchCoachRating", () => {
  it("returns mock rating on fallback", async () => {
    mockFetchFail();
    const rating = await fetchCoachRating(1);
    expect(typeof rating.avg).toBe("number");
    expect(typeof rating.review_count).toBe("number");
  });
});

/* ═══════════════════════════════════════════════════════════════════════
   AVAILABILITY
   ═══════════════════════════════════════════════════════════════════════ */

describe("listClientAvailability", () => {
  it("queries the date-range availability endpoint", async () => {
    mockFetchOk([]);
    await listClientAvailability("2026-05-01T00:00:00Z", "2026-05-08T00:00:00Z");
    const [url] = global.fetch.mock.calls[0];
    expect(url).toContain("/roles/client/availability");
    expect(url).toContain("from_dt=");
    expect(url).toContain("to_dt=");
  });
});

describe("createClientAvailability", () => {
  it("posts a datetime window payload", async () => {
    mockFetchOk({ id: 5 });
    const payload = {
      start_dt: "2026-05-04T15:00:00Z",
      end_dt: "2026-05-04T17:00:00Z",
      repeats_weekly: false,
      recurrence_end_dt: null,
    };
    await createClientAvailability(payload);
    const [url, opts] = global.fetch.mock.calls[0];
    expect(url).toContain("/roles/client/availability");
    expect(opts.method).toBe("POST");
    expect(JSON.parse(opts.body)).toEqual(payload);
  });
});

describe("deleteClientAvailability", () => {
  it("deletes by id", async () => {
    mockFetchOk({ details: "deleted" });
    await deleteClientAvailability(7);
    const [url, opts] = global.fetch.mock.calls[0];
    expect(url).toContain("/roles/client/availability/7");
    expect(opts.method).toBe("DELETE");
  });
});

describe("buildClientInformationPayload", () => {
  it("no longer carries availability — that's managed by the /availability CRUD routes", () => {
    const payload = buildClientInformationPayload({});
    expect(payload).not.toHaveProperty("availabilities");
  });
});

/* ═══════════════════════════════════════════════════════════════════════
   MEALS
   ═══════════════════════════════════════════════════════════════════════ */

describe("fetchMealsToday", () => {
  it("returns an empty list when the telemetry endpoint is unreachable", async () => {
    mockFetchFail();
    const meals = await fetchMealsToday(1);
    expect(meals).toEqual([]);
  });

  it("normalizes CompletedMealActivity rows from the backend", async () => {
    mockFetchOk([
      { id: 7, on_demand_meal_id: 3, client_prescribed_meal_id: null, last_updated: "2026-04-30T12:00:00" },
      { id: 8, on_demand_meal_id: null, client_prescribed_meal_id: 5, last_updated: "2026-04-30T18:00:00" },
    ]);
    const meals = await fetchMealsToday(1);
    expect(meals).toHaveLength(2);
    expect(meals[0]).toMatchObject({
      id: 7,
      on_demand_meal_id: 3,
      client_prescribed_meal_id: null,
    });
    expect(meals[1]).toMatchObject({
      id: 8,
      client_prescribed_meal_id: 5,
    });
    meals.forEach((m) => expect(m.logged_at).toBeTruthy());
  });
});

/* ═══════════════════════════════════════════════════════════════════════
   COACH BROWSE
   ═══════════════════════════════════════════════════════════════════════ */

describe("fetchAvailableCoaches", () => {
  it("returns an empty list on API failure instead of fake coaches", async () => {
    mockFetchFail();
    const coaches = await fetchAvailableCoaches();
    expect(coaches).toEqual([]);
  });

  it("normalizes coach experiences for public profile rendering", async () => {
    mockFetchOk([
      {
        coach_id: 7,
        name: "Coach A",
        email: "coach@example.com",
        specialties: "Strength, Mobility",
        experiences: [
          {
            experience_name: "Iron Gym",
            experience_title: "Head Coach",
            experience_description: "Led training programs",
            experience_start: "2020-01-01",
            experience_end: "2024-12-31",
          },
        ],
      },
    ]);
    const coaches = await fetchAvailableCoaches();
    expect(coaches[0].experiences[0]).toEqual({
      title: "Head Coach",
      organization: "Iron Gym",
      year: "2020-2024",
      description: "Led training programs",
    });
  });
});

describe("requestCoach", () => {
  it("posts to correct endpoint without a JSON body", async () => {
    mockFetchOk({ success: true });
    localStorage.setItem("jwt", "tok");
    await requestCoach(10, 5);
    const [url, opts] = global.fetch.mock.calls[0];
    expect(url).toContain("/roles/client/request_coach/5");
    expect(opts.method).toBe("POST");
    expect(opts.body).toBeUndefined();
  });
});

describe("deleteCoachRequest", () => {
  it("uses the client rescind route for client-side request cancellation", async () => {
    mockFetchOk({ success: true });
    localStorage.setItem("jwt", "tok");
    await deleteCoachRequest(17);
    const [url, opts] = global.fetch.mock.calls[0];
    expect(url).toContain("/roles/client/rescind_request/17");
    expect(opts.method).toBe("DELETE");
  });

  it("falls back to the shared delete route when rescind is unavailable", async () => {
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

    await deleteCoachRequest(17);

    const [url, opts] = global.fetch.mock.calls[1];
    expect(url).toContain("/roles/shared/client_coach_relationship/delete_coach_request/17");
    expect(opts.method).toBe("DELETE");
  });
});

describe("fetchMyCoachRequests", () => {
  it("normalizes approved requests from is_accepted when status is omitted", async () => {
    mockFetchOk([
      {
        id: 41,
        coach_id: 9,
        coach_name: "Coach Approved",
        is_accepted: true,
        client_coach_relationship: { id: 77 },
      },
    ]);

    const requests = await fetchMyCoachRequests();

    expect(requests).toEqual([
      expect.objectContaining({
        request_id: 41,
        coach_id: 9,
        coach_name: "Coach Approved",
        status: "approved",
        relationship_id: 77,
      }),
    ]);
  });
});

describe("uploadProgressPicture", () => {
  it("posts multipart form data to upload route", async () => {
    mockFetchOk({ url: "https://example.com/pic.jpg" });
    const file = new File(["img"], "progress.jpg", { type: "image/jpeg" });
    await uploadProgressPicture(file);
    const [url, opts] = global.fetch.mock.calls[0];
    expect(url).toContain("/roles/client/upload_progress_picture");
    expect(opts.method).toBe("POST");
    expect(opts.body).toBeInstanceOf(FormData);
  });
});

describe("extractUploadedAssetUrl", () => {
  it("finds urls across the upload response variants we see in the app", () => {
    expect(extractUploadedAssetUrl("https://example.com/a.jpg")).toBe("https://example.com/a.jpg");
    expect(extractUploadedAssetUrl({ public_url: "https://example.com/b.jpg" })).toBe("https://example.com/b.jpg");
    expect(extractUploadedAssetUrl({ account: { pfp_url: "https://example.com/c.jpg" } })).toBe("https://example.com/c.jpg");
    expect(extractUploadedAssetUrl({ data: { url: "https://example.com/d.jpg" } })).toBe("https://example.com/d.jpg");
  });
});

describe("buildInitialSurveyPayload", () => {
  it("maps onboarding fields to the backend client payload using datetime windows", () => {
    const payload = buildInitialSurveyPayload({
      primaryGoal: "Weight Loss",
      cardNumber: "4111111111111111",
      cardCvv: "123",
      cardExpiry: "2027-12-01",
      weight: "165 lbs",
      availabilityWindows: [
        {
          start_dt: "2026-05-04T13:00:00.000Z",
          end_dt: "2026-05-04T14:00:00.000Z",
          repeats_weekly: true,
          recurrence_end_dt: null,
        },
      ],
    });
    expect(payload.fitness_goals.goal_enum).toBe("weight loss");
    expect(payload.payment_information.ccnum).toBe("4111111111111111");
    expect(payload.initial_health_metric.weight).toBe(165);
    expect(payload.availabilities[0].start_dt).toBe("2026-05-04T13:00:00.000Z");
    expect(payload.availabilities[0].end_dt).toBe("2026-05-04T14:00:00.000Z");
    expect(payload.availabilities[0].repeats_weekly).toBe(true);
  });
});
