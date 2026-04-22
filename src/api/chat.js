/**
 * Chat API calls.
 * Same pattern — real endpoint first, mock fallback.
 */

import { apiGet, apiPost } from "./api";

/* ─── conversations list ─────────────────────────────────────────── */

export async function fetchConversations(accountId, role = "client") {
  try {
    return await apiGet(`/chat/conversations?account_id=${accountId}`);
  } catch {
    // Mock data based on role
    if (role === "coach") {
      return [
        {
          id: 1,
          partner_id: 201,
          partner_name: "John Doe",
          partner_role: "client",
          last_message: "Thanks for the program update!",
          last_message_at: "10:32 AM",
          unread_count: 2,
        },
        {
          id: 2,
          partner_id: 202,
          partner_name: "Sarah Chen",
          partner_role: "client",
          last_message: "Hit a new PR today!",
          last_message_at: "Yesterday",
          unread_count: 0,
        },
        {
          id: 3,
          partner_id: 203,
          partner_name: "Mike Johnson",
          partner_role: "client",
          last_message: "Question about my diet plan",
          last_message_at: "Mon",
          unread_count: 1,
        },
      ];
    } else {
      // Client conversations
      return [
        {
          id: 1,
          partner_id: 101,
          partner_name: "Coach Rafael",
          partner_role: "coach",
          last_message: "Great work today! Keep it up.",
          last_message_at: "10:32 AM",
          unread_count: 2,
        },
        {
          id: 2,
          partner_id: 102,
          partner_name: "Coach Sandra",
          partner_role: "coach",
          last_message: "Your meal plan for next week is ready.",
          last_message_at: "Yesterday",
          unread_count: 0,
        },
      ];
    }
  }
}

/* ─── messages for a conversation ────────────────────────────────── */

export async function fetchMessages(chatId) {
  try {
    return await apiGet(`/chat/${chatId}/messages`);
  } catch {
    const now = new Date();
    const t = (mins) => {
      const d = new Date(now.getTime() - mins * 60000);
      return d.toISOString();
    };

    // Mock messages based on chatId
    if (chatId === 1) {
      // Coach conversation with client (John Doe)
      return [
        { id: 1, from_account_id: 201, content: "Hey Coach! How's my progress looking?", created_at: t(120), is_read: true },
        { id: 2, from_account_id: 0,   content: "Looking great! You're hitting all your targets.", created_at: t(115), is_read: true },
        { id: 3, from_account_id: 201, content: "Thanks! I hit a new PR on bench today - 195 lbs!", created_at: t(110), is_read: true },
        { id: 4, from_account_id: 0,   content: "That's awesome! Keep pushing those weights.", created_at: t(60), is_read: true },
        { id: 5, from_account_id: 201, content: "Will do! What's next in my program?", created_at: t(55), is_read: true },
        { id: 6, from_account_id: 0,   content: "I updated it with more volume. Check your dashboard.", created_at: t(30), is_read: false },
        { id: 7, from_account_id: 0,   content: "Great work today! Keep it up.", created_at: t(5), is_read: false },
      ];
    } else if (chatId === 2) {
      // Coach conversation with client (Sarah Chen)
      return [
        { id: 1, from_account_id: 202, content: "Hit a new PR today!", created_at: t(1440), is_read: true },
        { id: 2, from_account_id: 0,   content: "Congratulations! That's excellent progress.", created_at: t(1435), is_read: true },
      ];
    } else if (chatId === 3) {
      // Coach conversation with client (Mike Johnson)
      return [
        { id: 1, from_account_id: 203, content: "Question about my diet plan", created_at: t(30), is_read: false },
      ];
    } else {
      // Client conversations with coaches
      return [
        { id: 1, from_account_id: 101, content: "Hey! How's your training going this week?", created_at: t(120), is_read: true },
        { id: 2, from_account_id: 0,   content: "Pretty good! Hit a new PR on bench press 195 lbs.", created_at: t(115), is_read: true },
        { id: 3, from_account_id: 101, content: "That's awesome! You've been making great progress.", created_at: t(110), is_read: true },
        { id: 4, from_account_id: 101, content: "I updated your program for next week. Added some volume on the accessories.", created_at: t(60), is_read: true },
        { id: 5, from_account_id: 0,   content: "Sounds good, I'll check it out.", created_at: t(55), is_read: true },
        { id: 6, from_account_id: 101, content: "Also, make sure you're hitting your protein target at least 160g.", created_at: t(30), is_read: false },
        { id: 7, from_account_id: 101, content: "Great work today! Keep it up.", created_at: t(5), is_read: false },
      ];
    }
  }
}

/* ─── send a message ─────────────────────────────────────────────── */

export async function sendMessage(chatId, content) {
  try {
    return await apiPost(`/chat/${chatId}/messages`, { content });
  } catch {
    return {
      id: Date.now(),
      from_account_id: 0,
      content,
      created_at: new Date().toISOString(),
      is_read: true,
    };
  }
}
