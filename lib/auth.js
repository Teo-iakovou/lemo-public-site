const disableAuthValue =
  typeof process !== "undefined" && process.env
    ? process.env.NEXT_PUBLIC_DISABLE_AUTH ??
      process.env.NEXT_PUBLIC_AUTH_DISABLED ??
      process.env.LEMO_DISABLE_AUTH ??
      "true"
    : "";

const AUTH_DISABLED =
  String(disableAuthValue)
    .trim()
    .toLowerCase() === "true";

export function isAuthDisabled() {
  return AUTH_DISABLED;
}

export { AUTH_DISABLED };
