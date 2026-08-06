import { Box } from "@chakra-ui/react";
import {
  BreadcrumbRoot,
  BreadcrumbLink,
  BreadcrumbCurrentLink,
} from "../ui/breadcrumb";
import React from "react";

interface BreadcrumbItem {
  title: string;
  onClick?: () => void;
}

export const MainContentAreaTemplate = ({
  breadcrumbs,
  children,
}: {
  breadcrumbs: BreadcrumbItem[];
  children: React.ReactNode;
}) => {
  return (
    <Box
      px={{ base: 3, sm: 4, md: 7, xl: 10 }}
      pt={{ base: 3, md: 0 }}
      pb={{ base: 6, md: 10 }}
      maxW="1540px"
      minW={0}
      mx="auto"
    >
      <BreadcrumbRoot
        display={{ base: "none", md: "flex" }}
        my={{ base: 3.5, md: 5 }}
        color="fg.muted"
        fontSize="11px"
        letterSpacing="0.08em"
      >
        {breadcrumbs.map((b, i) => {
          const isLast = i === breadcrumbs.length - 1;
          if (isLast) {
            return (
              <BreadcrumbCurrentLink key={i}>{b.title}</BreadcrumbCurrentLink>
            );
          }
          return (
            <BreadcrumbLink
              key={i}
              onClick={b.onClick}
              cursor={b.onClick ? "pointer" : "default"}
              color={b.onClick ? "blue.500" : "inherit"}
            >
              {b.title}
            </BreadcrumbLink>
          );
        })}
      </BreadcrumbRoot>
      <Box p={0} m={0} minH={280} bg="transparent">
        {children}
      </Box>
    </Box>
  );
};
