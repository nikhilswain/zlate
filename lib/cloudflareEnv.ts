type RateLimitBinding = {
  limit: (input: { key: string }) => Promise<{ success: boolean }>;
};

type CloudflareEnv = {
  PAIRING_LIMIT?: RateLimitBinding;
  SYNC_LIMIT?: RateLimitBinding;
};

export async function getCloudflareEnv(): Promise<CloudflareEnv> {
  try {
    const mod = await import("@opennextjs/cloudflare");
    const ctx = await mod.getCloudflareContext({ async: true });
    return ctx.env as CloudflareEnv;
  } catch {
    // Not in Workers runtime (e.g. `next dev`). Bindings unavailable.
    return {};
  }
}

export async function checkRateLimit(
  binding: RateLimitBinding | undefined,
  key: string,
): Promise<boolean> {
  if (!binding) return true; // No binding (dev mode) → always allow
  const { success } = await binding.limit({ key });
  return success;
}
