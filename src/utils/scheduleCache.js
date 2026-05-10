// src/utils/scheduleCache.js
const V = "v1";

const dayKey  = (iso) => `sched:day:${V}:${iso}`;
const weekKey = (iso) => `sched:week:${V}:${iso}`;

export function loadDayCache(dateIso) {
  try { return JSON.parse(localStorage.getItem(dayKey(dateIso))); } catch { return null; }
}
export function saveDayCache(dateIso, data) {
  try { localStorage.setItem(dayKey(dateIso), JSON.stringify(data)); } catch {}
}
export function loadWeekCache(fromIso) {
  try { return JSON.parse(localStorage.getItem(weekKey(fromIso))); } catch { return null; }
}
export function saveWeekCache(fromIso, data) {
  try { localStorage.setItem(weekKey(fromIso), JSON.stringify(data)); } catch {}
}
