'use client';

import { useEffect, useRef } from 'react';

// The 23 judges listed on the Nebius x NVIDIA Global AI Hackathon Devpost page.
const JUDGES = [
  ['Nancy Agarwal', 'Senior Software Engineer', 'NVIDIA'],
  ['Abhinav Balasubramanian', 'Staff AI Engineer', 'NVIDIA'],
  ['Dylan Bristot', 'Founding PMM, Token Factory', 'Nebius'],
  ['AbdulMajed Raja', 'DevRel Lead, Token Factory APJ', 'Nebius'],
  ['Rob Spectre', 'Developer Relations Advisor', 'Nebius'],
  ['Evan Rimer', 'Forward Deployed Engineer', 'Tavily'],
  ['Lakshmi Rameish', 'Senior System Software Engineer', 'NVIDIA'],
  ['Surbhi Jha', 'Senior Software Engineer', 'NVIDIA'],
  ['Joe Sarabia', 'Director of Product, Ecosystem', 'Nebius'],
  ['Marouane Khoukh', 'Technical Developer Advocate', 'Nebius'],
  ['Ricky Johnson', 'Developer Relations', 'Tavily'],
  ['Selena Williams', 'System Software Engineer', 'NVIDIA'],
  ['Aleksandr Patrushev', 'Head of Product, ML/AI', 'Nebius'],
  ['Unmesh Kurup', 'Chief ML Researcher, Product', 'Nebius'],
  ['Daniel Myers', 'Director of Developer Relations', 'Nebius'],
  ['Jacquie Capur', 'Senior Developer Advocate', 'Nebius'],
  ['Lakshya Prakash Agarwal', 'Forward Deployed Engineer', 'Tavily'],
  ['Johnny Nunez', 'AI Developer Advocate, Physical AI', 'NVIDIA'],
  ['Evan Helda', 'Head of GTM, Physical AI', 'Nebius'],
  ['Mikhail Rozhkov', 'Technical PM, Serverless AI', 'Nebius'],
  ['Dhruv Diddi', 'Principal, Physical AI Ecosystem', 'Nebius'],
  ['Aditya Sahu', 'TME, Jetson Platform', 'NVIDIA'],
  ['Sayali Kandarkar', 'Senior AI/ML Engineer', 'NVIDIA'],
];
const COLOR = { NVIDIA: '#76b900', Nebius: '#0d0c0b', Tavily: '#2a44c9' };
const count = (c) => JUDGES.filter((j) => j[2] === c).length;

export default function JudgesBand() {
  const ref = useRef(null);
  const sheet = useRef(null);

  useEffect(() => {
    const el = ref.current;
    const sh = sheet.current;
    if (!el || !sh) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let io;
    if ('IntersectionObserver' in window) {
      io = new IntersectionObserver(
        ([e]) => {
          if (e.isIntersecting) {
            el.classList.add('in');
            io.disconnect();
          }
        },
        { threshold: 0.2 }
      );
      io.observe(el);
    } else el.classList.add('in');
    if (reduce) return () => io?.disconnect();

    // Gentle parallax: the sheet drifts up to 8% of its height as the band passes through the viewport.
    let raf = 0;
    const update = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const p = Math.min(1, Math.max(0, (vh - r.top) / (vh + r.height)));
      sh.style.transform = `translate3d(0, ${(0.5 - p) * 0.16 * sh.offsetHeight * 0.5}px, 0)`;
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      io?.disconnect();
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <section className="band" id="judges" ref={ref} aria-labelledby="band-title">
      <p className="band-word" aria-hidden="true">
        PANEL
      </p>
      <div className="band-sheet" ref={sheet}>
        <div className="sheet sheet-pad">
          <div className="section-head" style={{ marginBottom: 20 }}>
            <h2 id="band-title" style={{ fontSize: 'clamp(24px, 2.6vw, 32px)' }}>
              Who is judging this hackathon
            </h2>
            <p>The full Devpost list. The Panel builds a profile for each one you seat.</p>
          </div>
          <ul className="seats">
            {JUDGES.map(([name, title, co], i) => (
              <li key={name} className="seat" style={{ '--i': i, '--c': COLOR[co] }}>
                <b>{name}</b>
                <span>
                  {title}, {co}
                </span>
              </li>
            ))}
          </ul>
          <div className="legend">
            <span style={{ '--c': COLOR.Nebius }}>Nebius, {count('Nebius')}</span>
            <span style={{ '--c': COLOR.NVIDIA }}>NVIDIA, {count('NVIDIA')}</span>
            <span style={{ '--c': COLOR.Tavily }}>Tavily, {count('Tavily')}</span>
          </div>
        </div>
        <p className="band-caption">
          Source: the judges list on nebiusglobalaihackathon.devpost.com. Profiles in a run are simulations built from public information, not statements by these people.
        </p>
      </div>
    </section>
  );
}
