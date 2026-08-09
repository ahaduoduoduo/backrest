import { Box } from "@chakra-ui/react";
import React from "react";

interface BreadcrumbItem {
  title: string;
  onClick?: () => void;
}

export const MainContentAreaTemplate = ({
  children,
  fillViewport = false,
}: {
  breadcrumbs: BreadcrumbItem[];
  children: React.ReactNode;
  fillViewport?: boolean;
}) => {
  return (
    <Box
      className={fillViewport ? "console-content-viewport" : undefined}
      px={{ base: 3, sm: 4, md: 7, xl: 10 }}
      pt={{ base: 4, md: 6 }}
      pb={{ base: "112px", md: "88px" }}
      maxW="1680px"
      minW={0}
      mx="auto"
    >
      <Box p={0} m={0} minH={280} bg="transparent">
        {children}
      </Box>
    </Box>
  );
};
