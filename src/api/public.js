import { apiGet } from "./api";

export function fetchPlatformStats() {
  return apiGet("/public/platform_stats");
}
