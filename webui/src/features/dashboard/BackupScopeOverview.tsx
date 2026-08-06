import { Box, Button, Flex, SimpleGrid, Stack, Text } from "@chakra-ui/react";
import { FiCheck, FiEdit2, FiMinusCircle } from "react-icons/fi";
import type { Plan } from "../../../gen/ts/v1/config_pb";
import { useShowModal } from "../../components/common/ModalManager";
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
  excluded = false,
}: {
  title: string;
  excluded?: boolean;
}) => (
  <Flex align="center" gap={2} minW={0} py={1.5}>
    <Box color={excluded ? "purple.300" : "blue.300"} flexShrink={0}>
      {excluded ? <FiMinusCircle /> : <FiCheck />}
    </Box>
    <Text fontSize="12px" fontWeight="450" lineHeight="1.35">
      {title}
    </Text>
  </Flex>
);

export const BackupScopeOverview = ({ plans }: { plans: Plan[] }) => {
  const copy = scopeText();
  const showModal = useShowModal();

  if (plans.length === 0) return null;

  const editPlan = async (plan: Plan) => {
    const { AddPlanModal } = await import("../plans/AddPlanModal");
    showModal(<AddPlanModal template={plan} />);
  };

  return (
    <Box
      position="relative"
      overflow="hidden"
      borderRadius={{ base: "24px", md: "30px" }}
      borderWidth="1px"
      borderColor="whiteAlpha.100"
      bg="#0a0b0f"
      data-testid="backup-content-card"
    >
      <Box
        position="absolute"
        top="-45%"
        right="-12%"
        width={{ base: "320px", md: "560px" }}
        height={{ base: "320px", md: "560px" }}
        borderRadius="full"
        bg="radial-gradient(circle, rgba(75, 126, 255, 0.16), rgba(95, 72, 255, 0.07) 38%, transparent 68%)"
        filter="blur(4px)"
        pointerEvents="none"
      />
      <Box position="relative" p={{ base: 5, md: 8 }}>
        <Flex
          align="flex-end"
          justify="space-between"
          gap={4}
          pb={{ base: 5, md: 7 }}
        >
          <Box>
            <Text
              color="blue.300"
              fontSize="10px"
              fontFamily="mono"
              letterSpacing="0.16em"
            >
              CONTENT / OFFSITE
            </Text>
            <Text
              mt={2}
              fontSize={{ base: "36px", md: "52px" }}
              fontWeight="400"
              lineHeight="1"
              letterSpacing="-0.055em"
            >
              {copy.overviewTitle}
            </Text>
            <Text mt={2} fontSize="12px" color="fg.muted">
              {copy.overviewDescription}
            </Text>
          </Box>
          <Box textAlign="right" flexShrink={0}>
            <Text
              fontSize={{ base: "42px", md: "58px" }}
              fontWeight="300"
              lineHeight="0.85"
              letterSpacing="-0.06em"
              fontVariantNumeric="tabular-nums"
            >
              {String(plans.length).padStart(2, "0")}
            </Text>
            <Text mt={2} fontSize="9px" color="fg.muted" letterSpacing="0.12em">
              PLANS
            </Text>
          </Box>
        </Flex>

        <Stack gap={0} borderTopWidth="1px" borderColor="whiteAlpha.150">
          {plans.map((plan, planIndex) => {
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
                py={{ base: 5, md: 6 }}
                borderBottomWidth="1px"
                borderColor="whiteAlpha.150"
              >
                <Flex
                  align="center"
                  justify="space-between"
                  gap={3}
                  mb={{ base: 4, md: 5 }}
                >
                  <Flex align="center" gap={3} minW={0}>
                    <Text
                      color="whiteAlpha.350"
                      fontSize="10px"
                      fontFamily="mono"
                      flexShrink={0}
                    >
                      {String(planIndex + 1).padStart(2, "0")}
                    </Text>
                    <Box minW={0}>
                      <Text
                        fontSize={{ base: "18px", md: "20px" }}
                        fontWeight="500"
                        letterSpacing="-0.025em"
                        truncate
                      >
                        {plan.id}
                      </Text>
                      <Text fontSize="10px" color="fg.muted" truncate>
                        {plan.repo}
                      </Text>
                    </Box>
                  </Flex>
                  <Button
                    size="xs"
                    variant="ghost"
                    flexShrink={0}
                    onClick={() => editPlan(plan)}
                    data-testid={`edit-backup-content-${plan.id}`}
                  >
                    <FiEdit2 /> {copy.editPlan}
                  </Button>
                </Flex>
                <SimpleGrid
                  columns={{ base: 1, md: 2 }}
                  gap={{ base: 5, md: 8 }}
                >
                  <Box
                    pl={{ base: 0, md: 8 }}
                    borderLeftWidth={{ base: "0", md: "1px" }}
                    borderColor="whiteAlpha.100"
                  >
                    <Text
                      fontSize="11px"
                      color="blue.300"
                      mb={3}
                      fontWeight="semibold"
                    >
                      {copy.backupTitle}
                    </Text>
                    <SimpleGrid columns={{ base: 2, sm: 3 }} columnGap={4}>
                      {sources.map((source) => (
                        <ScopeRow
                          key={source.id}
                          title={localizeScopeText(source.title)}
                        />
                      ))}
                      {customPaths.map((path) => (
                        <ScopeRow key={path} title={copy.customPaths} />
                      ))}
                      {sources.length === 0 && customPaths.length === 0 && (
                        <Text fontSize="12px" color="fg.muted">
                          {copy.noSources}
                        </Text>
                      )}
                    </SimpleGrid>
                  </Box>
                  <Box
                    pl={{ base: 0, md: 8 }}
                    borderLeftWidth={{ base: "0", md: "1px" }}
                    borderColor="whiteAlpha.100"
                  >
                    <Text
                      fontSize="11px"
                      color="purple.300"
                      mb={3}
                      fontWeight="semibold"
                    >
                      {copy.excludeTitle}
                    </Text>
                    <SimpleGrid columns={{ base: 2, sm: 3 }} columnGap={4}>
                      {activePresets.map((preset) => {
                        return (
                          <ScopeRow
                            key={preset.id}
                            excluded
                            title={localizeScopeText(preset.title)}
                          />
                        );
                      })}
                      {customRules.map((rule, index) => (
                        <ScopeRow
                          key={`${rule}-${index}`}
                          excluded
                          title={copy.customRules}
                        />
                      ))}
                      {activePresets.length === 0 &&
                        customRules.length === 0 && (
                          <Text fontSize="12px" color="fg.muted">
                            {copy.noExcludes}
                          </Text>
                        )}
                    </SimpleGrid>
                  </Box>
                </SimpleGrid>
              </Box>
            );
          })}
        </Stack>
      </Box>
    </Box>
  );
};
