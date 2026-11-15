'use client';

import { useState } from 'react';
import Link from 'next/link';

const QA = [
  {
    q: 'Is The Panel free to use?',
    a: 'Yes. There is no account and nothing to pay. Runs are limited per hour so one person cannot use up the shared credits.',
  },
  {
    q: 'Are these the real judges talking?',
    a: 'No. Each judge is a simulation built from public, professional information such as talks, posts and past judging, with sources linked. The real people are not involved and have not endorsed it. You can switch to roles instead of names before a run.',
  },
  {
    q: 'How accurate is the predicted score?',
    a: 'Treat it as a sharp second opinion, not a forecast. It has not yet been tested against the published results of a past hackathon, and real panels disagree. The fix list is usually the most useful part.',
  },
  {
    q: 'What links can I paste?',
    a: 'A Devpost page, a bounty listing, or any public page that lists the rules and judges. For your project, use a public repo or demo link. Private repos cannot be read, so paste your README or write-up into the description box instead.',
  },
  {
    q: 'Is my project saved anywhere?',
    a: 'No. Your links and description are sent to the services that do the work and the results live only in your browser tab. Close the tab and they are gone.',
  },
  {
    q: 'Which models and tools does it use?',
    a: 'NVIDIA Nemotron models served by Nebius Token Factory: a small model reads pages and builds profiles, a mid-size model runs each judge, and the strongest available model moderates. Tavily supplies the web pages and searches.',
  },
  {
    q: 'How long does a run take, and what does it cost?',
    a: 'Usually a few minutes, longer with more judges seated. Every model call is metered, and the cost of your run is shown at the end, model by model.',
  },
  {
    q: 'Why does it say sample mode?',
    a: 'When the server has no model key, runs use built-in placeholder data so you can see how the tool works. Every result is clearly labelled as a sample and no real scores are shown.',
  },
  {
    q: 'Can I use it for other hackathons and bounties?',
    a: 'Yes. Any event with a public page works. If the page lists no judges or criteria, the tool searches the rest of the site for them and tells you when it had to fall back to general criteria.',
  },
  {
    q: 'Is the code open?',
    a: 'Yes, under the MIT license on GitHub, including every prompt the models receive.',
  },
];

export default function Faq() {
  const [open, setOpen] = useState(() => new Set([0, 1]));
  const toggle = (i) =>
    setOpen((s) => {
      const n = new Set(s);
      n.has(i) ? n.delete(i) : n.add(i);
      return n;
    });

  return (
    <section className="section faq" aria-labelledby="faq-title">
      <div className="section-head">
        <h2 id="faq-title">Questions people ask</h2>
        <p>
          Still unsure? Read the <Link href="/method">method</Link> or open an issue on <a href="https://github.com/ohjay-official/the-panel/issues">GitHub</a>.
        </p>
      </div>
      <div className="faq-list">
        {QA.map(({ q, a }, i) => {
          const isOpen = open.has(i);
          return (
            <div key={q} className={`faq-item ${isOpen ? 'open' : ''}`}>
              <h3>
                <button type="button" className="faq-q" aria-expanded={isOpen} aria-controls={`faq-a-${i}`} id={`faq-q-${i}`} onClick={() => toggle(i)}>
                  <span>{q}</span>
                  <i className="faq-icon" aria-hidden="true" />
                </button>
              </h3>
              <div className="faq-a" id={`faq-a-${i}`} role="region" aria-labelledby={`faq-q-${i}`}>
                <div>
                  <p>{a}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
