declare module "*.svg" {
  const content: any;
  export default content;
}

declare module "*.css";

declare module "*/paraglide/messages" {
  const messages: any;
  export = messages;
}

declare module "*/paraglide/runtime" {
  export const getLocale: () => string;
  export const setLocale: (
    locale: string,
    options?: { reload?: boolean },
  ) => void;
  export const locales: string[];
}
