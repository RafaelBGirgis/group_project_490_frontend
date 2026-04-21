export default function ListRow({ label, sub, right, onClick }) {
  return (
    <div
      className={`flex items-center justify-between px-4 py-3 rounded-xl bg-[#0A1020] ${onClick ? "cursor-pointer hover:bg-[#0d1526] transition-colors" : ""}`}
      onClick={onClick}
    >
      <div className="flex flex-col min-w-0">
        <span className="text-white text-sm font-medium truncate">{label}</span>
        {sub && <span className="text-gray-500 text-xs mt-0.5 truncate">{sub}</span>}
      </div>
      {right && <div className="ml-3 shrink-0">{right}</div>}
    </div>
  );
}