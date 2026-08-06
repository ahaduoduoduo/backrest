import { Box, Card, Flex, SimpleGrid, Stack, Text } from "@chakra-ui/react";
import { FiCheck, FiMinusCircle } from "react-icons/fi";
import type { Plan } from "../../../gen/ts/v1/config_pb";
import {
  EXCLUDE_PRESETS,
  getCustomExcludeRules,
  getCustomPaths,
  getKnownSources,
  getPresetMatchCount,
  localizeScopeText,
  scopeText,
} from "../plans/backupScopeCatalog";

const ScopeRow = ({
  title,
  detail,
  excluded = false,
}: {
  title: string;
  detail?: string;
  excluded?: boolean;
}) => (
  <Flex align="flex-start" gap={2.5}>
    <Box color={excluded ? "purple.300" : "blue.300"} mt="3px" flexShrink={0}>
      {excluded ? <FiMinusCircle /> : <FiCheck />}
    </Box>
    <Box minW={0}>
      <Text fontSize="13px" fontWeight="medium">
        {title}
      </Text>
      {detail && (
        <Text fontSize="11px" color="fg.muted" overflowWrap="anywhere">
          {detail}
        </Text>
      )}
    </Box>
  </Flex>
);

export const BackupScopeOverview = ({ plans }: { plans: Plan[] }) => {
  const copy = scopeText();

  if (plans.length === 0) return null;

  return (
    <Card.Root borderRadius="20px">
      <Card.Body p={{ base: 4, md: 6 }}>
        <Text fontSize="18px" fontWeight="580">
          {copy.overviewTitle}
        </Text>
        <Text mt={1} mb={5} fontSize="12px" color="fg.muted">
          {copy.overviewDescription}
        </Text>

        <Stack gap={4}>
          {plans.map((plan) => {
            const sources = getKnownSources(plan.paths);
            const customPaths = getCustomPaths(plan.paths);
            const activePresets = EXCLUDE_PRESETS.filter(
              (preset) => getPresetMatchCount(preset, plan.excludes) > 0,
            );
            const customRules = [
              ...getCustomExcludeRules(plan.excludes),
              ...plan.iexcludes,
            ];

            return (
              <Box
                key={plan.id}
                borderWidth="1px"
                borderColor="border"
                borderRadius="xl"
                overflow="hidden"
              >
                <Flex
                  px={{ base: 3.5, md: 4 }}
                  py={3}
                  bg="bg.subtle"
                  align="center"
                  justify="space-between"
                  gap={3}
                >
                  <Text fontSize="14px" fontWeight="semibold">
                    {plan.id}
                  </Text>
                  <Text as="code" fontSize="10px" color="fg.muted" truncate>
                    {plan.repo}
                  </Text>
                </Flex>
                <SimpleGrid columns={{ base: 1, md: 2 }}>
                  <Box
                    p={{ base: 3.5, md: 4 }}
                    borderRightWidth={{ base: "0", md: "1px" }}
                    borderBottomWidth={{ base: "1px", md: "0" }}
                    borderColor="border"
                  >
                    <Text fontSize="11px" color="fg.muted" mb={3}>
                      {copy.backupTitle}
                    </Text>
                    <Stack gap={3}>
                      {sources.map((source) => (
                        <ScopeRow
                          key={source.id}
                          title={localizeScopeText(source.title)}
                          detail={localizeScopeText(source.description)}
                        />
                      ))}
                      {customPaths.map((path) => (
                        <ScopeRow
                          key={path}
                          title={copy.customPaths}
                          detail={path}
                        />
                      ))}
                      {sources.length === 0 && customPaths.length === 0 && (
                        <Text fontSize="12px" color="fg.muted">
                          {copy.noSources}
                        </Text>
                      )}
                    </Stack>
                  </Box>
                  <Box p={{ base: 3.5, md: 4 }}>
                    <Text fontSize="11px" color="fg.muted" mb={3}>
                      {copy.excludeTitle}
                    </Text>
                    <Stack gap={3}>
                      {activePresets.map((preset) => {
                        const count = getPresetMatchCount(
                          preset,
                          plan.excludes,
                        );
                        return (
                          <ScopeRow
                            key={preset.id}
                            excluded
                            title={localizeScopeText(preset.title)}
                            detail={
                              count === preset.patterns.length
                                ? localizeScopeText(preset.description)
                                : copy.rules(count, preset.patterns.length)
                            }
                          />
                        );
                      })}
                      {customRules.map((rule, index) => (
                        <ScopeRow
                          key={`${rule}-${index}`}
                          excluded
                          title={copy.customRules}
                          detail={rule}
                        />
                      ))}
                      {activePresets.length === 0 &&
                        customRules.length === 0 && (
                          <Text fontSize="12px" color="fg.muted">
                            {copy.noExcludes}
                          </Text>
                        )}
                    </Stack>
                  </Box>
                </SimpleGrid>
              </Box>
            );
          })}
        </Stack>
      </Card.Body>
    </Card.Root>
  );
};
