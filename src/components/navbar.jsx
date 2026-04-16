import { useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { ROLE_THEMES } from "./theme";
import clientLogo from "../assets/Client Logo.svg";
import coachLogo from "../assets/Coach Logo.svg";
import adminLogo from "../assets/Admin Logo.svg";

/* ── mock notifications (until backend ships an endpoint) ────────── */
const MOCK_NOTIFICATIONS = {
  client: [
    { id: 1, type: "workout",  text: "Your coach updated your workout plan",       time: "10 min ago", read: false },
    { id: 2, type: "session",  text: "Upcoming session with your coach tomorrow at 9 AM", time: "1 hr ago",  read: false },
    { id: 3, type: "meal",     text: "New meal plan assigned for this week",         time: "3 hrs ago", read: true },
    { id: 4, type: "message",  text: "You have a new message from your coach",      time: "Yesterday", read: true },
  ],
  coach: [
    { id: 1, type: "client",   text: "New client request from Jordan Lee",          time: "5 min ago", read: false },
    { id: 2, type: "review",   text: "Sarah Chen left you a 5-star review",         time: "2 hrs ago", read: false },
    { id: 3, type: "session",  text: "Session with John Doe in 30 minutes",         time: "30 min ago", read: false },
    { id: 4, type: "message",  text: "New message from Mike Torres",                time: "Yesterday", read: true },
  ],
  admin: [
    { id: 1, type: "request",  text: "New coach promotion request from Marcus Webb", time: "15 min ago", read: false },
    { id: 2, type: "report",   text: "New report filed against Coach X",            time: "1 hr ago",  read: false },
    { id: 3, type: "account",  text: "5 new accounts registered today",             time: "3 hrs ago", read: true },
  ],
};

const NOTIF_ICONS = {
  workout: "🏋️",
  session: "📅",
  meal:    "🍽️",
  message: "💬",
  client:  "👤",
  review:  "⭐",
  request: "📋",
  report:  "🚩",
  account: "👥",
};

export function Navbar({ role = "client", userName = "JD", onMessage, onNotification, notifications: externalNotifs }) {
  const theme = ROLE_THEMES[role];
  const navigate = useNavigate();
  const [showNotifs, setShowNotifs] = useState(false);
  const [notifs, setNotifs] = useState(externalNotifs ?? MOCK_NOTIFICATIONS[role] ?? []);
  const dropdownRef = useRef(null);

  // Update notifs if external prop changes
  useEffect(() => {
    if (externalNotifs) setNotifs(externalNotifs);
  }, [externalNotifs]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!showNotifs) return;
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowNotifs(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showNotifs]);

  // Close on Escape
  useEffect(() => {
    if (!showNotifs) return;
    const handler = (e) => e.key === "Escape" && setShowNotifs(false);
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [showNotifs]);

  const unreadCount = notifs.filter((n) => !n.read).length;

  const markAllRead = () => {
    setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const markOneRead = (id) => {
    setNotifs((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const switchText =
    role === "client" ? "Switch to Coach" :
    role === "coach"  ? "Switch to Client" :
    null;

  const handleSwitch = () => {
    if (role === "client") navigate("/coach");
    if (role === "coach")  navigate("/client");
  };

  const handleProfileClick = () => {
    if (role === "coach") navigate("/coach-profile");
    else if (role === "admin") navigate("/admin");
    else navigate("/profile");
  };

  const logo =
    role === "coach" ? coachLogo :
    role === "admin" ? adminLogo :
    clientLogo;

  const messagesRoute =
    role === "coach" ? "/coach/messages" :
    role === "client" ? "/client/messages" :
    "/chat";

  return (
    <nav className="relative z-10 border-b border-white/5 bg-[#0B1120]">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
        {/* Left: Logo + Brand + Role Badge */}
        <div className="flex items-center gap-3">
          <img
            src={logo}
            alt="Till Failure"
            onClick={() => navigate(`/${role}`)}
            className="h-9 cursor-pointer transition hover:scale-105"
          />
          <p
            onClick={() => navigate(`/${role}`)}
            className="cursor-pointer text-base font-semibold transition hover:opacity-80"
            style={{ color: theme.accentText }}
          >
            Till Failure
          </p>
          <span className={`px-2.5 py-0.5 rounded text-[11px] font-bold tracking-wider uppercase ${theme.badge} ${theme.badgeText}`}>
            {theme.label}
          </span>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-3">
          {switchText && (
            <button
              onClick={handleSwitch}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${theme.btnOutline}`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
              {switchText}
            </button>
          )}

          {/* Message Button */}
          <button
            onClick={onMessage || (() => navigate(messagesRoute))}
            className="relative w-10 h-10 flex items-center justify-center rounded-xl border border-white/10 bg-[rgba(255,255,255,0.03)] text-slate-400 hover:bg-[rgba(255,255,255,0.06)] hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </button>

          {/* Notification Button + Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => {
                if (onNotification) { onNotification(); return; }
                setShowNotifs((prev) => !prev);
              }}
              className="relative w-10 h-10 flex items-center justify-center rounded-xl border border-white/10 bg-[rgba(255,255,255,0.03)] text-slate-400 hover:bg-[rgba(255,255,255,0.06)] hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {unreadCount > 0 && (
                <span
                  className="absolute -top-1 -right-1 w-5 h-5 text-white text-[10px] font-bold rounded-full flex items-center justify-center"
                  style={{ backgroundColor: theme.accent, boxShadow: `0 0 10px ${theme.accent}60` }}
                >
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Dropdown Panel */}
            {showNotifs && (
              <div className="absolute right-0 top-12 w-80 rounded-2xl border border-white/10 bg-[#0D1424] shadow-[0_0_60px_rgba(0,0,0,0.5)] overflow-hidden z-50">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
                  <p className="text-sm font-bold text-white">Notifications</p>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllRead}
                      className="text-[10px] font-medium transition hover:opacity-80"
                      style={{ color: theme.accentText }}
                    >
                      Mark all read
                    </button>
                  )}
                </div>

                {/* List */}
                <div className="max-h-80 overflow-y-auto">
                  {notifs.length === 0 ? (
                    <p className="text-gray-500 text-sm text-center py-8">No notifications</p>
                  ) : (
                    notifs.map((n) => (
                      <button
                        key={n.id}
                        onClick={() => {
                          markOneRead(n.id);
                          // Navigate based on type
                          if (n.type === "message") { setShowNotifs(false); navigate(messagesRoute); }
                          else if (n.type === "workout" || n.type === "session") { setShowNotifs(false); navigate(`/${role}`); }
                        }}
                        className={`w-full text-left px-4 py-3 flex items-start gap-3 border-b border-white/3 transition-colors hover:bg-white/3 ${
                          !n.read ? "bg-white/[0.02]" : ""
                        }`}
                      >
                        {/* Icon */}
                        <span className="text-base mt-0.5 shrink-0">
                          {NOTIF_ICONS[n.type] ?? "📌"}
                        </span>
                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs leading-relaxed ${!n.read ? "text-white" : "text-gray-400"}`}>
                            {n.text}
                          </p>
                          <p className="text-[10px] text-gray-600 mt-1">{n.time}</p>
                        </div>
                        {/* Unread dot */}
                        {!n.read && (
                          <span
                            className="w-2 h-2 rounded-full shrink-0 mt-1.5"
                            style={{ backgroundColor: theme.accent }}
                          />
                        )}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Avatar */}
          <button
            onClick={handleProfileClick}
            className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-sm transition-transform hover:scale-105"
            style={{ backgroundColor: theme.accent, boxShadow: `0 0 20px ${theme.accent}50` }}
            title="Open Profile"
          >
            {userName}
          </button>
        </div>
      </div>
    </nav>
  );
}
