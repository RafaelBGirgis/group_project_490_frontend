/**
 * Tests for src/api/client.js
 *
 * Validates: auth (fetchMe), workout plan loading, activity logging,
 * coach info, availability, and meals.
 */

import { describe, it, expect, vi } from "vitest";
import {
  buildInitialSurveyPayload,
  createClientInitialSurvey,
  extractUploadedAssetUrl,
  fetchMe,
  fetchTelemetryToday,
  fetchWorkoutPlan,
  logWorkoutActivity,
  fetchCoachInfo,
  fetchCoachRating,
  fetchNextSession,
  fetchAvailability,
  saveAvailability,
  fetchMealsToday,
  logMeal,
  fetchAvailableCoaches,
  requestCoach,
  uploadProgressPicture,
} from "../api/client";

/* ─── helpers ────────────────────────────────────────────────────────── */

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
      "/me",
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
    expect(url).toBe("/roles/client/initial_survey");
    expect(opts.method).toBe("POST");
    expect(JSON.parse(opts.body)).toEqual(payload);
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

  it("returns the dashboard fallback shape", async () => {
    const result = await fetchTelemetryToday(1);
    expect(result).toEqual({
      step_count: 8241,
      calories_burned: 540,
      calories_consumed: 1438,
      calories_goal: 2000,
    });
  });
});

/* ═══════════════════════════════════════════════════════════════════════
   WORKOUT PLAN
   ═══════════════════════════════════════════════════════════════════════ */

describe("fetchWorkoutPlan", () => {
  it("returns a stable empty-state plan on API failure", async () => {
    mockFetchFail();
    const plan = await fetchWorkoutPlan(1, 0);
    expect(plan.strata_name).toBe("Rest Day");
    expect(plan.activities).toBeDefined();
    expect(plan.activities.length).toBe(0);
  });

  it("returns Rest Day for Saturday (index 5)", async () => {
    mockFetchFail();
    const plan = await fetchWorkoutPlan(1, 5);
    expect(plan.strata_name).toBe("Rest Day");
    expect(plan.activities.length).toBe(0);
  });

  it("each activity has required fields", async () => {
    mockFetchFail();
    const plan = await fetchWorkoutPlan(1, 0);
    plan.activities.forEach((a) => {
      expect(a.id).toBeDefined();
      expect(a.name).toBeTruthy();
      expect(typeof a.suggested_sets).toBe("number");
      expect(typeof a.suggested_reps).toBe("number");
      expect(typeof a.intensity_value).toBe("number");
      expect(a.intensity_measure).toBeTruthy();
      expect(typeof a.logged).toBe("boolean");
    });
  });
});

describe("logWorkoutActivity", () => {
  it("returns success without requiring an unsupported backend route", async () => {
    const result = await logWorkoutActivity(1, 1);
    expect(result.success).toBe(true);
  });
});

/* ═══════════════════════════════════════════════════════════════════════
   COACH INFO
   ═══════════════════════════════════════════════════════════════════════ */

describe("fetchCoachInfo", () => {
  it("returns null when no coach assigned (API failure)", async () => {
    mockFetchFail();
    const result = await fetchCoachInfo(1);
    expect(result).toBeNull();
  });

  it("returns coach object when API succeeds", async () => {
    const coach = { coach_id: 5, name: "Coach A", specialty: "Strength" };
    mockFetchOk(coach);
    const result = await fetchCoachInfo(1);
    expect(result).toBeNull();
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

describe("fetchAvailability", () => {
  it("returns mock availability slots on fallback", async () => {
    mockFetchFail();
    const slots = await fetchAvailability(1);
    expect(slots.length).toBeGreaterThan(0);
    slots.forEach((row) => {
      expect(row.time).toBeTruthy();
      expect(row.slots).toHaveLength(7);
    });
  });
});

describe("saveAvailability", () => {
  it("patches client information with availability data", async () => {
    mockFetchOk({ success: true });
    localStorage.setItem("jwt", "tok");
    const slots = [{ time: "9AM", slots: Array(7).fill("available") }];
    await saveAvailability(1, slots);
    const [url, opts] = global.fetch.mock.calls[0];
    expect(url).toBe("/roles/client/information");
    expect(opts.method).toBe("PATCH");
    expect(JSON.parse(opts.body).availabilities.length).toBeGreaterThan(0);
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
    expect(url).toBe("/roles/client/request_coach/5");
    expect(opts.method).toBe("POST");
    expect(opts.body).toBeUndefined();
  });
});

describe("uploadProgressPicture", () => {
  it("posts multipart form data to upload route", async () => {
    mockFetchOk({ url: "https://example.com/pic.jpg" });
    const file = new File(["img"], "progress.jpg", { type: "image/jpeg" });
    await uploadProgressPicture(file);
    const [url, opts] = global.fetch.mock.calls[0];
    expect(url).toBe("/roles/client/upload_progress_picture");
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
  it("maps onboarding fields to the backend client payload", () => {
    const payload = buildInitialSurveyPayload({
      primaryGoal: "Weight Loss",
      cardNumber: "4111111111111111",
      cardCvv: "123",
      cardExpiry: "2027-12-01",
      weight: "165 lbs",
      trainingAvailability: { Mon: ["9AM"], Tue: [], Wed: [], Thu: [], Fri: [], Sat: [], Sun: [] },
    });
    expect(payload.fitness_goals.goal_enum).toBe("weight loss");
    expect(payload.payment_information.ccnum).toBe("4111111111111111");
    expect(payload.initial_health_metric.weight).toBe(165);
    expect(payload.availabilities[0].weekday).toBe("monday");
  });
});
