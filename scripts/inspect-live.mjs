import fs from 'fs'
import path from 'path'
import { spawn } from 'child_process'

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const PORT = 9225
const TARGET_URL = 'http://localhost:5173/#contact'

async function run() {
  const tmpDir = path.join(process.env.TEMP || 'C:\\Windows\\Temp', 'chrome-inspect-' + Date.now())
  const chrome = spawn(CHROME_PATH, [
    `--remote-debugging-port=${PORT}`,
    '--remote-debugging-address=127.0.0.1',
    `--user-data-dir=${tmpDir}`,
    '--headless=new',
    '--disable-gpu-sandbox',
    '--no-sandbox',
    '--window-size=1920,1080',
    '--hide-scrollbars',
    '--enable-webgl',
    '--ignore-gpu-blocklist',
  ])

  for (let i = 0; i < 30; i++) {
    try {
      await new Promise(r => setTimeout(r, 200))
      const res = await fetch(`http://127.0.0.1:${PORT}/json/version`)
      if (res.ok) break
    } catch {}
  }

  const pagesRes = await fetch(`http://127.0.0.1:${PORT}/json`)
  const pages = await pagesRes.json()
  const target = pages.find(p => p.type === 'page') || pages[0]
  const ws = new WebSocket(target.webSocketDebuggerUrl)

  await new Promise(res => { ws.onopen = res })

  const consoleLogs = []
  ws.addEventListener('message', e => {
    const msg = JSON.parse(e.data)
    if (msg.method === 'Runtime.consoleAPICalled') {
      consoleLogs.push({ type: msg.params.type, args: msg.params.args.map(a => a.value || a.description) })
    }
    if (msg.method === 'Runtime.exceptionThrown') {
      consoleLogs.push({ type: 'error', exception: msg.params.exceptionDetails })
    }
  })

  function send(method, params = {}) {
    return new Promise(res => {
      const id = Math.floor(Math.random() * 1000000)
      const handler = e => {
        const msg = JSON.parse(e.data)
        if (msg.id === id) {
          ws.removeEventListener('message', handler)
          res(msg.result)
        }
      }
      ws.addEventListener('message', handler)
      ws.send(JSON.stringify({ id, method, params }))
    })
  }

  await send('Page.enable')
  await send('Runtime.enable')
  await send('Page.navigate', { url: TARGET_URL })

  await new Promise(r => setTimeout(r, 4000))

  await send('Runtime.evaluate', {
    expression: `
      (() => {
        const contact = document.getElementById('contact');
        if (contact) contact.scrollIntoView({ behavior: 'instant', block: 'center' });
        document.querySelectorAll('div.fixed.z-50').forEach(el => el.style.display = 'none');
      })()
    `
  })

  await new Promise(r => setTimeout(r, 2000))

  const screenshot = await send('Page.captureScreenshot', { format: 'png' })
  fs.writeFileSync('scripts/screenshots/live-contact-inspect.png', Buffer.from(screenshot.data, 'base64'))

  console.log(`Console Logs (${consoleLogs.length}):`)
  consoleLogs.forEach(l => console.log(l.type, JSON.stringify(l)))

  chrome.kill()
}

run().catch(console.error)
