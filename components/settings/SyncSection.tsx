"use client";

import { useEffect, useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { useUIStore } from "@/store/useUIStore";
import {
  checkPairingStatus,
  generatePairingCode,
  registerAccount,
  signOut,
  syncNow,
  SyncError,
} from "@/lib/sync";
import { SYNC_META_ID } from "@/lib/syncMeta";

type View = "idle" | "code" | "signing-out";

type CodeState = { code: string; expiresAt: string };

export function SyncSection() {
  const meta = useLiveQuery(() => db.syncMeta.get(SYNC_META_ID));
  const openPairingCodeModal = useUIStore((s) => s.openPairingCodeModal);

  const accountId = meta?.accountId ?? null;
  const lastSyncedAt = meta?.lastSyncedAt ?? null;

  const [view, setView] = useState<View>("idle");
  const [working, setWorking] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [code, setCode] = useState<CodeState | null>(null);

  function clearError() {
    setError(null);
  }

  function flashStatus(message: string, ms = 3000) {
    setStatus(message);
    setTimeout(() => setStatus((current) => (current === message ? null : current)), ms);
  }

  // While showing a pairing code, poll the server to detect when the other
  // device redeems it. On detect: dismiss the code view and flash a status.
  useEffect(() => {
    if (view !== "code" || !code) return;
    const codeValue = code.code;
    let cancelled = false;
    const interval = setInterval(async () => {
      if (cancelled) return;
      try {
        const status = await checkPairingStatus(codeValue);
        if (cancelled) return;
        if (status.used) {
          setView("idle");
          setCode(null);
          flashStatus("Device paired!");
        } else if (status.expired || !status.exists) {
          setView("idle");
          setCode(null);
        }
      } catch {
        // Silently ignore — CountdownLine handles hard expiry timing.
      }
    }, 7000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [view, code]);

  async function handleSetup() {
    setWorking("setup");
    clearError();
    try {
      await registerAccount();
      // Auto-sync so local data lands on the server immediately. Best-effort.
      try {
        await syncNow();
      } catch (syncErr) {
        console.error("[sync] post-setup sync failed", syncErr);
      }
    } catch (err) {
      setError(toMessage(err));
    } finally {
      setWorking(null);
    }
  }

  async function handleSyncNow() {
    setWorking("sync");
    clearError();
    try {
      await syncNow();
    } catch (err) {
      setError(toMessage(err));
    } finally {
      setWorking(null);
    }
  }

  async function handleGenerateCode() {
    setWorking("code");
    clearError();
    try {
      const res = await generatePairingCode();
      setCode(res);
      setView("code");
    } catch (err) {
      setError(toMessage(err));
    } finally {
      setWorking(null);
    }
  }

  async function handleSignOut() {
    setWorking("signout");
    clearError();
    try {
      await signOut();
    } catch (err) {
      setError(toMessage(err));
    } finally {
      setWorking(null);
      setView("idle");
    }
  }

  if (!accountId) {
    return (
      <section className="flex flex-col gap-3">
        <div className="text-[10px] uppercase tracking-wider text-fg-subtle font-medium">
          Sync
        </div>
        <div className="text-[11px] text-fg-subtle leading-relaxed">
          Sync your data across devices. No password required.
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleSetup}
            disabled={working === "setup"}
            className="px-3 py-2 text-xs font-medium bg-fg text-bg rounded hover:opacity-90 transition-opacity disabled:opacity-40"
          >
            {working === "setup" ? "Setting up…" : "Set up sync"}
          </button>
          <button
            type="button"
            onClick={openPairingCodeModal}
            className="px-3 py-2 text-xs font-medium border border-border text-fg rounded hover:bg-surface transition-colors"
          >
            Enter pairing code
          </button>
        </div>
        {status && (
          <div className="text-[11px] text-fg-muted leading-relaxed">
            {status}
          </div>
        )}
        {error && (
          <div className="text-[11px] text-red-400 leading-relaxed">
            {error}
          </div>
        )}
      </section>
    );
  }

  if (view === "code" && code) {
    return (
      <section className="flex flex-col gap-3">
        <div className="text-[10px] uppercase tracking-wider text-fg-subtle font-medium">
          Pairing code
        </div>
        <div className="bg-bg border border-border rounded-md p-4 text-center">
          <div className="text-2xl font-mono tracking-[0.3em] text-fg font-medium">
            {code.code}
          </div>
          <CountdownLine expiresAt={code.expiresAt} onExpire={() => setView("idle")} />
        </div>
        <div className="text-[11px] text-fg-subtle leading-relaxed">
          Open Settings on your other device and tap "Enter pairing code".
        </div>
        <button
          type="button"
          onClick={() => {
            setView("idle");
            setCode(null);
          }}
          className="self-start px-3 py-1.5 text-xs text-fg-muted hover:text-fg transition-colors"
        >
          Cancel
        </button>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="text-[10px] uppercase tracking-wider text-fg-subtle font-medium">
        Sync
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleSyncNow}
          disabled={working === "sync"}
          className="px-3 py-2 text-xs font-medium bg-fg text-bg rounded hover:opacity-90 transition-opacity disabled:opacity-40"
        >
          {working === "sync" ? "Syncing…" : "Sync now"}
        </button>
        <LastSyncedLabel lastSyncedAt={lastSyncedAt} />
      </div>

      <div className="border-t border-border-subtle pt-3 flex flex-col gap-2">
        <div className="text-[10px] uppercase tracking-wider text-fg-subtle font-medium">
          Pair another device
        </div>
        <button
          type="button"
          onClick={handleGenerateCode}
          disabled={working === "code"}
          className="self-start px-3 py-1.5 text-xs font-medium border border-border text-fg rounded hover:bg-surface transition-colors disabled:opacity-40"
        >
          {working === "code" ? "Generating…" : "Generate pairing code"}
        </button>
      </div>

      <div className="border-t border-border-subtle pt-3">
        <button
          type="button"
          onClick={handleSignOut}
          disabled={working === "signout"}
          className="text-xs text-fg-muted hover:text-fg transition-colors disabled:opacity-40"
        >
          {working === "signout" ? "Signing out…" : "Sign out"}
        </button>
      </div>

      {status && (
        <div className="text-[11px] text-fg-muted leading-relaxed">{status}</div>
      )}
      {error && (
        <div className="text-[11px] text-red-400 leading-relaxed">{error}</div>
      )}
    </section>
  );
}

function LastSyncedLabel({ lastSyncedAt }: { lastSyncedAt: string | null }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);
  const label = useMemo(() => {
    if (!lastSyncedAt) return "Not synced yet";
    const ms = Date.now() - new Date(lastSyncedAt).getTime();
    if (ms < 60_000) return "Synced just now";
    const mins = Math.floor(ms / 60_000);
    if (mins < 60) return `Synced ${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `Synced ${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `Synced ${days}d ago`;
  }, [lastSyncedAt]);
  return <span className="text-[11px] text-fg-subtle">{label}</span>;
}

function CountdownLine({
  expiresAt,
  onExpire,
}: {
  expiresAt: string;
  onExpire: () => void;
}) {
  const [remaining, setRemaining] = useState(() =>
    Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000)),
  );
  useEffect(() => {
    if (remaining <= 0) {
      onExpire();
      return;
    }
    const id = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          clearInterval(id);
          onExpire();
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [remaining, onExpire]);
  const m = Math.floor(remaining / 60);
  const s = (remaining % 60).toString().padStart(2, "0");
  return (
    <div className="mt-2 text-[11px] text-fg-subtle">
      Expires in {m}:{s}
    </div>
  );
}

function toMessage(err: unknown): string {
  if (err instanceof SyncError) return err.message;
  if (err instanceof Error) return err.message;
  return "Something went wrong.";
}
