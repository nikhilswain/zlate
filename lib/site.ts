export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://zlate.workers.dev"
).replace(/\/+$/, "");

export const SITE_NAME = "Zlate";

export const SITE_TITLE = "Zlate — Visual Project Tracker for Indie Developers";

export const SITE_DESCRIPTION =
  "Local-first visual project tracker for indie developers. Paint progress across a calendar grid, track side projects, and stay private — no account required.";

export const SITE_KEYWORDS = [
  "visual project tracker",
  "project tracker",
  "side project tracker",
  "indie developers",
  "indie hackers",
  "build in public",
  "local-first",
  "private project tracker",
  "calendar tracker",
  "project planner",
  "productivity",
  "no signup",
];

export const THEME_COLOR = "#1f1f1f";

export const OG_IMAGE = "/og.png";
