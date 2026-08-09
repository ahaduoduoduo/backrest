import { Box, Flex, Stack, Text } from "@chakra-ui/react";
import { FiCheck, FiFolder, FiSlash } from "react-icons/fi";
import {
  AccordionItem,
  AccordionItemContent,
  AccordionItemTrigger,
  AccordionRoot,
} from "../../components/ui/accordion";
import { DynamicList } from "../../components/common/DynamicList";
import { ToggleField } from "../../components/common/ToggleField";
import * as m from "../../paraglide/messages";
import {
  EXCLUDE_PRESETS,
  getPresetMatchCount,
  localizeScopeText,
  scopeText,
} from "./backupScopeCatalog";

interface BackupScopeEditorProps {
  paths: string[];
  excludes: string[];
  iexcludes: string[];
  onPathsChange: (paths: string[]) => void;
  onExcludesChange: (excludes: string[]) => void;
  onIexcludesChange: (iexcludes: string[]) => void;
}

export const BackupScopeEditor = ({
  paths,
  excludes,
  iexcludes,
  onPathsChange,
  onExcludesChange,
  onIexcludesChange,
}: BackupScopeEditorProps) => {
  const copy = scopeText();

  const updatePreset = (patterns: string[], checked: boolean) => {
    const patternSet = new Set(patterns);
    onExcludesChange(
      checked
        ? Array.from(new Set([...excludes, ...patterns]))
        : excludes.filter((rule) => !patternSet.has(rule)),
    );
  };

  return (
    <Stack gap={6}>
      <Box>
        <Flex align="center" gap={2} mb={1}>
          <FiFolder />
          <Text fontSize="sm" fontWeight="semibold">
            {copy.backupTitle}
          </Text>
        </Flex>
        <Text fontSize="xs" color="fg.muted" mb={3}>
          {copy.backupDescription}
        </Text>
        <DynamicList
          label={m.add_plan_modal_field_paths()}
          tooltip={m.add_plan_modal_field_paths_tooltip()}
          items={paths}
          onUpdate={onPathsChange}
          required
          autocompleteType="uri"
          placeholder={m.add_plan_modal_field_paths()}
          testId="add-plan-path"
        />
      </Box>

      <Box>
        <Flex align="center" gap={2} mb={1}>
          <FiSlash />
          <Text fontSize="sm" fontWeight="semibold">
            {copy.excludeTitle}
          </Text>
        </Flex>
        <Text fontSize="xs" color="fg.muted" mb={3}>
          {copy.excludeDescription}
        </Text>
        <Stack gap={2.5}>
          {EXCLUDE_PRESETS.map((preset) => {
            const matchCount = getPresetMatchCount(preset, excludes);
            const checked = matchCount === preset.patterns.length;
            return (
              <Box
                className="backup-scope-preset"
                key={preset.id}
                borderWidth="1px"
                data-active={matchCount > 0 || undefined}
                p={{ base: 3.5, md: 4 }}
              >
                <Flex align="flex-start" gap={3}>
                  <Box flex={1} minW={0}>
                    <ToggleField
                      checked={checked}
                      onChange={(value) => updatePreset(preset.patterns, value)}
                      testId={`exclude-preset-${preset.id}`}
                      label={localizeScopeText(preset.title)}
                      hint={localizeScopeText(preset.description)}
                    />
                  </Box>
                  <Flex
                    align="center"
                    gap={1}
                    color={matchCount > 0 ? "#8fd1f5" : "fg.muted"}
                    fontSize="11px"
                    flexShrink={0}
                    display={{ base: "none", sm: "flex" }}
                  >
                    {matchCount > 0 && <FiCheck />}
                    {checked
                      ? copy.excluded
                      : matchCount > 0
                        ? copy.rules(matchCount, preset.patterns.length)
                        : copy.included}
                  </Flex>
                </Flex>
              </Box>
            );
          })}
        </Stack>
      </Box>

      <AccordionRoot collapsible variant="plain">
        <AccordionItem value="advanced-scope">
          <AccordionItemTrigger
            px={0}
            py={2}
            data-testid="backup-scope-advanced-trigger"
          >
            <Box>
              <Text fontSize="sm" fontWeight="semibold">
                {copy.advancedTitle}
              </Text>
              <Text fontSize="xs" color="fg.muted">
                {copy.advancedDescription}
              </Text>
            </Box>
          </AccordionItemTrigger>
          <AccordionItemContent px={0} pt={3}>
            <Stack gap={4}>
              <DynamicList
                label={m.add_plan_modal_field_excludes()}
                items={excludes}
                onUpdate={onExcludesChange}
                placeholder={m.add_plan_modal_field_excludes()}
              />
              <DynamicList
                label={m.add_plan_modal_field_iexcludes()}
                items={iexcludes}
                onUpdate={onIexcludesChange}
                placeholder={m.add_plan_modal_field_iexcludes()}
              />
            </Stack>
          </AccordionItemContent>
        </AccordionItem>
      </AccordionRoot>
    </Stack>
  );
};
