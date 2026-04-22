import { useNavigate } from "react-router-dom";
import { useState, useEffect, useMemo } from "react";
import {
  Navbar,
  SectionHeader,
  StatusBadge,
  SkeletonDashCard,
} from "../components";
import { fetchMe, fetchAvailableCoaches, requestCoach } from "../api/client";
import { StarIcon as SolidStar } from '@heroicons/react/24/solid'

const role = "client";

/* ── all unique specialties for the filter chips ─────────────────── */
function extractSpecialties(coaches) {
  const set = new Set();
  coaches.forEach((c) => c.specialties?.forEach((s) => set.add(s)));
  return Array.from(set).sort();
}

/* ── star display helper ─────────────────────────────────────────── */
function Stars({ rating }) {
  const full  = Math.floor(rating);
  const half  = rating - full >= 0.25;
  const stars = [];

  {/* full star */}
  for (let i = 0; i < full; i++)
    stars.push(<SolidStar className="w-[1em] h-[1em]" />);

  {/* half star */}
  if (half) {
    stars.push(
    <span key="half" className="relative w-[1em] h-[1em]">
      {/* grey background*/}
      <SolidStar className="absolute w-[1em] h-[1em] text-gray-600" />

      {/* yellow half star */}
      <span className="absolute overflow-hidden w-1/2 text-yellow-400">
        <SolidStar className="w-[1em] h-[1em]" />
      </span>
    </span>
    );
  }

  {/* empty star */}
  for (let i = stars.length; i < 5; i++)
    stars.push(<SolidStar className="w-[1em] h-[1em] text-gray-600" />);

  {/* render stars array */}
  return (
    <> {stars} </>
  );
}

