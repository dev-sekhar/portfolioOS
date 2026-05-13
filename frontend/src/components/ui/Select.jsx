import { Select as MUISelect } from "@mui/material";

export default function Select({ children, sx, ...props }) {
  return (
    <MUISelect 
      size="small"
      native={true}
      sx={{
        color: 'var(--text-input)',
        borderRadius: '8px',
        minHeight: '40px',
        fontSize: '0.9rem',
        '& .MuiSelect-select': {
          padding: '8px 12px',
          background: 'var(--bg-input)',
          borderRadius: '8px',
        },
        '& fieldset': {
          borderColor: 'var(--border-strong) !important',
        },
        '&:hover fieldset': {
          borderColor: 'var(--accent-base) !important',
        },
        '&.Mui-focused fieldset': {
          borderColor: 'var(--accent-base) !important',
        },
        ...sx
      }}
      {...props}
    >
      {children}
    </MUISelect>
  );
}
