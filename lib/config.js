// Public base used by the browser. In production, set NEXT_PUBLIC_DIRECT_BACKEND_URL
// to call the backend directly and skip the Next.js proxy. In dev, leave empty
// so the app calls local Next.js routes (relative /api/*).
export const DIRECT_BACKEND_URL = process.env.NEXT_PUBLIC_DIRECT_BACKEND_URL || "";
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";
// Server-side base used by route handlers to talk to the backend
export const BACKEND_BASE_URL =
  process.env.LEMO_BACKEND_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "";
