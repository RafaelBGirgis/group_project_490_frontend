import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createConversation,
  fetchMessages,
  formatChatTimestamp,
  getConversationWithAccount,
  sendMessage,
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

  it("posts to the documented create-new-chat route", async () => {
    mockFetchOk({ chat_id: 42, account_id: 9 });
    await createConversation(9);
    const [url, opts] = global.fetch.mock.calls[0];
    expect(url).toContain("/roles/shared/chat/new_chat");
    expect(opts.method).toBe("POST");
    expect(JSON.parse(opts.body)).toEqual({ account_id: 9 });
  });

  it("uses the by-account route to fetch or create a conversation", async () => {
    mockFetchOk({ chat_id: 42, account_id: 9, messages: [] });
    await getConversationWithAccount(9, { name: "Coach A", role: "coach" });
    const [url, opts] = global.fetch.mock.calls[0];
    expect(url).toContain("/roles/shared/chat/by-account/9");
    expect(opts?.method ?? "GET").toBe("GET");
  });

  it("gets messages from the documented chat messages route", async () => {
    mockFetchOk({ messages: [{ id: 3, from_account_id: 9, message_text: "Hello", last_updated: "2026-05-01T12:00:00Z", is_read: true }] });
    const messages = await fetchMessages(42);
    const [url, opts] = global.fetch.mock.calls[0];
    expect(url).toContain("/roles/shared/chat/messages/42");
    expect(opts?.method ?? "GET").toBe("GET");
    expect(messages[0].content).toBe("Hello");
  });

  it("posts messages to the documented chat messages route", async () => {
    mockFetchOk({ message_id: 7, from_account_id: 9, message_text: "Ping" });
    const message = await sendMessage(42, "Ping");
    const [url, opts] = global.fetch.mock.calls[0];
    expect(url).toContain("/roles/shared/chat/messages/42");
    expect(opts.method).toBe("POST");
    expect(message.content).toBe("Ping");
  });


  it("formats timestamps in Eastern Time", () => {
    const formatted = formatChatTimestamp("2026-04-28T16:30:00.000Z", { includeZone: true });
    expect(formatted).toBe("12:30 PM ET");
  });
});
