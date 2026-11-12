'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { renderScene } from '../lib/scenes.js';

// The home stage. A pinned, full-screen section where scroll drives travel between the
// stages of a run. A rounded window in the centre shows the next stage, screen-locked behind it,
// and tilts toward the pointer. Scrolling (or clicking the window) opens it until it fills the
// screen, then the page commits to that stage and a new window opens onto the one after.

const STATES = [
  {
    key: 'intro', scene: 'yours', title: 'Panel', intro: true,
  },
  {
    key: 'event', scene: 'event', title: 'Event',
    facts: [
      ['Deadline', '30 Oct 2026, 6:00 pm WAT'],
      ['Tracks', 'Four, from coding agents to physical AI'],
      ['Criteria', 'Implementation, design, impact, idea'],
      ['Prizes', '$50,000 in cash, plus track prizes'],
    ],
  },
  {
    key: 'winners', scene: 'winners', title: 'Winners',
    facts: [
      ['Studied', 'Past winners from the same organizer'],
      ['MediSimplifier', '1st place, published its full bill: $320'],
      ['Injester', '1st place, accuracy from 2/5 to 5/5'],
      ['Pattern', 'Real numbers, not promises'],
    ],
  },
  {
    key: 'judges', scene: 'judges', title: 'Judges',
    facts: [
      ['On the panel', '23 people'],
      ['From', 'Nebius 12, NVIDIA 8, Tavily 3'],
      ['Research', 'Each one looked up on the web'],
      ['Scoring', 'Each one runs as its own Nemotron agent'],
    ],
  },
  {
    key: 'score', scene: 'score', title: 'Score',
    facts: [
      ['Scale', '1 to 10 on every official criterion'],
      ['Checks', 'Up to two web searches per judge'],
      ['Models', 'NVIDIA Nemotron on Nebius Token Factory'],
      ['Cost', 'Every call metered and shown to you'],
    ],
  },
  {
    key: 'fixes', scene: 'fixes', title: 'Fixes',
    facts: [
      ['Moderator', 'Settles where the judges disagree'],
      ['Prediction', 'A score out of 100'],
      ['Ranking', 'Impact against effort'],
      ['Export', 'Copy the list as Markdown'],
    ],
  },
];
const LAST = STATES.length - 1;
const UNITS = STATES.length; // one unit of scroll per transition, plus a final dwell
const FOCAL = 850;

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smooth = (t) => t * t * (3 - 2 * t);
const ramp = (p, a, b) => (b <= a ? (p >= b ? 1 : 0) : smooth(clamp((p - a) / (b - a), 0, 1)));
const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const pad = (n) => `[${String(n).padStart(2, '0')}]`;

// Points around a rounded rectangle centred on the origin: 4 corner arcs, 10 steps each.
function roundedRectPoints(w, h, r) {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  const arcs = [
    [w / 2 - r, -h / 2 + r, -Math.PI / 2, 0],
    [w / 2 - r, h / 2 - r, 0, Math.PI / 2],
    [-w / 2 + r, h / 2 - r, Math.PI / 2, Math.PI],
    [-w / 2 + r, -h / 2 + r, Math.PI, Math.PI * 1.5],
  ];
  const pts = [];
  for (const [ax, ay, a0, a1] of arcs) {
    for (let i = 0; i <= 10; i++) {
      const a = a0 + ((a1 - a0) * i) / 10;
      pts.push([ax + Math.cos(a) * r, ay + Math.sin(a) * r]);
    }
  }
  return pts;
}

// Fake perspective: rotate the flat shape about X and Y, then divide by depth.
function project(pts, cx, cy, rxDeg, ryDeg) {
  const ax = (rxDeg * Math.PI) / 180, ay = (ryDeg * Math.PI) / 180;
  return pts.map(([x, y]) => {
    const xx = x * Math.cos(ay), yy = y * Math.cos(ax);
    const z = x * Math.sin(ay) - y * Math.sin(ax);
    const p = FOCAL / (FOCAL + z);
    return [cx + xx * p, cy + yy * p];
  });
}

