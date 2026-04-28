import { Input as ChakraInput } from "@chakra-ui/react";

export default function Input({ ...props }) {
  return <ChakraInput size="sm" bg="white" {...props} />;
}
