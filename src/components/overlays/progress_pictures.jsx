import { useEffect, useMemo, useState } from "react";
import { uploadProgressPicture, extractUploadedAssetUrl } from "../../api/client";
import { fetchWeightHistory } from "../../api/survey";

const ACCENT = "#3B82F6";

/**
 * Progress pictures gallery + uploader. Pulls backend pictures from each
 * HealthMetrics row that has a non-empty progress_pic_url, and merges in any
 * pictures the client has uploaded locally (kept in localStorage because the
 * upload route returns a URL but the body-metrics route is what actually
 * persists it server-side).
 *
 * Props:
 *   storageKey — localStorage key for cached pictures, scoped per client.
 *   accent — accent color, defaults to dashboard blue.
 */
export default function ProgressPictures({ storageKey, accent = ACCENT }) {
  const [backendPictures, setBackendPictures] = useState([]);
  const [localPictures, setLocalPictures] = useState(() => readLocal(storageKey));
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLocalPictures(readLocal(storageKey));
  }, [storageKey]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const weights = await fetchWeightHistory({ limit: 50 });
      if (cancelled) return;
      const fromBackend = (weights || [])
        .filter((row) => row?.progress_pic_url)
        .map((row) => ({
          id: `backend-${row.id}`,
          url: row.progress_pic_url,
          uploaded_at: row.last_updated || null,
          weight: row.weight ?? null,
          source: "backend",
        }));
      setBackendPictures(fromBackend);
      setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const merged = useMemo(() => {
    const seen = new Set();
    const list = [];
    [...backendPictures, ...localPictures].forEach((pic) => {
      if (!pic?.url || seen.has(pic.url)) return;
      seen.add(pic.url);
      list.push(pic);
    });
    return list.sort((a, b) => {
      const aTime = a.uploaded_at ? Date.parse(a.uploaded_at) : 0;
      const bTime = b.uploaded_at ? Date.parse(b.uploaded_at) : 0;
      return bTime - aTime;
    });
  }, [backendPictures, localPictures]);

  const handleUpload = async (file) => {
    if (!file) return;
    setError("");
    setUploading(true);
    try {
      const response = await uploadProgressPicture(file);
      const url = extractUploadedAssetUrl(response);
      if (!url) throw new Error("Upload route did not return a URL.");
      const newEntry = {
        id: `local-${Date.now()}`,
        url,
        uploaded_at: new Date().toISOString(),
        file_name: file.name,
        source: "local",
      };
      const next = [newEntry, ...localPictures];
      setLocalPictures(next);
      writeLocal(storageKey, next);
    } catch (e) {
      setError(e.message || "Upload failed. Try again.");
    } finally {
      setUploading(false);
    }
  };

  const removeLocal = (id) => {
    const next = localPictures.filter((p) => p.id !== id);
    setLocalPictures(next);
    writeLocal(storageKey, next);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-white">Progress Pictures</p>
          <p className="text-[11px] text-gray-500 mt-0.5">
            Upload progress photos. Pictures attached to a body-metrics check-in show up here too.
          </p>
        </div>
        <label
          className="inline-flex shrink-0 cursor-pointer items-center rounded-lg px-4 py-2 text-xs font-semibold text-white transition-opacity disabled:opacity-50"
          style={{ backgroundColor: accent, opacity: uploading ? 0.6 : 1 }}
        >
          {uploading ? "Uploading..." : "+ Upload"}
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
      ) : merged.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/10 bg-[#0A1020] px-4 py-8 text-center text-xs text-gray-500">
          No progress pictures yet. Upload one above to get started.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {merged.map((picture) => (
            <div
              key={picture.id}
              className="overflow-hidden rounded-xl border border-white/10 bg-[#0A1020]"
            >
              <a href={picture.url} target="_blank" rel="noreferrer">
                <img
                  src={picture.url}
                  alt={picture.file_name || "Progress"}
                  className="h-40 w-full object-cover bg-[#080D19]"
                  loading="lazy"
                />
              </a>
              <div className="px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] uppercase tracking-widest text-gray-500">
                    {picture.source === "backend" ? "Logged" : "Uploaded"}
                  </span>
                  {picture.weight != null && (
                    <span className="text-[10px] font-semibold" style={{ color: accent }}>
                      {picture.weight} lbs
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  {picture.uploaded_at ? formatDate(picture.uploaded_at) : "Recently"}
                </p>
                {picture.source === "local" && (
                  <button
                    onClick={() => removeLocal(picture.id)}
                    className="mt-2 w-full rounded-md border border-red-500/30 bg-red-500/5 px-2 py-1 text-[10px] font-semibold text-red-300 hover:bg-red-500/10 transition-colors"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function readLocal(key) {
  if (!key) return [];
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocal(key, list) {
  if (!key) return;
  try {
    localStorage.setItem(key, JSON.stringify(list));
  } catch {
    // ignore quota errors
  }
}

function formatDate(value) {
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return "";
  }
}
