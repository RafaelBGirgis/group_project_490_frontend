import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import clientLogo from "../assets/Client Logo.svg";

const B  = "#3B82F6"; // blue core
const B2 = "#60A5FA"; // blue light
const B3 = "#2563EB"; // blue deep
const B4 = "#93C5FD"; // blue pale
const O  = "#F97316"; // orange core
const O2 = "#FB923C"; // orange light
const O3 = "#EA580C"; // orange deep
const O4 = "#FDBA74"; // orange pale
const M  = "#818CF8"; // midpoint — blue-leaning blend
const W  = "#F59E0B"; // warm amber accent

/* ── hooks ────────────────────────────────────────────────────────────── */
function useReveal(th = 0.15) {
  const ref = useRef(null);
  const [v, set] = useState(false);
  useEffect(() => {
    const o = new IntersectionObserver(([e]) => { if (e.isIntersecting) set(true); }, { threshold: th });
    if (ref.current) o.observe(ref.current);
    return () => o.disconnect();
  }, []);
  return [ref, v];
}

function CountUp({ to, suffix = "", dur = 1100 }) {
  const [v, set] = useState(0);
  const [ref, vis] = useReveal();
  const ran = useRef(false);
  useEffect(() => {
    if (!vis || ran.current) return; ran.current = true;
    let s = null;
    const go = (t) => { if (!s) s = t; const p = Math.min((t - s) / dur, 1); set(Math.floor((1 - Math.pow(1 - p, 3)) * to)); if (p < 1) requestAnimationFrame(go); };
    requestAnimationFrame(go);
  }, [vis, to, dur]);
  return <span ref={ref}>{v.toLocaleString()}{suffix}</span>;
}

/* ── icons (SVG) ──────────────────────────────────────────────────────── */
const I = {
  dumbbell: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M6.5 6.5h11M6.5 17.5h11M3 10v4M21 10v4M5 8v8a1 1 0 001 1h1a1 1 0 001-1V8a1 1 0 00-1-1H6a1 1 0 00-1 1zM16 8v8a1 1 0 001 1h1a1 1 0 001-1V8a1 1 0 00-1-1h-1a1 1 0 00-1 1z" />
    </svg>
  ),
  chart: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M3 3v18h18" /><path d="M7 16l4-6 4 3 5-7" />
    </svg>
  ),
  chat: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
    </svg>
  ),
  users: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
    </svg>
  ),
  target: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" />
    </svg>
  ),
  trend: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" />
    </svg>
  ),
  fork: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 002-2V2M7 2v20M21 15V2a5 5 0 00-5 5v6c0 1.1.9 2 2 2h3zm0 0v7" />
    </svg>
  ),
  heart: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M20.42 4.58a5.4 5.4 0 00-7.65 0l-.77.78-.77-.78a5.4 5.4 0 00-7.65 0C1.46 6.7 1.33 10.28 4 13l8 8 8-8c2.67-2.72 2.54-6.3.42-8.42z" />
    </svg>
  ),
  arrow: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  ),
};

/* ═══════════════════════════════════════════════════════════════════════ */

