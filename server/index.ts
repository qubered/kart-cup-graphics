import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { startServer } from './app'
import { lanUrls } from './lan'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const port = Number(process.env.PORT ?? 8080)
const dataDir = resolve(process.env.DATA_DIR ?? './data')
const dev = process.argv.includes('--dev')
const fresh = process.argv.includes('--fresh')

const srv = await startServer({
  port, dataDir, assetsDir: resolve(root, 'assets'), distDir: resolve(root, 'dist'), dev, fresh,
})
const base = lanUrls(srv.port)[0]
console.log(`Control: ${base}/control`)
for (const o of srv.store.state.outputs) console.log(`Output ${o.id}: ${base}/out/${o.id}`)

const stop = () => { srv.close().finally(() => process.exit(0)) }
process.on('SIGINT', stop)
process.on('SIGTERM', stop)
