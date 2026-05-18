function isProd(): boolean {
  return process.env.NODE_ENV === "production";
}

/**
 * Returns a 500 Response with a sanitized error body and logs the real error
 * server-side. In dev the internal error message is appended in parens so
 * `npm run dev` keeps useful debug info; in prod only `userMessage` is shown.
 */
export function serverError(
  internalErr: unknown,
  userMessage = "Sync failed. Please try again.",
): Response {
  console.error("[api]", userMessage, internalErr);
  const detail =
    !isProd() && internalErr instanceof Error
      ? ` (${internalErr.message})`
      : "";
  return Response.json(
    { error: `${userMessage}${detail}` },
    { status: 500 },
  );
}
