import type { ReactNode } from 'react';

/**
 * Shared line icons.
 *
 * All icons are stroked rather than filled, on a 24x24 grid at stroke width
 * 1.8, so they sit consistently next to each other and inherit colour from
 * their container. They are decorative by default: every one is aria-hidden,
 * and the interactive element that wraps them carries the accessible label.
 */
export type IconProps = { className?: string };

function Svg({ className = 'h-5 w-5', children }: IconProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

export const MenuIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 6h16M4 12h16M4 18h16" />
  </Svg>
);

export const CloseIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6 6l12 12M18 6L6 18" />
  </Svg>
);

export const ArrowLeftIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M19 12H5m0 0l6-6m-6 6l6 6" />
  </Svg>
);

export const ChevronLeftIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M15 6l-6 6 6 6" />
  </Svg>
);

export const ChevronRightIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M9 6l6 6-6 6" />
  </Svg>
);

export const SearchIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="M20 20l-3.8-3.8" />
  </Svg>
);

/** Closed book, used for the cover placeholder. */
export const BookIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5 4.5A1.5 1.5 0 016.5 3H18a1 1 0 011 1v14a1 1 0 01-1 1H6.5A1.5 1.5 0 015 17.5v-13z" />
    <path d="M5 16.5A1.5 1.5 0 016.5 15H19" />
  </Svg>
);

/** Stack of books, used for the loans empty state. */
export const BooksIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 5.5A1.5 1.5 0 015.5 4H9a1 1 0 011 1v14a1 1 0 01-1 1H5.5A1.5 1.5 0 014 18.5v-13z" />
    <path d="M13 5a1 1 0 011-1h3.5A1.5 1.5 0 0119 5.5v13a1.5 1.5 0 01-1.5 1.5H14a1 1 0 01-1-1V5z" />
    <path d="M4 16h6m3 0h6" />
  </Svg>
);

export const BookmarkIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6 4.5A1.5 1.5 0 017.5 3h9A1.5 1.5 0 0118 4.5V21l-6-4-6 4V4.5z" />
  </Svg>
);

export const CheckCircleIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M8.5 12.5l2.5 2.5 4.5-5" />
  </Svg>
);
