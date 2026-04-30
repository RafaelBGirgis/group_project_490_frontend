import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import clientLogo from "../assets/Client Logo.svg";
import { initiateGoogleOAuth, login as loginRequest, storeToken } from "../api/auth";
import { fetchBackendHealth } from "../api/client";

function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [backendReady, setBackendReady] = useState(null);

  useEffect(() => {
    fetchBackendHealth()
      .then(() => setBackendReady(true))
      .catch(() => setBackendReady(false));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault(); // prevent page reload
    setError("");

    try {
      const data = await loginRequest(email, password);
      storeToken(data.access_token);

      const normalizedEmail = email.trim().toLowerCase();
      localStorage.setItem("active_user_email", normalizedEmail);
      const hasOnboarded = localStorage.getItem(`onboarding_complete:${normalizedEmail}`) === "true";

      // Redirect to required onboarding unless completed
      window.location.href = hasOnboarded ? "/client" : "/onboarding";
    } catch (err) {
      console.error(err);
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-[#080D19] text-white overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-24 -left-16 h-72 w-72 rounded-full bg-blue-600/10 blur-3xl" />
        <div className="absolute top-1/3 -right-16 h-80 w-80 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-indigo-500/10 blur-3xl" />
      </div>

      {/* Top brand bar */}
      <header className="relative z-10 border-b border-white/5">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-6 py-4">
          <img src={clientLogo} alt="Till Failure" className="h-9" />
          <div>
            <p className="text-base font-semibold text-blue-300">Till Failure</p>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto grid min-h-[calc(100vh-73px)] max-w-7xl grid-cols-1 items-center gap-10 px-6 py-10 lg:grid-cols-2">
        {/* Left panel */}
        <section className="hidden lg:flex">
          <div className="w-full max-w-xl rounded-[28px] border border-white/8 bg-[rgba(255,255,255,0.02)] p-10 shadow-[0_0_60px_rgba(0,0,0,0.35)] backdrop-blur-sm">
            <p className="mb-8 text-lg font-semibold text-blue-400">Till Failure</p>

            <h1 className="max-w-md text-5xl font-black leading-tight tracking-tight">
              Transform your{" "}
              <span className="bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
                fitness journey
              </span>{" "}
              today
            </h1>

            <p className="mt-6 max-w-md text-base leading-7 text-slate-300">
              Connect with elite coaches, track your progress, and hit every goal —
              all in one place.
            </p>

            <div className="mt-10 space-y-4">
              <FeatureCard
                emoji="🏅"
                title="Find Your Coach"
                text="Browse certified coaches by specialty and availability."
              />
              <FeatureCard
                emoji="📊"
                title="Track Everything"
                text="Workouts, calories, steps, mood — all in one dashboard."
              />
              <FeatureCard
                emoji="🔥"
                title="Stay Consistent"
                text="Streaks, reminders, and coach check-ins keep you on track."
              />
            </div>
          </div>
        </section>

        {/* Right panel */}
        <section className="flex justify-center lg:justify-end">
          <div className="w-full max-w-md rounded-[28px] border border-white/10 bg-[rgba(255,255,255,0.03)] p-8 shadow-[0_0_80px_rgba(37,99,235,0.12)] backdrop-blur-md">
            <div className="mx-auto mb-6 flex w-fit rounded-xl border border-white/10 bg-[rgba(255,255,255,0.05)] px-30 py-2">
              <span className="text-sm font-semibold text-slate-200">Sign In</span>
            </div>

            <h2 className="text-4xl font-black tracking-tight">
              Welcome <span className="text-blue-400">back</span>
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              Sign in to continue your fitness journey
            </p>
            <p className={`mt-2 text-xs ${backendReady === false ? "text-red-400" : "text-slate-500"}`}>
              Backend status: {backendReady == null ? "checking..." : backendReady ? "online" : "offline"}
            </p>

            <div className="mt-6">
              <button
                type="button"
                onClick={initiateGoogleOAuth}
                className="flex w-full items-center justify-center gap-3 rounded-xl border border-white/10 bg-[rgba(255,255,255,0.03)] px-4 py-3 text-sm font-medium text-slate-200 transition hover:bg-[rgba(255,255,255,0.06)]"
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-[10px] font-bold text-white">
                  G
                </span>
                Google
              </button>
            </div>

            <div className="my-5 flex items-center gap-3">
              <div className="h-px flex-1 bg-white/10" />
              <span className="text-xs text-slate-500">or continue with email</span>
              <div className="h-px flex-1 bg-white/10" />
            </div>

            <form className="space-y-5" onSubmit={handleSubmit}>
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-slate-400">
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-[#0B1220] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-blue-400/60 focus:ring-2 focus:ring-blue-500/20"
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-slate-400">
                  Password
                </label>
                <input
                  type="password"
                  placeholder="••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-[#0B1220] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-blue-400/60 focus:ring-2 focus:ring-blue-500/20"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-400 px-4 py-3 text-sm font-bold text-white shadow-[0_0_30px_rgba(59,130,246,0.3)] transition hover:scale-[1.01]"
              >
                Sign In →
              </button>

              {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
            </form>

            <p className="mt-5 text-center text-xs text-slate-500">
              Don&apos;t have an account?{" "}
              <Link to="/signup" className="font-semibold text-blue-400 hover:text-cyan-300">
                Create one free
              </Link>
            </p>

            <div className="mt-8 flex justify-center">
              <Link
                to="/admin"
                className="rounded-full border border-red-500/30 bg-red-500/10 px-4 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-red-400 transition hover:bg-red-500/15"
              >
                Admin Login
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function FeatureCard({ emoji, title, text }) {
  return (
    <div className="flex items-start gap-4 rounded-2xl border border-white/8 bg-[#0B1220]/80 px-4 py-4 shadow-[0_0_30px_rgba(0,0,0,0.15)]">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/20 to-cyan-400/20 text-lg">
        {emoji}
      </div>
      <div>
        <h3 className="text-sm font-bold text-white">{title}</h3>
        <p className="mt-1 text-xs leading-5 text-slate-400">{text}</p>
      </div>
    </div>
  );
}

export default LoginPage;


