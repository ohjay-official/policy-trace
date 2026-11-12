"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { renderScene } from "@/lib/scenes";

type StageDef = {
  key: string;
  scene: string;
  title: string;
  intro?: boolean;
  facts?: [string, string][];
};

const STATES: StageDef[] = [
  { key: "intro", scene: "lab", title: "Policy Trace", intro: true },
  {
    key: "missing-grant",
    scene: "grant",
    title: "Missing grant",
    facts: [
      ["Grant", "A missing GRANT is sqlstate 42501"],
      ["Policy", "No SELECT policy, no rows, no error"],
      ["Table", "lab_sandbox.documents"],
      ["Who", "anon, Alice, and Bob"],
    ],
  },
  {
    key: "agent-as-alice",
    scene: "agent",
    title: "Agent as Alice",
    facts: [
      ["Tool", "list_tasks"],
      ["Runs as", "Alice, through her JWT"],
      ["Boundary", "Her policies, not a separate role"],
      ["Hidden", "Bob's tasks stay out"],
    ],
  },
  {
    key: "using-true",
    scene: "using",
    title: "USING (true)",
    facts: [
      ["Start", "An owner policy on invoices"],
      ["Trap", "A second permissive USING (true)"],
      ["Combine", "Permissive policies are OR"],
      ["Leak", "Bob's secret reaches Alice"],
    ],
  },
  {
    key: "silent-update",
    scene: "silent",
    title: "Silent update",
    facts: [
      ["Statement", "UPDATE tickets, with RETURNING"],
      ["Missing", "A SELECT policy"],
      ["Result", "0 rows, and no error"],
      ["Fix", "Add a SELECT policy"],
    ],
  },
  {
    key: "team-notes",
    scene: "team",
    title: "Team notes",
    facts: [
      ["Rule", "Owner, or a member of the team"],
      ["Team", "Acme, Alice and Bob"],
      ["Hidden", "Bob's private note"],
      ["Also hidden", "Carol, on the other team"],
    ],
  },
];

const LAST = STATES.length - 1;
const UNITS = STATES.length;
const FOCAL = 850;

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const smooth = (t: number) => t * t * (3 - 2 * t);
const ramp = (p: number, a: number, b: number) => (b <= a ? (p >= b ? 1 : 0) : smooth(clamp((p - a) / (b - a), 0, 1)));
const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - ((-2 * t + 2) ** 3) / 2);
const pad = (n: number) => `[${String(n).padStart(2, "0")}]`;

function roundedRectPoints(w: number, h: number, r: number) {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  const arcs: [number, number, number, number][] = [
    [w / 2 - r, -h / 2 + r, -Math.PI / 2, 0],
    [w / 2 - r, h / 2 - r, 0, Math.PI / 2],
    [-w / 2 + r, h / 2 - r, Math.PI / 2, Math.PI],
    [-w / 2 + r, -h / 2 + r, Math.PI, Math.PI * 1.5],
  ];
  const pts: [number, number][] = [];
  for (const [ax, ay, a0, a1] of arcs) {
    for (let i = 0; i <= 10; i++) {
      const a = a0 + ((a1 - a0) * i) / 10;
      pts.push([ax + Math.cos(a) * r, ay + Math.sin(a) * r]);
    }
  }
  return pts;
}

function project(pts: [number, number][], cx: number, cy: number, rxDeg: number, ryDeg: number) {
  const ax = (rxDeg * Math.PI) / 180;
  const ay = (ryDeg * Math.PI) / 180;
  return pts.map(([x, y]) => {
    const xx = x * Math.cos(ay);
    const yy = y * Math.cos(ax);
    const z = x * Math.sin(ay) - y * Math.sin(ax);
    const p = FOCAL / (FOCAL + z);
    return [cx + xx * p, cy + yy * p] as [number, number];
  });
}

