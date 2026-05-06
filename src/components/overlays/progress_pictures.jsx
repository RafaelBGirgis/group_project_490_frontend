import { useCallback, useEffect, useState } from "react";
import { fetchProgressPictures, uploadProgressPicture } from "../../api/client";

const ACCENT = "#3B82F6";

/**
 * Progress pictures gallery + uploader.
 *
 * All data comes from the API (`GET /roles/client/progress_pictures`).
 * Uploading calls `POST /roles/client/upload_progress_picture` which upserts
 * one record per day server-side — re-uploading today replaces the earlier
 * picture instead of creating a duplicate.
 *
 * Props:
 *   accent — accent color (defaults to dashboard blue).
 */
export default function ProgressPictures({ accent = ACCENT }) {
  const [pictures, setPictures] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const todayStr = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"

  const load = useCallback(async () => {
    const pics = await fetchProgressPictures();
    setPictures(pics);
    setLoaded(true);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleUpload = async (file) => {
    if (!file) return;
    setError("");
    setUploading(true);
    try {
      await uploadProgressPicture(file);
      await load(); // refresh from API so the upsert is reflected
    } catch (e) {
      setError(e.message || "Upload failed. Try again.");
    } finally {
      setUploading(false);
    }
  };

  const hasTodayPic = pictures.some((p) => String(p.date).startsWith(todayStr));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-white">Progress Pictures</p>
          <p className="text-[11px] text-gray-500 mt-0.5">
            {hasTodayPic
              ? "Today's photo is saved. Upload again to replace it."
              : "One photo per day. Upload today's progress photo below."}
          </p>
        </div>
        <label
          className="inline-flex shrink-0 cursor-pointer items-center rounded-lg px-4 py-2 text-xs font-semibold text-white transition-opacity"
          style={{ backgroundColor: accent, opacity: uploading ? 0.6 : 1 }}
        >
          {uploading ? "Uploading..." : hasTodayPic ? "Replace Today's" : "+ Upload"}
          <input
            type="file"
            className="hidden"
            accept="image/*"
            disabled={uploading}
            onChange={(e) => {
              const file = e.target.files?.[0] || null;
              handleUpload(file);
              e.target.value = "";
            }}
          />
        </label>
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      {!loaded ? (
        <div className="rounded-xl border border-dashed border-white/10 bg-[#0A1020] px-4 py-8 text-center text-xs text-gray-500">
          Loading pictures...
        </div>
      ) : pictures.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/10 bg-[#0A1020] px-4 py-8 text-center text-xs text-gray-500">
          No progress pictures yet. Upload one above to get started.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {pictures.map((picture) => {
            const isToday = String(picture.date).startsWith(todayStr);
            return (
              <div
                key={picture.id}
                className="overflow-hidden rounded-xl border bg-[#0A1020]"
                style={{ borderColor: isToday ? `${accent}60` : "rgba(255,255,255,0.1)" }}
              >
                <a href={picture.url} target="_blank" rel="noreferrer">
                  <img
                    src={picture.url}
                    alt={`Progress ${picture.date}`}
                    className="h-40 w-full object-cover bg-[#080D19]"
                    loading="lazy"
                  />
                </a>
                <div className="px-3 py-2">
                  {isToday && (
                    <span
                      className="text-[10px] font-bold uppercase tracking-widest"
                      style={{ color: accent }}
                    >
                      Today
                    </span>
                  )}
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    {picture.date ? formatDate(picture.date) : "Recently"}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function formatDate(value) {
  try {
    // date strings from the backend are "YYYY-MM-DD HH:MM:SS" or "YYYY-MM-DD"
    const d = new Date(String(value).slice(0, 10) + "T00:00:00");
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return "";
  }
}
