export function getBaseUrl() {
  return import.meta.env.VITE_API_URL || "/api/";
}
