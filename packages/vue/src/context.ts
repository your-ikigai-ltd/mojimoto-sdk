import { inject, provide, type App, type InjectionKey, type VNode } from 'vue';
import type { MojimotoClient } from '@mojimoto/client';
import type { MojiLinkResolver, MojiRichTextComponents } from '@mojimoto/richtext';

export interface MojimotoContextValue {
  /** Optional delivery client, consumed by the composables. */
  client?: MojimotoClient;
  /** Default link resolver applied to every link. */
  linkResolver?: MojiLinkResolver;
  /** Default rich-text component overrides. */
  richTextComponents?: MojiRichTextComponents<VNode | string>;
}

export const MojimotoInjectionKey: InjectionKey<MojimotoContextValue> = Symbol('mojimoto');

/** Call inside a component `setup()` to provide Mojimoto context to descendants. */
export function provideMojimoto(value: MojimotoContextValue): void {
  provide(MojimotoInjectionKey, value);
}

/**
 * A Vue plugin so you can `app.use(createMojimoto({ client, linkResolver }))`.
 */
export function createMojimoto(value: MojimotoContextValue) {
  return {
    install(app: App) {
      app.provide(MojimotoInjectionKey, value);
    },
  };
}

export function useMojimotoContext(): MojimotoContextValue {
  return inject(MojimotoInjectionKey, {});
}

/** Returns the client from context, throwing a helpful error if absent. */
export function useMojimotoClient(): MojimotoClient {
  const { client } = useMojimotoContext();
  if (!client) {
    throw new Error('[mojimoto] No client provided. Use app.use(createMojimoto({ client })) or provideMojimoto().');
  }
  return client;
}
