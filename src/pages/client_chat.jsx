import { useNavigate, useSearchParams } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { Navbar, SkeletonMessage } from "../components";
import { fetchMe } from "../api/client";
import {
  fetchConversations,
  fetchMessages,
  formatChatTimestamp,
  sendMessage,
  updateConversationPreview,
} from "../api/chat";
import { ROLE_THEMES } from "../components/theme";
import { getCoachAccessState } from "../utils/roleAccess";

export default function ClientChatPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedClient = searchParams.get("client");

  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [canSwitchToCoach, setCanSwitchToCoach] = useState(false);

  useEffect(() => {
    fetchMe()
      .then(async (me) => {
        setAccount(me);
        const coachAccess = await getCoachAccessState(me);
        setCanSwitchToCoach(coachAccess.canAccessCoach);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [navigate]);

  const role = "client";
  const theme = ROLE_THEMES.client;

  const [conversations, setConversations] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [loadingConvos, setLoadingConvos] = useState(true);
  const [chatError, setChatError] = useState("");

  useEffect(() => {
    if (!account) return;
    setLoadingConvos(true);
    setChatError("");
    fetchConversations(account.id, "client", {
      legacyAccountIds: [account.client_id],
    })
      .then((convos) => {
        setConversations(convos);
        if (preselectedClient) {
          const match = convos.find((c) => String(c.partner_id) === preselectedClient);
          if (match) setActiveChat(match);
          else if (convos.length > 0) setActiveChat(convos[0]);
          else setActiveChat(null);
        } else if (convos.length > 0) {
          setActiveChat((current) => current && convos.some((item) => item.id === current.id) ? current : convos[0]);
        } else {
          setActiveChat(null);
        }
      })
      .catch((error) => {
        setConversations([]);
        setActiveChat(null);
        setChatError(error.message || "Unable to load conversations.");
      })
      .finally(() => setLoadingConvos(false));
  }, [account, preselectedClient]);

  const [messages, setMessages] = useState([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (!activeChat) return;
    setLoadingMsgs(true);
    setChatError("");
    fetchMessages(activeChat.id)
      .then(setMessages)
      .catch((error) => {
        setMessages([]);
        setChatError(error.message || "Unable to load messages.");
      })
      .finally(() => setLoadingMsgs(false));
  }, [activeChat]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!draft.trim() || !activeChat || sending) return;
    const text = draft.trim();
    const previewTimestamp = new Date().toISOString();
    const previousPreview = {
      last_message: activeChat.last_message,
      last_message_at: activeChat.last_message_at,
      unread_count: activeChat.unread_count,
    };

    setDraft("");
    setSending(true);
    setChatError("");

    const tempMsg = {
      id: Date.now(),
      from_account_id: account.id,
      content: text,
      created_at: previewTimestamp,
      is_read: true,
    };
    setMessages((prev) => [...prev, tempMsg]);

    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeChat.id
          ? { ...c, last_message: text, last_message_at: previewTimestamp, unread_count: 0 }
          : c
      )
    );
    setActiveChat((prev) =>
      prev && prev.id === activeChat.id
        ? { ...prev, last_message: text, last_message_at: previewTimestamp, unread_count: 0 }
        : prev
    );

    try {
      const sentMessage = await sendMessage(activeChat.id, text);
      setMessages((prev) => prev.map((message) => (message.id === tempMsg.id ? sentMessage : message)));
      updateConversationPreview(
        activeChat.id,
        () => ({
          last_message: text,
          last_message_at: sentMessage.created_at,
          unread_count: 0,
        }),
        { accountId: account.id, role: "client" }
      );
      setConversations((prev) =>
        prev.map((conversation) =>
          conversation.id === activeChat.id
            ? { ...conversation, last_message: text, last_message_at: sentMessage.created_at, unread_count: 0 }
            : conversation
        )
      );
      setActiveChat((prev) =>
        prev && prev.id === activeChat.id
          ? { ...prev, last_message: text, last_message_at: sentMessage.created_at, unread_count: 0 }
          : prev
      );
    } catch (error) {
      setMessages((prev) => prev.filter((message) => message.id !== tempMsg.id));
      setConversations((prev) =>
        prev.map((conversation) =>
          conversation.id === activeChat.id
            ? { ...conversation, ...previousPreview }
            : conversation
        )
      );
      setActiveChat((prev) =>
        prev && prev.id === activeChat.id
          ? { ...prev, ...previousPreview }
          : prev
      );
      setChatError(error.message || "Unable to send message.");
    } finally {
      setSending(false);
    }
  };

  const getInitials = (name) =>
    name ? name.split(" ").map((n) => n[0]).join("").toUpperCase() : "?";

  const userInitials = getInitials(account?.name);
  const partnerTheme = activeChat ? ROLE_THEMES[activeChat.partner_role] || ROLE_THEMES.client : ROLE_THEMES.client;
  const bubbleTheme = (msg) => {
    const senderRole = msg.from_account_id === account?.id || msg.from_account_id === 0 ? role : activeChat?.partner_role || "client";
    return ROLE_THEMES[senderRole] || ROLE_THEMES.client;
  };

  if (loading) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: "#080D19" }}>
        <Navbar role="client" userName="?" />
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex gap-4 h-[calc(100vh-120px)]">
            <div className="w-80 rounded-2xl border border-white/6 bg-[#0F1729] p-4 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-16 bg-white/5 rounded-xl animate-pulse" />
              ))}
            </div>
            <div className="flex-1 rounded-2xl border border-white/6 bg-[#0F1729] p-6 space-y-4">
              <SkeletonMessage align="left" />
              <SkeletonMessage align="right" />
              <SkeletonMessage align="left" />
              <SkeletonMessage align="right" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#080D19" }}>
      <Navbar role={role} userName={userInitials} canSwitchToCoach={canSwitchToCoach} />

      <div className="max-w-7xl mx-auto px-6 py-6">
        {chatError ? (
          <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {chatError}
          </div>
        ) : null}

        <div className="flex gap-4 h-[calc(100vh-120px)]">
          <div className="w-80 shrink-0 flex flex-col rounded-2xl border border-white/6 bg-[#0F1729]">
            <div className="px-4 py-4 border-b border-white/5">
              <h2 className="text-lg font-bold text-white">Client Messages</h2>
              <p className="text-xs text-gray-500 mt-0.5">{conversations.length} conversation{conversations.length !== 1 ? "s" : ""}</p>
            </div>

            <div className="flex-1 overflow-y-auto">
              {loadingConvos ? (
                <div className="p-4 space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-16 bg-white/5 rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : conversations.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-10">No conversations yet</p>
              ) : (
                conversations.map((convo) => {
                  const isActive = activeChat?.id === convo.id;
                  return (
                    <button
                      key={convo.id}
                      onClick={() => setActiveChat(convo)}
                      className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-colors border-b border-white/3 ${
                        isActive ? "bg-white/5" : "hover:bg-white/3"
                      }`}
                    >
                      <div
                        className="w-10 h-10 rounded-full shrink-0 flex items-center justify-center text-white text-sm font-bold"
                        style={{
                          backgroundColor: ROLE_THEMES[convo.partner_role]?.accent || ROLE_THEMES.client.accent,
                        }}
                      >
                        {getInitials(convo.partner_name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center">
                          <p className="text-white text-sm font-medium truncate">{convo.partner_name}</p>
                          <span className="text-gray-500 text-[10px] shrink-0 ml-2">{formatChatTimestamp(convo.last_message_at)}</span>
                        </div>
                        <p className="text-gray-400 text-xs truncate mt-0.5">{convo.last_message}</p>
                      </div>
                      {convo.unread_count > 0 && (
                        <span
                          className="w-5 h-5 rounded-full text-white text-[10px] font-bold flex items-center justify-center shrink-0"
                          style={{ backgroundColor: theme.accent }}
                        >
                          {convo.unread_count}
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <div className="flex-1 flex flex-col rounded-2xl border border-white/6 bg-[#0F1729]">
            {!activeChat ? (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-gray-500 text-sm">Select a conversation to start chatting</p>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 px-6 py-4 border-b border-white/5">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold"
                    style={{
                      backgroundColor: partnerTheme.accent,
                    }}
                  >
                    {getInitials(activeChat.partner_name)}
                  </div>
                  <div>
                    <p className="text-white font-semibold text-sm">{activeChat.partner_name}</p>
                    <p className="text-gray-500 text-[10px] uppercase tracking-wider">
                      {activeChat.partner_role}
                    </p>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                  {loadingMsgs ? (
                    <>
                      <SkeletonMessage align="left" />
                      <SkeletonMessage align="right" />
                      <SkeletonMessage align="left" />
                      <SkeletonMessage align="left" />
                      <SkeletonMessage align="right" />
                    </>
                  ) : messages.length === 0 ? (
                    <p className="text-gray-500 text-sm text-center py-10">
                      No messages yet. Say hello!
                    </p>
                  ) : (
                    messages.map((msg) => {
                      const isMe = msg.from_account_id === account.id || msg.from_account_id === 0;
                      return (
                        <div
                          key={msg.id}
                          className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                        >
                          <div className={`max-w-[70%] ${isMe ? "items-end" : "items-start"} flex flex-col`}>
                            <span className="text-[10px] text-gray-500 mb-1 px-1">
                              {formatChatTimestamp(msg.created_at, { includeZone: true })}
                            </span>
                            <div
                              className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed border border-white/10 backdrop-blur-sm ${
                                isMe ? "rounded-br-md" : "rounded-bl-md"
                              }`}
                              style={{
                                backgroundColor: bubbleTheme(msg).accentLight,
                                color: isMe ? "#F8FAFC" : "#E5E7EB",
                                borderColor: bubbleTheme(msg).accent + "20",
                              }}
                            >
                              {msg.content}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                <div className="px-6 py-4 border-t border-white/5">
                  <form
                    onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                    className="flex items-center gap-3"
                  >
                    <input
                      type="text"
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      placeholder="Type a message..."
                      className="flex-1 rounded-xl border border-white/10 bg-[#0A1020] px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-blue-400/40 focus:ring-2 focus:ring-blue-500/10"
                    />
                    <button
                      type="submit"
                      disabled={!draft.trim() || sending}
                      className="px-5 py-3 rounded-xl text-sm font-medium text-white transition bg-blue-600 hover:bg-blue-700 disabled:bg-blue-900/40 disabled:cursor-not-allowed"
                    >
                      {sending ? "..." : "Send"}
                    </button>
                  </form>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
