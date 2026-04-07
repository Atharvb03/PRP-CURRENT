/**
 * Logo.jsx — PRP brand logo in 3 variations.
 *
 * Usage:
 *   <Logo variant="monogram" />          — PRP text only
 *   <Logo variant="full" />              — PRP + "Project Review Platform"
 *   <Logo variant="icon" />              — Stylized P icon (favicon use)
 *   <Logo variant="monogram" size={48} /> — custom size
 */

import React from 'react';

const GRAD_ID_PREFIX = 'prp-grad';

export default function Logo({ variant = 'full', size = 40, className = '' }) {
  const gradId = `${GRAD_ID_PREFIX}-${variant}`;

  if (variant === 'icon') {
    // Favicon / small icon — stylized "P" in a rounded square
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        aria-label="PRP icon"
      >
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ff4ecd" />
            <stop offset="100%" stopColor="#a855f7" />
          </linearGradient>
        </defs>
        {/* Rounded square background */}
        <rect width="40" height="40" rx="10" fill={`url(#${gradId})`} />
        {/* Stylized P */}
        <text
          x="50%"
          y="50%"
          dominantBaseline="central"
          textAnchor="middle"
          fill="white"
          fontSize="22"
          fontWeight="800"
          fontFamily="'Inter', 'Segoe UI', system-ui, sans-serif"
          letterSpacing="-0.5"
        >
          P
        </text>
      </svg>
    );
  }

  if (variant === 'monogram') {
    // PRP text only — gradient letters
    return (
      <svg
        width={size * 2.4}
        height={size}
        viewBox="0 0 96 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        aria-label="PRP"
      >
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ff4ecd" />
            <stop offset="100%" stopColor="#a855f7" />
          </linearGradient>
        </defs>
        <text
          x="50%"
          y="50%"
          dominantBaseline="central"
          textAnchor="middle"
          fill={`url(#${gradId})`}
          fontSize="32"
          fontWeight="800"
          fontFamily="'Inter', 'Segoe UI', system-ui, sans-serif"
          letterSpacing="2"
        >
          PRP
        </text>
      </svg>
    );
  }

  // variant === 'full' — PRP + subtitle
  return (
    <svg
      width={size * 8}
      height={size}
      viewBox="0 0 320 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="PRP — Project Review Platform"
    >
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#ff4ecd" />
          <stop offset="100%" stopColor="#a855f7" />
        </linearGradient>
      </defs>
      {/* PRP monogram */}
      <text
        x="0"
        y="27"
        fill={`url(#${gradId})`}
        fontSize="28"
        fontWeight="800"
        fontFamily="'Inter', 'Segoe UI', system-ui, sans-serif"
        letterSpacing="1.5"
      >
        PRP
      </text>
      {/* Divider line */}
      <line x1="72" y1="6" x2="72" y2="34" stroke="#c4b5fd" strokeWidth="1.5" strokeLinecap="round" />
      {/* Subtitle */}
      <text
        x="82"
        y="27"
        fill="#6d28d9"
        fontSize="16"
        fontWeight="600"
        fontFamily="'Inter', 'Segoe UI', system-ui, sans-serif"
        letterSpacing="0.2"
      >
        Project Review Platform
      </text>
    </svg>
  );
}