export default function FindCoachPage() {
  const navigate = useNavigate();

  /* ── auth + account ──────────────────────────────────────────────── */
  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("jwt");
    if (!token) { navigate("/login"); return; }
    fetchMe()
      .then((me) => setAccount(me))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [navigate]);

  /* ── coaches ─────────────────────────────────────────────────────── */
  const [coaches, setCoaches] = useState([]);
  const [loadingCoaches, setLoadingCoaches] = useState(true);

  useEffect(() => {
    fetchAvailableCoaches()
      .then(setCoaches)
      .catch(() => {})
      .finally(() => setLoadingCoaches(false));
  }, []);

  /* ── search + filters ───────────────────────────────────────────── */
  const [search, setSearch] = useState("");
  const [selectedSpecialty, setSelectedSpecialty] = useState(null);
  const [sortBy, setSortBy] = useState("rating"); // "rating" | "price" | "experience" | "availability"

  const allSpecialties = useMemo(() => extractSpecialties(coaches), [coaches]);

  const filtered = useMemo(() => {
    let list = [...coaches];

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((c) =>
        c.name.toLowerCase().includes(q) ||
        c.bio?.toLowerCase().includes(q) ||
        c.specialties?.some((s) => s.toLowerCase().includes(q)) ||
        c.certifications?.some((cert) =>
          cert.name.toLowerCase().includes(q) || cert.organization.toLowerCase().includes(q)
        )
      );
    }

    // Specialty filter
    if (selectedSpecialty) {
      list = list.filter((c) => c.specialties?.includes(selectedSpecialty));
    }

    // Sort
    if (sortBy === "rating")       list.sort((a, b) => (b.rating_avg ?? 0) - (a.rating_avg ?? 0));
    if (sortBy === "price")        list.sort((a, b) => (a.pricing?.amount ?? 0) - (b.pricing?.amount ?? 0));
    if (sortBy === "experience")   list.sort((a, b) => (b.experience_years ?? 0) - (a.experience_years ?? 0));
    if (sortBy === "availability") list.sort((a, b) => (b.availability_slots ?? 0) - (a.availability_slots ?? 0));

    return list;
  }, [coaches, search, selectedSpecialty, sortBy]);

  /* ── request a coach ────────────────────────────────────────────── */
  const [requesting, setRequesting] = useState(null); // coach_id being requested
  const [requestedIds, setRequestedIds] = useState(new Set());

  const handleRequest = async (coachId) => {
    if (!account?.client_id) return;
    setRequesting(coachId);
    try {
      await requestCoach(account.client_id, coachId);
      setRequestedIds((prev) => new Set(prev).add(coachId));
    } catch { /* stay on page */ }
    finally { setRequesting(null); }
  };

  /* ── expanded card ──────────────────────────────────────────────── */
  const [expandedId, setExpandedId] = useState(null);

  /* ── initials ───────────────────────────────────────────────────── */
  const userInitials = account?.name
    ? account.name.split(" ").map((n) => n[0]).join("").toUpperCase()
    : "?";

  /* ── loading skeleton ───────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: "#080D19" }}>
        <Navbar role={role} userName="?" />
        <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
          <div className="h-5 w-48 bg-white/5 rounded animate-pulse" />
          <div className="h-12 bg-white/5 rounded-xl animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SkeletonDashCard rows={4} />
            <SkeletonDashCard rows={4} />
            <SkeletonDashCard rows={4} />
            <SkeletonDashCard rows={4} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#080D19" }}>
      <Navbar role={role} userName={userInitials} />

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">

        {/* ─── HEADER ────────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Find a Coach</h1>
            <p className="text-gray-500 text-sm mt-1">
              Browse certified coaches and find the right fit for your goals
            </p>
          </div>
          <button
            onClick={() => navigate("/client")}
            className="text-sm text-blue-400 border border-blue-500/30 rounded-lg px-4 py-2 hover:bg-blue-500/10 transition-colors"
          >
            ← Back to Dashboard
          </button>
        </div>

        {/* ─── SEARCH BAR ────────────────────────────────────────── */}
        <div className="relative">
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, specialty, certification..."
            className="w-full rounded-xl border border-white/10 bg-[#0B1220] pl-12 pr-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-blue-400/40 focus:ring-2 focus:ring-blue-500/10"
          />
        </div>

        {/* ─── FILTERS + SORT ────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Specialty chips */}
          <button
            onClick={() => setSelectedSpecialty(null)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              !selectedSpecialty
                ? "bg-blue-600 text-white border-blue-600"
                : "border-white/10 text-gray-400 hover:border-white/20"
            }`}
          >
            All
          </button>
          {allSpecialties.map((sp) => (
            <button
              key={sp}
              onClick={() => setSelectedSpecialty(sp === selectedSpecialty ? null : sp)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                selectedSpecialty === sp
                  ? "bg-blue-600 text-white border-blue-600"
                  : "border-white/10 text-gray-400 hover:border-white/20"
              }`}
            >
              {sp}
            </button>
          ))}

          {/* Sort dropdown */}
          <div className="ml-auto flex items-center gap-2">
            <span className="text-[10px] text-gray-500 uppercase tracking-wider">Sort by</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="rounded-lg border border-white/10 bg-[#0B1220] px-3 py-1.5 text-xs text-gray-300 outline-none focus:border-blue-400/40"
            >
              <option value="rating">Highest Rated</option>
              <option value="price">Lowest Price</option>
              <option value="experience">Most Experienced</option>
              <option value="availability">Most Available</option>
            </select>
          </div>
        </div>

        {/* ─── RESULTS ───────────────────────────────────────────── */}
        <p className="text-gray-500 text-xs">
          {filtered.length} coach{filtered.length !== 1 ? "es" : ""} found
        </p>

        {loadingCoaches ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SkeletonDashCard rows={4} />
            <SkeletonDashCard rows={4} />
            <SkeletonDashCard rows={4} />
            <SkeletonDashCard rows={4} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-500 text-sm">No coaches match your search.</p>
            <button
              onClick={() => { setSearch(""); setSelectedSpecialty(null); }}
              className="text-blue-400 text-sm mt-2 hover:underline"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map((coach) => {
              const isExpanded = expandedId === coach.coach_id;
              const isRequested = requestedIds.has(coach.coach_id);
              const isRequesting = requesting === coach.coach_id;
              const initials = coach.name?.split(" ").map((n) => n[0]).join("") ?? "?";

              return (
                <div
                  key={coach.coach_id}
                  className="rounded-2xl border border-white/6 bg-[#0F1729] p-5 hover:border-blue-500/20 transition-colors"
                >
                  {/* Top row: avatar + info + price */}
                  <div className="flex items-start gap-4">
                    {/* Avatar */}
                    <div className="w-14 h-14 rounded-full bg-blue-900/40 flex items-center justify-center text-blue-400 font-bold text-lg shrink-0">
                      {initials}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-white font-bold text-sm truncate">{coach.name}</p>
                        {coach.verified && (
                          <StatusBadge label="Verified" variant="success" dot />
                        )}
                      </div>

                      {/* Specialties */}
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {coach.specialties?.map((s) => (
                          <span
                            key={s}
                            className="bg-blue-500/10 text-blue-400 text-[10px] font-medium px-2 py-0.5 rounded-full"
                          >
                            {s}
                          </span>
                        ))}
                      </div>

                      {/* Rating */}
                      <span className="inline-flex items-center text-yellow-400 text-sm leading-none tracking-normal">
                        <Stars rating={coach.rating_avg ?? 0} />
                        <span className="text-gray-600 ml-2">
                          {coach.rating_avg?.toFixed(1)} · {coach.review_count} review{coach.review_count !== 1 ? "s" : ""}
                        </span>
                      </span>
                    </div>

                    {/* Price */}
                    {coach.pricing && (
                      <div className="text-right shrink-0">
                        <p className="text-white font-bold text-lg">
                          ${coach.pricing.amount}
                        </p>
                        <p className="text-gray-500 text-[10px] uppercase">
                          /{coach.pricing.interval}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Stats row */}
                  <div className="flex gap-4 mt-4 pt-3 border-t border-white/5">
                    <div className="flex-1 text-center">
                      <p className="text-white font-bold text-sm">{coach.experience_years}yr</p>
                      <p className="text-gray-500 text-[10px] uppercase tracking-wider">Experience</p>
                    </div>
                    <div className="flex-1 text-center">
                      <p className="text-white font-bold text-sm">{coach.active_clients}</p>
                      <p className="text-gray-500 text-[10px] uppercase tracking-wider">Clients</p>
                    </div>
                    <div className="flex-1 text-center">
                      <p className="text-white font-bold text-sm">{coach.availability_slots}</p>
                      <p className="text-gray-500 text-[10px] uppercase tracking-wider">Open Slots</p>
                    </div>
                    <div className="flex-1 text-center">
                      <p className="text-white font-bold text-sm">{coach.certifications?.length ?? 0}</p>
                      <p className="text-gray-500 text-[10px] uppercase tracking-wider">Certs</p>
                    </div>
                  </div>

                  {/* Expandable details */}
                  {isExpanded && (
                    <div className="mt-4 pt-3 border-t border-white/5 space-y-3">
                      {/* Bio */}
                      {coach.bio && (
                        <div>
                          <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">About</p>
                          <p className="text-gray-300 text-xs leading-relaxed">{coach.bio}</p>
                        </div>
                      )}

                      {/* Certifications */}
                      {coach.certifications?.length > 0 && (
                        <div>
                          <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Certifications</p>
                          <div className="space-y-1">
                            {coach.certifications.map((cert, i) => (
                              <div key={i} className="flex items-center gap-2">
                                <span className="text-blue-400 text-xs">✓</span>
                                <span className="text-gray-300 text-xs">{cert.name}</span>
                                <span className="text-gray-600 text-[10px]">— {cert.organization}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : coach.coach_id)}
                      className="flex-1 border border-white/10 text-gray-300 hover:bg-white/5 rounded-xl py-2.5 text-sm font-medium transition-colors"
                    >
                      {isExpanded ? "Show Less" : "View Details"}
                    </button>
                    {isRequested ? (
                      <button
                        disabled
                        className="flex-1 bg-green-900/30 text-green-400 border border-green-500/30 rounded-xl py-2.5 text-sm font-medium cursor-default"
                      >
                        ✓ Request Sent
                      </button>
                    ) : (
                      <button
                        onClick={() => handleRequest(coach.coach_id)}
                        disabled={isRequesting}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-900/40 text-white rounded-xl py-2.5 text-sm font-medium transition-colors disabled:cursor-not-allowed"
                      >
                        {isRequesting ? "Sending..." : "Request Coach"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
