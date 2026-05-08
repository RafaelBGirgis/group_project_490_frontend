import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createConversation,
  formatChatTimestamp,
} from "../api/chat";

function mockFetchOk(data) {
  global.fetch = vi.fn(() =>
    Promise.resolve({
      ok: true,
      status: 200,
      headers: { get: () => "application/json" },
      json: () => Promise.resolve(data),
      text: () => Promise.resolve(JSON.stringify(data)),
    })
  );
}

describe("chat helpers", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });



  it("formats timestamps in Eastern Time", () => {
    const date = new Date("2026-04-28T16:30:00.000Z");
    const expectedTz =
      new Intl.DateTimeFormat(undefined, { timeZoneName: "short" })
        .formatToParts(date)
        .find((p) => p.type === "timeZoneName")?.value || "";
    const formatted = formatChatTimestamp("2026-04-28T16:30:00.000Z", { includeZone: true });
    const expectedTime = date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
    expect(formatted).toBe(expectedTz ? `${expectedTime} ${expectedTz}` : expectedTime);
  });
});
