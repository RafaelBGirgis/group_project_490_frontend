import { ROLE_THEMES } from "./theme";

export default function ProgressRing({
  role,
  percent = 0,
  size = 120,
  strokeWidth = 10,
  label,
  sublabel,
}) {
  const theme = ROLE_THEMES[role] ?? ROLE_THEMES.client;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          {/* Track — uses progressTrail from theme */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={theme.progressTrail}
            strokeWidth={strokeWidth}
          />
          {/* Progress — uses progressStroke from theme */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={theme.progressStroke}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 0.5s ease" }}
          />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {label && (
            <span className="text-white font-bold" style={{ fontSize: size * 0.16 }}>
              {label}
            </span>
          )}
          {sublabel && (
            <span className="text-gray-500" style={{ fontSize: size * 0.09 }}>
              {sublabel}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}