/**
 * Tests for src/api/workouts.js
 *
 * Validates: preset library, CRUD operations, duplicate, assignment,
 * and exercise database integrity.
 */

import { describe, it, expect, vi } from "vitest";
import {
  fetchPresetWorkouts,
  fetchMyWorkouts,
  createWorkout,
  updateWorkout,
  deleteWorkout,
  duplicatePreset,
  assignWorkout,
  fetchAssignableClients,
  fetchAssignedWorkouts,
  EXERCISE_DATABASE,
  MUSCLE_GROUPS,
} from "../api/workouts";

/*  helpers  */

function mockFetchOk(data) {
  global.fetch = vi.fn(() =>
    Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(data) })
  );
}

function mockFetchFail() {
  global.fetch = vi.fn(() =>
    Promise.resolve({ ok: false, status: 500, json: () => Promise.resolve({ detail: "Server error" }) })
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   EXERCISE DATABASE
   ═══════════════════════════════════════════════════════════════════════ */

describe("EXERCISE_DATABASE", () => {
  it("contains at least 30 exercises", () => {
    expect(EXERCISE_DATABASE.length).toBeGreaterThanOrEqual(30);
  });

  it("every exercise has name, muscle_group, and equipment", () => {
    EXERCISE_DATABASE.forEach((ex) => {
      expect(ex.name).toBeTruthy();
      expect(ex.muscle_group).toBeTruthy();
      expect(ex.equipment).toBeTruthy();
    });
  });

  it("every exercise muscle_group is in MUSCLE_GROUPS", () => {
    EXERCISE_DATABASE.forEach((ex) => {
      expect(MUSCLE_GROUPS).toContain(ex.muscle_group);
    });
  });

  it("has no duplicate exercise names", () => {
    const names = EXERCISE_DATABASE.map((e) => e.name);
    const unique = new Set(names);
    expect(unique.size).toBe(names.length);
  });
});

/* ═══════════════════════════════════════════════════════════════════════
   PRESET WORKOUTS
   ═══════════════════════════════════════════════════════════════════════ */

describe("fetchPresetWorkouts", () => {
  it("returns an empty list when no backend preset source exists", async () => {
    mockFetchFail();
    const presets = await fetchPresetWorkouts();
    expect(presets).toEqual([]);
  });

  it("does not expose a frontend preset library anymore", async () => {
    const result = await fetchPresetWorkouts();
    expect(Array.isArray(result)).toBe(true);
    expect(result).toEqual([]);
  });

  it("returns no preset exercises because presets are API-only now", async () => {
    mockFetchFail();
    const presets = await fetchPresetWorkouts();
    expect(presets).toEqual([]);
  });
});

/* ═══════════════════════════════════════════════════════════════════════
   MY WORKOUTS (CRUD)
   ═══════════════════════════════════════════════════════════════════════ */

describe("fetchMyWorkouts", () => {
  it("returns an empty list on API failure when nothing is cached locally", async () => {
    mockFetchFail();
    const workouts = await fetchMyWorkouts("client", 1);
    expect(workouts).toEqual([]);
  });
});

describe("createWorkout", () => {
  it("throws for clients because local mock creation is removed", async () => {
    mockFetchFail();
    const workout = { name: "Test", exercises: [{ name: "Bench Press", sets: 3, reps: 10 }] };
    await expect(createWorkout("client", 1, workout)).rejects.toThrow(
      "Only coaches and admins can publish workouts to the shared library."
    );
  });

  it("posts to correct endpoint", async () => {
    mockFetchOk({ workout_id: 99 });
    localStorage.setItem("jwt", "test-token");
    await createWorkout("coach", 42, {
      name: "Plan",
      description: "Coach plan",
      exercises: [{ name: "Bench Press", weight: 185, intensity_measure: "lbs", estimated_calories_per_unit_frequency: 8, equipment: "Barbell" }],
    });
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/roles/coach/fitness/workout"),
      expect.objectContaining({ method: "POST" })
    );
  });
});

describe("updateWorkout", () => {
  it("throws because the backend has no workout update route", async () => {
    mockFetchFail();
    await expect(updateWorkout("client", 1, "w-1", { name: "Updated" })).rejects.toThrow(
      "The backend route list does not include a workout update endpoint."
    );
  });
});

describe("deleteWorkout", () => {
  it("throws because the backend has no workout delete route", async () => {
    mockFetchFail();
    await expect(deleteWorkout("client", 1, "w-1")).rejects.toThrow(
      "The backend route list does not include a workout delete endpoint."
    );
  });
});

/* ═══════════════════════════════════════════════════════════════════════
   DUPLICATE PRESET
   ═══════════════════════════════════════════════════════════════════════ */

describe("duplicatePreset", () => {
  it("throws because frontend preset duplication is removed", async () => {
    mockFetchFail();
    await expect(duplicatePreset("client", 1, "preset-ppl-push")).rejects.toThrow(
      "Preset workouts are no longer available without backend data."
    );
  });

  it("throws for unknown preset ids as well", async () => {
    mockFetchFail();
    await expect(duplicatePreset("client", 1, "nonexistent")).rejects.toThrow(
      "Preset workouts are no longer available without backend data."
    );
  });
});

/* ═══════════════════════════════════════════════════════════════════════
   COACH ASSIGNMENT
   ═══════════════════════════════════════════════════════════════════════ */

describe("assignWorkout", () => {
  it("creates a workout plan and prescribes it to selected clients", async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 200, headers: { get: () => "application/json" }, json: () => Promise.resolve([{ id: 9, planned_sets: 3, planned_reps: 10 }]), text: () => Promise.resolve("[]") })
      .mockResolvedValueOnce({ ok: true, status: 200, headers: { get: () => "application/json" }, json: () => Promise.resolve({ workout_plan_id: 88 }), text: () => Promise.resolve("{}") })
      .mockResolvedValueOnce({ ok: true, status: 200, headers: { get: () => "application/json" }, json: () => Promise.resolve({ client_workout_plan_id: 101 }), text: () => Promise.resolve("{}") })
      .mockResolvedValueOnce({ ok: true, status: 200, headers: { get: () => "application/json" }, json: () => Promise.resolve({ client_workout_plan_id: 102 }), text: () => Promise.resolve("{}") });

    const result = await assignWorkout(1, 77, [4, 5]);

    expect(global.fetch.mock.calls[1][0]).toContain("/roles/shared/fitness/plan");
    expect(global.fetch.mock.calls[2][0]).toContain("/roles/coach/prescribe_plan");
    expect(result.success).toBe(true);
    expect(result.assigned).toHaveLength(2);
  });
});

