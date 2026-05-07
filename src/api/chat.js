import { apiDelete, apiGet, apiPatch, apiPost, withQuery } from "./api";
import { getToken } from "./auth";

export async function fetchConversationWithAccount(accountId, fallback = {}) {
  if (!accountId) return null;

  try {
    const result = await apiGet(`/roles/shared/chat/by-account/${accountId}`);
    return normalizeConversation(result, fallback);
  } catch (error) {
    if (error?.status && error.status !== 404) {
      try {
        const legacyResult = await apiGet(`/roles/shared/chat/chat_with_account/${accountId}`);
        return normalizeConversation(legacyResult, fallback);
      } catch {
        // Fall through to the original error below.
      }
    }
    if (error?.status === 404) {
      return null;
    }
    throw error;
  }
}

export async function fetchConversations(_accountId, _role = "client", options = {}) {
  const partnerAccounts = Array.isArray(options.partnerAccounts)
    ? Array.from(
        new Map(
          options.partnerAccounts
            .filter((item) => item?.account_id)
            .map((item) => [Number(item.account_id), item])
        ).values()
      )
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

export async function createConversation(accountId) {
  const result = await apiPost("/roles/shared/chat/new_chat", {
    account_id: Number(accountId),
  });
  return normalizeConversation(result, { account_id: Number(accountId) });
}

export function cacheConversationForAccount() {}

export function updateConversationPreview() {}

export async function fetchMessages(chatId, { skip = 0, limit = 100 } = {}) {
  let result;
  try {
    result = await apiGet(
      withQuery(`/roles/shared/chat/messages/${chatId}`, { skip, limit })
    );
  } catch (error) {
    if (error?.status === 404 || error?.status === 405) {
      result = await apiGet(
        withQuery(`/roles/shared/chat/get_messages/${chatId}`, { skip, limit })
      );
    } else {
      throw error;
    }
  }
  const messages =
    Array.isArray(result)
      ? result
      : Array.isArray(result?.messages)
        ? result.messages
        : Array.isArray(result?.items)
          ? result.items
          : [];
  return messages.map(normalizeMessage).filter(Boolean);
}

export async function sendMessage(chatId, content) {
  let result;
  try {
    result = await apiPost(
      withQuery(`/roles/shared/chat/messages/${chatId}`, {
        message_text: content,
      })
    );
  } catch (error) {
    if (error?.status === 404 || error?.status === 405) {
      result = await apiPost(
        withQuery(`/roles/shared/chat/send_message/${chatId}`, {
          message_text: content,
        })
      );
    } else {
      throw error;
    }
  }
  return (
    normalizeMessage(result?.message || result?.data || result) || {
      id: result?.message_id ?? result?.id ?? Date.now(),
      from_account_id: result?.from_account_id ?? result?.account_id ?? null,
      content: result?.message_text ?? result?.content ?? content,
      created_at:
        result?.created_at ??
        result?.last_updated ??
        new Date().toISOString(),
      is_read: Boolean(result?.is_read ?? true),
    }
  );
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

function normalizeConversation(result, fallback = {}) {
  if (!result || typeof result !== "object") return null;

  const chatId =
    result.chat_id ??
    result.id ??
    result.chat?.id ??
    result.chat?.chat_id;
  if (!chatId) return null;

  const account =
    result.account ||
    result.partner ||
    result.chat_with ||
    result.other_account ||
    null;
  const lastMessage =
    result.last_message?.message_text ||
    result.last_message?.content ||
    result.messages?.[result.messages.length - 1]?.message_text ||
    result.messages?.[result.messages.length - 1]?.content ||
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
      result.partner?.id ??
      result.account?.id ??
      result.account_id ??
      null,
    partner_account_id:
      fallback.account_id ??
      fallback.accountId ??
      account?.id ??
      result.account_id ??
      null,
    partner_name:
      fallback.name ||
      fallback.partner_name ||
      account?.name ||
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

function normalizeMessage(message) {
  if (!message || typeof message !== "object") return null;

  return {
    id: message.id ?? message.message_id ?? null,
    from_account_id:
      message.from_account_id ??
      message.account_id ??
      message.sender_account_id ??
      null,
    content:
      message.message_text ??
      message.content ??
      message.text ??
      "",
    created_at:
      message.created_at ??
      message.last_updated ??
      message.sent_at ??
      new Date().toISOString(),
    is_read: Boolean(message.is_read ?? true),
  };
}

/* relationship management */

export async function deleteCoachRequest(requestId) {
  try {
    return await apiDelete(`/roles/client/rescind_request/${requestId}`);
  } catch (error) {
    if (error?.status === 404 || error?.status === 405) {
      return apiDelete(`/roles/shared/client_coach_relationship/delete_coach_request/${requestId}`);
    }
    throw error;
  }
}

export async function terminateRelationship(relationshipId) {
  return apiPost(
    `/roles/shared/client_coach_relationship/terminate_relationship/${relationshipId}`,
    {}
  );
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
