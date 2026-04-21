// variant: "success" | "warning" | "danger" | "info" | "neutral"
const VARIANTS = {
  success: { bg: "bg-green-900/40",  text: "text-green-400",  dot: "bg-green-400"  },
  warning: { bg: "bg-orange-900/40", text: "text-orange-400", dot: "bg-orange-400" },
  danger:  { bg: "bg-red-900/40",    text: "text-red-400",    dot: "bg-red-400"    },
  info:    { bg: "bg-blue-900/40",   text: "text-blue-400",   dot: "bg-blue-400"   },
  neutral: { bg: "bg-gray-800",      text: "text-gray-400",   dot: "bg-gray-400"   },
};

export default function StatusBadge({ label, variant = "neutral", dot = false }) {
  const v = VARIANTS[variant] ?? VARIANTS.neutral;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${v.bg} ${v.text}`}>
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${v.dot}`} />}
      {label}
    </span>
  );
}