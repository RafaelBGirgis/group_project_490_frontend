import { ROLE_THEMES } from "./theme";

// variant: "solid" | "outline" | "ghost"
export default function Button({
  role,
  label,
  onClick,
  variant = "solid",
  size = "md",
  disabled = false,
  icon,
  className = "",
}) {
  const theme = ROLE_THEMES[role] ?? ROLE_THEMES.client;

  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base",
  };

  const styles = {
    solid:   { backgroundColor: theme.primary, color: "#fff", border: "none" },
    outline: { backgroundColor: "transparent", color: theme.primary, border: `1px solid ${theme.primary}` },
    ghost:   { backgroundColor: "transparent", color: theme.primary, border: "none" },
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-2 rounded-xl font-medium transition-all
        ${sizes[size] ?? sizes.md}
        ${disabled ? "opacity-40 cursor-not-allowed" : "hover:opacity-80 cursor-pointer"}
        ${className}`}
      style={styles[variant] ?? styles.solid}
    >
      {icon && <span>{icon}</span>}
      {label}
    </button>
  );
}