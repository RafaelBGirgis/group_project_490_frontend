import { useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useRef, useState, useMemo } from "react";
import { Navbar, SkeletonMessage } from "../components";
import { fetchMe } from "../api/client";
import {
  blockAccount,
  fetchAllConversations,
  fetchBlockStatus,
  fetchMessages,
  fetchPublicAccount,
  formatChatTimestamp,
  getConversationWithAccount,
  markMessagesRead,
  sendMessage,
  unblockAccount,
} from "../api/chat";
import { apiPost, withQuery } from "../api/api";
import { ROLE_THEMES } from "../components/theme";
import { getCoachAccessState, getImmediateCoachAccessState } from "../utils/roleAccess";
import { getImmediateRoleState, resolveRoleState } from "../utils/sessionAuth";
import { getLastRoleContext } from "../utils/sessionCache";

export default function MessagesPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedAccount = searchParams.get("account");
  const immediateRoleState = getImmediateRoleState();
  const immediateCoachAccess = getImmediateCoachAccessState();
  const lastRoleContext = getLastRoleContext();

  const [account, setAccount] = useState(null);
  const [loadingAccount, setLoadingAccount] = useState(true);
  const [roleState, setRoleState] = useState(immediateRoleState);
  const [canSwitchToCoach, setCanSwitchToCoach] = useState(
    immediateCoachAccess.canAccessCoach
  );
  const [canSwitchToAdmin, setCanSwitchToAdmin] = useState(immediateRoleState.hasAdminRole);

  useEffect(() => {
    fetchMe()
      .then(async (me) => {
        setAccount(me);
        const roleState = await resolveRoleState().catch(() => immediateRoleState);
        setRoleState(roleState);
        const coachAccess = await getCoachAccessState(me, roleState).catch(
          () => immediateCoachAccess
        );
        setCanSwitchToCoach(coachAccess.canAccessCoach);
        setCanSwitchToAdmin(Boolean(roleState.hasAdminRole));
      })
      .catch(() => {})
      .finally(() => setLoadingAccount(false));
  }, []);

  const accountRole = !account
    ? null
    : account.admin_id
      ? "admin"
      : account.coach_id
        ? "coach"
        : "client";
  const fallbackRole = roleState.hasAdminRole
    ? "admin"
    : roleState.hasCoachRole
      ? "coach"
      : "client";
  const navbarRole =
    lastRoleContext?.role ||
    (accountRole === "admin" ? fallbackRole : accountRole);
  const role = accountRole || fallbackRole;
  const theme = ROLE_THEMES[role] || ROLE_THEMES.client;
  const navbarSwitchOptions =
    navbarRole === "coach"
      ? [
          { label: "Client", to: "/client" },
          ...(canSwitchToAdmin ? [{ label: "Admin", to: "/admin" }] : []),
        ]
      : navbarRole === "admin"
        ? [
            ...(canSwitchToCoach ? [{ label: "Coach", to: "/coach" }] : []),
            ...(roleState.hasClientRole ? [{ label: "Client", to: "/client" }] : []),
          ]
      : [
          ...(canSwitchToCoach ? [{ label: "Coach", to: "/coach" }] : []),
          ...(canSwitchToAdmin ? [{ label: "Admin", to: "/admin" }] : []),
        ];
  const dashboardContextAction = lastRoleContext
    ? {
        label:
          lastRoleContext.role === "admin"
            ? "Admin Dashboard"
            : lastRoleContext.role === "coach"
            ? "Coach Dashboard"
            : "Client Dashboard",
        to: lastRoleContext.dashboardPath,
      }
    : null;

  const [conversations, setConversations] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [loadingConvos, setLoadingConvos] = useState(true);
  const [chatError, setChatError] = useState("");

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

  // ── Messages ───────────────────────────────────────────────────────────────
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
        if (!cancelled) {
          setMessages(next);
          // Mark as read after the initial fetch so the unread badge clears.
          if (initial) markMessagesRead(activeChat.id);
        }
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
    // Slowed from 4s → 10s; we re-poll on focus so a returning user still
    // sees fresh messages immediately. The 4s cadence was hammering the
    // backend even when the tab was idle in the background.
    const intervalId = window.setInterval(loadMessages, 10000);
    const onFocus = () => loadMessages();
    window.addEventListener("focus", onFocus);
    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      window.removeEventListener("focus", onFocus);
    };
  }, [activeChat?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Partner profile ────────────────────────────────────────────────────────
  const [partnerOverride, setPartnerOverride] = useState(null);
  useEffect(() => {
    setPartnerOverride(null);
    if (!activeChat?.partner_account_id) return;
    if (activeChat.partner_pfp_url || activeChat.partner_age != null || activeChat.partner_gender) return;
    let cancelled = false;
    fetchPublicAccount(activeChat.partner_account_id).then((profile) => {
      if (!cancelled) setPartnerOverride(profile);
    });
    return () => { cancelled = true; };
  }, [activeChat?.id, activeChat?.partner_account_id]);

  const partnerProfile = useMemo(() => {
    if (!activeChat) return null;
    return {
      id: activeChat.partner_account_id,
      name: partnerOverride?.name || activeChat.partner_name || "Account",
      pfp_url: partnerOverride?.pfp_url || activeChat.partner_pfp_url || null,
      age: partnerOverride?.age ?? activeChat.partner_age ?? null,
      gender: partnerOverride?.gender || activeChat.partner_gender || null,
      is_admin: !!(partnerOverride?.is_admin ?? activeChat.partner_is_admin),
      is_verified_coach: !!(partnerOverride?.is_verified_coach ?? activeChat.partner_is_verified_coach),
      is_client: !!(partnerOverride?.is_client ?? activeChat.partner_is_client),
      role: partnerOverride?.is_coach
        ? "coach"
        : partnerOverride?.is_client
          ? "client"
          : activeChat.partner_role || "user",
    };
  }, [activeChat, partnerOverride]);

  // ── Block status ───────────────────────────────────────────────────────────
  const [blockStatus, setBlockStatus] = useState({
    i_blocked_them: false,
    they_blocked_me: false,
  });

  useEffect(() => {
    if (!activeChat?.partner_account_id) return;
    let cancelled = false;
    const refresh = async () => {
      const s = await fetchBlockStatus(activeChat.partner_account_id);
      if (!cancelled)
        setBlockStatus({ i_blocked_them: !!s.i_blocked_them, they_blocked_me: !!s.they_blocked_me });
    };
    refresh();
    // Block status changes are rare (user has to explicitly tap a button).
    // 5s polling was excessive — block UI just needs to be eventually
    // consistent, so 30s cuts 83% of round trips.
    const intervalId = window.setInterval(refresh, 30000);
    return () => { cancelled = true; window.clearInterval(intervalId); };
  }, [activeChat?.partner_account_id]);

  // ── Block / report actions ─────────────────────────────────────────────────
  const [reportedPartnerIds, setReportedPartnerIds] = useState(new Set());
  const partnerAlreadyReported = activeChat?.partner_account_id
    ? reportedPartnerIds.has(activeChat.partner_account_id)
    : false;

  const [showBlockModal, setShowBlockModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [actionBusy, setActionBusy] = useState(false);
  const [actionMessage, setActionMessage] = useState("");

  const handleConfirmBlock = async () => {
    if (!activeChat?.partner_account_id || actionBusy) return;
    setActionBusy(true);
    setActionMessage("");
    try {
      await blockAccount(activeChat.partner_account_id);
      const s = await fetchBlockStatus(activeChat.partner_account_id);
      setBlockStatus({ i_blocked_them: !!s.i_blocked_them, they_blocked_me: !!s.they_blocked_me });
      setShowBlockModal(false);
      setActionMessage("Account blocked. The chat is read-only.");
    } catch (err) {
      setActionMessage(err.message || "Could not block this account.");
    } finally {
      setActionBusy(false);
    }
  };

  const handleUnblock = async () => {
    if (!activeChat?.partner_account_id || actionBusy) return;
    setActionBusy(true);
    setActionMessage("");
    try {
      await unblockAccount(activeChat.partner_account_id);
      const s = await fetchBlockStatus(activeChat.partner_account_id);
      setBlockStatus({ i_blocked_them: !!s.i_blocked_them, they_blocked_me: !!s.they_blocked_me });
      setActionMessage("Account unblocked. You can send messages again.");
    } catch (err) {
      setActionMessage(err.message || "Could not unblock this account.");
    } finally {
      setActionBusy(false);
    }
  };

  const handleSubmitReport = async () => {
    if (!activeChat?.partner_account_id || actionBusy) return;
    if (!reportReason.trim()) { setActionMessage("Please add a short reason."); return; }
    setActionBusy(true);
    setActionMessage("");
    try {
      await apiPost(
        withQuery(`/roles/shared/account/report/${activeChat.partner_account_id}`, {
          reason: reportReason.trim(),
        }),
      );
      setReportedPartnerIds((prev) => {
        const next = new Set(prev);
        next.add(activeChat.partner_account_id);
        return next;
      });
      setShowReportModal(false);
      setReportReason("");
      setActionMessage("Report submitted. Thanks for letting us know.");
    } catch (err) {
      setActionMessage(err.message || "Could not submit the report.");
    } finally {
      setActionBusy(false);
    }
  };

  // ── Send ───────────────────────────────────────────────────────────────────
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

  // ── Helpers ────────────────────────────────────────────────────────────────
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

  // ── Render ─────────────────────────────────────────────────────────────────
  if (loadingAccount) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: "#080D19" }}>
        <Navbar
          role={navbarRole}
          userName="?"
          hideProfile={Boolean(immediateRoleState.hasAdminRole)}
          switchOptions={navbarSwitchOptions}
          contextAction={dashboardContextAction}
        />
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="h-[calc(100vh-120px)] rounded-2xl border border-white/6 bg-[#0F1729] animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#080D19" }}>
      <Navbar
        role={navbarRole}
        userName={userInitials}
        hideProfile={Boolean(account?.admin_id)}
        switchOptions={navbarSwitchOptions}
        contextAction={dashboardContextAction}
      />

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
                {/* Chat header */}
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
                    {(partnerProfile.age != null || partnerProfile.gender) ? (
                      <p className="text-gray-500 text-[10px] uppercase tracking-wider">
                        {partnerProfile.age != null ? partnerProfile.age : null}
                        {partnerProfile.age != null && partnerProfile.gender ? " · " : null}
                        {partnerProfile.gender || null}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2">
                    {partnerProfile.role === "coach" && partnerProfile.id ? (
                      <button
                        onClick={() => navigate(`/coaches/${partnerProfile.id}`)}
                        className="text-xs text-gray-400 hover:text-white border border-white/10 rounded-lg px-3 py-1.5 transition-colors"
                      >
                        View Profile
                      </button>
                    ) : null}
                    {!partnerAlreadyReported && !blockStatus.they_blocked_me ? (
                      <button
                        onClick={() => { setActionMessage(""); setShowReportModal(true); }}
                        className="text-xs font-medium text-red-300 hover:text-red-200 border border-red-500/30 bg-red-500/10 rounded-lg px-3 py-1.5 transition-colors"
                      >
                        Report
                      </button>
                    ) : null}
                    {blockStatus.they_blocked_me ? null : blockStatus.i_blocked_them ? (
                      <button
                        onClick={handleUnblock}
                        disabled={actionBusy}
                        className="text-xs font-medium text-emerald-300 hover:text-emerald-200 border border-emerald-500/30 bg-emerald-500/10 rounded-lg px-3 py-1.5 transition-colors disabled:opacity-60"
                      >
                        {actionBusy ? "..." : "Unblock"}
                      </button>
                    ) : (
                      <button
                        onClick={() => { setActionMessage(""); setShowBlockModal(true); }}
                        className="text-xs font-medium text-amber-300 hover:text-amber-200 border border-amber-500/30 bg-amber-500/10 rounded-lg px-3 py-1.5 transition-colors"
                      >
                        Block
                      </button>
                    )}
                  </div>
                </div>

                {actionMessage ? (
                  <div className="px-6 pt-3 text-xs text-slate-300">{actionMessage}</div>
                ) : null}

                {/* Messages */}
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
                        <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
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

                {/* Input */}
                <div className="px-6 py-4 border-t border-white/5">
                  {blockStatus.they_blocked_me ? (
                    <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                      This account has blocked you. The conversation is read-only.
                    </div>
                  ) : blockStatus.i_blocked_them ? (
                    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300 flex items-center justify-between gap-4">
                      <span>You blocked this account. Unblock to send messages.</span>
                      <button
                        onClick={handleUnblock}
                        disabled={actionBusy}
                        className="shrink-0 rounded-lg bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                      >
                        {actionBusy ? "..." : "Unblock"}
                      </button>
                    </div>
                  ) : (
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
                        className="px-5 py-3 rounded-xl text-sm font-medium text-white transition disabled:cursor-not-allowed"
                        style={{ backgroundColor: sending || !draft.trim() ? "#1e3a5f" : theme.accent }}
                      >
                        {sending ? "..." : "Send"}
                      </button>
                    </form>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {showBlockModal ? (
        <Modal
          title={`Block ${partnerProfile?.name || "this account"}?`}
          onClose={() => !actionBusy && setShowBlockModal(false)}
        >
          <p className="text-sm text-slate-300">
            They won&apos;t be able to send you messages. Past messages stay visible in read-only
            mode. Any active coaching relationship will end.
          </p>
          <div className="mt-4 flex justify-end gap-2">
            <button
              onClick={() => setShowBlockModal(false)}
              disabled={actionBusy}
              className="rounded-lg border border-white/10 bg-[rgba(255,255,255,0.03)] px-4 py-2 text-xs font-medium text-slate-300 hover:bg-white/5 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmBlock}
              disabled={actionBusy}
              className="rounded-lg bg-amber-600 hover:bg-amber-500 px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"
            >
              {actionBusy ? "Blocking..." : "Block"}
            </button>
          </div>
        </Modal>
      ) : null}

      {showReportModal ? (
        <Modal
          title={`Report ${partnerProfile?.name || "this account"}`}
          onClose={() => !actionBusy && setShowReportModal(false)}
        >
          <p className="text-sm text-slate-300">
            Tell us what happened. Reports are reviewed by an admin.
          </p>
          <textarea
            value={reportReason}
            onChange={(e) => setReportReason(e.target.value)}
            rows={5}
            placeholder="Describe the issue..."
            className="mt-3 w-full rounded-lg border border-white/10 bg-[#0A1020] px-3 py-2 text-sm text-white outline-none focus:border-red-400/40 focus:ring-2 focus:ring-red-500/10"
          />
          <div className="mt-4 flex justify-end gap-2">
            <button
              onClick={() => { setShowReportModal(false); setReportReason(""); }}
              disabled={actionBusy}
              className="rounded-lg border border-white/10 bg-[rgba(255,255,255,0.03)] px-4 py-2 text-xs font-medium text-slate-300 hover:bg-white/5 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmitReport}
              disabled={actionBusy || !reportReason.trim()}
              className="rounded-lg bg-red-600 hover:bg-red-500 px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"
            >
              {actionBusy ? "Submitting..." : "Submit Report"}
            </button>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0F1729] p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <h3 className="text-base font-semibold text-white">{title}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300" aria-label="Close">
            ×
          </button>
        </div>
        <div className="mt-3">{children}</div>
      </div>
    </div>
  );
}