describe("fetchAssignableClients", () => {
  it("returns an empty list because the backend has no assignable-clients route", async () => {
    mockFetchFail();
    const clients = await fetchAssignableClients(1);
    expect(clients).toEqual([]);
  });
});

describe("fetchAssignedWorkouts", () => {
  it("returns an empty list because the backend has no assigned-workouts route", async () => {
    mockFetchFail();
    const assigned = await fetchAssignedWorkouts(1);
    expect(assigned).toEqual([]);
  });

  it("groups assigned plans across active clients", async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 200, headers: { get: () => "application/json" }, json: () => Promise.resolve([{ relationship_id: 1, client_id: 4, request_id: 11 }]), text: () => Promise.resolve("[]") })
      .mockResolvedValueOnce({ ok: true, status: 200, headers: { get: () => "application/json" }, json: () => Promise.resolve({ base_account: { name: "Client A" }, fitness_goals: [] }), text: () => Promise.resolve("{}") })
      .mockResolvedValueOnce({ ok: true, status: 200, headers: { get: () => "application/json" }, json: () => Promise.resolve([]), text: () => Promise.resolve("[]") })
      .mockResolvedValueOnce({ ok: true, status: 200, headers: { get: () => "application/json" }, json: () => Promise.resolve([{ id: 91, strata_name: "Assigned Workout 77" }]), text: () => Promise.resolve("[]") });

    const assigned = await fetchAssignedWorkouts(1);

    expect(assigned).toEqual([
      {
        workout_id: 91,
        workout_name: "Assigned Workout 77",
        assigned_to: [{ client_id: 4, name: "Client A" }],
      },
    ]);
  });
});
