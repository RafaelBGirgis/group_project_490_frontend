import { apiDelete, apiGet, apiPatch, apiPost, withQuery } from "./api";
import { getToken } from "./auth";

export async function fetchConversationWithAccount(accountId, fallback = {}) {
  if (!accountId) return null;

  try {
    const result = await apiGet(`/roles/shared/chat/by-account/${accountId}`);
    return normalizeConversation(result, fallback);
  } catch (error) {
    if (error?.status === 404) {
      return null;
    }
    throw error;
  }
}

export async function fetchConversations(_accountId, _role = "client", options = {}) {
  const partnerAccounts = Array.isArray(options.partnerAccounts)
    ? options.partnerAccounts.filter((item) => item?.account_id)
    : [];

  if (partnerAccounts.length === 0) {
    return [];
  }

  const conversations = await Promise.all(
    partnerAccounts.map((partner) =>
      getConversationWithAccount(partner.account_id, partner).catch(() => null)
    )
  );

  return conversations
    .filter(Boolean)
    .sort((a, b) => {
      const aTime = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
      const bTime = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
      return bTime - aTime;
    });
}

export async function getConversationWithAccount(accountId, partner = {}) {
  return fetchConversationWithAccount(accountId, partner);
}

export function cacheConversationForAccount() {}

export function updateConversationPreview() {}

export async function fetchMessages(chatId, { skip = 0, limit = 100 } = {}) {
  const result = await apiGet(withQuery(`/roles/shared/chat/messages/${chatId}`, { skip, limit }));
  const messages = Array.isArray(result?.messages) ? result.messages : [];
  return messages.map((message) => ({
    id: message.id,
    from_account_id: message.from_account_id,
    content: message.message_text,
    created_at: message.last_updated || new Date().toISOString(),
    is_read: message.is_read,
  }));
}

export async function sendMessage(chatId, content) {
  const result = await apiPost(withQuery(`/roles/shared/chat/messages/${chatId}`, {
    message_text: content,
  }));
  const createdAt = new Date().toISOString();
  return {
    id: result?.message_id,
    from_account_id: result?.from_account_id,
    content: result?.message_text,
    created_at: createdAt,
    is_read: true,
  };
}

export function formatChatTimestamp(value, { includeZone = false } = {}) {
  if (!value) return "";
  try {
    const date = new Date(value);
    const formatted = date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      timeZone: "America/New_York",
    });
    return includeZone ? `${formatted} ET` : formatted;
  } catch {
    return "";
  }
}

function readJson(key) {
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function normalizeConversation(result, fallback = {}) {
  if (!result || typeof result !== "object") return null;

  const chatId = result.chat_id ?? result.id ?? result.chat?.id;
  if (!chatId) return null;

  const lastMessage =
    result.last_message?.message_text ||
    result.last_message?.content ||
    result.last_message_text ||
    result.preview ||
    "";
  const lastMessageAt =
    result.last_message?.last_updated ||
    result.last_message?.created_at ||
    result.last_message_at ||
    result.updated_at ||
    null;

  return {
    id: Number(chatId),
    partner_id:
      fallback.id ??
      fallback.partner_id ??
      result.partner_id ??
      result.account_id ??
      null,
    partner_account_id:
      fallback.account_id ??
      fallback.accountId ??
      result.account_id ??
      null,
    partner_name:
      fallback.name ||
      fallback.partner_name ||
      result.partner_name ||
      result.account_name ||
      result.name ||
      "Conversation",
    partner_role:
      fallback.role ||
      fallback.partner_role ||
      result.partner_role ||
      "client",
    last_message: lastMessage,
    last_message_at: lastMessageAt,
    unread_count: Number(result.unread_count ?? 0),
  };
}

/* relationship management */

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

/* blocks */

export async function blockAccount(accountId) {
  return apiPost(`/roles/shared/blocks/${accountId}`);
}

export async function unblockAccount(accountId) {
  return apiDelete(`/roles/shared/blocks/${accountId}`);
}

export async function listBlockedAccounts() {
  try {
    const result = await apiGet(`/roles/shared/blocks`);
    return Array.isArray(result?.blocked) ? result.blocked : [];
  } catch {
    return [];
  }
}

/* shared account updates */

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
  const token = getToken();
  const API_BASE = import.meta.env.PROD ? "https://api.till-failure.us" : "";
  const formData = new FormData();
  formData.append("file", file);
  const headers = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}/roles/shared/account/update_pfp`, {
    method: "POST",
    credentials: "include",
    headers,
    body: formData,
  });
  if (!res.ok) throw new Error("Upload failed");
  return res.json();
}
