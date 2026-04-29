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

  it("reuses the same chat id for the same relationship", async () => {
    mockFetchOk({ chat_id: 42 });

    const first = await createConversation(99, { id: 7, name: "Coach A", role: "coach" }, { accountId: 1, role: "client" });
    const second = await createConversation(99, { id: 7, name: "Coach A", role: "coach" }, { accountId: 1, role: "client" });

    expect(first.id).toBe(42);
    expect(second.id).toBe(42);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it("formats timestamps in Eastern Time", () => {
    const formatted = formatChatTimestamp("2026-04-28T16:30:00.000Z", { includeZone: true });
    expect(formatted).toBe("12:30 PM ET");
  });
});
