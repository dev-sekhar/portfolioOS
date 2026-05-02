import { Select as ChakraSelect } from "@chakra-ui/react";

export default function Select({ children, ...props }) {
  return (
    <ChakraSelect 
      size="sm"
      style={{
        backgroundColor: 'var(--bg-surface)',
        color: 'var(--text-primary)',
        borderColor: 'var(--border-strong)',
        background: 'var(--bg-surface)'
      }}
      sx={{
        background: 'var(--bg-surface) !important',
        borderColor: 'var(--border-strong)',
        color: 'var(--text-primary)',
        minHeight: '38px',
        _placeholder: { color: 'var(--text-tertiary)' },
        _focus: { borderColor: 'var(--accent-base)', boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.1)' },
        option: {
          background: 'var(--bg-surface)',
          color: 'var(--text-primary)',
          _hover: { background: 'var(--bg-surface-hover)' },
          _selected: { background: 'rgba(59, 130, 246, 0.3)', color: 'var(--text-primary)' }
        }
      }}
      {...props}
    >
      {children}
    </ChakraSelect>
  );
}
