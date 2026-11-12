// Scenes shown through the portal window, drawn on canvas.
// The window is screen-locked, so each scene puts one compact, complete, readable block exactly
// where the window sits (box.cx, box.cy), sized to fit inside it with room for the rounded corners.
// Everything is real content from the hackathon page, or plainly labelled as an illustration.

const INK = '#0d0c0b';
const PAPER = '#f2f0ec';
const DIM = 'rgba(242,240,236,0.62)';
const RULE = 'rgba(242,240,236,0.16)';
const GREEN = '#8fd60f';
const RED = '#ff6b5c';
const BLUE = '#a9b8ff';
const SANS = "'Inter Tight Variable', 'Inter Tight', 'Helvetica Neue', Arial, sans-serif";
const MONO = "'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace";
const DISPLAY = "'Bebas Neue', 'Arial Narrow', 'DejaVu Sans Condensed', sans-serif";

// Design space for the focus block. It is scaled to fit the live window.
const DW = 236;
const DH = 256;

function wrap(ctx, text, maxW) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const w of words) {
    const t = line ? `${line} ${w}` : w;
    if (ctx.measureText(t).width > maxW && line) {
      lines.push(line);
      line = w;
    } else line = t;
  }
  if (line) lines.push(line);
  return lines;
}

function text(ctx, s, x, y, { font, color = PAPER, align = 'left', base = 'alphabetic' }) {
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = base;
  ctx.fillText(s, x, y);
}

function label(ctx, s, y) {
  text(ctx, s, 0, y, { font: `500 12px ${MONO}`, color: DIM, align: 'center' });
}

function hatch(ctx, x, y, w, h) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.strokeStyle = 'rgba(242,240,236,0.1)';
  ctx.beginPath();
  for (let i = -h; i < w; i += 6) {
    ctx.moveTo(x + i, y + h);
    ctx.lineTo(x + i + h, y);
  }
  ctx.stroke();
  ctx.restore();
  ctx.strokeStyle = RULE;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
}

