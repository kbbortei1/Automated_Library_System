import { useState } from 'react';

// Renders a book cover. Prefers an explicit coverImageUrl, otherwise falls back to the
// Open Library cover for the ISBN; if neither resolves, shows a placeholder.
export function BookCover({
  isbn,
  coverImageUrl,
  title,
  size = 'M',
}: {
  isbn?: string;
  coverImageUrl?: string | null;
  title?: string;
  size?: 'S' | 'M' | 'L';
}) {
  const [failed, setFailed] = useState(false);

  const src =
    coverImageUrl ||
    (isbn ? `https://covers.openlibrary.org/b/isbn/${encodeURIComponent(isbn)}-${size}.jpg?default=false` : '');

  if (!src || failed) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-surface-3 text-5xl">📘</div>
    );
  }

  return (
    <img
      src={src}
      alt={title ? `Cover of ${title}` : ''}
      loading="lazy"
      onError={() => setFailed(true)}
      className="h-full w-full object-cover"
    />
  );
}
