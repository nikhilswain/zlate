export function readableTextColor(bgHex: string): string {
  return relativeLuminance(bgHex) > 0.49
    ? "rgba(0, 0, 0, 0.88)"
    : "rgba(255, 255, 255, 0.95)";
}

function relativeLuminance(bgHex: string): number {
  const c = bgHex.replace("#", "");
  const r = parseInt(c.slice(0, 2), 16) / 255;
  const g = parseInt(c.slice(2, 4), 16) / 255;
  const b = parseInt(c.slice(4, 6), 16) / 255;
  const toLin = (v: number) =>
    v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  return 0.2126 * toLin(r) + 0.7152 * toLin(g) + 0.0722 * toLin(b);
}
