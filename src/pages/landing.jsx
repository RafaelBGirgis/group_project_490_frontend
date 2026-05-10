import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  ArrowRight,
  CalendarDays,
  Check,
  ChevronRight,
  Crown,
  Dumbbell,
  Flame,
  Gauge,
  HeartHandshake,
  MessageCircle,
  Sparkles,
  Star,
  Trophy,
  Users,
} from "lucide-react";
import clientLogo from "../assets/Client Logo.svg";
import coachLogo from "../assets/Coach Logo.svg";
import { fetchLeaderboard, fetchPlatformStats } from "../api/public";

const leaderboard = {
  client: {
    label: "Client board",
    categories: [
      {
        id: "burn",
        apiCategory: "man-of-burn",
        name: "Man of Burn",
        icon: Flame,
        caption: "Monthly calorie effort",
        unit: "kcal",
        rows: [
          { name: "Maya Stone", badge: "Hybrid athlete", score: "48,220", delta: "+14%" },
          { name: "Jordan Vale", badge: "Cut phase", score: "45,890", delta: "+9%" },
          { name: "Sam Brooks", badge: "Conditioning", score: "42,640", delta: "+7%" },
          { name: "Nina Park", badge: "Strength block", score: "39,810", delta: "+6%" },
          { name: "Theo James", badge: "Volume week", score: "37,540", delta: "+4%" },
        ],
      },
      {
        id: "steps",
        apiCategory: "cardi-athletes",
        name: "Cardi-athletes",
        icon: Activity,
        caption: "Step leaders this month",
        unit: "steps",
        rows: [
          { name: "Elena Cruz", badge: "Daily walker", score: "412k", delta: "+18%" },
          { name: "Theo James", badge: "Runner", score: "388k", delta: "+13%" },
          { name: "Andre Moss", badge: "Busy week", score: "351k", delta: "+10%" },
          { name: "Priya Shah", badge: "Zone 2", score: "328k", delta: "+8%" },
          { name: "Maya Stone", badge: "Daily pace", score: "304k", delta: "+6%" },
        ],
      },
      {
        id: "consistency",
        apiCategory: "consistency-kings",
        name: "Consistency Kings",
        icon: CalendarDays,
        caption: "Telemetry streaks",
        unit: "check-ins",
        rows: [
          { name: "Noah Reed", badge: "Perfect week", score: "42", delta: "+5" },
          { name: "Ari Kim", badge: "Never misses", score: "39", delta: "+4" },
          { name: "Leah Ford", badge: "AM logs", score: "37", delta: "+3" },
          { name: "Cam Ortiz", badge: "Locked in", score: "35", delta: "+2" },
          { name: "Elena Cruz", badge: "Steady habits", score: "33", delta: "+2" },
        ],
      },
    ],
  },
  coach: {
    label: "Coach board",
    categories: [
      {
        id: "mvp",
        apiCategory: "mvp",
        name: "MVP",
        icon: Trophy,
        caption: "Most valued professionals",
        unit: "value",
        rows: [
          { name: "Alex Rivera", badge: "Bodybuilding", score: "98.4", delta: "+12%" },
          { name: "Sarah Chen", badge: "Powerlifting", score: "95.9", delta: "+10%" },
          { name: "Marcus Hale", badge: "Mobility", score: "91.7", delta: "+8%" },
          { name: "Dana Scott", badge: "Endurance", score: "88.2", delta: "+6%" },
          { name: "Iris Morgan", badge: "Lifestyle", score: "85.6", delta: "+4%" },
        ],
      },
      {
        id: "liked",
        apiCategory: "most-liked",
        name: "Most Liked",
        icon: Star,
        caption: "Review momentum",
        unit: "love",
        rows: [
          { name: "Iris Morgan", badge: "Lifestyle", score: "1,280", delta: "+21%" },
          { name: "Troy Baker", badge: "Strength", score: "1,144", delta: "+17%" },
          { name: "Mina Patel", badge: "Nutrition", score: "1,032", delta: "+14%" },
          { name: "Owen Lee", badge: "Athletic prep", score: "984", delta: "+11%" },
          { name: "Reese Young", badge: "Team training", score: "942", delta: "+8%" },
        ],
      },
      {
        id: "wisest",
        apiCategory: "wisest",
        name: "Wisest",
        icon: Sparkles,
        caption: "Retention and experience",
        unit: "wisdom",
        rows: [
          { name: "Camila Torres", badge: "6 years", score: "94.1", delta: "+9%" },
          { name: "Ben Carter", badge: "Roster builder", score: "90.8", delta: "+8%" },
          { name: "Jules Hunt", badge: "Habit coach", score: "87.5", delta: "+6%" },
          { name: "Reese Young", badge: "Team training", score: "84.9", delta: "+5%" },
          { name: "Troy Baker", badge: "10 seasons", score: "82.4", delta: "+4%" },
        ],
      },
    ],
  },
};

