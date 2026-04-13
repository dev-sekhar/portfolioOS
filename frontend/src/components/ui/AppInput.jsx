import { FormControl, FormLabel, Input } from "@chakra-ui/react";

export default function AppInput({ label, className = "", ...props }) {
  return (
    <FormControl className={className}>
      {label ? (
        <FormLabel className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
          {label}
        </FormLabel>
      ) : null}
      <Input
        className="rounded-xl border-slate-200 bg-white/80"
        focusBorderColor="cyan.400"
        {...props}
      />
    </FormControl>
  );
}
