import { useState } from "react";

export default function ProfileAvatar({ src, alt, name, size = "sm" }) {
  const [imageError, setImageError] = useState(false);

  const sizeClasses = {
    sm: "w-9 h-9 text-xs",
    md: "w-10 h-10 text-xs",
    lg: "w-12 h-12 text-sm",
    xl: "w-16 h-16 text-base",
  };

  const getInitials = (text) => {
    if (!text) return "?";
    return text
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const initials = getInitials(name);

  if (src && !imageError) {
    return (
      <img
        src={src}
        alt={alt}
        onError={() => setImageError(true)}
        className={`${sizeClasses[size]} rounded-full object-cover shrink-0`}
      />
    );
  }

  return (
    <div className={`${sizeClasses[size]} rounded-full bg-gradient-to-br from-orange-500/40 to-orange-600/40 flex items-center justify-center text-orange-300 font-bold shrink-0 border border-orange-500/20`}>
      {initials}
    </div>
  );
}
