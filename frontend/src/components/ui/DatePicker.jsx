import { Input as ChakraInput } from "@chakra-ui/react";

export default function DatePicker({ ...props }) {
  return (
    <ChakraInput 
      type="date" 
      size="sm"
      sx={{
        background: 'var(--bg-surface)',
        borderColor: 'var(--border-strong)',
        color: 'var(--text-primary)',
        _placeholder: { color: 'var(--text-tertiary)' },
        _focus: { borderColor: 'var(--accent-base)', boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.1)' }
      }}
      {...props} 
    />
  );
}
