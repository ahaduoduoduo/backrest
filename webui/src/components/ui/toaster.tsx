"use client";

import {
  Toaster as ChakraToaster,
  Portal,
  Spinner,
  Stack,
  Toast,
  createToaster,
} from "@chakra-ui/react";

// Toasts sit above dialogs, so they must not cover dialog footers where the
// primary actions (Submit/Save) live; top-end keeps them clear of those.
export const toaster = createToaster({
  placement: "top-end",
  pauseOnPageIdle: true,
});

export const Toaster = () => {
  return (
    <Portal>
      <ChakraToaster toaster={toaster}>
        {(toast: any) => (
          <Toast.Root
            data-testid="app-toast"
            width={{ base: "calc(100vw - 24px)", md: "500px" }}
            maxWidth="calc(100vw - 24px)"
            minWidth={0}
            alignItems="flex-start"
            overflow="hidden"
          >
            {toast.type === "loading" ? (
              <Spinner size="sm" color="blue.solid" flexShrink={0} />
            ) : (
              // @ts-ignore
              <Toast.Indicator flexShrink={0} mt="0.5" />
            )}
            <Stack
              gap="1"
              flex="1"
              minWidth={0}
              maxWidth="100%"
              maxHeight={{ base: "52vh", md: "420px" }}
              overflowY="auto"
              userSelect="text"
            >
              {toast.title && (
                // @ts-ignore
                <Toast.Title
                  userSelect="text"
                  whiteSpace="pre-wrap"
                  overflowWrap="anywhere"
                  wordBreak="break-word"
                  lineHeight="1.45"
                >
                  {toast.title}
                </Toast.Title>
              )}
              {toast.description && (
                // @ts-ignore
                <Toast.Description
                  userSelect="text"
                  whiteSpace="pre-wrap"
                  overflowWrap="anywhere"
                  wordBreak="break-word"
                >
                  {toast.description}
                </Toast.Description>
              )}
            </Stack>
            {toast.action && (
              // @ts-ignore
              <Toast.ActionTrigger flexShrink={0}>
                {toast.action.label}
              </Toast.ActionTrigger>
            )}
            {/* @ts-ignore */}
            <Toast.CloseTrigger flexShrink={0} />
          </Toast.Root>
        )}
      </ChakraToaster>
    </Portal>
  );
};
