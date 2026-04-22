import { useNavigate, useSearchParams } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { Navbar, SkeletonMessage } from "../components";
import { fetchMe } from "../api/client";
import { fetchConversations, fetchMessages, sendMessage } from "../api/chat";
import { ROLE_THEMES } from "../components/theme";

export default function ClientChatPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedClient = searchParams.get("client");

  /* ── auth + account ──────────────────────────────────────────────── */
  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("jwt");
    if (!token) { navigate("/login"); return; }

    fetchMe()
      .then((me) => {
        setAccount(me);
        // No role checking needed - routing ensures only clients access this page
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [navigate]);

  const role = "client";
  const theme = ROLE_THEMES.client;

  /* ── conversations ───────────────────────────────────────────────── */
  const [conversations, setConversations] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [loadingConvos, setLoadingConvos] = useState(true);

  useEffect(() => {
    if (!account) return;
    fetchConversations(account.id, "client")
      .then((convos) => {
        setConversations(convos);
        // Auto-select conversation if preselected or first one
        if (preselectedClient) {
          const match = convos.find((c) => String(c.partner_id) === preselectedClient);
          if (match) setActiveChat(match);
          else if (convos.length > 0) setActiveChat(convos[0]);
        } else if (convos.length > 0) {
          setActiveChat(convos[0]);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingConvos(false));
  }, [account, preselectedClient]);

  /* ── messages ────────────────────────────────────────────────────── */
  const [messages, setMessages] = useState([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (!activeChat) return;
    setLoadingMsgs(true);
    fetchMessages(activeChat.id)
      .then(setMessages)
      .catch(() => {})
      .finally(() => setLoadingMsgs(false));
  }, [activeChat]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /* ── send ────────────────────────────────────────────────────────── */
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!draft.trim() || !activeChat || sending) return;
    const text = draft.trim();
    setDraft("");
    setSending(true);

    // Optimistic add
    const tempMsg = {
      id: Date.now(),
      from_account_id: account.id,
      content: text,
      created_at: new Date().toISOString(),
      is_read: true,
    };
    setMessages((prev) => [...prev, tempMsg]);

    // Update conversation preview
    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeChat.id
          ? { ...c, last_message: text, last_message_at: "Just now", unread_count: 0 }
          : c
      )
    );

    try {
      await sendMessage(activeChat.id, text);
    } catch {
      // Message already shown optimistically
    } finally {
      setSending(false);
    }
  };

  /* ── initials helper ─────────────────────────────────────────────── */
  const getInitials = (name) =>
    name ? name.split(" ").map((n) => n[0]).join("").toUpperCase() : "?";

  const userInitials = getInitials(account?.name);
  const partnerTheme = activeChat ? ROLE_THEMES[activeChat.partner_role] || ROLE_THEMES.client : ROLE_THEMES.client;
  const bubbleTheme = (msg) => {
    const senderRole = msg.from_account_id === account?.id || msg.from_account_id === 0 ? role : activeChat?.partner_role || "client";
    return ROLE_THEMES[senderRole] || ROLE_THEMES.client;
  };

  /* ── format time ─────────────────────────────────────────────────── */
  const formatTime = (iso) => {
    try {
      const d = new Date(iso);
      return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    } catch {
      return "";
    }
  };

  /* ── loading state ───────────────────────────────────────────────── */
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
      <Navbar role={role} userName={userInitials} />

      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex gap-4 h-[calc(100vh-120px)]">

          {/* ─── Conversation List (Left Sidebar) ─────────────────── */}
          <div className="w-80 shrink-0 flex flex-col rounded-2xl border border-white/6 bg-[#0F1729]">
            {/* Header */}
            <div className="px-4 py-4 border-b border-white/5">
              <h2 className="text-lg font-bold text-white">Client Messages</h2>
              <p className="text-xs text-gray-500 mt-0.5">{conversations.length} conversation{conversations.length !== 1 ? "s" : ""}</p>
            </div>

            {/* List */}
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
                      {/* Avatar */}
                      <div
                        className="w-10 h-10 rounded-full shrink-0 flex items-center justify-center text-white text-sm font-bold"
                        style={{
                          backgroundColor: ROLE_THEMES[convo.partner_role]?.accent || ROLE_THEMES.client.accent,
                        }}
                      >
                        {getInitials(convo.partner_name)}
                      </div>
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center">
                          <p className="text-white text-sm font-medium truncate">{convo.partner_name}</p>
                          <span className="text-gray-500 text-[10px] shrink-0 ml-2">{convo.last_message_at}</span>
                        </div>
                        <p className="text-gray-400 text-xs truncate mt-0.5">{convo.last_message}</p>
                      </div>
                      {/* Unread badge */}
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

          {/* ─── Chat Area (Right) ────────────────────────────────── */}
          <div className="flex-1 flex flex-col rounded-2xl border border-white/6 bg-[#0F1729]">
            {!activeChat ? (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-gray-500 text-sm">Select a conversation to start chatting</p>
              </div>
            ) : (
              <>
                {/* Chat Header */}
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

                {/* Messages */}
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
                              {formatTime(msg.created_at)}
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

                {/* Input */}
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