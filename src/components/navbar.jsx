import { useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { ROLE_THEMES } from "./theme";
import clientLogo from "../assets/Client Logo.svg";
import coachLogo from "../assets/Coach Logo.svg";
import adminLogo from "../assets/Admin Logo.svg";
import {
  queryNotifications,
  readAllNotifications,
  readNotification,
} from "../api/notifications";

const NOTIFICATION_ICONS = {
  payment: CreditCard,
  workout_plan: Dumbbell,
  relationship: Handshake,
  relationship_request_creation: UserPlus,
  relationship_request_deletion: UserMinus,
  relationship_request_denied: CircleX,
  relationship_termination: Unlink,
  chat_message: MessageCircle,
};

function Bell(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 0 0-4-5.7V5a2 2 0 1 0-4 0v.3A6 6 0 0 0 6 11v3.2c0 .5-.2 1-.6 1.4L4 17h5" />
      <path d="M9 17a3 3 0 0 0 6 0" />
    </svg>
  );
}

function BellDot(props) {
  return (
    <span className="relative inline-flex" aria-hidden="true">
      <Bell {...props} />
      <span className="absolute right-0 top-0 h-2 w-2 rounded-full bg-current" />
    </span>
  );
}

function CircleX(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="m9 9 6 6M15 9l-6 6" />
    </svg>
  );
}

function CreditCard(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <path d="M3 10h18M7 14h3" />
    </svg>
  );
}

function Dumbbell(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path d="M2 10v4M5 9v6M19 9v6M22 10v4M7 12h10" />
      <path d="M5 12h2M17 12h2" />
    </svg>
  );
}

function Handshake(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path d="m11 12 2 2a2 2 0 0 0 2.8 0l3.4-3.4a2 2 0 0 0 0-2.8L17.4 6a2 2 0 0 0-2.8 0L12 8.6 9.4 6A2 2 0 0 0 6.6 6L4.8 7.8a2 2 0 0 0 0 2.8L8 13.8" />
      <path d="m8 13 1.5 1.5a2 2 0 0 0 2.8 0l.7-.7" />
    </svg>
  );
}

function Unlink(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path d="M10 14 8 16a3 3 0 1 1-4-4l2-2" />
      <path d="m14 10 2-2a3 3 0 1 1 4 4l-2 2" />
      <path d="M9 15 15 9" />
    </svg>
  );
}

function UserMinus(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path d="M16 21a4 4 0 0 0-8 0" />
      <circle cx="12" cy="8" r="4" />
      <path d="M17 11h5" />
    </svg>
  );
}

function UserPlus(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path d="M16 21a4 4 0 0 0-8 0" />
      <circle cx="12" cy="8" r="4" />
      <path d="M19 8v6M16 11h6" />
    </svg>
  );
}

function MessageCircle(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path d="M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 0 1-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8Z" />
      <path d="M8 12h.01M12 12h.01M16 12h.01" />
    </svg>
  );
}

const NOTIFICATION_POLL_MS = 3000;

