import { TextField } from "@mui/material";

export default function DatePicker({ sx, ...props }) {
  return (
    <TextField
      type="date"
      size="small"
      sx={{
        '& .MuiInputBase-root': {
          background: 'var(--bg-input)',
          color: 'var(--text-input)',
          borderRadius: '8px',
          minHeight: '40px',
          fontSize: '0.9rem',
          '& fieldset': {
            borderColor: 'var(--border-strong)',
          },
          '&:hover fieldset': {
            borderColor: 'var(--accent-base)',
          },
          '&.Mui-focused fieldset': {
            borderColor: 'var(--accent-base)',
          },
        },
        '& .MuiInputBase-input': {
          padding: '8px 12px',
        },
        ...sx
      }}
      {...props} 
    />
  );
}
