import { useNavigate } from "react-router-dom";
import { ROLE_THEMES } from "./theme";
import clientLogo from "../assets/Client Logo.svg"
import coachLogo from "../assets/Coach Logo.svg"
import adminLogo from "../assets/Admin Logo.svg"

export function Navbar({
  role = "client",
  userName = "JD",
  onSwitch,
  onMessage,
  onNotification,
}) {
  const theme = ROLE_THEMES[role];

  const switchText =
    role === "client"
      ? "Switch to Coach"
      : role === "coach"
      ? "Switch to Client"
      : null;

  const handleProfileClick = () => {
    navigate(role === "coach" ? "/coach-profile" : "/profile");
  };

  return (
    <nav className="flex items-center justify-between px-6 py-3 bg-[#0B1120] border-b border-white/5">
      {/* Left: Logo + Role Badge */}
      <div className="flex items-center gap-3">
        <div>
          
          <img src={logo} alt="Logo" className="h-8 cursor-pointer" onClick={() => navigate(`/${role}`)}/>
        </div>
        <span className="text-#3B82F6 font-semibold text-lg tracking-tight">Till Failure</span>
        <span className={`px-2.5 py-0.5 rounded text-[11px] font-bold tracking-wider uppercase ${theme.badge} ${theme.badgeText}`}>
          {theme.label}
        </span>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-3">
        {switchText && (
          <button
            onClick={onSwitch}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors"
            style={{
              borderColor: theme.accent + "60",
              color: theme.accentText,
              backgroundColor: theme.accent + "10",
            }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
              />
            </svg>
            {switchText}
          </button>
        )}

        {/* Message Button */}
        <button
          onClick={onMessage}
          className="relative w-10 h-10 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
        </button>

        {/* Notification Button */}
        <button
          onClick={onNotification}
          className="relative w-10 h-10 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-orange-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            3
          </span>
        </button>

        {/* User Avatar */}
        <button
          onClick={handleProfileClick}
          className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-sm ring-2 transition-transform hover:scale-105"
          style={{ backgroundColor: theme.accent, ringColor: theme.accent + "60" }}
          title="Open Profile"
        >
          {userName}
        </button>
      </div>
    </nav>
  );
}