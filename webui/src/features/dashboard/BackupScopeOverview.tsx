import {
  Box,
  Button,
  Card,
  Flex,
  SimpleGrid,
  Stack,
  Text,
} from "@chakra-ui/react";
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
  <Flex
    align="center"
    gap={2}
    minW={0}
    px={2.5}
    py={2}
    borderRadius="lg"
    bg={excluded ? "rgba(139, 108, 255, 0.09)" : "rgba(97, 184, 255, 0.09)"}
    borderWidth="1px"
    borderColor={
      excluded ? "rgba(139, 108, 255, 0.18)" : "rgba(97, 184, 255, 0.18)"
    }
  >
    <Box color={excluded ? "purple.300" : "blue.300"} flexShrink={0}>
      {excluded ? <FiMinusCircle /> : <FiCheck />}
    </Box>
    <Text fontSize="12px" fontWeight="medium" lineHeight="1.35">
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
    <Card.Root
      borderRadius={{ base: "18px", md: "20px" }}
      data-testid="backup-content-card"
    >
      <Card.Body p={{ base: 4, md: 6 }}>
        <Flex
          align="flex-start"
          justify="space-between"
          gap={4}
          mb={{ base: 4, md: 5 }}
        >
          <Box>
            <Text fontSize={{ base: "19px", md: "22px" }} fontWeight="580">
              {copy.overviewTitle}
            </Text>
            <Text mt={1} fontSize="12px" color="fg.muted">
              {copy.overviewDescription}
            </Text>
          </Box>
          <Text
            fontSize="11px"
            color="fg.muted"
            borderWidth="1px"
            borderColor="border"
            borderRadius="full"
            px={2.5}
            py={1}
            flexShrink={0}
          >
            {copy.planCount(plans.length)}
          </Text>
        </Flex>

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
                  <Box minW={0}>
                    <Text fontSize="14px" fontWeight="semibold" truncate>
                      {plan.id}
                    </Text>
                    <Text fontSize="10px" color="fg.muted" truncate>
                      {plan.repo}
                    </Text>
                  </Box>
                  <Button
                    size="xs"
                    variant="outline"
                    flexShrink={0}
                    onClick={() => editPlan(plan)}
                    data-testid={`edit-backup-content-${plan.id}`}
                  >
                    <FiEdit2 /> {copy.editPlan}
                  </Button>
                </Flex>
                <SimpleGrid columns={{ base: 1, md: 2 }}>
                  <Box
                    p={{ base: 3.5, md: 4 }}
                    borderRightWidth={{ base: "0", md: "1px" }}
                    borderBottomWidth={{ base: "1px", md: "0" }}
                    borderColor="border"
                  >
                    <Text
                      fontSize="11px"
                      color="blue.300"
                      mb={3}
                      fontWeight="semibold"
                    >
                      {copy.backupTitle}
                    </Text>
                    <SimpleGrid
                      columns={{ base: 2, sm: 3, md: 2, xl: 3 }}
                      gap={2}
                    >
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
                  <Box p={{ base: 3.5, md: 4 }}>
                    <Text
                      fontSize="11px"
                      color="purple.300"
                      mb={3}
                      fontWeight="semibold"
                    >
                      {copy.excludeTitle}
                    </Text>
                    <SimpleGrid
                      columns={{ base: 2, sm: 3, md: 2, xl: 3 }}
                      gap={2}
                    >
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
      </Card.Body>
    </Card.Root>
  );
};
