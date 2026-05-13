import React from 'react';

export default function InfoBox({ title, children, variant = "default", style = {} }) {
  let bg = "var(--bg-surface-hover)";
  let border = "1px solid var(--border-subtle)";
  
  if (variant === "highlight") {
    bg = "rgba(20, 184, 166, 0.15)";
    border = "1px solid rgba(20, 184, 166, 0.4)";
  } else if (variant === "warning") {
    bg = "rgba(245, 158, 11, 0.15)";
    border = "1px solid rgba(245, 158, 11, 0.4)";
  }

  return (
    <div style={{ 
        marginBottom: '20px', 
        padding: '16px', 
        background: bg, 
        border: border, 
        borderRadius: '8px', 
        ...style
    }}>
      {title && <strong style={{ display: 'block', color: 'var(--text-primary)', marginBottom: '8px' }}>{title}</strong>}
      <div style={{ lineHeight: 1.6, color: 'var(--text-primary)' }}>
        {children}
      </div>
    </div>
  );
}
