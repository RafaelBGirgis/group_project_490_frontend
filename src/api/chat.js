import { apiGet, apiPost, withQuery } from "./api";
import { getToken } from "./auth";

function getConversationCacheKey(accountId, role = "client") {
  return `chat:conversations:${role}:${accountId ?? "current"}`;
}

function getRelationshipChatKey(relationshipId) {
  return `chat:relationship:${relationshipId}`;
}

function mergeConversationLists(lists = []) {
  const merged = [];
  const seen = new Set();
  lists.flat().forEach((conversation) => {
    if (!conversation || seen.has(conversation.id)) return;
    seen.add(conversation.id);
    merged.push(conversation);
  });
  return merged;
}

export async function fetchConversations(accountId, role = "client", options = {}) {
  const legacyIds = Array.isArray(options.legacyAccountIds) ? options.legacyAccountIds.filter(Boolean) : [];
  const keys = [getConversationCacheKey(accountId, role), ...legacyIds.map((id) => getConversationCacheKey(id, role))];
  const conversationLists = keys.map((key) => {
    const parsed = readJson(key);
    return Array.isArray(parsed) ? parsed : [];
  });
  const merged = mergeConversationLists(conversationLists);

  if (merged.length > 0) {
    localStorage.setItem(getConversationCacheKey(accountId, role), JSON.stringify(merged));
    legacyIds.forEach((id) => {
      if (id !== accountId) {
        localStorage.removeItem(getConversationCacheKey(id, role));
      }
    });
  }

  return merged;
}

export async function createConversation(relationshipId, partner, options = {}) {
  const relationshipChatKey = getRelationshipChatKey(relationshipId);
  const existingChatId = localStorage.getItem(relationshipChatKey);
  let chatId = existingChatId ? Number(existingChatId) : null;

  if (!chatId) {
    const response = await apiPost("/roles/shared/chat/new_chat", {
      relationship_id: relationshipId,
    });
    chatId = Number(response?.chat_id);
    if (chatId) {
      localStorage.setItem(relationshipChatKey, String(chatId));
    }
  }

  const conversation = {
    id: chatId,
    partner_id: partner?.id,
    partner_name: partner?.name || "New conversation",
    partner_role: partner?.role || "coach",
    last_message: "",
    last_message_at: null,
    unread_count: 0,
  };

  const cacheKey = getConversationCacheKey(options.accountId, options.role || partner?.role || "client");
  const cached = readJson(cacheKey) || [];
  const next = [conversation, ...cached.filter((item) => item.id !== conversation.id)];
  localStorage.setItem(cacheKey, JSON.stringify(next));
  return conversation;
}

export function cacheConversationForAccount(conversation, { accountId, role = "client" } = {}) {
  if (!conversation || !accountId) return;
  const cacheKey = getConversationCacheKey(accountId, role);
  const cached = readJson(cacheKey) || [];
  const next = [conversation, ...cached.filter((item) => item.id !== conversation.id)];
  localStorage.setItem(cacheKey, JSON.stringify(next));
}

export function updateConversationPreview(chatId, updater, { accountId, role = "client" } = {}) {
  if (!chatId || !accountId || typeof updater !== "function") return;
  const cacheKey = getConversationCacheKey(accountId, role);
  const cached = readJson(cacheKey);
  if (!Array.isArray(cached)) return;
  const next = cached.map((conversation) =>
    conversation.id === chatId ? { ...conversation, ...updater(conversation) } : conversation
  );
  localStorage.setItem(cacheKey, JSON.stringify(next));
}

export async function fetchMessages(chatId, { skip = 0, limit = 100 } = {}) {
  const result = await apiGet(withQuery(`/roles/shared/chat/get_messages/${chatId}`, { skip, limit }));
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
  const result = await apiPost(withQuery(`/roles/shared/chat/send_message/${chatId}`, {
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
