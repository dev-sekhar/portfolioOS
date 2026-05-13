import React from 'react';

export default function Table({ columns, data, keyField = "id", renderRow, className = "portfolio-table" }) {
  if (!data || data.length === 0) return null;

  return (
    <div style={{ overflowX: 'auto', border: '1px solid var(--border-subtle)', borderRadius: '8px', maxHeight: '500px' }}>
      <table className={className} style={{ width: '100%', borderCollapse: 'collapse', minWidth: '100%', tableLayout: 'auto' }}>
        <thead style={{ background: 'var(--bg-surface-elevated)', position: 'sticky', top: 0, zIndex: 10, borderBottom: '1px solid var(--border-subtle)' }}>
          <tr>
            {columns.map((col, idx) => (
              <th key={idx} style={{ padding: '10px 12px', color: 'var(--text-primary)', textAlign: 'left', fontWeight: '600', fontSize: '0.875rem' }}>
                {typeof col === 'string' ? col : (col.label || col.key)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => {
            if (renderRow) {
                return renderRow(row, i);
            }
            return (
              <tr key={row[keyField] || i} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                {columns.map((col, j) => {
                  const key = typeof col === 'string' ? col : col.key;
                  return (
                    <td key={j} style={{ padding: '10px 12px', color: 'var(--text-primary)', fontSize: '0.875rem' }}>
                      {row[key] !== undefined ? String(row[key]) : '-'}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
