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
    <Box px={{ base: 4, md: 7, xl: 10 }} pb={10} maxW="1540px" mx="auto">
      <BreadcrumbRoot my={5} color="fg.muted" fontSize="11px" letterSpacing="0.08em">
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
      <Box
        p={0}
        m={0}
        minH={280}
        bg="transparent"
      >
        {children}
      </Box>
    </Box>
  );
};
