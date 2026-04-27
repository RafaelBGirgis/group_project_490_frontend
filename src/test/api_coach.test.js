import { describe, it, expect, vi } from "vitest";
import {
  buildCoachInformationPayload,
  buildCoachRequestPayload,
  buildCoachWorkoutActivities,
  buildCoachWorkoutPayload,
  createCoachRequest,
  fetchCoachProfile,
  saveCoachAvailability,
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
    expect(url).toBe("/roles/coach/me");
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
    expect(url).toBe("/roles/coach/request_coach_creation");
    expect(opts.method).toBe("POST");
    expect(JSON.parse(opts.body)).toEqual(payload);
  });
});

describe("updateCoachInformation", () => {
  it("patches /roles/coach/information", async () => {
    mockFetchOk({ coach_id: 7 });
    await updateCoachInformation({ specialties: ["Powerlifting"] });
    const [url, opts] = global.fetch.mock.calls[0];
    expect(url).toBe("/roles/coach/information");
    expect(opts.method).toBe("PATCH");
    expect(JSON.parse(opts.body)).toEqual({ specialties: ["Powerlifting"] });
  });
});

describe("saveCoachAvailability", () => {
  it("uses the coach information patch route", async () => {
    mockFetchOk({ coach_id: 7 });
    await saveCoachAvailability(7, [{ time: "9AM", slots: Array(7).fill("available") }]);
    const [url, opts] = global.fetch.mock.calls[0];
    expect(url).toBe("/roles/coach/information");
    expect(opts.method).toBe("PATCH");
    expect(JSON.parse(opts.body).availabilities.length).toBeGreaterThan(0);
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
