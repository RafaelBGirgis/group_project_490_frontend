import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import clientLogo from "../assets/Client Logo.svg";
import { initiateGoogleOAuth, isAuthenticated, signup as signupRequest, storeToken } from "../api/auth";
import { fetchMe } from "../api/client";
import { saveSignupPrefill } from "../utils/profileDrafts";

export default function SignupPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    age: "",
    gender: "",
    pfpUrl: "",
    bio: "",
  });
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isAuthenticated()) {
      return;
    }

    let cancelled = false;

    const restoreSession = async () => {
      try {
        const account = await fetchMe();
        const normalizedEmail = String(account?.email || "").trim().toLowerCase();
        if (normalizedEmail) {
          localStorage.setItem("active_user_email", normalizedEmail);
        }
        if (!cancelled) {
          window.location.href = account?.client_id ? "/client" : "/onboarding";
        }
      } catch {
        // Keep the signup screen available if silent auth restoration fails.
      }
    };

    restoreSession();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    const parsedAge = Number(formData.age);
    if (!Number.isInteger(parsedAge) || parsedAge <= 0) {
      setError("Please enter a valid age");
      return;
    }

    try {
      const data = await signupRequest(
        formData.email,
        formData.password,
        formData.name,
        parsedAge,
        formData.gender,
        formData.pfpUrl.trim() || undefined,
        formData.bio.trim() || undefined
      );
      storeToken(data.access_token);
      saveSignupPrefill({
        name: formData.name,
        email: formData.email,
        age: parsedAge,
        gender: formData.gender,
        bio: formData.bio.trim(),
        pfpUrl: formData.pfpUrl.trim(),
      });
      window.location.href = "/onboarding";
    } catch (err) {
      console.error(err);
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-[#080D19] text-white overflow-hidden relative">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-24 -left-16 h-72 w-72 rounded-full bg-blue-600/10 blur-3xl" />
        <div className="absolute top-1/3 -right-16 h-80 w-80 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-indigo-500/10 blur-3xl" />
      </div>

      {/* Top bar */}
      <header className="relative z-10 border-b border-white/5">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-6 py-4">
          <img src={clientLogo} alt="Till Failure" className="h-9" />
          <div>
            <p className="text-base font-semibold text-blue-300">Till Failure</p>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto grid min-h-[calc(100vh-73px)] max-w-7xl grid-cols-1 items-center gap-10 px-6 py-10 lg:grid-cols-2">
        {/* Left side info panel */}
        <section className="hidden lg:flex">
          <div className="w-full max-w-xl rounded-[28px] border border-white/8 bg-[rgba(255,255,255,0.02)] p-10 shadow-[0_0_60px_rgba(0,0,0,0.35)] backdrop-blur-sm">
            <p className="mb-8 text-lg font-semibold text-blue-400">Till Failure</p>

            <h1 className="max-w-md text-5xl font-black leading-tight tracking-tight">
              Create your{" "}
              <span className="bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
                fitness account
              </span>{" "}
              today
            </h1>

            <p className="mt-6 max-w-md text-base leading-7 text-slate-300">
              Join your coaches, track your goals, and build a consistent routine
              with one account.
            </p>

            <div className="mt-10 space-y-4">
              <FeatureCard
                emoji="✅"
                title="Simple Signup"
                text="Create your account in minutes with email or Google."
              />
              <FeatureCard
                emoji="📈"
                title="Track Progress"
                text="Keep your workouts, calories, and milestones all in one place."
              />
              <FeatureCard
                emoji="🤝"
                title="Connect With Coaches"
                text="Work directly with experts and stay accountable."
              />
            </div>
          </div>
        </section>

        {/* Right side form */}
        <section className="flex justify-center lg:justify-end">
          <div className="w-full max-w-md rounded-[28px] border border-white/10 bg-[rgba(255,255,255,0.03)] p-8 shadow-[0_0_80px_rgba(37,99,235,0.12)] backdrop-blur-md">
            <div className="mx-auto mb-6 flex w-fit rounded-xl border border-white/10 bg-[rgba(255,255,255,0.05)] px-30 py-2">
              <button className="text-sm font-semibold text-slate-200">
                Sign Up
              </button>
            </div>

            <h2 className="text-4xl font-black tracking-tight">
              Create your <span className="text-blue-400">account</span>
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              Start your fitness journey with a free account
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
                Continue with Google
              </button>
            </div>

            <div className="my-5 flex items-center gap-3">
              <div className="h-px flex-1 bg-white/10" />
              <span className="text-xs text-slate-500">or continue with email</span>
              <div className="h-px flex-1 bg-white/10" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-slate-400">
                  Name
                </label>
                <input
                  type="text"
                  name="name"
                  placeholder="John Doe"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-white/10 bg-[#0B1220] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-blue-400/60 focus:ring-2 focus:ring-blue-500/20"
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-slate-400">
                  Email Address
                </label>
                <input
                  type="email"
                  name="email"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-white/10 bg-[#0B1220] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-blue-400/60 focus:ring-2 focus:ring-blue-500/20"
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-slate-400">
                  Age
                </label>
                <input
                  type="number"
                  min="1"
                  name="age"
                  placeholder="25"
                  value={formData.age}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-white/10 bg-[#0B1220] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-blue-400/60 focus:ring-2 focus:ring-blue-500/20"
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-slate-400">
                  Gender
                </label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-white/10 bg-[#0B1220] px-4 py-3 text-sm text-white outline-none transition focus:border-blue-400/60 focus:ring-2 focus:ring-blue-500/20"
                  required
                >
                  <option value="">Select gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Non-Binary">Non-binary</option>
                  <option value="Prefer_Not_to_Say">Prefer not to say</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-slate-400">
                  Password
                </label>
                <input
                  type="password"
                  name="password"
                  placeholder="••••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-white/10 bg-[#0B1220] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-blue-400/60 focus:ring-2 focus:ring-blue-500/20"
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-slate-400">
                  Confirm Password
                </label>
                <input
                  type="password"
                  name="confirmPassword"
                  placeholder="••••••••••"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-white/10 bg-[#0B1220] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-blue-400/60 focus:ring-2 focus:ring-blue-500/20"
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-slate-400">
                  Profile Image URL (Optional)
                </label>
                <input
                  type="url"
                  name="pfpUrl"
                  placeholder="https://example.com/avatar.png"
                  value={formData.pfpUrl}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-white/10 bg-[#0B1220] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-blue-400/60 focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-slate-400">
                  Bio (Optional)
                </label>
                <textarea
                  name="bio"
                  placeholder="Tell us about your fitness goals"
                  value={formData.bio}
                  onChange={handleChange}
                  rows={3}
                  className="w-full rounded-xl border border-white/10 bg-[#0B1220] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-blue-400/60 focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <button
                type="submit"
                className="w-full rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-400 px-4 py-3 text-sm font-bold text-white shadow-[0_0_30px_rgba(59,130,246,0.3)] transition hover:scale-[1.01]"
              >
                Create account →
              </button>

              {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
            </form>

            <p className="mt-5 text-center text-xs text-slate-500">
              Already have an account?{" "}
              <Link to="/login" className="font-semibold text-blue-400 hover:text-cyan-300">
                Sign in
              </Link>
            </p>
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


