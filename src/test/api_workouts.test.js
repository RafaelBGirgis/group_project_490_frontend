/**
 * Tests for src/api/workouts.js
 *
 * Validates: preset library, CRUD operations, duplicate, assignment,
 * and exercise database integrity.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
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

/* ─── helpers ────────────────────────────────────────────────────────── */

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
  it("returns presets from mock fallback when API fails", async () => {
    mockFetchFail();
    const presets = await fetchPresetWorkouts();
    expect(presets.length).toBeGreaterThanOrEqual(5);
    presets.forEach((p) => {
      expect(p.id).toBeTruthy();
      expect(p.name).toBeTruthy();
      expect(p.type).toBe("preset");
      expect(p.exercises.length).toBeGreaterThan(0);
      expect(p.difficulty).toBeTruthy();
      expect(p.category).toBeTruthy();
    });
  });

  it("returns API data when endpoint succeeds", async () => {
    const mockData = [{ id: "p1", name: "Test Preset", type: "preset", exercises: [] }];
    mockFetchOk(mockData);
    const result = await fetchPresetWorkouts();
    expect(result).toEqual(mockData);
  });

  it("every preset exercise has required fields", async () => {
    mockFetchFail();
    const presets = await fetchPresetWorkouts();
    presets.forEach((p) => {
      p.exercises.forEach((ex) => {
        expect(ex.name).toBeTruthy();
        expect(typeof ex.sets).toBe("number");
        expect(typeof ex.reps).toBe("number");
        expect(ex.intensity_measure).toBeTruthy();
      });
    });
  });
});

/* ═══════════════════════════════════════════════════════════════════════
   MY WORKOUTS (CRUD)
   ═══════════════════════════════════════════════════════════════════════ */

describe("fetchMyWorkouts", () => {
  it("returns mock custom workouts on API failure", async () => {
    mockFetchFail();
    const workouts = await fetchMyWorkouts("client", 1);
    expect(workouts.length).toBeGreaterThanOrEqual(1);
    workouts.forEach((w) => {
      expect(w.type).toBe("custom");
      expect(w.exercises.length).toBeGreaterThan(0);
    });
  });
});

describe("createWorkout", () => {
  it("returns success with id on API failure (mock fallback)", async () => {
    mockFetchFail();
    const workout = { name: "Test", exercises: [{ name: "Bench Press", sets: 3, reps: 10 }] };
    const result = await createWorkout("client", 1, workout);
    expect(result.success).toBe(true);
    expect(result.id).toBeTruthy();
    expect(result.name).toBe("Test");
  });

  it("posts to correct endpoint", async () => {
    mockFetchOk({ success: true, id: "new-1" });
    localStorage.setItem("jwt", "test-token");
    await createWorkout("coach", 42, { name: "Plan" });
    expect(global.fetch).toHaveBeenCalledWith(
      "/roles/coach/42/workouts",
      expect.objectContaining({ method: "POST" })
    );
  });
});

describe("updateWorkout", () => {
  it("returns success on fallback", async () => {
    mockFetchFail();
    const result = await updateWorkout("client", 1, "w-1", { name: "Updated" });
    expect(result.success).toBe(true);
  });
});

describe("deleteWorkout", () => {
  it("returns success on fallback", async () => {
    mockFetchFail();
    const result = await deleteWorkout("client", 1, "w-1");
    expect(result.success).toBe(true);
  });
});

/* ═══════════════════════════════════════════════════════════════════════
   DUPLICATE PRESET
   ═══════════════════════════════════════════════════════════════════════ */

describe("duplicatePreset", () => {
  it("copies a preset into custom with (Copy) suffix", async () => {
    mockFetchFail();
    const presets = await fetchPresetWorkouts();
    const first = presets[0];
    const result = await duplicatePreset("client", 1, first.id);
    expect(result.success).toBe(true);
    expect(result.type).toBe("custom");
    expect(result.name).toContain("(Copy)");
  });

  it("returns failure for unknown preset id", async () => {
    mockFetchFail();
    const result = await duplicatePreset("client", 1, "nonexistent");
    expect(result.success).toBe(false);
  });
});

/* ═══════════════════════════════════════════════════════════════════════
   COACH ASSIGNMENT
   ═══════════════════════════════════════════════════════════════════════ */

describe("assignWorkout", () => {
  it("returns success with assigned count on fallback", async () => {
    mockFetchFail();
    const result = await assignWorkout(1, "w-1", [1, 2, 3]);
    expect(result.success).toBe(true);
    expect(result.assigned_count).toBe(3);
  });
});

describe("fetchAssignableClients", () => {
  it("returns mock client list on fallback", async () => {
    mockFetchFail();
    const clients = await fetchAssignableClients(1);
    expect(clients.length).toBeGreaterThan(0);
    clients.forEach((c) => {
      expect(c.id).toBeTruthy();
      expect(c.name).toBeTruthy();
    });
  });
});

describe("fetchAssignedWorkouts", () => {
  it("returns assigned workouts with client lists on fallback", async () => {
    mockFetchFail();
    const assigned = await fetchAssignedWorkouts(1);
    expect(assigned.length).toBeGreaterThan(0);
    assigned.forEach((a) => {
      expect(a.workout_name).toBeTruthy();
      expect(a.assigned_to.length).toBeGreaterThan(0);
    });
  });
});
