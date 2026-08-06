import { Box, Flex, Text } from "@chakra-ui/react";
import { motion } from "framer-motion";
import { formatBytes } from "../../lib/formatting";

interface BackupHeroProps {
  title: string;
  state: "ok" | "warn" | "err" | "run" | "idle";
  protectedBytes: number;
  bytesAdded30Days: number;
  planCount: number;
  lastBackup: string;
  nextBackup?: string | null;
  protectedLabel: string;
  addedLabel: string;
  plansLabel: string;
}

const stateColor: Record<BackupHeroProps["state"], string> = {
  ok: "#72d7b1",
  warn: "#ffbd66",
  err: "#ff6f7d",
  run: "#61b8ff",
  idle: "#858b99",
};

export const BackupHero = ({
  title,
  state,
  protectedBytes,
  bytesAdded30Days,
  planCount,
  lastBackup,
  nextBackup,
  protectedLabel,
  addedLabel,
  plansLabel,
}: BackupHeroProps) => {
  const color = stateColor[state];

  return (
    <Box
      position="relative"
      minH={{ base: "320px", md: "390px", lg: "430px" }}
      border="1px solid"
      borderColor="whiteAlpha.100"
      borderRadius={{ base: "24px", lg: "30px" }}
      bg="#090a0e"
      overflow="hidden"
      isolation="isolate"
    >
      <Box
        position="absolute"
        inset="0"
        bg="radial-gradient(circle at 54% 58%, rgba(111, 76, 255, 0.30), transparent 28%), radial-gradient(circle at 25% 78%, rgba(75, 165, 255, 0.24), transparent 30%)"
        filter="blur(8px)"
      />
      <Box position="absolute" inset="0" display="block">
        <svg
          viewBox="0 0 1200 430"
          preserveAspectRatio="none"
          style={{
            width: "100%",
            height: "100%",
            opacity: 0.86,
          }}
        >
          <defs>
            <linearGradient id="hero-line" x1="0" x2="1">
              <stop offset="0" stopColor="#6ab8ff" />
              <stop offset="0.55" stopColor="#8f72ff" />
              <stop offset="1" stopColor="#4f5bff" />
            </linearGradient>
            <linearGradient id="hero-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#826bff" stopOpacity="0.28" />
              <stop offset="1" stopColor="#090a0e" stopOpacity="0" />
            </linearGradient>
            <filter id="hero-glow">
              <feGaussianBlur stdDeviation="18" />
            </filter>
          </defs>
          <path
            d="M0 365 C155 288 275 306 390 350 C515 398 610 362 660 248 C708 140 772 147 868 215 C965 286 1050 337 1200 324 L1200 430 L0 430 Z"
            fill="url(#hero-fill)"
          />
          <path
            d="M0 365 C155 288 275 306 390 350 C515 398 610 362 660 248 C708 140 772 147 868 215 C965 286 1050 337 1200 324"
            fill="none"
            stroke="url(#hero-line)"
            strokeWidth="30"
            opacity="0.28"
            filter="url(#hero-glow)"
          />
          <path
            d="M0 365 C155 288 275 306 390 350 C515 398 610 362 660 248 C708 140 772 147 868 215 C965 286 1050 337 1200 324"
            fill="none"
            stroke="url(#hero-line)"
            strokeWidth="1.5"
          />
        </svg>
      </Box>

      <Flex
        position="relative"
        zIndex={1}
        minH="inherit"
        direction="column"
        p={0}
      >
        <Box p={{ base: 5, md: 8, lg: 9 }}>
          <Flex align="center" gap={2.5} mb={{ base: 3, md: 5 }}>
            <motion.div
              animate={state === "run" ? { opacity: [1, 0.35, 1] } : {}}
              transition={{ duration: 1.5, repeat: Infinity }}
              style={{
                width: 8,
                height: 8,
                borderRadius: 8,
                background: color,
              }}
            />
            <Text
              color={color}
              fontSize="12px"
              fontWeight="650"
              letterSpacing="0.08em"
            >
              {title}
            </Text>
          </Flex>
          <Text
            color="whiteAlpha.600"
            fontSize="11px"
            fontWeight="600"
            letterSpacing="0.14em"
            textTransform="uppercase"
          >
            {protectedLabel}
          </Text>
          <Text
            mt={1}
            fontSize={{ base: "62px", md: "88px", xl: "106px" }}
            fontWeight="300"
            lineHeight="0.98"
            letterSpacing="-0.065em"
            fontVariantNumeric="tabular-nums"
          >
            {protectedBytes > 0 ? formatBytes(protectedBytes) : "0 B"}
          </Text>
          <Text
            mt={{ base: 2, md: 4 }}
            color="whiteAlpha.600"
            fontSize="12px"
            lineHeight="1.5"
          >
            {lastBackup}
            {nextBackup ? ` · ${nextBackup}` : ""}
          </Text>
        </Box>

        <Flex
          mt="auto"
          borderTopWidth="1px"
          borderColor="whiteAlpha.100"
          bg="rgba(7, 8, 11, 0.52)"
          backdropFilter="blur(12px)"
        >
          <Box flex={1} p={{ base: 4, md: 5 }}>
            <Metric
              label={plansLabel}
              value={String(planCount).padStart(2, "0")}
            />
          </Box>
          <Box
            flex={1}
            p={{ base: 4, md: 5 }}
            borderLeftWidth="1px"
            borderColor="whiteAlpha.100"
          >
            <Metric
              label={addedLabel}
              value={
                bytesAdded30Days > 0 ? formatBytes(bytesAdded30Days) : "0 B"
              }
            />
          </Box>
        </Flex>
      </Flex>
    </Box>
  );
};

const Metric = ({ label, value }: { label: string; value: string }) => (
  <Box>
    <Text
      color="whiteAlpha.500"
      fontSize="10px"
      fontWeight="650"
      letterSpacing="0.12em"
    >
      {label.toUpperCase()}
    </Text>
    <Text
      mt={1}
      fontSize={{ base: "17px", md: "20px" }}
      fontWeight="450"
      fontVariantNumeric="tabular-nums"
    >
      {value}
    </Text>
  </Box>
);
