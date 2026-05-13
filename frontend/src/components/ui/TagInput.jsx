import React, { useState } from 'react';

export default function TagInput({ value, onChange, onBlur, placeholder = "Type and press Enter...", style = {} }) {
  const [inputValue, setInputValue] = useState("");
  
  const tags = value ? value.split(',').map(s => s.trim()).filter(Boolean) : [];

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const newTag = inputValue.trim();
      if (newTag && !tags.includes(newTag)) {
        const newValue = [...tags, newTag].join(', ');
        onChange(newValue);
        if (onBlur) onBlur(newValue);
      }
      setInputValue("");
    } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      const newValue = tags.slice(0, -1).join(', ');
      onChange(newValue);
      if (onBlur) onBlur(newValue);
    }
  };

  const removeTag = (tagToRemove) => {
    const newValue = tags.filter(t => t !== tagToRemove).join(', ');
    onChange(newValue);
    if (onBlur) onBlur(newValue);
  };

  const handleBlur = () => {
    const newTag = inputValue.trim();
    if (newTag && !tags.includes(newTag)) {
      const newValue = [...tags, newTag].join(', ');
      onChange(newValue);
      if (onBlur) onBlur(newValue);
      setInputValue("");
    } else if (onBlur) {
      onBlur(value);
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexWrap: 'wrap',
      gap: '8px',
      padding: '4px 12px',
      background: 'var(--bg-input)',
      border: '1px solid var(--border-strong)',
      borderRadius: '8px',
      minHeight: '40px',
      alignItems: 'center',
      ...style
    }}>
      {tags.map((tag, i) => (
        <div key={i} style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          background: '#3b82f6',
          color: '#fff',
          padding: '2px 8px',
          borderRadius: '999px',
          fontSize: '0.8rem',
          fontWeight: '500'
        }}>
          {tag}
          <button 
            type="button" 
            onClick={() => removeTag(tag)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#fff',
              cursor: 'pointer',
              padding: '0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1rem',
              lineHeight: 1,
              opacity: 0.8
            }}
          >
            ×
          </button>
        </div>
      ))}
      <input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        placeholder={tags.length === 0 ? placeholder : ""}
        style={{
          border: 'none',
          background: 'transparent',
          outline: 'none',
          color: 'var(--text-input)',
          flex: 1,
          minWidth: '120px',
          fontSize: '0.9rem'
        }}
      />
    </div>
  );
}
