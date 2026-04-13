import { Checkbox } from "@chakra-ui/react";

export default function AppCheckbox({ children, className = "", ...props }) {
  return (
    <Checkbox className={`text-slate-700 ${className}`} colorScheme="cyan" {...props}>
      {children}
    </Checkbox>
  );
}
