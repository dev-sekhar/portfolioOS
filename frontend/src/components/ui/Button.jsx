import { Button as ChakraButton } from "@chakra-ui/react";

export default function Button({ children, ...props }) {
  return (
    <ChakraButton colorScheme="blue" size="sm" {...props}>
      {children}
    </ChakraButton>
  );
}
