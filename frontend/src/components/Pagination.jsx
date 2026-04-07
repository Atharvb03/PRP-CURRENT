/**
 * Pagination.jsx — Reusable pagination controls.
 * Props:
 *   currentPage   {number}
 *   totalPages    {number}
 *   totalRecords  {number}
 *   limit         {number}
 *   onPageChange  {(page: number) => void}
 *   loading       {boolean} — disables buttons while fetching
 */

import React, { useMemo } from 'react';

export default function Pagination({ currentPage, totalPages, totalRecords, limit, onPageChange, loading = false }) {
  if (!totalPages || totalPages <= 1) return null;

  const from = (currentPage - 1) * limit + 1;
  const to   = Math.min(currentPage * limit, totalRecords);

  // Build page number list with ellipsis: [1] ... [4][5][6] ... [10]
  const pages = useMemo(() => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const result = [];
    result.push(1);
    if (currentPage > 3) result.push('...');
    for (let p = Math.max(2, currentPage - 1); p <= Math.min(totalPages - 1, currentPage + 1); p++) {
      result.push(p);
    }
    if (currentPage < totalPages - 2) result.push('...');
    result.push(totalPages);
    return result;
  }, [currentPage, totalPages]);

  const btnBase = {
    padding: '6px 12px',
    borderRadius: '8px',
    fontSize: '12px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.15s',
    border: '1px solid rgba(236,72,153,0.2)',
  };

  const btnActive = { ...btnBase, background: 'linear-gradient(135deg,#ec4899,#a855f7)', color: '#fff', border: 'none' };
  const btnNormal = { ...btnBase, background: 'rgba(236,72,153,0.06)', color: 'var(--text-muted)' };
  const btnDisabled = { ...btnNormal, opacity: 0.4, cursor: 'not-allowed' };

  return (
    <div className="flex items-center justify-between flex-wrap gap-3 mt-4 px-1">
      {/* Record count */}
      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
        Showing {from}–{to} of {totalRecords}
      </p>

      {/* Page buttons */}
      <div className="flex items-center gap-1">
        {/* Prev */}
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1 || loading}
          style={currentPage === 1 || loading ? btnDisabled : btnNormal}
        >
          ← Prev
        </button>

        {/* Page numbers */}
        {pages.map((p, i) =>
          p === '...' ? (
            <span key={`ellipsis-${i}`} className="px-2 text-xs" style={{ color: 'var(--text-muted)' }}>…</span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              disabled={loading}
              style={p === currentPage ? btnActive : (loading ? btnDisabled : btnNormal)}
            >
              {p}
            </button>
          )
        )}

        {/* Next */}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages || loading}
          style={currentPage === totalPages || loading ? btnDisabled : btnNormal}
        >
          Next →
        </button>
      </div>
    </div>
  );
}