export default function PortalHero() {
  const router = useRouter();
  const sec = useRef(null);
  const stage = useRef(null);
  const canvas = useRef(null);
  const portal = useRef(null);
  const chrome = useRef(null);
  const meter = useRef(null);
  const live = useRef({ current: 0 });
  const [current, setCurrent] = useState(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const cv = canvas.current, st = stage.current, el = sec.current;
    if (!cv || !st || !el) return;
    const ctx = cv.getContext('2d');
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let W = 0, H = 0, dpr = 1, scenes = {}, raf = 0, last = performance.now();
    let target = 0, at = 0, intro = 0, rotX = 0, rotY = 0, tX = 0, tY = 0;

    const build = () => {
      const r = st.getBoundingClientRect();
      W = r.width; H = r.height; dpr = Math.min(window.devicePixelRatio || 1, 2);
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      cv.style.width = W + 'px'; cv.style.height = H + 'px';
      // Each scene centres its readable block exactly where the window sits.
      const pr = portal.current?.getBoundingClientRect();
      const box = pr && pr.width
        ? { cx: pr.left - r.left + pr.width / 2, cy: pr.top - r.top + pr.height / 2, w: pr.width, h: pr.height }
        : { cx: W / 2, cy: H / 2, w: 300, h: 330 };
      scenes = {};
      for (const k of ['yours', 'event', 'winners', 'judges', 'score', 'fixes']) scenes[k] = renderScene(k, W, H, dpr, box);
    };
    const read = () => {
      const r = el.getBoundingClientRect();
      const span = r.height - window.innerHeight;
      target = span > 0 ? clamp(-r.top / span, 0, 1) : 0;
    };

    // Draw a scene screen-locked, the full size of the stage.
    const cover = (k) => scenes[k] && ctx.drawImage(scenes[k], 0, 0, W, H);
    // The page itself: plain paper with a faint ledger grid.
    const paper = (a) => {
      if (a <= 0) return;
      ctx.fillStyle = `rgba(242,240,236,${a})`;
      ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = `rgba(13,12,11,${0.045 * a})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = (W / 2) % 48; x < W; x += 48) { ctx.moveTo(Math.round(x) + 0.5, 0); ctx.lineTo(Math.round(x) + 0.5, H); }
      for (let y = (H / 2) % 48; y < H; y += 48) { ctx.moveTo(0, Math.round(y) + 0.5); ctx.lineTo(W, Math.round(y) + 0.5); }
      ctx.stroke();
    };

    const draw = (now) => {
      const dt = Math.min(40, now - last);
      last = now;
      // Ease the drawn position toward the scroll position instead of snapping to it.
      const gap = target - at;
      at = Math.abs(gap) > 0.0004 ? at + gap * 0.08 : target;
      rotX += (tX - rotX) * Math.min(1, dt * 0.0063);
      rotY += (tY - rotY) * Math.min(1, dt * 0.0063);

      const f = at * UNITS;
      const seg = Math.min(Math.floor(f), LAST);
      const frac = f - seg;
      const e = seg < LAST ? ramp(frac, 0.45, 1) : 0;
      const reopen = seg > 0 ? ramp(frac, 0, 0.2) : 1;
      const maskScale = Math.min(intro, reopen);

      if (seg !== live.current.current) {
        live.current.current = seg;
        setCurrent(seg);
      }
      if (chrome.current) {
        const o = 1 - ramp(e, 0, 0.3);
        chrome.current.style.opacity = o;
        chrome.current.style.visibility = o < 0.02 ? 'hidden' : 'visible';
      }
      if (meter.current) meter.current.style.transform = `scaleX(${at})`;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      paper(1);

      const nextScene = seg < LAST ? STATES[seg + 1].scene : 'yours';
      const pr = portal.current?.getBoundingClientRect();
      const sr = st.getBoundingClientRect();
      if (pr && pr.width > 0) {
        const rcx = pr.left - sr.left + pr.width / 2, rcy = pr.top - sr.top + pr.height / 2;
        const cx = rcx + (W / 2 - rcx) * e, cy = rcy + (H / 2 - rcy) * e;
        const bw = pr.width + (W - pr.width) * e, bh = pr.height + (H - pr.height) * e;
        const s = e ? 1 : maskScale;
        const w = bw * s, h = bh * s;
        const R = W < 640 ? 44 : 64;
        if (w > 1 && h > 1) {
          const pts = project(roundedRectPoints(w, h, R * (1 - e) * s), cx, cy, rotX * (1 - e), rotY * (1 - e));
          ctx.beginPath();
          pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
          ctx.closePath();
          if (e < 0.6) {
            ctx.save();
            ctx.shadowColor = `rgba(13,12,11,${0.35 * (1 - e) * s})`;
            ctx.shadowBlur = 60;
            ctx.shadowOffsetY = 30;
            ctx.fillStyle = '#0d0c0b';
            ctx.fill();
            ctx.restore();
          }
          ctx.save();
          ctx.clip();
          cover(nextScene);
          // As the window fills the screen it fades to the page's own paper,
          // so committing to the next stage is seamless.
          paper(ramp(e, 0.55, 1));
          ctx.restore();
        }
      }
      raf = requestAnimationFrame(draw);
    };

    const onMove = (ev) => {
      if (ev.pointerType !== 'mouse' || reduce) return;
      tY = (ev.clientX / window.innerWidth - 0.5) * 37.4;
      tX = (ev.clientY / window.innerHeight - 0.5) * -33;
    };
    const onLeave = () => { tX = 0; tY = 0; };

    // Open the first window once the loading screen has gone.
    const openIntro = () => {
      setReady(true);
      const t0 = performance.now();
      const step = (now) => {
        const t = clamp((now - t0) / 1365, 0, 1);
        intro = easeInOutCubic(t);
        if (t < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };

    build();
    read();
    at = target;
    const fontsReady = document.fonts?.ready;
    if (fontsReady) fontsReady.then(build);
    let rt = 0;
    const onResize = () => { read(); clearTimeout(rt); rt = setTimeout(build, 120); };
    window.addEventListener('scroll', read, { passive: true });
    window.addEventListener('resize', onResize);
    st.addEventListener('pointermove', onMove);
    st.addEventListener('pointerleave', onLeave);
    if (document.documentElement.hasAttribute('data-loaded')) openIntro();
    else window.addEventListener('panel:ready', openIntro, { once: true });
    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(rt);
      window.removeEventListener('scroll', read);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('panel:ready', openIntro);
      st.removeEventListener('pointermove', onMove);
      st.removeEventListener('pointerleave', onLeave);
    };
  }, []);

  // Fit the giant title to the room it has, whatever font actually loaded.
  const titleRef = useRef(null);
  const sideRef = useRef(null);
  useEffect(() => {
    const fit = () => {
      const t = titleRef.current;
      const box = t?.parentElement;
      if (!t || !box) return;
      t.style.fontSize = '';
      const stacked = window.innerWidth <= 640;
      const side = sideRef.current;
      const room = box.clientWidth - (stacked || !side ? 0 : side.offsetWidth + 40);
      const need = t.scrollWidth;
      if (need > room && room > 0) {
        const size = parseFloat(getComputedStyle(t).fontSize);
        t.style.fontSize = `${Math.floor(size * (room / need) * 0.98)}px`;
      }
    };
    fit();
    document.fonts?.ready?.then(fit);
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, [current]);

  // Scroll to the start of stage i, just after its window has re-opened.
  const goTo = (i) => {
    const el = sec.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY;
    const span = el.offsetHeight - window.innerHeight;
    window.scrollTo({ top: top + span * ((i + (i ? 0.22 : 0)) / UNITS), behavior: "smooth" });
  };
  const travel = () => (current < LAST ? goTo(current + 1) : router.push('/panel'));

  const s = STATES[current];
  const nextTitle = current < LAST ? STATES[current + 1].title : 'Your project';

  return (
    <section className="ph" ref={sec} aria-label="How The Panel works">
      <div className={`ph-stage ${ready ? 'is-ready' : ''}`} ref={stage}>
        <canvas className="ph-canvas" ref={canvas} aria-hidden="true" />
        <div className="grain" aria-hidden="true" />
        <i className="meter" ref={meter} aria-hidden="true" />

        <nav className="ph-list" aria-label="Stages">
          {STATES.map((x, i) => (
            <button key={x.key} type="button" className={`ph-item ${i === current ? 'active' : ''}`} onClick={() => goTo(i)} aria-current={i === current ? 'step' : undefined}>
              {x.intro ? 'Start' : x.title}
            </button>
          ))}
        </nav>

        <div className="ph-chrome" ref={chrome}>
          <div className="ph-portal-wrap">
            <div className="ph-heading" key={`h${current}`}>
              <span>Next:</span>
              <span>
                {pad(current + 1)} <strong>{nextTitle}</strong>
              </span>
            </div>
            <button className="ph-portal" ref={portal} type="button" onClick={travel} aria-label={current < LAST ? `Go to ${nextTitle}` : 'Score your project'} />
            <p className="ph-hint">
              <span className="mouse">{current < LAST ? 'Scroll, or click the window' : 'Click the window to score yours'}</span>
              <span className="touch">{current < LAST ? 'Scroll, or tap the window' : 'Tap the window to score yours'}</span>
            </p>
          </div>

          <div className="ph-content" key={`c${current}`}>
            <h2 className="ph-title" ref={titleRef} aria-hidden={s.intro ? 'true' : undefined}>
              {s.title}
            </h2>
            {s.intro ? (
              <div className="ph-intro" ref={sideRef}>
                                <h1>See your score before the judges do.</h1>
                <p className="ph-sub">Paste a hackathon link and your project. The Panel studies the judges and past winners, then scores you on the event’s real criteria.</p>
                <div className="ph-actions">
                  <Link href="/panel" className="btn btn-lg">
                    Score a project
                  </Link>
                  <button type="button" className="btn btn-lg btn-quiet" onClick={() => goTo(1)}>
                    See how it works
                  </button>
                </div>
              </div>
            ) : (
              <dl className="ph-facts" ref={sideRef}>
                {s.facts.map(([k, v], i) => (
                  <div className="ph-fact" key={k} style={{ '--i': i }}>
                    <dt>{k}</dt>
                    <dd>{v}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
