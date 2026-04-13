import { Button } from "@chakra-ui/react";

export default function AppButton({
  children,
  variant = "solid",
  colorScheme = "cyan",
  size = "md",
  className = "",
  ...props
}) {
  return (
    <Button
      variant={variant}
      colorScheme={colorScheme}
      size={size}
      className={`rounded-xl font-semibold shadow-sm transition hover:-translate-y-px ${className}`}
      {...props}
    >
      {children}
    </Button>
  );
}
