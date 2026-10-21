import { useEffect, useRef, useState } from 'react';
import Icon from './Icon';
import { galleryPhotos } from './gallery';

const base = import.meta.env.BASE_URL;

export default function Gallery({ headingRef }: { headingRef: React.Ref<HTMLHeadingElement> }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const [index, setIndex] = useState<number | null>(null);
  const [failed, setFailed] = useState(false);
  const photo = index === null ? null : galleryPhotos[index];

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (index !== null && !dialog.open) dialog.showModal();
  }, [index]);

  const open = (i: number, el: HTMLElement) => {
    opener.current = el;
    setFailed(false);
    setIndex(i);
  };
  const close = () => {
    dialogRef.current?.close();
    setIndex(null);
    opener.current?.focus();
  };
  const step = (delta: number) => {
    setFailed(false);
    setIndex((i) => (i === null ? i : (i + delta + galleryPhotos.length) % galleryPhotos.length));
  };

  return (
    <div className="page gallery">
      <h1 ref={headingRef} tabIndex={-1}>Photos <span className="count">{galleryPhotos.length}</span></h1>
      <ul className="photo-grid">
        {galleryPhotos.map((p, i) => (
          <li key={p.id}>
            <button type="button" className="photo-tile" onClick={(e) => open(i, e.currentTarget)} aria-label={`Open photo ${i + 1}: ${p.alt}`}>
              <img src={`${base}${p.thumbnail}`} alt="" width="800" height="533" loading="lazy" decoding="async" />
            </button>
          </li>
        ))}
      </ul>
      <dialog
        ref={dialogRef}
        className="lightbox"
        aria-label="Photo viewer"
        onCancel={(e) => { e.preventDefault(); close(); }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft') step(-1);
          if (e.key === 'ArrowRight') step(1);
        }}
        onClick={(e) => { if (e.target === e.currentTarget) close(); }}
      >
        {photo && (
          <div className="lightbox-body">
            {failed
              ? <p role="alert" className="lightbox-error">This photo could not load.</p>
              : <img src={`${base}${photo.src}`} alt={photo.alt} onError={() => setFailed(true)} />}
            <div className="lightbox-bar">
              <p className="lightbox-caption">{photo.alt}</p>
              <span className="lightbox-count" aria-live="polite">{index! + 1} / {galleryPhotos.length}</span>
              <button type="button" className="icon-btn" onClick={() => step(-1)} aria-label="Previous photo"><Icon name="prev" /></button>
              <button type="button" className="icon-btn" onClick={() => step(1)} aria-label="Next photo"><Icon name="next" /></button>
              <button type="button" className="icon-btn" onClick={close} aria-label="Close photo"><Icon name="close" /></button>
            </div>
          </div>
        )}
      </dialog>
    </div>
  );
}
