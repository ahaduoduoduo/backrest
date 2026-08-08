import { Box, Card, Flex, SimpleGrid, Text } from "@chakra-ui/react";
import type { OpenListUsage } from "../../api/openlist";
import { formatBytes } from "../../lib/formatting";
import * as m from "../../paraglide/messages";

export const GatewayUsageCard = ({
  usage,
}: {
  usage: OpenListUsage | null;
}) => {
  if (!usage) return null;

  return (
    <Card.Root borderRadius={{ base: "20px", md: "24px" }} overflow="hidden">
      <Card.Body p={0}>
        <Flex
          align="center"
          justify="space-between"
          px={{ base: 4, md: 6 }}
          py={{ base: 3.5, md: 4 }}
        >
          <Box>
            <Text fontSize="11px" color="whiteAlpha.500" letterSpacing="0.14em">
              OPENLIST
            </Text>
            <Text mt={1} fontSize="14px" fontWeight="520">
              {m.dashboard_gateway_title()}
            </Text>
          </Box>
          <Box
            w="9px"
            h="9px"
            borderRadius="full"
            bg="#72d7b1"
            boxShadow="0 0 18px #72d7b1"
          />
        </Flex>
        <SimpleGrid
          columns={3}
          borderTopWidth="1px"
          borderColor="whiteAlpha.100"
        >
          <Box p={{ base: 3.5, md: 5 }}>
            <UsageMetric
              label={m.dashboard_gateway_today()}
              used={usage.day_bytes}
              limit={usage.day_limit}
            />
          </Box>
          <Box
            p={{ base: 3.5, md: 5 }}
            borderLeftWidth="1px"
            borderColor="whiteAlpha.100"
          >
            <UsageMetric
              label={m.dashboard_gateway_month()}
              used={usage.month_bytes}
              limit={usage.month_limit}
            />
          </Box>
          <Box
            p={{ base: 3.5, md: 5 }}
            borderLeftWidth="1px"
            borderColor="whiteAlpha.100"
          >
            <Text color="whiteAlpha.500" fontSize="11px" letterSpacing="0.1em">
              {m.dashboard_gateway_rate()}
            </Text>
            <Text
              mt={{ base: 1.5, md: 2 }}
              fontSize={{ base: "15px", sm: "18px", md: "24px" }}
              fontWeight="450"
              fontVariantNumeric="tabular-nums"
            >
              {usage.rate_bytes_per_second > 0
                ? `${formatBytes(usage.rate_bytes_per_second)}/s`
                : m.dashboard_gateway_unlimited()}
            </Text>
          </Box>
        </SimpleGrid>
      </Card.Body>
    </Card.Root>
  );
};

const UsageMetric = ({
  label,
  used,
  limit,
}: {
  label: string;
  used: number;
  limit: number;
}) => {
  const percent = limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
  return (
    <Box>
      <Text color="whiteAlpha.500" fontSize="11px" letterSpacing="0.1em">
        {label}
      </Text>
      <Text
        mt={{ base: 1.5, md: 2 }}
        fontSize={{ base: "15px", sm: "18px", md: "24px" }}
        fontWeight="450"
        fontVariantNumeric="tabular-nums"
      >
        {formatBytes(used)}
      </Text>
      <Flex mt={2} align="center" gap={{ base: 1.5, md: 3 }}>
        <Box
          flex={1}
          h="3px"
          bg="whiteAlpha.100"
          borderRadius="full"
          overflow="hidden"
        >
          <Box
            h="full"
            width={`${percent}%`}
            bg="rgba(224, 228, 234, 0.62)"
            borderRadius="full"
          />
        </Box>
        <Text
          color="whiteAlpha.400"
          fontSize="10px"
          minW={0}
          display={{ base: "none", sm: "block" }}
          textAlign="right"
        >
          {limit > 0 ? formatBytes(limit) : m.dashboard_gateway_unlimited()}
        </Text>
      </Flex>
    </Box>
  );
};