const formatNotificationTime = (value) => {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

const normalizeNotification = (notification) => ({
  id: notification.id,
  category: notification.fav_category || notification.category || notification.type || "default",
  text: notification.message || notification.text || "",
  details: notification.details || "",
  time: notification.time || formatNotificationTime(notification.created_at),
  read: Boolean(notification.is_read ?? notification.read),
});

export function Navbar({
  role = "client",
  userName = "JD",
  userAvatar = "",
  onMessage,
  onNotification,
  notifications: externalNotifs,
  onSwitch,
  canSwitchToCoach = false,
  switchOptions = null,
}) {
  const theme = ROLE_THEMES[role];
  const navigate = useNavigate();
  const dropdownRef = useRef(null);
  const [showNotifs, setShowNotifs] = useState(false);
  const [notifs, setNotifs] = useState(() => (externalNotifs ?? []).map(normalizeNotification));
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsError, setNotificationsError] = useState("");

  useEffect(() => {
    if (externalNotifs) {
      setNotifs(externalNotifs.map(normalizeNotification));
    }
  }, [externalNotifs]);

  useEffect(() => {
    if (externalNotifs) return;

    let isMounted = true;
    let isFetching = false;

    const loadNotifications = async ({ initial = false } = {}) => {
      if (isFetching) return;
      isFetching = true;
      if (initial) {
        setNotificationsLoading(true);
      }
      setNotificationsError("");

      try {
        const items = await queryNotifications();
        if (isMounted) setNotifs(items.map(normalizeNotification));
      } catch {
        if (isMounted) setNotificationsError("Unable to load notifications.");
      } finally {
        isFetching = false;
        if (isMounted && initial) setNotificationsLoading(false);
      }
    };

    loadNotifications({ initial: true });
    const intervalId = window.setInterval(loadNotifications, NOTIFICATION_POLL_MS);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, [externalNotifs]);

  useEffect(() => {
    if (!showNotifs) return;
    const handler = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowNotifs(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showNotifs]);

  useEffect(() => {
    if (!showNotifs) return;
    const handler = (event) => event.key === "Escape" && setShowNotifs(false);
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [showNotifs]);

  const unreadCount = notifs.filter((notification) => !notification.read).length;

  const markAllRead = async () => {
    if (unreadCount === 0) return;

    const previous = notifs;
    setNotifs((prev) => prev.map((notification) => ({ ...notification, read: true })));

    try {
      if (!externalNotifs) {
        await readAllNotifications();
      }
    } catch {
      setNotifs(previous);
      setNotificationsError("Unable to mark notifications as read.");
    }
  };

  const markOneRead = async (id) => {
    const target = notifs.find((notification) => notification.id === id);
    if (!target || target.read) return;

    setNotifs((prev) =>
      prev.map((notification) =>
        notification.id === id ? { ...notification, read: true } : notification
      )
    );

    try {
      if (!externalNotifs) {
        const updated = await readNotification(id);
        if (updated) {
          setNotifs((prev) =>
            prev.map((notification) =>
              notification.id === id ? normalizeNotification(updated) : notification
            )
          );
        }
      }
    } catch {
      setNotifs((prev) =>
        prev.map((notification) =>
          notification.id === id ? { ...notification, read: false } : notification
        )
      );
      setNotificationsError("Unable to mark notification as read.");
    }
  };

  const handleSwitch = () => {
    if (typeof onSwitch === "function") {
      onSwitch();
      return;
    }
    if (role === "client" && canSwitchToCoach) navigate("/coach");
    if (role === "coach") navigate("/client");
  };

  const resolvedSwitchOptions = Array.isArray(switchOptions)
    ? switchOptions.filter((option) => option?.label && option?.to)
    : [
        role === "client" && canSwitchToCoach
          ? { label: "Coach", to: "/coach" }
          : null,
        role === "coach"
          ? { label: "Client", to: "/client" }
          : null,
      ].filter(Boolean);

  const handleProfileClick = () => {
    if (role === "coach") navigate("/coach-profile");
    else if (role === "admin") navigate("/admin");
    else navigate("/profile");
  };

  const logo =
    role === "coach" ? coachLogo :
    role === "admin" ? adminLogo :
    clientLogo;

  const notificationButtonLabel =
    unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications";

  return (
    <nav className="relative z-50 border-b border-white/5 bg-[#0B1120]">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
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
          <span className={`rounded px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider ${theme.badge} ${theme.badgeText}`}>
            {theme.label}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {switchOptions == null && resolvedSwitchOptions.length === 1 && (
            <button
              onClick={handleSwitch}
              className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${theme.btnOutline}`}
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
              {`Switch to ${resolvedSwitchOptions[0].label}`}
            </button>
          )}

          {switchOptions != null && resolvedSwitchOptions.length > 0 && (
            <div className="flex items-center gap-2">
              {resolvedSwitchOptions.map((option) => (
                <button
                  key={option.to}
                  onClick={() => navigate(option.to)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${theme.btnOutline}`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                  {`Switch to ${option.label}`}
                </button>
              ))}
            </div>
          )}

          {/* Message Button */}
          <button
            onClick={onMessage || (() => navigate(`/${role}/messages`))}
            className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-[rgba(255,255,255,0.03)] text-slate-400 transition-colors hover:bg-[rgba(255,255,255,0.06)] hover:text-white"
            aria-label="Messages"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </button>

          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => {
                if (onNotification) { onNotification(); return; }
                setShowNotifs((prev) => !prev);
              }}
              className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-[rgba(255,255,255,0.03)] text-slate-400 transition-colors hover:bg-[rgba(255,255,255,0.06)] hover:text-white"
              aria-label={notificationButtonLabel}
            >
              {unreadCount > 0 ? <BellDot className="h-5 w-5" /> : <Bell className="h-5 w-5" />}
              {unreadCount > 0 && (
                <span
                  className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white"
                  style={{ backgroundColor: theme.accent, boxShadow: `0 0 10px ${theme.accent}60` }}
                >
                  {unreadCount}
                </span>
              )}
            </button>

            {showNotifs && (
              <div className="absolute right-0 top-12 z-[100] w-80 overflow-hidden rounded-2xl border border-white/10 bg-[#0D1424] shadow-[0_0_60px_rgba(0,0,0,0.5)]">
                <div className="flex items-center justify-between border-b border-white/5 px-4 py-3">
                  <p className="text-sm font-bold text-white">Notifications</p>
                  <button
                    onClick={markAllRead}
                    disabled={unreadCount === 0}
                    className="text-[10px] font-medium transition hover:opacity-80 disabled:cursor-not-allowed disabled:text-gray-600"
                    style={unreadCount > 0 ? { color: theme.accentText } : undefined}
                  >
                    Read all
                  </button>
                </div>

                <div className="max-h-80 overflow-y-auto">
                  {notificationsLoading ? (
                    <p className="py-8 text-center text-sm text-gray-500">Loading notifications...</p>
                  ) : notificationsError ? (
                    <p className="py-8 text-center text-sm text-rose-300">{notificationsError}</p>
                  ) : notifs.length === 0 ? (
                    <p className="py-8 text-center text-sm text-gray-500">No notifications</p>
                  ) : (
                    notifs.map((notification) => {
                      const Icon = NOTIFICATION_ICONS[notification.category] || Bell;
                      return (
                        <button
                          key={notification.id}
                          onClick={() => {
                            markOneRead(notification.id);
                            if (notification.category === "workout_plan") {
                              setShowNotifs(false);
                              navigate(`/${role}`);
                            }
                          }}
                          className={`flex w-full items-start gap-3 border-b border-white/3 px-4 py-3 text-left transition-colors hover:bg-white/3 ${
                            !notification.read ? "bg-white/[0.02]" : ""
                          }`}
                        >
                          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-slate-300">
                            <Icon className="h-4 w-4" aria-hidden="true" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className={`text-xs leading-relaxed ${!notification.read ? "text-white" : "text-gray-400"}`}>
                              {notification.text}
                            </p>
                            {notification.details && (
                              <p className="mt-1 line-clamp-2 text-[10px] leading-snug text-gray-500">
                                {notification.details}
                              </p>
                            )}
                            <p className="mt-1 text-[10px] text-gray-600">{notification.time}</p>
                          </div>
                          {!notification.read && (
                            <span
                              className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                              style={{ backgroundColor: theme.accent }}
                            />
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={handleProfileClick}
            className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full text-sm font-bold text-white transition-transform hover:scale-105"
            style={{ backgroundColor: theme.accent, boxShadow: `0 0 20px ${theme.accent}50` }}
            title="Open Profile"
          >
            {userAvatar ? (
              <img
                src={userAvatar}
                alt="Open Profile"
                className="h-full w-full object-cover"
              />
            ) : (
              userName
            )}
          </button>
        </div>
      </div>
    </nav>
  );
}
