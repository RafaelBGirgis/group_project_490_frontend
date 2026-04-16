/**
 * Tests for src/api/client.js
 *
 * Validates: auth (fetchMe), workout plan loading, activity logging,
 * coach info, availability, and meals.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  fetchMe,
  fetchClientProfile,
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
} from "../api/client";

/* ─── helpers ────────────────────────────────────────────────────────── */

function mockFetchOk(data) {
  global.fetch = vi.fn(() =>
    Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(data) })
  );
}

function mockFetchFail(status = 500) {
  global.fetch = vi.fn(() =>
    Promise.resolve({ ok: false, status, json: () => Promise.resolve({ detail: "err" }) })
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

  it("returns real data when API succeeds", async () => {
    const mock = { step_count: 5000, calories_burned: 300, calories_consumed: 1200, calories_goal: 2000 };
    mockFetchOk(mock);
    const result = await fetchTelemetryToday(1);
    expect(result).toEqual(mock);
  });
});

/* ═══════════════════════════════════════════════════════════════════════
   WORKOUT PLAN
   ═══════════════════════════════════════════════════════════════════════ */

describe("fetchWorkoutPlan", () => {
  it("returns mock plan with activities for Monday (index 0)", async () => {
    mockFetchFail();
    const plan = await fetchWorkoutPlan(1, 0);
    expect(plan.strata_name).toBeTruthy();
    expect(plan.activities).toBeDefined();
    expect(plan.activities.length).toBeGreaterThan(0);
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
  it("posts to correct endpoint with activity id", async () => {
    mockFetchOk({ success: true });
    localStorage.setItem("jwt", "tok");
    await logWorkoutActivity(42, 7);
    const [url, opts] = global.fetch.mock.calls[0];
    expect(url).toBe("/roles/client/42/workout-log");
    expect(JSON.parse(opts.body)).toEqual({ workout_plan_activity_id: 7 });
  });

  it("returns success on fallback", async () => {
    mockFetchFail();
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
    expect(result).toEqual(coach);
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
  it("posts to update_client_information", async () => {
    mockFetchOk({ success: true });
    localStorage.setItem("jwt", "tok");
    const slots = [{ time: "9AM", slots: Array(7).fill("available") }];
    await saveAvailability(1, slots);
    const [url] = global.fetch.mock.calls[0];
    expect(url).toBe("/roles/client/update_client_information");
  });
});

/* ═══════════════════════════════════════════════════════════════════════
   MEALS
   ═══════════════════════════════════════════════════════════════════════ */

describe("fetchMealsToday", () => {
  it("returns mock meals with required fields on fallback", async () => {
    mockFetchFail();
    const meals = await fetchMealsToday(1);
    expect(meals.length).toBeGreaterThan(0);
    meals.forEach((m) => {
      expect(m.meal_type).toBeTruthy();
      expect(m.meal_name).toBeTruthy();
      expect(typeof m.calories).toBe("number");
    });
  });
});

/* ═══════════════════════════════════════════════════════════════════════
   COACH BROWSE
   ═══════════════════════════════════════════════════════════════════════ */

describe("fetchAvailableCoaches", () => {
  it("returns mock coaches with full profile data on fallback", async () => {
    mockFetchFail();
    const coaches = await fetchAvailableCoaches();
    expect(coaches.length).toBeGreaterThanOrEqual(3);
    coaches.forEach((c) => {
      expect(c.coach_id).toBeDefined();
      expect(c.name).toBeTruthy();
      expect(c.specialties.length).toBeGreaterThan(0);
      expect(typeof c.rating_avg).toBe("number");
      expect(c.pricing.amount).toBeDefined();
      expect(c.certifications.length).toBeGreaterThan(0);
    });
  });
});

describe("requestCoach", () => {
  it("posts to correct endpoint", async () => {
    mockFetchOk({ success: true });
    localStorage.setItem("jwt", "tok");
    await requestCoach(10, 5);
    const [url, opts] = global.fetch.mock.calls[0];
    expect(url).toBe("/roles/client/10/coach-request");
    expect(JSON.parse(opts.body)).toEqual({ coach_id: 5 });
  });
});
