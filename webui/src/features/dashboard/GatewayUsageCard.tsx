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
    <Card.Root borderRadius="20px">
      <Card.Body p={{ base: 5, md: 6 }}>
        <Flex align="center" justify="space-between" mb={{ base: 4, md: 5 }}>
          <Box>
            <Text fontSize="11px" color="whiteAlpha.500" letterSpacing="0.14em">
              OPENLIST
            </Text>
            <Text mt={1} fontSize="18px" fontWeight="580">
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
        <SimpleGrid columns={{ base: 1, md: 3 }} gap={{ base: 6, md: 8 }}>
          <UsageMetric
            label={m.dashboard_gateway_today()}
            used={usage.day_bytes}
            limit={usage.day_limit}
          />
          <UsageMetric
            label={m.dashboard_gateway_month()}
            used={usage.month_bytes}
            limit={usage.month_limit}
          />
          <Box>
            <Text color="whiteAlpha.500" fontSize="11px" letterSpacing="0.1em">
              {m.dashboard_gateway_rate()}
            </Text>
            <Text
              mt={2}
              fontSize="24px"
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
        mt={2}
        fontSize="24px"
        fontWeight="450"
        fontVariantNumeric="tabular-nums"
      >
        {formatBytes(used)}
      </Text>
      <Flex mt={2} align="center" gap={3}>
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
            bg="linear-gradient(90deg, #61b8ff, #8b6cff)"
            borderRadius="full"
          />
        </Box>
        <Text
          color="whiteAlpha.400"
          fontSize="10px"
          minW="72px"
          textAlign="right"
        >
          {limit > 0 ? formatBytes(limit) : m.dashboard_gateway_unlimited()}
        </Text>
      </Flex>
    </Box>
  );
};
