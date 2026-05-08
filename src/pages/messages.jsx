import { useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useRef, useState, useMemo } from "react";
import { Navbar, SkeletonMessage } from "../components";
import { fetchMe } from "../api/client";
import {
  fetchAllConversations,
  fetchMessages,
  fetchPublicAccount,
  formatChatTimestamp,
  getConversationWithAccount,
  sendMessage,
} from "../api/chat";
import { ROLE_THEMES } from "../components/theme";
import { getCoachAccessState } from "../utils/roleAccess";

/**
 * Unified chat page. Replaces the role-split client_chat / coach_chat pages.
 * Conversations come from /roles/shared/chat/conversations and include each
 * partner's public profile (name, pfp_url, age, gender, role).
 */
export default function MessagesPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedAccount = searchParams.get("account");

  const [account, setAccount] = useState(null);
  const [loadingAccount, setLoadingAccount] = useState(true);
  const [canSwitchToCoach, setCanSwitchToCoach] = useState(false);

  useEffect(() => {
    fetchMe()
      .then(async (me) => {
        setAccount(me);
        const coachAccess = await getCoachAccessState(me);
        setCanSwitchToCoach(coachAccess.canAccessCoach);
      })
      .catch(() => {})
      .finally(() => setLoadingAccount(false));
  }, []);

  // Pick the role used for navbar/theme. Admin wins if present (admins may also
  // hold client/coach roles on the same account, but their dashboard is admin).
  const role = account?.admin_id
    ? "admin"
    : account?.coach_id
      ? "coach"
      : "client";
  const theme = ROLE_THEMES[role] || ROLE_THEMES.client;

  const [conversations, setConversations] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [loadingConvos, setLoadingConvos] = useState(true);
  const [chatError, setChatError] = useState("");

  // Load full conversation list. Always re-runs when the URL ?account changes
  // so deep-links from find_coach / pending requests / public profile open
  // straight to the right thread.
  useEffect(() => {
    if (!account) return;

    let cancelled = false;
    setLoadingConvos(true);
    setChatError("");

    (async () => {
      try {
        let convos = await fetchAllConversations();

        let nextActiveChat = null;
        if (preselectedAccount) {
          nextActiveChat =
            convos.find(
              (c) => String(c.partner_account_id) === String(preselectedAccount),
            ) || null;

          if (!nextActiveChat) {
            // Brand-new chat: ensure the row exists, then re-fetch the list so
            // the partner's profile is populated by the backend.
            const ensured = await getConversationWithAccount(
              Number(preselectedAccount),
              { account_id: Number(preselectedAccount) },
            ).catch(() => null);
            if (ensured) {
              convos = await fetchAllConversations();
              nextActiveChat =
                convos.find(
                  (c) => String(c.partner_account_id) === String(preselectedAccount),
                ) || null;
            }
          }
        }

        if (cancelled) return;

        setConversations(convos);
        if (nextActiveChat) {
          setActiveChat(nextActiveChat);
        } else if (convos.length > 0) {
          setActiveChat((current) =>
            current && convos.some((c) => c.id === current.id) ? current : convos[0],
          );
        } else {
          setActiveChat(null);
        }
      } catch (error) {
        if (cancelled) return;
        setConversations([]);
        setActiveChat(null);
        setChatError(error.message || "Unable to load conversations.");
      } finally {
        if (!cancelled) setLoadingConvos(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [account, preselectedAccount]);

  // ── Messages for the active chat ───────────────────────────────────────────
  const [messages, setMessages] = useState([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (!activeChat) return;
    let cancelled = false;

    setMessages([]);
    setLoadingMsgs(true);

    const loadMessages = async ({ initial = false } = {}) => {
      try {
        const next = await fetchMessages(activeChat.id);
        if (!cancelled) setMessages(next);
      } catch (error) {
        if (!cancelled && initial) {
          setMessages([]);
          setChatError(error.message || "Unable to load messages.");
        }
      } finally {
        if (!cancelled && initial) setLoadingMsgs(false);
      }
    };

    loadMessages({ initial: true });
    const intervalId = window.setInterval(loadMessages, 4000);
    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [activeChat?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Lazy-fetch partner profile if the conversation row didn't bring one yet
  // (defensive — the unified endpoint should always populate it, but a freshly
  // ensured chat that came back through the legacy normalize path may not).
  const [partnerOverride, setPartnerOverride] = useState(null);
  useEffect(() => {
    setPartnerOverride(null);
    if (!activeChat?.partner_account_id) return;
    if (activeChat.partner_pfp_url || activeChat.partner_age != null || activeChat.partner_gender) return;
    let cancelled = false;
    fetchPublicAccount(activeChat.partner_account_id).then((profile) => {
      if (!cancelled) setPartnerOverride(profile);
    });
    return () => {
      cancelled = true;
    };
  }, [activeChat?.id, activeChat?.partner_account_id]);

  const partnerProfile = useMemo(() => {
    if (!activeChat) return null;
    return {
      id: activeChat.partner_account_id,
      name: partnerOverride?.name || activeChat.partner_name || "Account",
      pfp_url: partnerOverride?.pfp_url || activeChat.partner_pfp_url || null,
      age: partnerOverride?.age ?? activeChat.partner_age ?? null,
      gender: partnerOverride?.gender || activeChat.partner_gender || null,
      role: partnerOverride?.is_coach
        ? "coach"
        : partnerOverride?.is_client
          ? "client"
          : activeChat.partner_role || "user",
    };
  }, [activeChat, partnerOverride]);

  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!draft.trim() || !activeChat || sending) return;
    const text = draft.trim();
    setDraft("");
    setSending(true);
    setChatError("");

    try {
      const sent = await sendMessage(activeChat.id, text);
      setMessages((prev) => [...prev, sent]);
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeChat.id
            ? { ...c, last_message: text, last_message_at: sent.created_at, unread_count: 0 }
            : c,
        ),
      );
      setActiveChat((prev) =>
        prev && prev.id === activeChat.id
          ? { ...prev, last_message: text, last_message_at: sent.created_at, unread_count: 0 }
          : prev,
      );
    } catch (error) {
      setChatError(error.message || "Unable to send message.");
    } finally {
      setSending(false);
    }
  };

  const getInitials = (name) =>
    name ? name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() : "?";

  const userInitials = getInitials(account?.name);
  const partnerTheme = partnerProfile
    ? ROLE_THEMES[partnerProfile.role] || ROLE_THEMES.client
    : ROLE_THEMES.client;

  const bubbleTheme = (msg) => {
    const senderRole =
      msg.from_account_id === account?.id || msg.from_account_id === 0
        ? role
        : partnerProfile?.role || "client";
    return ROLE_THEMES[senderRole] || ROLE_THEMES.client;
  };

  if (loadingAccount) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: "#080D19" }}>
        <Navbar role={role} userName="?" />
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="h-[calc(100vh-120px)] rounded-2xl border border-white/6 bg-[#0F1729] animate-pulse" />
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
          {/* Conversation list */}
          <div className="w-80 shrink-0 flex flex-col rounded-2xl border border-white/6 bg-[#0F1729]">
            <div className="px-4 py-4 border-b border-white/5">
              <h2 className="text-lg font-bold text-white">Messages</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                {conversations.length} conversation{conversations.length !== 1 ? "s" : ""}
              </p>
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
                  const convoTheme = ROLE_THEMES[convo.partner_role] || ROLE_THEMES.client;
                  return (
                    <button
                      key={convo.id}
                      onClick={() => setActiveChat(convo)}
                      className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-colors border-b border-white/3 ${
                        isActive ? "bg-white/5" : "hover:bg-white/3"
                      }`}
                    >
                      {convo.partner_pfp_url ? (
                        <img
                          src={convo.partner_pfp_url}
                          alt={convo.partner_name}
                          className="w-10 h-10 rounded-full shrink-0 object-cover"
                        />
                      ) : (
                        <div
                          className="w-10 h-10 rounded-full shrink-0 flex items-center justify-center text-white text-sm font-bold"
                          style={{ backgroundColor: convoTheme.accent }}
                        >
                          {getInitials(convo.partner_name)}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center">
                          <p className="text-white text-sm font-medium truncate">{convo.partner_name}</p>
                          <span className="text-gray-500 text-[10px] shrink-0 ml-2">
                            {formatChatTimestamp(convo.last_message_at)}
                          </span>
                        </div>
                        <p className="text-gray-400 text-xs truncate mt-0.5">
                          {convo.last_message || (
                            <span className="italic text-gray-600">No messages yet</span>
                          )}
                        </p>
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

          {/* Active chat */}
          <div className="flex-1 flex flex-col rounded-2xl border border-white/6 bg-[#0F1729]">
            {!activeChat || !partnerProfile ? (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-gray-500 text-sm">Select a conversation to start chatting</p>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 px-6 py-4 border-b border-white/5">
                  {partnerProfile.pfp_url ? (
                    <img
                      src={partnerProfile.pfp_url}
                      alt={partnerProfile.name}
                      className="w-9 h-9 rounded-full object-cover"
                    />
                  ) : (
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold"
                      style={{ backgroundColor: partnerTheme.accent }}
                    >
                      {getInitials(partnerProfile.name)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold text-sm truncate">{partnerProfile.name}</p>
                    <p className="text-gray-500 text-[10px] uppercase tracking-wider">
                      {partnerProfile.role}
                      {partnerProfile.age != null ? <> · {partnerProfile.age}</> : null}
                      {partnerProfile.gender ? <> · {partnerProfile.gender}</> : null}
                    </p>
                  </div>
                  {partnerProfile.role === "coach" && partnerProfile.id ? (
                    <button
                      onClick={() => navigate(`/coaches/${partnerProfile.id}`)}
                      className="text-xs text-gray-400 hover:text-white border border-white/10 rounded-lg px-3 py-1.5 transition-colors"
                    >
                      View Profile
                    </button>
                  ) : null}
                </div>

                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                  {loadingMsgs ? (
                    <>
                      <SkeletonMessage align="left" />
                      <SkeletonMessage align="right" />
                      <SkeletonMessage align="left" />
                    </>
                  ) : messages.length === 0 ? (
                    <p className="text-gray-500 text-sm text-center py-10">No messages yet. Say hello!</p>
                  ) : (
                    messages.map((msg) => {
                      const isMe = msg.from_account_id === account?.id || msg.from_account_id === 0;
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
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSend();
                    }}
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
                      className="px-5 py-3 rounded-xl text-sm font-medium text-white transition disabled:cursor-not-allowed"
                      style={{
                        backgroundColor: sending || !draft.trim() ? "#1e3a5f" : theme.accent,
                      }}
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
