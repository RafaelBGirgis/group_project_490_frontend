import { useState } from "react";
import { Link } from "react-router-dom";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    // connect backend reset email logic here later
    console.log("Send reset link to:", email);
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
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-400 shadow-[0_0_30px_rgba(59,130,246,0.25)]">
            <span className="text-lg">🏋️</span>
          </div>
          <p className="text-base font-semibold text-blue-300">Till Failure</p>
        </div>
      </header>

      <main className="relative z-10 flex min-h-[calc(100vh-73px)] items-center justify-center px-6 py-10">
        <div className="w-full max-w-md rounded-[28px] border border-white/10 bg-white/[0.03] p-8 shadow-[0_0_80px_rgba(37,99,235,0.12)] backdrop-blur-md">
          <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500/20 to-cyan-400/20 border border-white/10 text-2xl shadow-[0_0_25px_rgba(59,130,246,0.15)]">
            🔑
          </div>

          <h1 className="text-4xl font-black tracking-tight">
            Forgot your <span className="text-blue-400">password?</span>
          </h1>

          <p className="mt-3 text-sm leading-6 text-slate-400">
            No worries — enter your email address and we&apos;ll send you a link
            to reset it.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
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
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-400 px-4 py-3 text-sm font-bold text-white shadow-[0_0_30px_rgba(59,130,246,0.3)] transition hover:scale-[1.01]"
            >
              Send reset link →
            </button>
          </form>

          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-white/10" />
            <span className="text-xs text-slate-500">or</span>
            <div className="h-px flex-1 bg-white/10" />
          </div>

          <Link
            to="/login"
            className="flex w-full items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-medium text-slate-300 transition hover:bg-white/[0.06]"
          >
            ← Back to sign in
          </Link>

          <p className="mt-5 text-center text-xs text-slate-500">
            Don&apos;t have an account?{" "}
            <Link to="/signup" className="font-semibold text-blue-400 hover:text-cyan-300">
              Sign up free
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}