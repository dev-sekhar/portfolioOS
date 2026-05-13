import { Box, Typography } from "@mui/material";

export default function Card({ title, subtitle, actions, className = "", children }) {
  return (
    <Box
      className={`mb-0 rounded-3xl border backdrop-blur ${className}`}
      sx={{
        borderColor: "var(--border-subtle)",
        background: "var(--glass-bg)",
        boxShadow: "var(--shadow-card)",
        padding: { xs: "16px", md: "22px" }
      }}
    >
      {(title || subtitle || actions) && (
        <Box className="mb-4 flex flex-wrap items-start justify-between gap-3" sx={{ borderBottom: "1px solid var(--border-subtle)", paddingBottom: "12px", marginBottom: "16px" }}>
          <Box>
            {title ? (
              <Typography variant="h6" component="h3" sx={{ color: "var(--text-primary)", fontFamily: "var(--font-display)", fontWeight: "bold" }}>
                {title}
              </Typography>
            ) : null}
            {subtitle ? <Typography className="mt-1 text-sm" sx={{ color: "var(--text-secondary)" }}>{subtitle}</Typography> : null}
          </Box>
          {actions ? <Box>{actions}</Box> : null}
        </Box>
      )}
      {children}
    </Box>
  );
}