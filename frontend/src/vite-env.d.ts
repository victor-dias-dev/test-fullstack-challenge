/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string
  /** Sem Kong: http://localhost:4001 */
  readonly VITE_GAMES_URL?: string
  /** Sem Kong: http://localhost:4002 */
  readonly VITE_WALLETS_URL?: string
  readonly VITE_SOCKET_URL: string
  readonly VITE_KEYCLOAK_URL: string
  readonly VITE_KEYCLOAK_REALM: string
  readonly VITE_KEYCLOAK_CLIENT_ID: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