export function Stage() {
  const router = useRouter();
  const sec = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const portal = useRef<HTMLButtonElement>(null);
  const chrome = useRef<HTMLDivElement>(null);
  const meter = useRef<HTMLElement>(null);
  const live = useRef({ current: 0 });
  const [current, setCurrent] = useState(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const cv = canvas.current;
    const st = stage.current;
    const el = sec.current;
    if (!cv || !st || !el) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let W = 0;
    let H = 0;
    let dpr = 1;
    let scenes: Record<string, HTMLCanvasElement> = {};
    let raf = 0;
    let last = performance.now();
    let target = 0;
    let at = 0;
    let intro = reduce ? 1 : 0;
    let rotX = 0;
    let rotY = 0;
    let tX = 0;
    let tY = 0;

    const build = () => {
      const r = st.getBoundingClientRect();
      W = r.width;
      H = r.height;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      cv.width = Math.round(W * dpr);
      cv.height = Math.round(H * dpr);
      cv.style.width = `${W}px`;
      cv.style.height = `${H}px`;
      const pr = portal.current?.getBoundingClientRect();
      const box = pr && pr.width
        ? { cx: pr.left - r.left + pr.width / 2, cy: pr.top - r.top + pr.height / 2, w: pr.width, h: pr.height }
        : { cx: W / 2, cy: H / 2, w: 300, h: 330 };
      scenes = {};
      for (const key of ["lab", "grant", "agent", "using", "silent", "team"]) {
        scenes[key] = renderScene(key, W, H, dpr, box);
      }
    };
    const read = () => {
      const r = el.getBoundingClientRect();
      const span = r.height - window.innerHeight;
      target = span > 0 ? clamp(-r.top / span, 0, 1) : 0;
    };
    const cover = (key: string) => {
      const scene = scenes[key];
      if (scene) ctx.drawImage(scene, 0, 0, W, H);
    };
    const paper = (alpha: number) => {
      if (alpha <= 0) return;
      ctx.fillStyle = `rgba(28,28,28,${alpha})`;
      ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = `rgba(248,248,248,${0.045 * alpha})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = (W / 2) % 48; x < W; x += 48) {
        ctx.moveTo(Math.round(x) + 0.5, 0);
        ctx.lineTo(Math.round(x) + 0.5, H);
      }
      for (let y = (H / 2) % 48; y < H; y += 48) {
        ctx.moveTo(0, Math.round(y) + 0.5);
        ctx.lineTo(W, Math.round(y) + 0.5);
      }
      ctx.stroke();
    };

    const draw = (now: number) => {
      const dt = Math.min(40, now - last);
      last = now;
      const gap = target - at;
      at = Math.abs(gap) > 0.0004 ? at + gap * 0.08 : target;
      if (!reduce) {
        rotX += (tX - rotX) * Math.min(1, dt * 0.0063);
        rotY += (tY - rotY) * Math.min(1, dt * 0.0063);
      }
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
        chrome.current.style.opacity = String(o);
        chrome.current.style.visibility = o < 0.02 ? "hidden" : "visible";
      }
      if (meter.current) meter.current.style.transform = `scaleX(${at})`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      paper(1);
      const nextScene = seg < LAST ? STATES[seg + 1].scene : "lab";
      const pr = portal.current?.getBoundingClientRect();
      const sr = st.getBoundingClientRect();
      if (pr && pr.width > 0) {
        const rcx = pr.left - sr.left + pr.width / 2;
        const rcy = pr.top - sr.top + pr.height / 2;
        const cx = rcx + (W / 2 - rcx) * e;
        const cy = rcy + (H / 2 - rcy) * e;
        const bw = pr.width + (W - pr.width) * e;
        const bh = pr.height + (H - pr.height) * e;
        const s = e ? 1 : maskScale;
        const w = bw * s;
        const h = bh * s;
        const R = W < 640 ? 44 : 64;
        if (w > 1 && h > 1) {
          const pts = project(roundedRectPoints(w, h, R * (1 - e) * s), cx, cy, rotX * (1 - e), rotY * (1 - e));
          ctx.beginPath();
          pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
          ctx.closePath();
          if (e < 0.6) {
            ctx.save();
            ctx.shadowColor = `rgba(0,0,0,${0.45 * (1 - e) * s})`;
            ctx.shadowBlur = 60;
            ctx.shadowOffsetY = 30;
            ctx.fillStyle = "#111111";
            ctx.fill();
            ctx.restore();
          }
          ctx.save();
          ctx.clip();
          cover(nextScene);
          paper(ramp(e, 0.55, 1));
          ctx.restore();
        }
      }
      raf = requestAnimationFrame(draw);
    };

    const onMove = (ev: PointerEvent) => {
      if (ev.pointerType !== "mouse" || reduce) return;
      tY = (ev.clientX / window.innerWidth - 0.5) * 37.4;
      tX = (ev.clientY / window.innerHeight - 0.5) * -33;
    };
    const onLeave = () => {
      tX = 0;
      tY = 0;
    };
    const openIntro = () => {
      setReady(true);
      if (reduce) {
        intro = 1;
        return;
      }
      const t0 = performance.now();
      const step = (now: number) => {
        const t = clamp((now - t0) / 1365, 0, 1);
        intro = easeInOutCubic(t);
        if (t < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };

    build();
    read();
    at = target;
    document.fonts?.ready.then(build);
    let rt = 0;
    const onResize = () => {
      read();
      clearTimeout(rt);
      rt = window.setTimeout(build, 120);
    };
    window.addEventListener("scroll", read, { passive: true });
    window.addEventListener("resize", onResize);
    st.addEventListener("pointermove", onMove);
    st.addEventListener("pointerleave", onLeave);
    if (document.documentElement.hasAttribute("data-loaded")) openIntro();
    else window.addEventListener("panel:ready", openIntro, { once: true });
    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(rt);
      window.removeEventListener("scroll", read);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("panel:ready", openIntro);
      st.removeEventListener("pointermove", onMove);
      st.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  const titleRef = useRef<HTMLHeadingElement>(null);
  const sideRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const fit = () => {
      const t = titleRef.current;
      const box = t?.parentElement;
      if (!t || !box) return;
      t.style.fontSize = "";
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
    document.fonts?.ready.then(fit);
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [current]);

  const goTo = (i: number) => {
    const el = sec.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY;
    const span = el.offsetHeight - window.innerHeight;
    window.scrollTo({ top: top + span * ((i + (i ? 0.22 : 0)) / UNITS), behavior: "smooth" });
  };
  const travel = () => (current < LAST ? goTo(current + 1) : router.push("/lab/missing-grant"));

  const s = STATES[current];
  const nextTitle = current < LAST ? STATES[current + 1].title : "The lab";

  return (
    <section className="ph" ref={sec} aria-label="How Policy Trace works" id="how">
      <div className={`ph-stage ${ready ? "is-ready" : ""}`} ref={stage}>
        <canvas className="ph-canvas" ref={canvas} aria-hidden="true" />
        <div className="grain" aria-hidden="true" />
        <i className="meter" ref={meter} aria-hidden="true" />
        <nav className="ph-list" aria-label="Stages">
          {STATES.map((item, i) => (
            <button
              key={item.key}
              type="button"
              className={`ph-item ${i === current ? "active" : ""}`}
              onClick={() => goTo(i)}
              aria-current={i === current ? "step" : undefined}
            >
              {item.intro ? "Start" : item.title}
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
            <button
              className="ph-portal"
              ref={portal}
              type="button"
              onClick={travel}
              aria-label={current < LAST ? `Go to ${nextTitle}` : "Open the lab"}
            />
            <p className="ph-hint">
              <span className="mouse">{current < LAST ? "Scroll, or click the window" : "Click the window to open the lab"}</span>
              <span className="touch">{current < LAST ? "Scroll, or tap the window" : "Tap the window to open the lab"}</span>
            </p>
          </div>
          <div className="ph-content" key={`c${current}`}>
            <h2 className="ph-title" ref={titleRef} aria-hidden={s.intro ? "true" : undefined}>
              {s.title}
            </h2>
            {s.intro ? (
              <div className="ph-intro" ref={(node) => { sideRef.current = node; }}>
                <h1>See why a row came back, or why it didn&apos;t.</h1>
                <p className="ph-sub">
                  Pick a scenario, choose who is asking, and read the grant and the policy that decided it.
                </p>
                <div className="ph-actions">
                  <Link href="/lab/missing-grant" className="btn btn-lg">
                    Open the lab
                  </Link>
                  <button type="button" className="btn btn-lg btn-quiet" onClick={() => goTo(1)}>
                    See how it works
                  </button>
                </div>
              </div>
            ) : (
              <dl className="ph-facts" ref={(node) => { sideRef.current = node; }}>
                {s.facts?.map(([k, v], i) => (
                  <div className="ph-fact" key={k} style={{ ["--i" as string]: i }}>
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
