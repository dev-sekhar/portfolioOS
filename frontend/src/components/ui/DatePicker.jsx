import { Input as ChakraInput } from "@chakra-ui/react";

export default function DatePicker({ ...props }) {
  return <ChakraInput type="date" size="sm" bg="white" {...props} />;
}
