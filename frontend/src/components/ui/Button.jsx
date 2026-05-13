import { Button as MUIButton } from "@mui/material";

export default function Button({ children, variant = "contained", ...props }) {
  // MUI variant defaults to "contained", we handle "outline" -> "outlined"
  const muiVariant = variant === "outline" ? "outlined" : variant;
  return (
    <MUIButton variant={muiVariant} size="small" {...props}>
      {children}
    </MUIButton>
  );
}
