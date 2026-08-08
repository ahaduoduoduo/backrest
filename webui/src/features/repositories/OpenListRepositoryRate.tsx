import { Box, Flex, Text } from "@chakra-ui/react";
import { useEffect, useMemo, useState } from "react";
import { getOpenListUsage, type OpenListUsage } from "../../api/openlist";
import { formatBytes } from "../../lib/formatting";
import * as m from "../../paraglide/messages";

const openListRepositoryName = (uri: string): string | null => {
  const match = uri.match(/\/(?:api\/)?restic\/([^/?#]+)/i);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
};

export const OpenListRepositoryRate = ({ uri }: { uri?: string }) => {
  const repositoryName = useMemo(
    () => (uri ? openListRepositoryName(uri) : null),
    [uri],
  );
  const [usage, setUsage] = useState<OpenListUsage | null>(null);

  useEffect(() => {
    if (!repositoryName) return;
    let disposed = false;
    getOpenListUsage()
      .then((nextUsage) => {
        if (!disposed && nextUsage) setUsage(nextUsage);
      })
      .catch(() => {});
    return () => {
      disposed = true;
    };
  }, [repositoryName]);

  if (!repositoryName || !usage) return null;

  const repositoryUsage = usage.repositories.find(
    (repository) => repository.name === repositoryName,
  );
  const effectiveRate =
    repositoryUsage && repositoryUsage.rate_bytes_per_second > 0
      ? repositoryUsage.rate_bytes_per_second
      : usage.rate_bytes_per_second;

  return (
    <Flex
      align="center"
      justify="space-between"
      gap={4}
      px={4}
      py={3.5}
      border="1px solid"
      borderColor="whiteAlpha.100"
      borderRadius="14px"
      bg="whiteAlpha.025"
      data-testid="openlist-repository-rate"
    >
      <Box>
        <Text fontSize="13px" fontWeight="550">
          {m.dashboard_gateway_rate()}
        </Text>
        <Text mt={1} color="whiteAlpha.450" fontSize="11px">
          OpenList · {repositoryName}
        </Text>
      </Box>
      <Text fontSize="18px" fontWeight="450" fontVariantNumeric="tabular-nums">
        {effectiveRate > 0
          ? `${formatBytes(effectiveRate)}/s`
          : m.dashboard_gateway_unlimited()}
      </Text>
    </Flex>
  );
};
