import { apiGet } from "./api";

export function fetchPlatformStats() {
  return apiGet("/public/platform_stats");
}

export function fetchLeaderboard(role, category) {
  return apiGet(`/public/leaderboards/${role}/${category}`);
}
