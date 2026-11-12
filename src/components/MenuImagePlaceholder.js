import React from 'react';

/** Subtle food-plate placeholder when a menu item has no image. */
export default function MenuImagePlaceholder({ className = '', iconClassName = 'h-12 w-12' }) {
  return (
    <div
      className={`flex h-full w-full items-center justify-center bg-gradient-to-br from-neutral-100 via-amber-50/50 to-neutral-150 dark:from-neutral-900 dark:via-amber-950/10 dark:to-neutral-950 ${className}`}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`${iconClassName} text-neutral-300 dark:text-neutral-600`}
      >
        <circle cx="32" cy="34" r="16" stroke="currentColor" strokeWidth="1.5" opacity="0.9" />
        <circle cx="32" cy="34" r="10" stroke="currentColor" strokeWidth="1.25" opacity="0.55" />
        <path
          d="M20 18c2.5 3 4 6.5 4 10.5M24 16.5c1.2 2.8 1.8 5.8 1.8 9"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity="0.75"
        />
        <path
          d="M44 17v12.5c0 2.2-1.3 3.5-3 3.5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity="0.75"
        />
        <path d="M41 17v16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.55" />
      </svg>
    </div>
  );
}
