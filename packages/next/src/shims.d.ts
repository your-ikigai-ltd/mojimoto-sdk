// Minimal ambient declarations for the Next.js APIs this package lazily imports.
// The real types come from the consumer's installed `next` (a peer dependency);
// these keep the package buildable in isolation.
declare module 'next/headers' {
  export function draftMode(): Promise<{
    isEnabled: boolean;
    enable(): void;
    disable(): void;
  }>;
}

declare module 'next/navigation' {
  export function redirect(url: string): never;
  export function notFound(): never;
}
