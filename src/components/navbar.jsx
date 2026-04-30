import { useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import {
  Bell,
  BellDot,
  CircleX,
  CreditCard,
  Dumbbell,
  Handshake,
  Unlink,
  UserMinus,
  UserPlus,
} from "lucide-react";
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
};

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
  onMessage,
  onNotification,
  notifications: externalNotifs,
  onSwitch,
  canSwitchToCoach = false,
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
    if (!localStorage.getItem("jwt")) return;

    let isMounted = true;
    setNotificationsLoading(true);
    setNotificationsError("");

    queryNotifications()
      .then((items) => {
        if (isMounted) setNotifs(items.map(normalizeNotification));
      })
      .catch(() => {
        if (isMounted) setNotificationsError("Unable to load notifications.");
      })
      .finally(() => {
        if (isMounted) setNotificationsLoading(false);
      });

    return () => {
      isMounted = false;
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
      if (!externalNotifs && localStorage.getItem("jwt")) {
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
      if (!externalNotifs && localStorage.getItem("jwt")) {
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

  const switchText =
    role === "client" && canSwitchToCoach ? "Switch to Coach" :
    role === "coach" ? "Switch to Client" :
    null;

  const handleSwitch = () => {
    if (typeof onSwitch === "function") {
      onSwitch();
      return;
    }
    if (role === "client" && canSwitchToCoach) navigate("/coach");
    if (role === "coach") navigate("/client");
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

  const notificationButtonLabel =
    unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications";

  return (
    <nav className="relative z-10 border-b border-white/5 bg-[#0B1120]">
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
          {switchText && (
            <button
              onClick={handleSwitch}
              className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${theme.btnOutline}`}
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
              {switchText}
            </button>
          )}

          <button
            onClick={onMessage || (() => navigate(`/${role}-chat`))}
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
              <div className="absolute right-0 top-12 z-50 w-80 overflow-hidden rounded-2xl border border-white/10 bg-[#0D1424] shadow-[0_0_60px_rgba(0,0,0,0.5)]">
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
            className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white transition-transform hover:scale-105"
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
