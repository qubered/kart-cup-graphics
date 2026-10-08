import http from 'node:http'
import type { AddressInfo } from 'node:net'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { indexCatalog, type Catalog } from '../shared/catalog'
import { StateStore } from './store'
import { createHttpHandler } from './http'
import { attachSockets } from './ws'

export interface StartOpts {
  port: number; dataDir: string; assetsDir: string; distDir: string; dev: boolean; fresh?: boolean; catalog?: Catalog
}

export async function startServer(opts: StartOpts): Promise<{ port: number; store: StateStore; close(): Promise<void> }> {
  let catalog = opts.catalog
  if (!catalog) {
    const p = join(opts.assetsDir, 'catalog.json')
    if (!existsSync(p)) {
      console.error('Missing assets/catalog.json — run npm run fetch-assets')
      process.exit(1)
    }
    catalog = JSON.parse(readFileSync(p, 'utf8')) as Catalog
  }
  const idx = indexCatalog(catalog)
  const store = new StateStore({ dataDir: opts.dataDir, catalog: idx })
  await store.load()
  if (opts.fresh) { store.reset(); await store.flush() }

  let vite: import('vite').ViteDevServer | undefined
  let boundPort = opts.port
  const server = http.createServer()
  if (opts.dev) {
    const { createServer } = await import('vite')
    vite = await createServer({ appType: 'mpa', server: { middlewareMode: true, hmr: { server } } })
  }
  server.on('request', createHttpHandler({ distDir: opts.distDir, assetsDir: opts.assetsDir, dataDir: opts.dataDir, store, vite, port: () => boundPort }))
  const sockets = attachSockets(server, store, idx)

  await new Promise<void>((ok, fail) => {
    server.once('error', fail)
    server.listen(opts.port, '0.0.0.0', () => ok())
  })
  boundPort = (server.address() as AddressInfo).port

  return {
    port: boundPort,
    store,
    async close() {
      sockets.close()
      await store.flush()
      await vite?.close()
      server.closeAllConnections?.()
      await new Promise<void>((ok) => server.close(() => ok()))
    },
  }
}
