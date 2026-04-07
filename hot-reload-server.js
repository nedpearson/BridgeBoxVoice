/**
 * Bridgebox Voice Extension Hot-Reload Server (ESM)
 * Watches chrome-extension/ for file changes and signals the extension to reload.
 */

import { WebSocketServer } from 'ws'
import chokidar from 'chokidar'
import { fileURLToPath } from 'url'
import { dirname, join, relative } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PORT = 58371
const EXT_DIR = join(__dirname, 'chrome-extension')

const wss = new WebSocketServer({ port: PORT })
const clients = new Set()

wss.on('listening', () => {
  console.log(`\x1b[36m🔥 Extension hot-reload → ws://localhost:${PORT}\x1b[0m`)
  console.log(`\x1b[90m   Watching: ${EXT_DIR}\x1b[0m\n`)
})

wss.on('connection', (ws) => {
  clients.add(ws)
  console.log(`\x1b[32m   ↺ Extension connected (${clients.size} tab)\x1b[0m`)
  ws.on('close', () => clients.delete(ws))
})

const broadcast = (msg) => clients.forEach(ws => ws.readyState === 1 && ws.send(msg))

let timer = null
const scheduleReload = (file) => {
  clearTimeout(timer)
  timer = setTimeout(() => {
    console.log(`\x1b[33m   changed: ${relative(__dirname, file)}\x1b[0m`)
    console.log(`\x1b[32m   ↺ Reloading extension...\x1b[0m`)
    broadcast('reload')
  }, 150)
}

chokidar
  .watch(EXT_DIR, { ignoreInitial: true })
  .on('change', scheduleReload)
  .on('add', scheduleReload)
