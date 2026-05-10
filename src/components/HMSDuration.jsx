// src/components/HMSDuration.jsx
export function HMSDuration({ value = 0, onChange, disabled = false, className = "" }) {
  const total = Math.max(0, Math.floor(Number(value) || 0));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;

  const box = "w-14 bg-[#080D19] border border-white/10 rounded px-2 py-1 text-sm text-white text-center disabled:opacity-50 disabled:cursor-not-allowed";

  const emit = (dh, dm, ds) =>
    onChange(Math.max(0, dh) * 3600 + Math.min(59, Math.max(0, dm)) * 60 + Math.min(59, Math.max(0, ds)));

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <input type="number" min={0} value={h}
        onChange={(e) => emit(Number(e.target.value) || 0, m, s)}
        disabled={disabled} className={box} />
      <span className="text-xs text-gray-400">h</span>
      <input type="number" min={0} max={59} value={m}
        onChange={(e) => emit(h, Number(e.target.value) || 0, s)}
        disabled={disabled} className={box} />
      <span className="text-xs text-gray-400">m</span>
      <input type="number" min={0} max={59} value={s}
        onChange={(e) => emit(h, m, Number(e.target.value) || 0)}
        disabled={disabled} className={box} />
      <span className="text-xs text-gray-400">s</span>
    </div>
  );
}
