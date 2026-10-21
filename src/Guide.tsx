import { useState } from 'react';
import Icon from './Icon';
import { steps, VIDEO_ID } from './keyboard';

const parts = [
  'Core PCB and breakout PCB',
  'Neoprene dampener and plate',
  'Switches and stabilizers',
  'Top and bottom housing',
  'Bumpers, isolation strips and screws',
  'Keycaps',
];

export default function Guide({ headingRef }: { headingRef: React.Ref<HTMLHeadingElement> }) {
  const [playing, setPlaying] = useState(false);
  return (
    <div className="page guide">
      <h1 ref={headingRef} tabIndex={-1}>Guide</h1>
      <div className="video">
        {playing ? (
          <iframe
            title="Universe keyboard kit assembly video"
            src={`https://www.youtube-nocookie.com/embed/${VIDEO_ID}?autoplay=1&rel=0`}
            allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        ) : (
          <button type="button" className="video-play" onClick={() => setPlaying(true)}>
            <img src="images/R0002895.webp" alt="" />
            <span className="play-label"><Icon name="play" size={20} />Play video</span>
          </button>
        )}
      </div>
      <div className="guide-cols">
        <section aria-labelledby="steps-h">
          <h2 id="steps-h">Steps</h2>
          <ol className="guide-steps">
            {steps.map((s) => (
              <li key={s.name}>
                <h3>{s.name}</h3>
                <p>{s.guide}</p>
              </li>
            ))}
          </ol>
        </section>
        <section aria-labelledby="box-h">
          <h2 id="box-h">In the box</h2>
          <ul className="guide-parts">
            {parts.map((p) => <li key={p}>{p}</li>)}
          </ul>
        </section>
      </div>
    </div>
  );
}
