/**
 * Skeleton.jsx — Reusable shimmer skeleton components.
 * Usage:
 *   <SkeletonCard />           — single card shimmer
 *   <SkeletonList count={5} /> — N card shimmers stacked
 *   <SkeletonRow />            — single table row shimmer
 *   <SkeletonTable rows={5} /> — N table row shimmers
 */

import React from 'react';

// Base shimmer animation via inline style (no Tailwind animation needed)
const shimmerStyle = {
  background: 'linear-gradient(90deg, rgba(236,72,153,0.06) 25%, rgba(236,72,153,0.12) 50%, rgba(236,72,153,0.06) 75%)',
  backgroundSize: '200% 100%',
  animation: 'prp-shimmer 1.4s infinite',
  borderRadius: '8px',
};

// Inject keyframes once
if (typeof document !== 'undefined' && !document.getElementById('prp-shimmer-style')) {
  const style = document.createElement('style');
  style.id = 'prp-shimmer-style';
  style.textContent = `
    @keyframes prp-shimmer {
      0%   { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
  `;
  document.head.appendChild(style);
}

function Bar({ width = '100%', height = 12, style = {} }) {
  return <div style={{ ...shimmerStyle, width, height, ...style }} />;
}

/** Single mentee/assignment card skeleton */
export function SkeletonCard() {
  return (
    <div className="glass rounded-2xl p-5" style={{ border: '1px solid rgba(236,72,153,0.08)' }}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-2">
          <Bar width="45%" height={14} />
          <Bar width="60%" height={11} />
          <Bar width="35%" height={11} />
          <Bar width="20%" height={20} style={{ borderRadius: '999px', marginTop: 6 }} />
        </div>
        <div className="flex gap-2">
          <Bar width={70} height={30} style={{ borderRadius: '8px' }} />
          <Bar width={70} height={30} style={{ borderRadius: '8px' }} />
        </div>
      </div>
    </div>
  );
}

/** Stack of N card skeletons */
export function SkeletonList({ count = 4 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => <SkeletonCard key={i} />)}
    </div>
  );
}

/** Single table row skeleton */
export function SkeletonRow({ cols = 5 }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Bar width={i === 0 ? '80%' : '60%'} height={12} />
        </td>
      ))}
    </tr>
  );
}

/** Table body with N skeleton rows */
export function SkeletonTable({ rows = 5, cols = 5 }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => <SkeletonRow key={i} cols={cols} />)}
    </>
  );
}

/** Inline subtle refresh indicator (small spinner, not full skeleton) */
export function RefreshIndicator() {
  return (
    <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
      <div className="w-3 h-3 rounded-full border border-t-transparent animate-spin"
        style={{ borderColor: '#ec4899', borderTopColor: 'transparent' }} />
      Refreshing...
    </div>
  );
}
