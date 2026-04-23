/**
 * Chat API calls.
 * Same pattern — real endpoint first, mock fallback.
 *
 * Backend endpoints (under /roles/shared/chat):
 *   POST /new_chat         — create a new chat for a relationship
 *   POST /send_message/{chatId} — send a message (query param: message_text)
 *   GET  /get_messages/{chatId} — paginated messages
 */

import { apiGet, apiPost, apiPatch, apiDelete } from "./api";

/* ─── create a new chat ─────────────────────────────────────────── */

export async function createChat(relationshipId) {
  try {
    // Backend: POST /roles/shared/chat/new_chat → { chat_id }
    return await apiPost("/roles/shared/chat/new_chat", {
      relationship_id: relationshipId,
    });
  } catch {
    return { chat_id: Date.now() };
  }
}

/* ─── conversations list ─────────────────────────────────────────── */

export async function fetchConversations(accountId, role = "client") {
  try {
    // No direct "list conversations" endpoint in backend — keep mock for now
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

export async function fetchMessages(chatId, skip = 0, limit = 50) {
  try {
    // Backend: GET /roles/shared/chat/get_messages/{chat_id}?skip=&limit=
    const data = await apiGet(
      `/roles/shared/chat/get_messages/${chatId}?skip=${skip}&limit=${limit}`
    );
    // Backend returns { messages: [...] }
    return data.messages ?? data;
  } catch {
    const now = new Date();
    const t = (mins) => {
      const d = new Date(now.getTime() - mins * 60000);
      return d.toISOString();
    };

    if (chatId === 1) {
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
      return [
        { id: 1, from_account_id: 202, content: "Hit a new PR today!", created_at: t(1440), is_read: true },
        { id: 2, from_account_id: 0,   content: "Congratulations! That's excellent progress.", created_at: t(1435), is_read: true },
      ];
    } else {
      return [
        { id: 1, from_account_id: 101, content: "Hey! How's your training going this week?", created_at: t(120), is_read: true },
        { id: 2, from_account_id: 0,   content: "Pretty good! Hit a new PR on bench press 195 lbs.", created_at: t(115), is_read: true },
        { id: 3, from_account_id: 101, content: "That's awesome! You've been making great progress.", created_at: t(110), is_read: true },
      ];
    }
  }
}

/* ─── send a message ─────────────────────────────────────────────── */

export async function sendMessage(chatId, content) {
  try {
    // Backend: POST /roles/shared/chat/send_message/{chat_id}?message_text=...
    // The backend takes message_text as a query parameter
    const encoded = encodeURIComponent(content);
    return await apiPost(
      `/roles/shared/chat/send_message/${chatId}?message_text=${encoded}`,
      {}
    );
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

/* ─── relationship management ────────────────────────────────────── */

export async function deleteCoachRequest(requestId) {
  try {
    return await apiDelete(`/roles/shared/client_coach_relationship/delete_coach_request/${requestId}`);
  } catch {
    return { message: "Request deleted successfully" };
  }
}

export async function terminateRelationship(relationshipId) {
  try {
    return await apiPost(
      `/roles/shared/client_coach_relationship/terminate_relationship/${relationshipId}`,
      {}
    );
  } catch {
    return { details: "success" };
  }
}

/* ─── shared account updates ─────────────────────────────────────── */

export async function updateAccount(payload) {
  try {
    // Backend: PATCH /roles/shared/account/update
    // payload: { age?, email?, bio?, pfp_url?, gender? }
    return await apiPatch("/roles/shared/account/update", payload);
  } catch {
    return null;
  }
}

export async function uploadProfilePicture(file) {
  const token = localStorage.getItem("jwt");
  const API_BASE = import.meta.env.PROD ? "https://api.till-failure.us" : "";
  const formData = new FormData();
  formData.append("file", file);
  const headers = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}/roles/shared/account/update_pfp`, {
    method: "POST",
    headers,
    body: formData,
  });
  if (!res.ok) throw new Error("Upload failed");
  return res.json();
}
