import * as React from 'react';
import type { ReactNode } from 'react';
import type { MojimotoClient } from '@mojimoto/client';
import type { MojiLinkResolver, MojiRichTextComponents } from '@mojimoto/richtext';

export interface MojimotoContextValue {
  /** Optional delivery client, consumed by the client-side hooks. */
  client?: MojimotoClient;
  /** Default link resolver applied to every `<MojiLink>` / rich-text link. */
  linkResolver?: MojiLinkResolver;
  /** Default rich-text component overrides, merged under per-call `components`. */
  richTextComponents?: MojiRichTextComponents<ReactNode>;
}

// Server Components get a React build without context, so components fall back to their props there.
const MojimotoContext = React.createContext ? React.createContext<MojimotoContextValue>({}) : null;

export interface MojimotoProviderProps extends MojimotoContextValue {
  children: ReactNode;
}

/**
 * Provides a delivery client, a link resolver, and default rich-text component
 * overrides to descendant Mojimoto components. Optional — components work
 * standalone with explicit props too.
 *
 * ```tsx
 * <MojimotoProvider client={cms} linkResolver={(l) => `/${l.uid}`}>
 *   <App />
 * </MojimotoProvider>
 * ```
 */
export function MojimotoProvider({ children, ...value }: MojimotoProviderProps) {
  if (!MojimotoContext) {
    throw new Error('MojimotoProvider needs a client component. Add "use client" to the file that renders it.');
  }

  return <MojimotoContext.Provider value={value}>{children}</MojimotoContext.Provider>;
}

export function useMojimotoContext(): MojimotoContextValue {
  return MojimotoContext ? React.useContext(MojimotoContext) : {};
}

/** Returns the client from context, throwing a helpful error if absent. */
export function useMojimotoClient(): MojimotoClient {
  const { client } = useMojimotoContext();
  if (!client) {
    throw new Error('[mojimoto] No client in context. Wrap your tree in <MojimotoProvider client={...}>.');
  }
  return client;
}
