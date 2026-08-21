// Unset in development: the development server proxies the API under this origin, which keeps the
// client reachable through a single tunnel. A build sets it to the deployed API.
export const apiUrl = import.meta.env.VITE_API_URL || window.location.origin;
