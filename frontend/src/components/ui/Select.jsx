import { Select as ChakraSelect } from "@chakra-ui/react";

export default function Select({ children, ...props }) {
  return (
    <ChakraSelect size="sm" bg="white" {...props}>
      {children}
    </ChakraSelect>
  );
}
