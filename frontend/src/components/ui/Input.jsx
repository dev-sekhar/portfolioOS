import { TextField } from "@mui/material";

export default function Input({ sx, ...props }) {
  return (
    <TextField
      size="small"
      variant="outlined" // Explicitly setting variant
      sx={{
        '& .MuiInputBase-root': {
          background: 'var(--bg-input)',
          color: 'var(--text-input)',
          borderRadius: '10px', // Slightly rounder for a modern look
          minHeight: '42px',
          fontSize: '0.875rem',
          transition: 'all 0.2s ease-in-out', // Smooth state changes

          '& fieldset': {
            borderColor: 'var(--border-strong)',
            transition: 'border-color 0.2s ease-in-out',
          },
          '&:hover fieldset': {
            borderColor: 'var(--accent-base)',
          },
          '&.Mui-focused': {
            backgroundColor: 'var(--bg-input-focus, var(--bg-input))', // Optional: slight tint on focus
            boxShadow: '0 0 0 4px rgba(var(--accent-rgb), 0.15)', // Soft glow
          },
          '&.Mui-focused fieldset': {
            borderColor: 'var(--accent-base) !important',
            borderWidth: '1px !important',
          },
        },
        '& .MuiInputBase-input': {
          padding: '10px 14px',
          '&::placeholder': {
            opacity: 0.6,
            fontStyle: 'italic', // Subtle stylistic choice
          },
        },
        // Styling the label if you use one
        '& .MuiInputLabel-root': {
          fontSize: '0.85rem',
          color: 'var(--text-muted)',
          '&.Mui-focused': {
            color: 'var(--accent-base)',
          }
        },
        ...sx
      }}
      {...props}
    />
  );
}