export default function LandingPage() {
  const [loaded, setLoaded] = useState(false);
  const [mouse, setMouse] = useState({ x: 0.5, y: 0.5 });
  useEffect(() => { setTimeout(() => setLoaded(true), 60); }, []);
  const onMouse = (e) => setMouse({ x: e.clientX / window.innerWidth, y: e.clientY / window.innerHeight });

  const [gRef, gVis] = useReveal(0.05);
  const [sRef, sVis] = useReveal(0.12);
  const [cRef, cVis] = useReveal(0.15);

  return (
    <div className="min-h-screen text-white overflow-hidden relative" style={{ background: "#030712" }} onMouseMove={onMouse}>

      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes float-a{0%,100%{transform:translateY(0)}50%{transform:translateY(-18px)}}
        @keyframes float-b{0%,100%{transform:translateX(0)}50%{transform:translateX(14px)}}
        @keyframes breathe{0%,100%{opacity:.5}50%{opacity:.8}}
        @keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
        @keyframes pulse-ring{0%{transform:scale(1);opacity:.6}100%{transform:scale(2.5);opacity:0}}
        @keyframes wave-draw{from{stroke-dashoffset:400}to{stroke-dashoffset:0}}
        @keyframes color-cycle{0%{stop-color:${B}}33%{stop-color:${M}}66%{stop-color:${O}}100%{stop-color:${B}}}
        .spin-s{animation:spin 80s linear infinite}
        .spin-r{animation:spin 55s linear infinite reverse}
        .fa{animation:float-a 6s ease-in-out infinite}
        .fb{animation:float-a 4.5s ease-in-out infinite 1s}
        .fc{animation:float-b 5.5s ease-in-out infinite .5s}
        .breathe{animation:breathe 4s ease-in-out infinite}
        .shimmer-t{
          background:linear-gradient(90deg,${B},${B2},${O},${O2},${B});
          background-size:300% 100%;
          -webkit-background-clip:text;-webkit-text-fill-color:transparent;
          animation:shimmer 5s linear infinite;
        }
      `}</style>

      {/* ══════════════════════════════════════════════════════════════════
          BACKGROUND — multiple vivid color layers
          ══════════════════════════════════════════════════════════════════ */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {/* Big rotating conic meshes */}
        <div className="spin-s absolute w-[110vw] h-[110vh] -top-[30%] -left-[20%] blur-[130px]"
          style={{ background: `conic-gradient(from 0deg, ${B}30, ${B2}20, transparent 25%, ${O}28, ${O2}18, transparent 50%, ${B3}20, ${B}15, transparent 75%, ${O}22, ${W}14, transparent)`,
            transform: `translate(${(mouse.x - .5) * 20}px, ${(mouse.y - .5) * 20}px)`, transition: "transform .3s ease-out" }} />
        <div className="spin-r absolute w-[90vw] h-[90vh] -bottom-[20%] -right-[10%] blur-[110px]"
          style={{ background: `conic-gradient(from 180deg, ${O}28, ${O2}18, transparent 20%, ${B}22, ${B2}18, transparent 45%, ${W}20, ${O}14, transparent 70%, ${B}15, ${M}12, transparent)`,
            animationDelay: "2s" }} />

        {/* Color pools */}
        <div className="absolute top-[5%] left-[10%] w-[400px] h-[400px] rounded-full blur-[90px]" style={{ background: `${B}18` }} />
        <div className="absolute top-[8%] right-[12%] w-[350px] h-[350px] rounded-full blur-[90px]" style={{ background: `${O}16` }} />
        <div className="absolute top-[40%] left-[50%] -translate-x-1/2 w-[500px] h-[300px] rounded-full blur-[100px]" style={{ background: `linear-gradient(135deg, ${B}0D, ${O}0D)` }} />
        <div className="absolute bottom-[10%] left-[20%] w-[300px] h-[300px] rounded-full blur-[80px]" style={{ background: `${B2}10` }} />
        <div className="absolute bottom-[15%] right-[15%] w-[350px] h-[350px] rounded-full blur-[80px]" style={{ background: `${O2}0E` }} />

        {/* Grid */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.03]"><defs><pattern id="g" width="50" height="50" patternUnits="userSpaceOnUse"><path d="M50 0L0 0 0 50" fill="none" stroke="white" strokeWidth=".5"/></pattern></defs><rect width="100%" height="100%" fill="url(#g)"/></svg>

        {/* Orbs */}
        <div className="fa absolute top-[12%] left-[18%] w-3 h-3 rounded-full" style={{ background: `radial-gradient(${B}, transparent)`, boxShadow: `0 0 12px ${B}60` }} />
        <div className="fb absolute top-[22%] right-[22%] w-3.5 h-3.5 rounded-full" style={{ background: `radial-gradient(${O}, transparent)`, boxShadow: `0 0 12px ${O}60` }} />
        <div className="fc absolute top-[45%] left-[8%] w-2.5 h-2.5 rounded-full" style={{ background: `radial-gradient(${B2}, transparent)`, boxShadow: `0 0 10px ${B2}50` }} />
        <div className="fa absolute top-[55%] right-[12%] w-2 h-2 rounded-full" style={{ background: `radial-gradient(${O2}, transparent)`, boxShadow: `0 0 10px ${O2}50` }} />
        <div className="fb absolute top-[72%] left-[35%] w-3 h-3 rounded-full" style={{ background: `radial-gradient(${W}, transparent)`, boxShadow: `0 0 12px ${W}40` }} />
        <div className="fc absolute top-[80%] right-[30%] w-2 h-2 rounded-full" style={{ background: `radial-gradient(${B}, transparent)`, boxShadow: `0 0 10px ${B}40` }} />
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          NAV
          ══════════════════════════════════════════════════════════════════ */}
      <nav className="relative z-30 backdrop-blur-2xl border-b border-white/[0.06]"
        style={{ opacity: loaded ? 1 : 0, transform: loaded ? "translateY(0)" : "translateY(-14px)", transition: "all .6s cubic-bezier(.22,1,.36,1) .1s" }}>
        <div className="mx-auto max-w-7xl flex items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="relative">
              <img src={clientLogo} alt="" className="h-10 w-10 rounded-xl bg-white/5 p-1.5 relative z-10 group-hover:scale-110 transition-transform" />
              <div className="absolute inset-0 rounded-xl blur-lg opacity-0 group-hover:opacity-60 transition-opacity duration-500"
                style={{ background: `linear-gradient(135deg, ${B}, ${O})` }} />
            </div>
            <div>
              <p className="text-[15px] font-bold tracking-tight">Till Failure</p>
              <p className="text-[9px] uppercase tracking-[0.35em] font-medium" style={{ color: `${B}90` }}>Fitness platform</p>
            </div>
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-sm text-slate-400 hover:text-white transition px-3 py-1.5">Log in</Link>
            <Link to="/signup"
              className="text-sm font-semibold rounded-full px-5 py-2 text-white transition-all duration-300 hover:scale-105 hover:shadow-lg"
              style={{ background: `linear-gradient(135deg, ${B}, ${M}, ${O})`, boxShadow: `0 4px 24px ${B}30, 0 4px 24px ${O}30` }}>
              Get started
            </Link>
          </div>
        </div>
      </nav>

      {/* ══════════════════════════════════════════════════════════════════
          HERO
          ══════════════════════════════════════════════════════════════════ */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 pt-28 pb-20 text-center">
        {/* Decorative animated SVG arcs */}
        <svg className="absolute top-8 left-1/2 -translate-x-1/2 w-[700px] h-[350px] pointer-events-none" viewBox="0 0 700 350" fill="none">
          <defs>
            <linearGradient id="hg1" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={B} stopOpacity=".5"><animate attributeName="stop-color" values={`${B};${B2};${B}`} dur="6s" repeatCount="indefinite" /></stop>
              <stop offset="100%" stopColor={O} stopOpacity=".5"><animate attributeName="stop-color" values={`${O};${O2};${O}`} dur="6s" repeatCount="indefinite" /></stop>
            </linearGradient>
          </defs>
          <path d="M50 250 Q200 50 350 180 Q500 310 650 100" stroke="url(#hg1)" strokeWidth="1.5" strokeLinecap="round"
            strokeDasharray="800" style={{ strokeDashoffset: loaded ? 0 : 800, transition: "stroke-dashoffset 2.5s ease-out .5s" }} />
          <path d="M50 280 Q250 100 350 220 Q450 340 650 140" stroke={`${O2}35`} strokeWidth="1"
            strokeDasharray="800" style={{ strokeDashoffset: loaded ? 0 : 800, transition: "stroke-dashoffset 2.5s ease-out .8s" }} />
        </svg>

        {/* Pill */}
        <div style={{ opacity: loaded ? 1 : 0, transform: loaded ? "translateY(0)" : "translateY(18px)", transition: "all .7s cubic-bezier(.22,1,.36,1) .2s" }}>
          <span className="inline-flex items-center gap-2.5 rounded-full px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.2em]"
            style={{ background: `linear-gradient(135deg, ${B}12, ${O}12)`, border: `1px solid ${B}20` }}>
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: B, boxShadow: `0 0 10px ${B}` }} />
            <span className="text-slate-300">Athletes & Coaches</span>
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: O, boxShadow: `0 0 10px ${O}` }} />
          </span>
        </div>

        {/* Headline */}
        <h1 className="mt-10 text-5xl sm:text-6xl lg:text-[5.5rem] font-black leading-[1.02] tracking-tight"
          style={{ opacity: loaded ? 1 : 0, transform: loaded ? "translateY(0)" : "translateY(28px)", transition: "all .9s cubic-bezier(.22,1,.36,1) .35s" }}>
          <span className="text-white">Where </span>
          <span className="relative inline-block">
            <span style={{ background: `linear-gradient(135deg, ${B}, ${B2})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>effort</span>
            <svg className="absolute -bottom-2 left-0 w-full h-3 overflow-visible" viewBox="0 0 100 10">
              <path d="M0 5 Q25 0 50 5 Q75 10 100 5" fill="none" stroke={B} strokeWidth="3" strokeLinecap="round" opacity=".6"
                strokeDasharray="120" style={{ strokeDashoffset: loaded ? 0 : 120, transition: "stroke-dashoffset 1.2s ease-out 1.2s" }} />
            </svg>
          </span>
          <br className="hidden sm:block" />
          <span className="text-white">meets </span>
          <span className="relative inline-block">
            <span style={{ background: `linear-gradient(135deg, ${O}, ${O2})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>expertise</span>
            <svg className="absolute -bottom-2 left-0 w-full h-3 overflow-visible" viewBox="0 0 100 10">
              <path d="M0 5 Q25 10 50 5 Q75 0 100 5" fill="none" stroke={O} strokeWidth="3" strokeLinecap="round" opacity=".6"
                strokeDasharray="120" style={{ strokeDashoffset: loaded ? 0 : 120, transition: "stroke-dashoffset 1.2s ease-out 1.4s" }} />
            </svg>
          </span>
        </h1>

        <p className="mt-8 text-lg sm:text-xl max-w-2xl mx-auto leading-relaxed"
          style={{ color: "rgba(203,213,225,.8)", opacity: loaded ? 1 : 0, transform: loaded ? "translateY(0)" : "translateY(18px)", transition: "all .8s cubic-bezier(.22,1,.36,1) .55s" }}>
          One platform for clients chasing PRs and coaches building empires.
          Train, track, connect, and grow — together.
        </p>

        {/* CTAs */}
        <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4"
          style={{ opacity: loaded ? 1 : 0, transform: loaded ? "translateY(0)" : "translateY(14px)", transition: "all .8s cubic-bezier(.22,1,.36,1) .7s" }}>
          <Link to="/signup"
            className="group relative rounded-2xl px-9 py-4 text-base font-bold text-white overflow-hidden transition-all duration-300 hover:scale-105"
            style={{ background: `linear-gradient(135deg, ${B}, ${M}dd, ${O})`, boxShadow: `0 8px 30px ${B}30, 0 8px 30px ${O}30` }}>
            <span className="relative z-10 flex items-center gap-2">Start for free {I.arrow}</span>
            <div className="absolute inset-0 bg-white/0 group-hover:bg-white/[0.12] transition duration-300" />
          </Link>
          <Link to="/login"
            className="rounded-2xl px-8 py-4 text-base font-semibold text-slate-300 transition-all duration-300 hover:text-white"
            style={{ background: "rgba(255,255,255,.03)", border: `1px solid rgba(255,255,255,.08)` }}>
            I have an account
          </Link>
        </div>

        {/* Colorful role pills */}
        <div className="mt-14 flex items-center justify-center gap-6"
          style={{ opacity: loaded ? 1 : 0, transition: "opacity 1s ease-out 1s" }}>
          <div className="flex items-center gap-2 px-4 py-2 rounded-full" style={{ background: `${B}15`, border: `1px solid ${B}25` }}>
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: B, boxShadow: `0 0 8px ${B}` }} />
            <span className="text-xs font-semibold" style={{ color: B2 }}>Client tools</span>
          </div>
          <div className="w-8 h-px" style={{ background: `linear-gradient(90deg, ${B}40, ${M}40, ${O}40)` }} />
          <div className="flex items-center gap-2 px-4 py-2 rounded-full" style={{ background: `linear-gradient(135deg, ${B}08, ${O}08)`, border: `1px solid ${M}20` }}>
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: `linear-gradient(135deg, ${B}, ${O})`, boxShadow: `0 0 8px ${M}` }} />
            <span className="text-xs font-semibold" style={{ color: M }}>Shared</span>
          </div>
          <div className="w-8 h-px" style={{ background: `linear-gradient(90deg, ${O}40, ${M}40, ${B}40)` }} />
          <div className="flex items-center gap-2 px-4 py-2 rounded-full" style={{ background: `${O}15`, border: `1px solid ${O}25` }}>
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: O, boxShadow: `0 0 8px ${O}` }} />
            <span className="text-xs font-semibold" style={{ color: O2 }}>Coach tools</span>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          BENTO GRID
          ══════════════════════════════════════════════════════════════════ */}
      <section ref={gRef} className="relative z-10 max-w-6xl mx-auto px-6 pb-28">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

          {/* Workouts — client, tall */}
          <GlowCard i={0} vis={gVis} color={B} span="lg:row-span-2" gradient={`linear-gradient(160deg, ${B}14 0%, ${B3}08 40%, transparent 70%)`}>
            <Badge color={B}>Client</Badge>
            <Ico color={B}>{I.dumbbell}</Ico>
            <h3 className="text-lg font-bold text-white mt-4">Build your workouts</h3>
            <p className="text-sm text-slate-400 mt-2 leading-relaxed">
              Choose from 100+ presets or create custom routines. Every set, rep, and rest period — dialed in.
            </p>
            <div className="mt-5 flex gap-2 flex-wrap">
              {["Push/Pull/Legs","Upper/Lower","Full Body","Custom"].map(t=>(
                <span key={t} className="text-[10px] px-2.5 py-1 rounded-full font-medium"
                  style={{ background:`${B}15`, color:B2, border:`1px solid ${B}20` }}>{t}</span>
              ))}
            </div>
            {/* Colorful bars */}
            <div className="mt-6 flex items-end gap-1.5 h-24">
              {[35,55,45,70,60,85,50,72,80,48,65,90].map((h,i)=>{
                const colors = [B,B2,B3,B,B4,B2,B3,B,B2,B4,B,B3];
                return <div key={i} className="flex-1 rounded-t transition-all duration-700"
                  style={{ height: gVis?`${h}%`:"0%", background:`linear-gradient(to top, ${colors[i]}70, ${colors[i]}25)`, transitionDelay:`${500+i*60}ms` }}/>;
              })}
            </div>
          </GlowCard>

          {/* Assign — coach */}
          <GlowCard i={1} vis={gVis} color={O} gradient={`linear-gradient(160deg, ${O}12 0%, transparent 60%)`}>
            <Badge color={O}>Coach</Badge>
            <Ico color={O}>{I.target}</Ico>
            <h3 className="text-lg font-bold text-white mt-4">Assign programs</h3>
            <p className="text-sm text-slate-400 mt-2 leading-relaxed">
              Push tailored workout plans to any client. Monitor compliance and adjust on the fly.
            </p>
            <div className="mt-4 flex items-center gap-2.5">
              <div className="flex -space-x-2">
                {[B,B2,O2,O].map((c,i)=>(
                  <div key={i} className="w-8 h-8 rounded-full border-2 flex items-center justify-center text-[9px] font-bold"
                    style={{ borderColor:"#0a0f1a", background:`${c}30`, color:`${c}`, boxShadow:`0 0 8px ${c}30` }}>
                    {["AM","JK","SR","CT"][i]}
                  </div>
                ))}
              </div>
              <span className="text-xs" style={{ color: O2 }}>4 assigned</span>
            </div>
          </GlowCard>

          {/* Progress — client */}
          <GlowCard i={2} vis={gVis} color={B} gradient={`linear-gradient(160deg, ${B2}0C 0%, ${B}0A 50%, transparent 80%)`}>
            <Badge color={B}>Client</Badge>
            <Ico color={B2}>{I.chart}</Ico>
            <h3 className="text-lg font-bold text-white mt-4">Track everything</h3>
            <p className="text-sm text-slate-400 mt-2 leading-relaxed">
              Workouts, meals, body metrics — animated charts that make progress tangible.
            </p>
            <svg className="mt-4 w-full h-14" viewBox="0 0 200 56">
              <defs>
                <linearGradient id="af" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={B2} stopOpacity=".4" />
                  <stop offset="100%" stopColor={B} stopOpacity="0" />
                </linearGradient>
              </defs>
              <polygon points="0,56 10,44 30,40 50,26 70,30 90,16 110,20 130,10 150,18 170,8 190,14 200,6 200,56" fill="url(#af)" />
              <polyline points="10,44 30,40 50,26 70,30 90,16 110,20 130,10 150,18 170,8 190,14 200,6" fill="none" stroke={B2} strokeWidth="2" strokeLinecap="round" />
              <circle cx="200" cy="6" r="3.5" fill={B2}>
                <animate attributeName="r" values="3.5;6;3.5" dur="2s" repeatCount="indefinite"/>
                <animate attributeName="opacity" values="1;.4;1" dur="2s" repeatCount="indefinite"/>
              </circle>
            </svg>
          </GlowCard>

          {/* Roster — coach, tall */}
          <GlowCard i={3} vis={gVis} color={O} span="lg:row-span-2" gradient={`linear-gradient(160deg, ${O}14 0%, ${O3}0A 40%, transparent 70%)`}>
            <Badge color={O}>Coach</Badge>
            <Ico color={O}>{I.users}</Ico>
            <h3 className="text-lg font-bold text-white mt-4">Manage your roster</h3>
            <p className="text-sm text-slate-400 mt-2 leading-relaxed">
              Every client, their plans, and progress — one view. Scale without losing the personal touch.
            </p>
            <div className="mt-5 space-y-2">
              {[
                { n:"Alex M.", s:"On track", c:"#22C55E" },
                { n:"Jordan K.", s:"Needs check-in", c:O },
                { n:"Sam R.", s:"PR this week", c:B },
                { n:"Casey T.", s:"New client", c:M },
              ].map((u,i)=>(
                <div key={u.n} className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-600"
                  style={{ background:`${u.c}06`, border:`1px solid ${u.c}15`,
                    opacity:gVis?1:0, transform:gVis?"translateX(0)":"translateX(20px)", transitionDelay:`${700+i*120}ms` }}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold"
                    style={{ background:`${u.c}18`, color:u.c, border:`1px solid ${u.c}30`, boxShadow:`0 0 8px ${u.c}20` }}>
                    {u.n.split(" ").map(x=>x[0]).join("")}
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-medium text-white/80">{u.n}</p>
                    <p className="text-[10px]" style={{ color:`${u.c}bb` }}>{u.s}</p>
                  </div>
                  <div className="w-2 h-2 rounded-full" style={{ background:u.c, boxShadow:`0 0 8px ${u.c}80` }}/>
                </div>
              ))}
            </div>
          </GlowCard>

          {/* Messaging — shared */}
          <GlowCard i={4} vis={gVis} color={M} gradient={`linear-gradient(135deg, ${B}0C, ${M}0A, ${O}0C)`}>
            <div className="flex gap-1.5">
              <Badge color={B}>Client</Badge>
              <Badge color={O}>Coach</Badge>
            </div>
            <Ico color={M} dual>{I.chat}</Ico>
            <h3 className="text-lg font-bold text-white mt-4">Real-time messaging</h3>
            <p className="text-sm text-slate-400 mt-2 leading-relaxed">
              Seamless chat between athletes and coaches. Form checks, questions, accountability.
            </p>
          </GlowCard>

          {/* Analytics — coach */}
          <GlowCard i={5} vis={gVis} color={O} gradient={`linear-gradient(160deg, ${O}0E 0%, ${W}0A 50%, transparent 80%)`}>
            <Badge color={O}>Coach</Badge>
            <Ico color={W}>{I.trend}</Ico>
            <h3 className="text-lg font-bold text-white mt-4">Growth analytics</h3>
            <p className="text-sm text-slate-400 mt-2 leading-relaxed">
              Retention, engagement, revenue — the metrics that build your empire.
            </p>
            {/* Mini multi-color bar */}
            <div className="mt-4 flex items-end gap-1 h-10">
              {[50,70,40,85,60,75,90,55].map((h,i)=>{
                const c = [O,W,O2,O,W,O2,O,W][i];
                return <div key={i} className="flex-1 rounded-t transition-all duration-500"
                  style={{ height:gVis?`${h}%`:"0%", background:`linear-gradient(to top,${c}60,${c}20)`, transitionDelay:`${800+i*50}ms` }}/>;
              })}
            </div>
          </GlowCard>

          {/* Nutrition — client */}
          <GlowCard i={6} vis={gVis} color={B} gradient={`linear-gradient(160deg, ${B4}0C 0%, ${B}0A 50%, transparent 80%)`}>
            <Badge color={B}>Client</Badge>
            <Ico color={B4}>{I.fork}</Ico>
            <h3 className="text-lg font-bold text-white mt-4">Log meals</h3>
            <p className="text-sm text-slate-400 mt-2 leading-relaxed">
              Track macros and meals alongside training for the complete picture.
            </p>
            {/* Donut ring */}
            <svg className="mt-3 w-16 h-16" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="14" fill="none" stroke={`${B}20`} strokeWidth="3" />
              <circle cx="18" cy="18" r="14" fill="none" stroke={B} strokeWidth="3" strokeLinecap="round"
                strokeDasharray={gVis?"55 33":"0 88"} transform="rotate(-90 18 18)"
                style={{ transition:"stroke-dasharray 1.2s ease-out 1s" }} />
              <circle cx="18" cy="18" r="14" fill="none" stroke={O} strokeWidth="3" strokeLinecap="round"
                strokeDasharray={gVis?"22 66":"0 88"} strokeDashoffset="-55" transform="rotate(-90 18 18)"
                style={{ transition:"stroke-dasharray 1.2s ease-out 1.2s" }} />
              <circle cx="18" cy="18" r="14" fill="none" stroke={B2} strokeWidth="3" strokeLinecap="round"
                strokeDasharray={gVis?"11 77":"0 88"} strokeDashoffset="-77" transform="rotate(-90 18 18)"
                style={{ transition:"stroke-dasharray 1.2s ease-out 1.4s" }} />
            </svg>
          </GlowCard>

          {/* Marketplace — shared, wide */}
          <GlowCard i={7} vis={gVis} color={null} span="md:col-span-2" gradient={`linear-gradient(135deg, ${B}0C, ${M}08, ${O}0C)`}>
            <div className="flex gap-1.5">
              <Badge color={B}>Client</Badge>
              <Badge color={O}>Coach</Badge>
            </div>
            <div className="flex flex-col sm:flex-row gap-6 mt-1">
              <div className="flex-1">
                <Ico color={O2}>{I.heart}</Ico>
                <h3 className="text-lg font-bold text-white mt-4">Find your perfect match</h3>
                <p className="text-sm text-slate-400 mt-2 leading-relaxed">
                  Clients browse verified coaches. Coaches grow their roster. The marketplace for both.
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0 self-center">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background:`${B}15`, border:`1px solid ${B}25`, boxShadow:`0 0 20px ${B}15` }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke={B2} strokeWidth="1.5" className="w-7 h-7"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <div className="w-6 h-px" style={{ background:`linear-gradient(90deg, ${B}, ${M}, ${O})` }} />
                  <div className="w-8 h-px" style={{ background:`linear-gradient(90deg, ${B}80, ${M}, ${O}80)` }} />
                  <div className="w-6 h-px" style={{ background:`linear-gradient(90deg, ${B}, ${M}, ${O})` }} />
                </div>
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background:`${O}15`, border:`1px solid ${O}25`, boxShadow:`0 0 20px ${O}15` }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke={O2} strokeWidth="1.5" className="w-7 h-7"><path d="M12 15l-2-2m0 0l2-2m-2 2h12M19.071 4.929A10 10 0 003 12a10 10 0 0016.071 7.071"/></svg>
                </div>
              </div>
            </div>
          </GlowCard>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          STATS
          ══════════════════════════════════════════════════════════════════ */}
      <section ref={sRef} className="relative z-10">
        <div className="h-px" style={{ background:`linear-gradient(90deg, transparent 5%, ${B}40, ${B2}30, ${O2}30, ${O}40, transparent 95%)` }} />
        <div className="max-w-6xl mx-auto px-6 py-20">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10 text-center"
            style={{ opacity:sVis?1:0, transform:sVis?"translateY(0)":"translateY(18px)", transition:"all .8s cubic-bezier(.22,1,.36,1)" }}>
            {[
              { v:100, s:"+", l:"Preset workouts", c:B },
              { v:12, s:"k+", l:"Active users", c:B2 },
              { v:500, s:"+", l:"Verified coaches", c:O },
              { v:95, s:"%", l:"Satisfaction", c:O2 },
            ].map((st,i)=>(
              <div key={st.l} style={{ transitionDelay:`${i*100}ms` }}>
                <p className="text-4xl lg:text-5xl font-black" style={{ color:st.c, textShadow:`0 0 30px ${st.c}30` }}>
                  <CountUp to={st.v} suffix={st.s}/>
                </p>
                <p className="mt-2 text-[11px] uppercase tracking-[0.2em] text-slate-500 font-medium">{st.l}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="h-px" style={{ background:`linear-gradient(90deg, transparent 5%, ${O}40, ${O2}30, ${B2}30, ${B}40, transparent 95%)` }} />
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          CTA
          ══════════════════════════════════════════════════════════════════ */}
      <section ref={cRef} className="relative z-10 max-w-4xl mx-auto px-6 py-28 text-center">
        {/* Big glow behind CTA */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] rounded-full blur-[100px] pointer-events-none"
          style={{ background:`linear-gradient(135deg, ${B}1A, ${B2}10, ${O2}10, ${O}1A)` }} />

        <div className="relative" style={{ opacity:cVis?1:0, transform:cVis?"translateY(0)":"translateY(22px)", transition:"all .8s cubic-bezier(.22,1,.36,1)" }}>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black leading-tight">
            <span className="text-white">Ready to go </span>
            <span className="shimmer-t">till failure</span>
            <span className="text-white">?</span>
          </h2>
          <p className="mt-5 text-slate-400 text-lg max-w-lg mx-auto">
            Join thousands already on the platform.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/signup?role=client"
              className="rounded-2xl px-8 py-4 text-base font-bold text-white transition-all duration-300 hover:scale-105 hover:brightness-110"
              style={{ background:`linear-gradient(135deg, ${B}, ${B3})`, boxShadow:`0 10px 40px ${B}35` }}>
              Join as Client
            </Link>
            <Link to="/signup?role=coach"
              className="rounded-2xl px-8 py-4 text-base font-bold text-white transition-all duration-300 hover:scale-105 hover:brightness-110"
              style={{ background:`linear-gradient(135deg, ${O}, ${O3})`, boxShadow:`0 10px 40px ${O}35` }}>
              Become a Coach
            </Link>
          </div>
          <p className="mt-10 text-slate-600 text-sm">
            Already a member?{" "}
            <Link to="/login" className="hover:text-white transition underline underline-offset-4 decoration-white/15 hover:decoration-white/50" style={{ color:B2 }}>Log in</Link>
          </p>
        </div>
      </section>

      <div className="h-px" style={{ background:`linear-gradient(90deg, transparent 10%, ${B}25, ${B2}20, ${O2}20, ${O}25, transparent 90%)` }} />
      <div className="relative z-10 text-center py-6">
        <p className="text-[11px] tracking-wide" style={{ color:"rgba(148,163,184,.4)" }}>Till Failure — Train without limits.</p>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   SUB-COMPONENTS
   ═══════════════════════════════════════════════════════════════════════ */

function GlowCard({ children, i, vis, color, span = "", gradient }) {
  const [h, setH] = useState(false);
  return (
    <div className={`group relative rounded-2xl p-6 overflow-hidden transition-all duration-500 cursor-default ${span}`}
      style={{
        background: gradient || "rgba(255,255,255,.02)",
        border: `1px solid ${h && color ? `${color}30` : "rgba(255,255,255,.06)"}`,
        opacity: vis ? 1 : 0, transform: vis ? "translateY(0)" : "translateY(26px)",
        transitionDelay: vis ? `${i * 80}ms` : "0ms",
        boxShadow: h ? `0 20px 60px rgba(0,0,0,.3), inset 0 1px 0 rgba(255,255,255,.04)` : "inset 0 1px 0 rgba(255,255,255,.03)",
      }}
      onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}>
      {color && <div className="absolute -top-20 -left-20 w-56 h-56 rounded-full pointer-events-none transition-opacity duration-700"
        style={{ background: `radial-gradient(circle, ${color}15 0%, transparent 70%)`, opacity: h ? 1 : 0 }} />}
      <div className="relative z-10">{children}</div>
    </div>
  );
}

function Badge({ color, children }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.15em] rounded-full px-2.5 py-1 mb-3"
      style={{ background: `${color}14`, color, border: `1px solid ${color}22` }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: color, boxShadow: `0 0 6px ${color}` }} />
      {children}
    </span>
  );
}

function Ico({ color, dual, children }) {
  return (
    <div className="w-11 h-11 rounded-xl flex items-center justify-center"
      style={{
        background: dual ? `linear-gradient(135deg, ${B}18, ${M}14, ${O}18)` : `${color}14`,
        border: `1px solid ${dual ? `${M}22` : `${color}25`}`,
        color: color || "#fff",
        boxShadow: `0 0 16px ${color || M}15`,
      }}>
      {children}
    </div>
  );
}
