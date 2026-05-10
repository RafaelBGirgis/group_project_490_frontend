// USDA + cached-food helpers. The UI uses these when:
//   - Coach is building a meal and needs to search USDA for foods
//   - Client is logging a custom meal and needs to find a food
//
// All routes go through the backend proxy so the USDA API key never leaves
// the server.
import { apiGet, withQuery } from "./api";

/**
 * Search USDA for foods matching `q`. Returns a list of search hits with
 * abridged macros (per 100g). The hits each have an `fdc_id` — call
 * `fetchFoodDetail(fdc_id)` to upsert that food into our cache and get an
 * internal `id` you can use when building a meal.
 */
export async function searchFoods(q, { pageSize = 25 } = {}) {
  if (!q || !q.trim()) return [];
  try {
    const result = await apiGet(
      withQuery("/api/foods/search", { q: q.trim(), page_size: pageSize })
    );
    return Array.isArray(result?.foods) ? result.foods : [];
  } catch {
    return [];
  }
}

/**
 * Fetch full detail for a USDA food by FDC ID. The backend caches into our
 * `food` table on the way through, so subsequent calls for the same `fdc_id`
 * are instant. The returned `id` is the internal food id — pass that to
 * `createMeal({ foods: [{food_id, grams}, ...] })`.
 */
export async function fetchFoodDetail(fdcId) {
  return apiGet(`/api/foods/${encodeURIComponent(fdcId)}`);
}

/**
 * List foods we've already cached locally. Useful for "recently used" or
 * offline-style meal building when the USDA API is rate-limited.
 */
export async function listCachedFoods({ q, skip = 0, limit = 50 } = {}) {
  try {
    const result = await apiGet(
      withQuery("/api/foods/library/cached", { q, skip, limit })
    );
    return Array.isArray(result) ? result : [];
  } catch {
    return [];
  }
}
