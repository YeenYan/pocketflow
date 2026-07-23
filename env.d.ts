/// <reference types="vite/client" />

interface ImportMetaEnv {
	readonly VITE_FIREBASE_VAPID_KEY?: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<object, object, unknown>
  export default component
}

declare module 'virtual:pwa-register' {
  export function registerSW(options?: {
    onNeedRefresh?: () => void
    onOfflineReady?: () => void
  }): (reloadPage?: boolean) => Promise<void>
}

interface Window {
  __pwaUpdateSW?: (reloadPage?: boolean) => Promise<void>
}
