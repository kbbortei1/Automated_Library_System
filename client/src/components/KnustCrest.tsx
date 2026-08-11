import { useState } from 'react';

/**
 * University crest.
 *
 * Renders the official KNUST emblem from `public/knust-logo.png` when it is
 * present. Until that file is dropped in (and if it ever 404s) we fall back to
 * an original mark built from two emblem motifs — the pot of fire, for the
 * quest for knowledge that must be kept burning, and an open book — so the
 * page never renders a broken image.
 */
export function KnustCrest({ className = 'h-14 w-14' }: { className?: string }) {
  const [failed, setFailed] = useState(false);

  if (!failed) {
    return (
      <img
        src="/knust-logo.png"
        alt="KNUST university crest"
        className={`${className} object-contain`}
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <svg viewBox="0 0 64 64" role="img" aria-label="KNUST university crest" className={className}>
      <circle cx="32" cy="32" r="31" fill="#0b2f0f" stroke="#f5b301" strokeWidth="2" />
      {/* Pot of fire — the flame of knowledge. */}
      <path
        d="M32 13c3.4 4.1 5.1 7.4 5.1 10a5.1 5.1 0 0 1-10.2 0c0-2.6 1.7-5.9 5.1-10Z"
        fill="#f5b301"
      />
      <path d="M32 18.5c1.6 2.2 2.4 3.9 2.4 5.2a2.4 2.4 0 0 1-4.8 0c0-1.3.8-3 2.4-5.2Z" fill="#e62020" />
      {/* Open book. */}
      <path
        d="M13 33h16.5c1.4 0 2.5 1 2.5 2.3V49c0-1.3-1.1-2.3-2.5-2.3H13V33Z"
        fill="#fff"
        opacity="0.94"
      />
      <path
        d="M51 33H34.5c-1.4 0-2.5 1-2.5 2.3V49c0-1.3 1.1-2.3 2.5-2.3H51V33Z"
        fill="#fff"
        opacity="0.78"
      />
      <path d="M32 35.3V49" stroke="#0b2f0f" strokeWidth="1.4" />
      {/* Green leaves flanking the base. */}
      <path d="M17 52c3.6-.4 6.3.6 8.1 3-3.6.4-6.3-.6-8.1-3Z" fill="#44a24b" />
      <path d="M47 52c-3.6-.4-6.3.6-8.1 3 3.6.4 6.3-.6 8.1-3Z" fill="#44a24b" />
    </svg>
  );
}
