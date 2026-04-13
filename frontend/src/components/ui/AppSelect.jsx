import { FormControl, FormLabel, Select } from "@chakra-ui/react";

export default function AppSelect({ label, options, className = "", ...props }) {
  return (
    <FormControl className={className}>
      {label ? (
        <FormLabel className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
          {label}
        </FormLabel>
      ) : null}
      <Select
        className="rounded-xl border-slate-200 bg-white/80"
        focusBorderColor="cyan.400"
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>
    </FormControl>
  );
}
