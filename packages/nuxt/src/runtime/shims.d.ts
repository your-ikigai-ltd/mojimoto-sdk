// `#imports` is a Nuxt virtual module resolved at the consumer's build time.
// These loose declarations let the module build standalone; real types are
// provided by Nuxt in the consuming app.
declare module '#imports' {
  export interface NuxtAppLike {
    vueApp: { use: (plugin: unknown) => void };
    [key: string]: unknown;
  }
  export const defineNuxtPlugin: <T>(plugin: (nuxtApp: NuxtAppLike) => T) => unknown;
  export const useRuntimeConfig: () => { public: Record<string, unknown> } & Record<string, unknown>;
  export const useCookie: (name: string) => { value: string | null | undefined };
  export const useNuxtApp: () => Record<string, unknown> & { $mojimoto?: unknown };
  export const useAsyncData: <T>(
    key: string,
    handler: () => Promise<T>,
  ) => Promise<{ data: { value: T | null }; pending: { value: boolean }; error: { value: Error | null } }>;
}
