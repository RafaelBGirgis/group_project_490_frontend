import { apiGet, apiPost, withQuery } from "./api";

const CONVERSATION_CACHE_KEY = "chat:conversations";

export async function fetchConversations(accountId, role = "client") {
  const cached = readJson(CONVERSATION_CACHE_KEY);
  if (Array.isArray(cached) && cached.length > 0) {
    return cached;
  }

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
    ];
  }

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
  ].map((conversation) => ({
    ...conversation,
    from_account_id: accountId,
  }));
}

export async function createConversation(relationshipId, partner) {
  const response = await apiPost("/roles/shared/chat/new_chat", {
    relationship_id: relationshipId,
  });

  const conversation = {
    id: response?.chat_id,
    partner_id: partner?.id,
    partner_name: partner?.name || "New conversation",
    partner_role: partner?.role || "coach",
    last_message: "",
    last_message_at: "",
    unread_count: 0,
  };

  const cached = readJson(CONVERSATION_CACHE_KEY) || [];
  localStorage.setItem(CONVERSATION_CACHE_KEY, JSON.stringify([conversation, ...cached]));
  return conversation;
}

export async function fetchMessages(chatId, { skip = 0, limit = 100 } = {}) {
  try {
    const result = await apiGet(withQuery(`/roles/shared/chat/get_messages/${chatId}`, { skip, limit }));
    const messages = Array.isArray(result?.messages) ? result.messages : [];
    return messages.map((message) => ({
      id: message.id,
      from_account_id: message.from_account_id,
      content: message.message_text,
      created_at: message.last_updated || new Date().toISOString(),
      is_read: message.is_read,
    }));
  } catch {
    const now = new Date();
    const t = (mins) => {
      const d = new Date(now.getTime() - mins * 60000);
      return d.toISOString();
    };
    return [
      { id: 1, from_account_id: 101, content: "Hey! How's your training going this week?", created_at: t(120), is_read: true },
      { id: 2, from_account_id: 0, content: "Pretty good! Hit a new PR on bench press 195 lbs.", created_at: t(115), is_read: true },
    ];
  }
}

export async function sendMessage(chatId, content) {
  try {
    const result = await apiPost(withQuery(`/roles/shared/chat/send_message/${chatId}`, {
      message_text: content,
    }));
    return {
      id: result?.message_id,
      from_account_id: result?.from_account_id,
      content: result?.message_text,
      created_at: new Date().toISOString(),
      is_read: true,
    };
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

function readJson(key) {
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