const stats = [
  { key: "preset_workouts", fallback: "100+", label: "Preset workouts", icon: Dumbbell, tone: "blue" },
  { key: "active_users", fallback: "12k+", label: "Active users", icon: Users, tone: "orange" },
  { key: "verified_coaches", fallback: "500+", label: "Verified coaches", icon: Check, tone: "blue" },
  { key: "average_coach_rating", fallback: "4.9/5", label: "Average coach rating", icon: Star, tone: "orange" },
];

const flowCards = [
  {
    title: "Hire the right coach",
    copy: "Browse verified profiles, specialties, client fit, and training style before starting the relationship.",
    icon: HeartHandshake,
  },
  {
    title: "Plan around real availability",
    copy: "Coaches prescribe programs while clients schedule training around the week they actually have.",
    icon: CalendarDays,
  },
  {
    title: "Message through the work",
    copy: "Clients and coaches keep feedback, form notes, and accountability close to the training plan.",
    icon: MessageCircle,
  },
];

export default function LandingPage() {
  const [boardMode, setBoardMode] = useState("client");
  const [categoryId, setCategoryId] = useState("burn");
  const [platformStats, setPlatformStats] = useState(null);
  const [leaderboardData, setLeaderboardData] = useState({});

  const mode = leaderboard[boardMode];
  const activeCategory = useMemo(() => {
    return mode.categories.find((category) => category.id === categoryId) || mode.categories[0];
  }, [categoryId, mode]);

  function changeMode(nextMode) {
    setBoardMode(nextMode);
    setCategoryId(leaderboard[nextMode].categories[0].id);
  }

  useEffect(() => {
    let cancelled = false;

    const loadStats = async () => {
      try {
        const nextStats = await fetchPlatformStats();
        if (!cancelled) {
          setPlatformStats(nextStats);
        }
      } catch {
        if (!cancelled) {
          setPlatformStats(null);
        }
      }
    };

    loadStats();
    const intervalId = window.setInterval(loadStats, 30000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const role = boardMode === "client" ? "clients" : "coaches";
    const apiCategory = activeCategory.apiCategory;
    const cacheKey = `${role}:${apiCategory}`;

    const loadLeaderboard = async () => {
      try {
        const response = await fetchLeaderboard(role, apiCategory);
        if (!cancelled) {
          setLeaderboardData((current) => ({
            ...current,
            [cacheKey]: Array.isArray(response?.entries) ? response.entries : [],
          }));
        }
      } catch {
        if (!cancelled) {
          setLeaderboardData((current) => ({
            ...current,
            [cacheKey]: current[cacheKey] || [],
          }));
        }
      }
    };

    loadLeaderboard();
    const intervalId = window.setInterval(loadLeaderboard, 30000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [activeCategory.apiCategory, boardMode]);

  const activeLeaderboardRows = useMemo(() => {
    const role = boardMode === "client" ? "clients" : "coaches";
    const cacheKey = `${role}:${activeCategory.apiCategory}`;
    const entries = leaderboardData[cacheKey] || [];

    return [...entries]
      .sort((a, b) => Number(b?.score ?? 0) - Number(a?.score ?? 0))
      .slice(0, 5)
      .map((entry) => ({
        accountId: entry.account_id,
        name: entry.name,
        badge: entry.badge || activeCategory.caption,
        score: entry.display_score || String(entry.score ?? ""),
        delta: entry.detail || "",
        pfpUrl: entry.pfp_url || null,
        age: entry.age ?? null,
        gender: entry.gender || null,
      }));
  }, [activeCategory, boardMode, leaderboardData]);

  return (
    <main className="min-h-screen overflow-hidden bg-[#080D19] text-white">
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_12%_18%,rgba(59,130,246,0.16),transparent_30%),radial-gradient(circle_at_86%_10%,rgba(249,115,22,0.12),transparent_27%)]" />
      <div className="fixed inset-0 pointer-events-none opacity-[0.06] [background-image:linear-gradient(rgba(255,255,255,0.8)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.8)_1px,transparent_1px)] [background-size:72px_72px]" />

      <nav className="fixed left-0 top-0 z-50 w-full border-b border-white/5 bg-[#0B1120] px-6 py-3">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <img src={clientLogo} alt="Till Failure" className="h-9 transition hover:scale-105" />
            <span className="text-base font-semibold text-blue-400 transition hover:opacity-80">Till Failure</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/login" className="hidden rounded-lg px-4 py-2 text-sm font-medium text-slate-400 transition hover:text-white sm:block">
              Log in
            </Link>
            <Link to="/signup" className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700">
              Get started
            </Link>
          </div>
        </div>
      </nav>

      <section id="workouts" className="relative z-10 mx-auto grid min-h-screen max-w-7xl items-center gap-12 px-5 pb-20 pt-32 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="animate-[landing-rise_800ms_ease-out_both]">
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2">
            <span className="h-2 w-2 rounded-full bg-blue-500 shadow-[0_0_18px_rgba(59,130,246,0.7)]" />
            <span className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Performance and expertise</span>
            <span className="h-2 w-2 rounded-full bg-orange-500 shadow-[0_0_18px_rgba(249,115,22,0.7)]" />
          </div>
          <h1 className="text-5xl font-extrabold leading-[1.02] text-white sm:text-6xl lg:text-[82px]">
            Where <span className="text-blue-400 [text-shadow:0_0_28px_rgba(59,130,246,0.45)]">effort</span> meets{" "}
            <span className="text-orange-400 [text-shadow:0_0_28px_rgba(249,115,22,0.42)]">expertise</span>
          </h1>
          <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-400">
            Hire verified coaches, receive tailored workout plans, schedule sessions around real availability, and keep every adjustment connected through built-in messaging.
          </p>
          <div className="mt-10 flex flex-col gap-4 sm:flex-row">
            <Link to="/signup" className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-8 py-4 text-base font-bold text-white transition-colors hover:bg-blue-700">
              Sign up now <ArrowRight size={19} />
            </Link>
            <Link to="/login" className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] px-8 py-4 text-base font-bold text-white backdrop-blur-xl transition hover:bg-white/[0.08]">
              Log in
            </Link>
          </div>
        </div>

        <HeroWorkspace />
      </section>

      <section className="relative z-10 mx-auto max-w-7xl px-5 py-8">
        <div className="grid gap-4 rounded-2xl border border-white/10 bg-white/[0.05] p-2 shadow-2xl sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat, index) => (
            <StatCard key={stat.label} stat={stat} value={formatPlatformStat(stat, platformStats)} index={index} />
          ))}
        </div>
      </section>

      <section id="coaches" className="relative z-10 mx-auto max-w-7xl px-5 py-24">
        <div className="mb-12 max-w-3xl">
          <h2 className="mt-4 text-4xl font-extrabold text-white md:text-6xl">Structured tools for accountable training.</h2>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {flowCards.map((card, index) => (
            <article key={card.title} className="rounded-2xl border border-white/10 bg-white/[0.035] p-7 backdrop-blur-xl" style={{ animation: `landing-rise 700ms ${index * 120}ms ease-out both` }}>
              <div className="mb-9 flex h-13 w-13 items-center justify-center rounded-xl border border-white/10 bg-[#0D1424] text-blue-400">
                <card.icon size={25} />
              </div>
              <h3 className="text-2xl font-bold text-white">{card.title}</h3>
              <p className="mt-4 leading-7 text-slate-400">{card.copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="leaderboards" className="relative z-10 mx-auto max-w-7xl px-5 py-10">
        <div className="mx-auto mb-10 max-w-4xl text-center">
          <h2 className="mt-4 text-4xl font-extrabold text-white md:text-6xl">Leaderboards with personality</h2>
          <p className="mt-6 text-lg leading-8 text-slate-400">
            Compare client consistency, training output, and coach reputation across focused categories designed to highlight progress, reliability, and impact.
          </p>
        </div>
        <LeaderboardPanel
          mode={mode}
          boardMode={boardMode}
          activeCategory={activeCategory}
          rows={activeLeaderboardRows}
          categoryId={categoryId}
          onModeChange={changeMode}
          onCategoryChange={setCategoryId}
        />
      </section>

      <footer className="relative z-10 border-t border-white/10 px-5 py-10">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-4 text-sm text-slate-500 md:flex-row md:items-center">
          <p className="text-xl font-bold text-white">Till Failure</p>
        </div>
      </footer>
    </main>
  );
}

function HeroWorkspace() {
  return (
    <div className="relative animate-[landing-float_7s_ease-in-out_infinite]">
      <div className="relative rounded-[2rem] border border-white/15 bg-[#0D1424] p-3 shadow-[0_45px_130px_rgba(0,0,0,0.42)]">
        <div className="rounded-[1.4rem] border border-black/60 bg-[#0B1120] p-4">
          <div className="mb-4 flex items-center justify-between border-b border-white/5 pb-3">
            <div className="flex items-center gap-2.5">
              <img src={coachLogo} alt="" className="h-7" />
              <span className="text-sm font-bold text-orange-400">Till Failure</span>
              <span className="rounded bg-orange-600 px-2 py-0.5 text-[9px] font-bold text-white">COACH</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-lg border border-orange-500 px-3 py-1 text-[10px] font-bold text-orange-400">
                Switch to Client
              </span>
              <span className="grid h-7 w-7 place-items-center rounded-lg border border-white/10 bg-white/[0.03] text-slate-400">
                <svg viewBox="0 0 24 24" width={13} height={13} fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 0 0-4-5.7V5a2 2 0 1 0-4 0v.3A6 6 0 0 0 6 11v3.2c0 .5-.2 1-.6 1.4L4 17h5" />
                  <path d="M9 17a3 3 0 0 0 6 0" />
                </svg>
              </span>
              <span className="grid h-7 w-7 place-items-center rounded-lg border border-white/10 bg-white/[0.03] text-slate-400">
                <svg viewBox="0 0 24 24" width={13} height={13} fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 0 1-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8Z" />
                  <path d="M8 12h.01M12 12h.01M16 12h.01" />
                </svg>
              </span>
              <span className="grid h-8 w-8 place-items-center rounded-full bg-orange-600 text-xs font-bold text-white">M</span>
            </div>
          </div>

          <div className="mb-4 flex items-center gap-3">
            <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-white">Overview</span>
            <span className="h-px flex-1 bg-orange-500/20" />
          </div>

          <div className="mb-5 grid gap-3 md:grid-cols-4">
            {[
              { label: "Good morning", value: "Mike", meta: "Coach Dashboard - Verified" },
              { label: "Active clients", value: "9", meta: "3 new this month" },
              { label: "Avg rating", value: "4.9", meta: "from 38 reviews" },
              { label: "Earnings", value: "$4.8k", meta: "from paid invoices" },
            ].map((stat) => (
              <div key={stat.label} className="rounded-xl border border-white/10 bg-[#0D1424] p-4">
                <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">{stat.label}</p>
                <p className="mt-5 text-2xl font-extrabold text-white">{stat.value}</p>
                <p className="mt-4 text-[10px] font-medium text-orange-400">{stat.meta}</p>
              </div>
            ))}
          </div>

          <div className="mb-4 flex items-center gap-3">
            <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-white">Clients & sessions</span>
            <span className="h-px flex-1 bg-orange-500/20" />
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="rounded-xl border border-white/10 bg-[#0D1424] p-4">
              <div className="mb-4 flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-white">My Clients (9)</h3>
                  <p className="mt-1 text-xs text-slate-500">Active training roster</p>
                </div>
                <span className="rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-500">Search by name...</span>
              </div>
              <div className="space-y-2">
                {[
                  { name: "Maya Stone", goal: "Hypertrophy block", tag: "On track" },
                  { name: "Jordan Vale", goal: "Strength rebuild", tag: "Check-in due" },
                  { name: "Nina Park", goal: "Cut phase", tag: "New PR" },
                ].map((client, index) => (
                  <div key={client.name} className="grid grid-cols-[34px_1fr_auto] items-center gap-3 rounded-lg border border-white/5 bg-white/[0.025] p-2.5">
                    <span className="grid h-8 w-8 place-items-center rounded-full bg-orange-600 text-[10px] font-bold text-white">
                      {client.name.split(" ").map((part) => part[0]).join("")}
                    </span>
                    <span>
                      <span className="block text-sm font-bold text-white">{client.name}</span>
                      <span className="block text-[10px] text-slate-500">{client.goal}</span>
                    </span>
                    <span className={index === 1 ? "text-[10px] font-bold text-orange-400" : "text-[10px] font-bold text-blue-400"}>
                      {client.tag}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-xl border border-white/10 bg-[#0D1424] p-4">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-base font-bold text-white">Client Requests (3)</h3>
                  <span className="text-xs font-bold text-orange-400">Review</span>
                </div>
                <div className="space-y-2">
                  {["Andre Moss", "Priya Shah", "Cam Ortiz"].map((name) => (
                    <div key={name} className="flex items-center justify-between rounded-lg bg-white/[0.025] px-3 py-2">
                      <span className="text-sm font-semibold text-white">{name}</span>
                      <span className="text-[10px] font-bold text-orange-400">Pending</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-xl border border-white/10 bg-[#0D1424] p-4">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-base font-bold text-white">Workout Plans</h3>
                  <span className="text-xs font-bold text-orange-400">View all</span>
                </div>
                <div className="rounded-lg border border-orange-500/30 px-4 py-3 text-center text-xs font-bold text-orange-400">
                  Prescribe Plans
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="mx-auto h-8 w-36 bg-[#0D1424]" />
        <div className="mx-auto h-4 w-72 rounded-full bg-slate-700" />
      </div>
      <div className="pointer-events-none absolute -bottom-8 left-1/2 flex -translate-x-1/2 items-center gap-3">
        <div className="-rotate-12 rounded-full border border-white/10 bg-[#0D1424] px-7 py-3 shadow-2xl">
          <Dumbbell className="text-blue-400" size={34} />
        </div>
        <div className="rotate-12 rounded-full border border-white/10 bg-[#0D1424] px-7 py-3 shadow-2xl">
          <Dumbbell className="text-orange-400" size={34} />
        </div>
      </div>
    </div>
  );
}

function formatWholeNumber(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return new Intl.NumberFormat().format(number);
}

function formatPlatformStat(stat, platformStats) {
  const value = platformStats?.[stat.key];
  if (stat.key === "average_coach_rating") {
    const rating = Number(value);
    return Number.isFinite(rating) && rating > 0 ? `${rating.toFixed(1)}/5` : stat.fallback;
  }
  return formatWholeNumber(value) || stat.fallback;
}

function StatCard({ stat, value, index }) {
  const Icon = stat.icon;
  const tones = {
    blue: "from-blue-500/20 text-blue-400",
    orange: "from-orange-500/20 text-orange-400",
  };

  return (
    <article className={`rounded-xl border border-white/10 bg-gradient-to-br ${tones[stat.tone]} to-white/[0.03] p-6 text-center backdrop-blur-xl transition hover:-translate-y-1`} style={{ animation: `landing-rise 650ms ${index * 90}ms ease-out both` }}>
      <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-xl border border-white/10 bg-[#0D1424]">
        <Icon size={23} />
      </div>
      <p className="text-4xl font-extrabold text-white">{value}</p>
      <p className="mt-2 text-xs font-bold uppercase tracking-[0.14em] text-slate-400">{stat.label}</p>
    </article>
  );
}

// Mirrors the gender enum from onboarding.jsx: male | female | non-binary | prefer_not_to_say.
// Normalized case-insensitively so backend variants ("Male", "FEMALE") also map.
function genderSymbol(gender) {
  if (!gender) return null;
  const key = String(gender).trim().toLowerCase().replace(/\s+/g, "_").replace(/-/g, "_");
  switch (key) {
    case "male":
      return { glyph: "♂", label: "Male", className: "text-blue-400" };
    case "female":
      return { glyph: "♀", label: "Female", className: "text-pink-400" };
    case "non_binary":
      return { glyph: "🜬", label: "Non-binary", className: "text-purple-300" };
    case "prefer_not_to_say":
      return null;
    default:
      return null;
  }
}

function LeaderboardAvatar({ row, isFirst }) {
  const initials = (row.name || "?")
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="relative h-12 w-12 shrink-0">
      {isFirst ? (
        <Crown
          size={20}
          className="absolute -top-3 left-1/2 -translate-x-1/2 -rotate-12 fill-yellow-300 text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.6)]"
        />
      ) : null}
      <div
        className={`grid h-12 w-12 place-items-center overflow-hidden rounded-full border-2 ${isFirst ? "border-yellow-400 shadow-[0_0_18px_rgba(250,204,21,0.4)]" : "border-white/15"
          } bg-white/[0.05]`}
      >
        {row.pfpUrl ? (
          <img src={row.pfpUrl} alt={row.name} className="h-full w-full object-cover" />
        ) : (
          <span className="text-sm font-extrabold text-white">{initials}</span>
        )}
      </div>
    </div>
  );
}

function LeaderboardPanel({ mode, boardMode, activeCategory, rows, categoryId, onModeChange, onCategoryChange }) {
  const ActiveIcon = activeCategory.icon;

  return (
    <div className="relative mx-auto w-full max-w-[640px]">
      {/* Client/Coach toggle — right-justified directly above the leaderboard */}
      <div className="mb-4 flex justify-end">
        <div className="inline-grid grid-cols-2 rounded-xl border border-white/10 bg-[#0B1120] p-1">
          {["client", "coach"].map((modeName) => (
            <button
              key={modeName}
              type="button"
              onClick={() => onModeChange(modeName)}
              className={`rounded-lg px-4 py-2 text-sm font-bold transition ${boardMode === modeName ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"
                }`}
            >
              {leaderboard[modeName].label}
            </button>
          ))}
        </div>
      </div>

      {/* Floating leaderboard, centered. Category rail floats to its right via absolute positioning so it doesn't push the leaderboard off-center. */}
      <section
        key={`${boardMode}-${activeCategory.id}`}
        className="rounded-2xl border border-white/10 bg-[#0D1424] p-5 shadow-2xl"
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
              <ActiveIcon size={15} className="text-orange-400" /> {activeCategory.unit}
            </div>
            <h3 className="text-3xl font-extrabold text-white">{activeCategory.name}</h3>
            <p className="mt-2 text-sm text-slate-400">{activeCategory.caption}</p>
          </div>
          <Trophy className="mt-2 text-blue-400" size={32} />
        </div>

        <div className="space-y-3">
          {rows.length === 0 ? (
            <div className="rounded-xl border border-white/10 bg-white/[0.035] p-6 text-center">
              <p className="font-bold text-white">No rankings yet</p>
              <p className="mt-2 text-sm text-slate-500">
                This leaderboard will populate once real account activity is available.
              </p>
            </div>
          ) : (
            rows.slice(0, 5).map((row, index) => {
              const isFirst = index === 0;
              const sym = genderSymbol(row.gender);
              return (
                <div
                  key={`${boardMode}-${activeCategory.id}-${row.accountId ?? row.name}-${index}`}
                  className={`grid grid-cols-[36px_56px_1fr_auto] items-center gap-3 rounded-xl border p-3 transition hover:border-blue-500/30 ${isFirst
                      ? "border-yellow-400/40 bg-yellow-400/[0.04]"
                      : "border-white/10 bg-white/[0.035]"
                    }`}
                >
                  <div
                    className={`grid h-9 w-9 place-items-center rounded-lg text-base font-extrabold ${isFirst ? "bg-yellow-500/20 text-yellow-300" : "bg-white/[0.05] text-white"
                      }`}
                  >
                    {index + 1}
                  </div>
                  <LeaderboardAvatar row={row} isFirst={isFirst} />
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 truncate font-bold text-white">
                      <span className="truncate">{row.name}</span>
                      {row.age != null ? (
                        <span className="shrink-0 text-xs font-semibold text-slate-400">· {row.age}</span>
                      ) : null}
                      {sym ? (
                        <span
                          className={`shrink-0 text-base font-bold leading-none ${sym.className}`}
                          title={sym.label}
                          aria-label={sym.label}
                        >
                          {sym.glyph}
                        </span>
                      ) : null}
                    </p>
                    <p className="truncate text-xs text-slate-500">{row.badge}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-extrabold text-blue-400">{row.score}</p>
                    <p className="text-xs font-bold text-orange-400">{row.delta}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* Category switch rail — absolutely positioned to the right so the leaderboard stays centered.
          Falls back below the leaderboard on narrow viewports. */}
      <aside className="mt-4 flex flex-col gap-2 lg:absolute lg:left-[calc(100%+1.5rem)] lg:top-[64px] lg:mt-0 lg:w-[210px]">
        {mode.categories.map((category) => {
          const Icon = category.icon;
          const active = category.id === categoryId;
          return (
            <button
              key={category.id}
              type="button"
              onClick={() => onCategoryChange(category.id)}
              className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition ${active
                  ? "border-orange-500/40 bg-orange-500/10 text-white"
                  : "border-white/10 bg-white/[0.03] text-slate-400 hover:bg-white/[0.06]"
                }`}
            >
              <span className="flex items-center gap-3">
                <Icon size={18} className={active ? "text-orange-400" : "text-slate-500"} />
                <span className="text-sm font-bold">{category.name}</span>
              </span>
              <ChevronRight size={16} />
            </button>
          );
        })}
      </aside>
    </div>
  );
}
