import { Link } from "react-router-dom";
import clientLogo from "../assets/Client Logo.svg";
import { ROLE_THEMES } from "../components/theme";

const theme = ROLE_THEMES.client;

function HighlightTile({ title, value }) {
  return (
    <div className="rounded-[28px] border border-white/10 bg-white/5 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.14)]">
      <p className="text-sm uppercase tracking-[0.24em] text-slate-400">{title}</p>
      <p className="mt-3 text-3xl font-bold text-white">{value}</p>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#080D19] text-white overflow-hidden relative">
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute -top-28 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full blur-3xl"
          style={{ backgroundColor: theme.accentLight }}
        />
        <div
          className="absolute top-24 right-10 h-80 w-80 rounded-full blur-3xl"
          style={{ backgroundColor: ROLE_THEMES.coach.accentLight }}
        />
      </div>

      <header className="relative z-10 border-b border-white/10">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-6 py-5">
          <Link to="/" className="flex items-center gap-3">
            <img src={clientLogo} alt="Till Failure logo" className="h-11 w-11 rounded-2xl bg-white/5 p-2 shadow-[0_0_25px_rgba(255,255,255,0.08)]" />
            <div>
              <p className="text-base font-semibold text-white">Till Failure</p>
              <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Workout hub</p>
            </div>
          </Link>

          <div className="hidden items-center gap-4 text-sm text-slate-300 md:flex">
            <Link to="/login" className="transition hover:text-white">Login</Link>
            <Link to="/signup" className="rounded-full border border-white/15 px-4 py-2 text-white transition hover:border-white/25 hover:bg-white/5">Signup</Link>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-7xl px-6 py-16 sm:py-20 lg:py-24">
        <div className="grid gap-12 lg:grid-cols-[1.25fr_0.9fr] lg:items-center">
          <section className="space-y-8">
            <div className="max-w-3xl space-y-6">
              <p className="inline-flex rounded-full bg-white/5 px-4 py-2 text-sm font-semibold uppercase tracking-[0.3em] text-slate-300 ring-1 ring-white/10">
                Workout platform
              </p>
              <h1 className="text-5xl font-black tracking-tight text-white sm:text-6xl">
                Train harder, recover smarter, and stay consistent every week.
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-slate-300 sm:text-xl">
                Access training plans, coach messaging, and progress tracking from one polished fitness dashboard.
              </p>
            </div>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <Link
                to="/signup"
                className="inline-flex items-center justify-center rounded-2xl px-6 py-4 text-base font-bold text-white transition"
                style={{ backgroundColor: theme.accent, boxShadow: `0 20px 70px ${theme.accent}22` }}
              >
                Create Account
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center justify-center rounded-2xl border border-white/15 bg-white/5 px-6 py-4 text-base font-semibold text-white transition hover:bg-white/10"
              >
                Login
              </Link>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <HighlightTile title="Workouts" value="100+" />
              <HighlightTile title="Coaches" value="12k+" />
              <HighlightTile title="Progress" value="Live" />
            </div>
          </section>

          <section className="rounded-[32px] border border-white/10 bg-white/5 p-8 shadow-[0_30px_100px_rgba(0,0,0,0.18)] backdrop-blur-xl">
            <div className="space-y-6">
              <div className="rounded-[28px] border border-white/10 bg-[#0B1220]/90 p-6">
                <p className="text-sm uppercase tracking-[0.24em] text-slate-400">Ready to train</p>
                <h2 className="mt-3 text-3xl font-bold text-white">Quick access to login or signup</h2>
                <p className="mt-3 text-sm leading-6 text-slate-300">
                  Bring your workouts, coach support, and progress history into a single training space.
                </p>
              </div>

              <div className="grid gap-4">
                <Link
                  to="/login"
                  className="rounded-3xl border border-white/10 bg-[#0B1220] px-5 py-4 text-base font-semibold text-white transition hover:border-slate-300/30 hover:bg-white/5"
                >
                  Login to your account
                </Link>
                <Link
                  to="/signup"
                  className="rounded-3xl bg-white/10 px-5 py-4 text-base font-semibold text-white transition hover:bg-white/15"
                  style={{ borderColor: theme.accent, boxShadow: `0 15px 45px ${theme.accent}22` }}
                >
                  Create a new account
                </Link>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
