import Link from 'next/link';
import PortalHero from '../components/PortalHero.jsx';
import JudgesBand from '../components/JudgesBand.jsx';
import Reveal from '../components/Reveal.jsx';
import Faq from '../components/Faq.jsx';

export default function Home() {
  return (
    <>
      <PortalHero />

      <Reveal className="runs-on" aria-label="What The Panel runs on">
        <div>
          <b>NVIDIA Nemotron</b>
          <span>The models that read, judge and moderate</span>
        </div>
        <div>
          <b>Nebius Token Factory</b>
          <span>Where those models run</span>
        </div>
        <div>
          <b>Tavily</b>
          <span>Live web pages and search</span>
        </div>
      </Reveal>

      <div className="section">
        <JudgesBand />
      </div>

      <Reveal className="section">
        <div className="section-head">
          <h2>What the rules page won’t tell you</h2>
        </div>
        <div className="glow-cards stagger">
          <article className="glow-card" style={{ '--i': 0 }}>
            <span className="gc-index">Judges</span>
            <h3>Who is reading</h3>
            <p>Each score is written from one judge’s point of view, based on what they have built, written and judged.</p>
          </article>
          <article className="glow-card" style={{ '--i': 1 }}>
            <span className="gc-index">Past winners</span>
            <h3>What won before</h3>
            <p>Winners from the same organizer show you the real bar, each one linked to where it came from.</p>
          </article>
          <article className="glow-card" style={{ '--i': 2 }}>
            <span className="gc-index">Fix list</span>
            <h3>What to fix first</h3>
            <p>Changes are ranked by how much they should move your score against how long they take.</p>
          </article>
        </div>
        <p className="aside">
          It’s a second opinion, not a verdict. The judges are simulations built from public information, and real panels disagree. <Link href="/method">Read how it works and where it falls short.</Link>
        </p>
      </Reveal>

      <Faq />

      <Reveal className="cta-band">
        <div>
          <h2>Your deadline won’t move. Your score still can.</h2>
          <p>Run The Panel on your project and get a ranked fix list in a few minutes.</p>
        </div>
        <Link href="/panel" className="btn btn-lg">
          Score a project
        </Link>
      </Reveal>
    </>
  );
}
