import { useEffect } from "react";

/**
 * Full-screen overlay that renders on top of the dashboard.
 * Closes on backdrop click or Escape key.
 *
 * Props:
 *   open     – boolean
 *   onClose  – () => void
 *   title    – string (header text)
 *   wide     – boolean (use wider panel, default false)
 *   children – overlay body
 */
export default function Overlay({ open, onClose, title, wide = false, children }) {
  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // Lock body scroll while open
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 pb-10 px-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={`relative ${wide ? "max-w-4xl" : "max-w-2xl"} w-full max-h-[calc(100vh-8rem)] flex flex-col rounded-2xl border border-white/10 bg-[#0D1424] shadow-[0_0_80px_rgba(0,0,0,0.6)] animate-in`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <h2 className="text-lg font-bold text-white">{title}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {children}
        </div>
      </div>
    </div>
  );
}
