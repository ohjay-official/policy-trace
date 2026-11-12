const INK = "#111111";
const PAPER = "#f8f8f8";
const DIM = "rgba(248,248,248,0.62)";
const RULE = "rgba(248,248,248,0.16)";
const GREEN = "#3ecf8e";
const RED = "#e07a7e";
const BLUE = "#8eabc4";
const SANS = "Inter, 'Helvetica Neue', Arial, sans-serif";
const MONO = "'Source Code Pro', ui-monospace, monospace";
const DISPLAY = "Manrope, 'Helvetica Neue', Arial, sans-serif";

const DW = 236;
const DH = 256;

function text(
  ctx: CanvasRenderingContext2D,
  value: string,
  x: number,
  y: number,
  opts: { font: string; color?: string; align?: CanvasTextAlign },
) {
  ctx.font = opts.font;
  ctx.fillStyle = opts.color ?? PAPER;
  ctx.textAlign = opts.align ?? "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(value, x, y);
}

function label(ctx: CanvasRenderingContext2D, value: string, y: number) {
  text(ctx, value, 0, y, { font: `500 12px ${MONO}`, color: DIM, align: "center" });
}

function hairline(ctx: CanvasRenderingContext2D, y: number) {
  ctx.strokeStyle = RULE;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-DW / 2, y + 0.5);
  ctx.lineTo(DW / 2, y + 0.5);
  ctx.stroke();
}

const FOCUS: Record<string, (ctx: CanvasRenderingContext2D) => void> = {
  lab(ctx) {
    label(ctx, "Five seeded scenarios", -108);
    text(ctx, "Open", 0, -20, { font: `300 64px ${DISPLAY}`, align: "center" });
    text(ctx, "the lab", 0, 42, { font: `300 64px ${DISPLAY}`, align: "center" });
    label(ctx, "Illustration only", 112);
  },
  grant(ctx) {
    label(ctx, "Grant versus policy", -108);
    text(ctx, "42501", 0, -36, { font: `400 56px ${DISPLAY}`, color: RED, align: "center" });
    text(ctx, "missing GRANT", 0, -8, { font: `400 14px ${SANS}`, color: DIM, align: "center" });
    hairline(ctx, 16);
    text(ctx, "0 rows", 0, 64, { font: `400 44px ${DISPLAY}`, align: "center" });
    text(ctx, "missing SELECT policy", 0, 90, { font: `400 14px ${SANS}`, color: DIM, align: "center" });
    label(ctx, "Illustration only", 112);
  },
  agent(ctx) {
    label(ctx, "The tool call runs as Alice", -108);
    text(ctx, "list_tasks", 0, -28, { font: `500 28px ${MONO}`, color: BLUE, align: "center" });
    hairline(ctx, 0);
    text(ctx, "sub", -DW / 2, 40, { font: `500 13px ${MONO}`, color: DIM });
    text(ctx, "Alice", -DW / 2 + 48, 40, { font: `500 16px ${SANS}` });
    text(ctx, "No separate agent role", 0, 84, { font: `400 14px ${SANS}`, color: DIM, align: "center" });
    label(ctx, "Illustration only", 112);
  },
  using(ctx) {
    label(ctx, "Permissive policies use OR", -108);
    text(ctx, "USING", -DW / 2, -28, { font: `500 13px ${MONO}`, color: GREEN });
    text(ctx, "owner_id = uid", -DW / 2, -4, { font: `400 16px ${SANS}` });
    hairline(ctx, 16);
    text(ctx, "OR", -DW / 2, 48, { font: `500 13px ${MONO}`, color: DIM });
    text(ctx, "USING (true)", -DW / 2, 76, { font: `500 20px ${MONO}`, color: RED });
    label(ctx, "Illustration only", 112);
  },
  silent(ctx) {
    label(ctx, "Update with no visible row", -108);
    text(ctx, "UPDATE", 0, -24, { font: `300 52px ${DISPLAY}`, align: "center" });
    text(ctx, "0", 0, 36, { font: `400 64px ${DISPLAY}`, color: RED, align: "center" });
    text(ctx, "no error", 0, 68, { font: `400 16px ${SANS}`, color: DIM, align: "center" });
    label(ctx, "Illustration only", 112);
  },
  team(ctx) {
    label(ctx, "Owner or teammate", -108);
    const rows: [string, string, string][] = [
      ["Alice, Acme", "visible", GREEN],
      ["Bob, private", "hidden", RED],
      ["Carol, other team", "hidden", DIM],
    ];
    let y = -70;
    rows.forEach(([name, state, color]) => {
      hairline(ctx, y);
      text(ctx, name, -DW / 2, y + 28, { font: `500 15px ${SANS}` });
      text(ctx, state, DW / 2, y + 28, { font: `500 13px ${MONO}`, color, align: "right" });
      y += 48;
    });
    label(ctx, "Illustration only", 112);
  },
};

function base(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = INK;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = "rgba(248,248,248,0.05)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = (w / 2) % 48; x < w; x += 48) {
    ctx.moveTo(Math.round(x) + 0.5, 0);
    ctx.lineTo(Math.round(x) + 0.5, h);
  }
  for (let y = (h / 2) % 48; y < h; y += 48) {
    ctx.moveTo(0, Math.round(y) + 0.5);
    ctx.lineTo(w, Math.round(y) + 0.5);
  }
  ctx.stroke();
}

export function renderScene(
  key: string,
  w: number,
  h: number,
  dpr: number,
  box: { cx: number; cy: number; w: number; h: number },
) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(w * dpr));
  canvas.height = Math.max(1, Math.round(h * dpr));
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  base(ctx, w, h);
  const k = Math.min((box.w * 0.84) / DW, (box.h * 0.82) / DH, 1.6);
  ctx.translate(box.cx, box.cy);
  ctx.scale(k, k);
  (FOCUS[key] ?? FOCUS.lab)(ctx);
  return canvas;
}