// Each focus block draws in design space, centred on (0, 0).
const FOCUS = {
  yours(ctx) {
    // Shrink to fit the window if the display face renders wider than expected.
    ctx.font = `400 74px ${DISPLAY}`;
    const size = Math.min(74, Math.floor((74 * (DW - 16)) / ctx.measureText('PROJECT').width));
    text(ctx, 'YOUR', 0, -58, { font: `400 ${size}px ${DISPLAY}`, align: 'center' });
    text(ctx, 'PROJECT', 0, 6, { font: `400 ${size}px ${DISPLAY}`, align: 'center' });
    const cw = 40, ch = 28, gap = 5, x0 = -(5 * cw + 4 * gap) / 2, y0 = 30;
    for (let r = 0; r < 2; r++)
      for (let c = 0; c < 5; c++) {
        hatch(ctx, x0 + c * (cw + gap), y0 + r * (ch + gap), cw, ch);
        if (c === 4) {
          ctx.strokeStyle = PAPER;
          ctx.lineWidth = 1.5;
          ctx.strokeRect(x0 + c * (cw + gap) + 0.75, y0 + r * (ch + gap) + 0.75, cw - 1.5, ch - 1.5);
          ctx.lineWidth = 1;
        }
      }
    label(ctx, 'An empty scorecard', 112);
  },

  event(ctx) {
    const rows = ['Technological Implementation', 'Design', 'Potential Impact', 'Quality of the Idea'];
    label(ctx, 'The judging criteria', -108);
    let y = -82;
    rows.forEach((r, i) => {
      ctx.font = `600 16px ${SANS}`;
      const lines = wrap(ctx, r, DW - 40);
      const h = lines.length * 20 + 20;
      ctx.strokeStyle = RULE;
      ctx.beginPath();
      ctx.moveTo(-DW / 2, y + 0.5);
      ctx.lineTo(DW / 2, y + 0.5);
      ctx.stroke();
      text(ctx, `0${i + 1}`, -DW / 2, y + 24, { font: `500 11px ${MONO}`, color: GREEN });
      lines.forEach((l, k) => text(ctx, l, -DW / 2 + 32, y + 26 + k * 20, { font: `600 16px ${SANS}` }));
      y += h;
    });
  },

  winners(ctx) {
    label(ctx, 'A past winner at a Nebius event', -104);
    ctx.font = `400 104px ${DISPLAY}`;
    const big = Math.min(104, Math.floor((104 * (DW - 16)) / ctx.measureText('$320').width));
    text(ctx, '$320', 0, -2, { font: `400 ${big}px ${DISPLAY}`, color: GREEN, align: 'center' });
    text(ctx, 'MediSimplifier', 0, 32, { font: `700 18px ${SANS}`, align: 'center' });
    text(ctx, '1st place, Serverless AI', 0, 56, { font: `400 14px ${SANS}`, color: DIM, align: 'center' });
    text(ctx, 'Builders Challenge', 0, 74, { font: `400 14px ${SANS}`, color: DIM, align: 'center' });
    text(ctx, 'It published its full bill.', 0, 102, { font: `600 14px ${SANS}`, align: 'center' });
  },

  judges(ctx) {
    const people = [
      ['Rob Spectre', 'Nebius', PAPER], ['Surbhi Jha', 'NVIDIA', GREEN], ['Ricky Johnson', 'Tavily', BLUE],
      ['Joe Sarabia', 'Nebius', PAPER], ['Evan Rimer', 'Tavily', BLUE], ['Aditya Sahu', 'NVIDIA', GREEN],
    ];
    label(ctx, '6 of the 23 judges', -108);
    const tw = 112, th = 58, gap = 8, x0 = -(2 * tw + gap) / 2, y0 = -90;
    people.forEach(([n, co, col], i) => {
      const x = x0 + (i % 2) * (tw + gap), y = y0 + Math.floor(i / 2) * (th + gap);
      ctx.fillStyle = 'rgba(242,240,236,0.05)';
      ctx.fillRect(x, y, tw, th);
      ctx.strokeStyle = RULE;
      ctx.strokeRect(x + 0.5, y + 0.5, tw - 1, th - 1);
      ctx.fillStyle = col;
      ctx.fillRect(x + 10, y + 10, 16, 3);
      text(ctx, n, x + 10, y + 32, { font: `600 13px ${SANS}` });
      text(ctx, co, x + 10, y + 48, { font: `400 12px ${SANS}`, color: DIM });
    });
  },

  score(ctx) {
    const heads = ['Tech', 'Design', 'Impact', 'Idea', 'All'];
    // An illustration: shading only, no numbers, because only a real run produces scores.
    const heat = [
      [0.7, 0.5, 0.8, 0.6, 0.7], [0.4, 0.6, 0.5, 0.75, 0.55], [0.85, 0.3, 0.6, 0.7, 0.62],
      [0.5, 0.72, 0.45, 0.6, 0.57], [0.9, 0.55, 0.7, 0.8, 0.8],
    ];
    label(ctx, 'Judges by criterion', -108);
    const cw = 40, ch = 28, gap = 6, x0 = -(5 * cw + 4 * gap) / 2, y0 = -66;
    heads.forEach((h, c) => text(ctx, h, x0 + c * (cw + gap) + cw / 2, y0 - 10, { font: `500 11px ${SANS}`, color: DIM, align: 'center' }));
    heat.forEach((row, r) =>
      row.forEach((t, c) => {
        const x = x0 + c * (cw + gap), y = y0 + r * (ch + gap);
        ctx.fillStyle = `rgba(118,185,0,${0.15 + t * 0.8})`;
        ctx.fillRect(x, y, cw, ch);
        if (c === 4) {
          ctx.strokeStyle = PAPER;
          ctx.lineWidth = 1.5;
          ctx.strokeRect(x + 0.75, y + 0.75, cw - 1.5, ch - 1.5);
          ctx.lineWidth = 1;
        }
      })
    );
    label(ctx, 'Illustration only', 112);
  },

  fixes(ctx) {
    const items = ['Put the cost per run in your README', 'Show a live run in the first 20 seconds', 'Use Tavily extract, not only search'];
    label(ctx, 'A ranked fix list', -108);
    let y = -84;
    items.forEach((t, i) => {
      ctx.strokeStyle = RULE;
      ctx.beginPath();
      ctx.moveTo(-DW / 2, y + 0.5);
      ctx.lineTo(DW / 2, y + 0.5);
      ctx.stroke();
      text(ctx, String(i + 1), -DW / 2, y + 38, { font: `400 34px ${DISPLAY}`, color: RED });
      ctx.font = `600 15px ${SANS}`;
      const lines = wrap(ctx, t, DW - 34);
      lines.forEach((l, k) => text(ctx, l, -DW / 2 + 30, y + 24 + k * 19, { font: `600 15px ${SANS}` }));
      y += Math.max(58, lines.length * 19 + 24);
    });
  },
};

function base(ctx, W, H) {
  ctx.fillStyle = INK;
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = 'rgba(242,240,236,0.05)';
  ctx.lineWidth = 1;
  const step = 48;
  ctx.beginPath();
  for (let x = (W / 2) % step; x < W; x += step) {
    ctx.moveTo(Math.round(x) + 0.5, 0);
    ctx.lineTo(Math.round(x) + 0.5, H);
  }
  for (let y = (H / 2) % step; y < H; y += step) {
    ctx.moveTo(0, Math.round(y) + 0.5);
    ctx.lineTo(W, Math.round(y) + 0.5);
  }
  ctx.stroke();
}

// box: the window's centre and size on screen, in CSS pixels.
export function renderScene(key, W, H, dpr, box) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(W * dpr));
  c.height = Math.max(1, Math.round(H * dpr));
  const ctx = c.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  base(ctx, W, H);
  const k = Math.min((box.w * 0.84) / DW, (box.h * 0.82) / DH, 1.6);
  ctx.translate(box.cx, box.cy);
  ctx.scale(k, k);
  (FOCUS[key] || FOCUS.yours)(ctx);
  return c;
}
