import fs from 'fs'
import path from 'path'
import { spawn } from 'child_process'

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const PORT = 9226
const TARGET_URL = 'http://localhost:5173/#contact'

async function run() {
  const tmpDir = path.join(process.env.TEMP || 'C:\\Windows\\Temp', 'chrome-crops-' + Date.now())
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

  const scrollRes = await send('Runtime.evaluate', {
    expression: 'window.scrollY'
  })
  const scrollY = scrollRes.result.value
  console.log('Current scrollY:', scrollY)

  const regions = [
    { name: 'left-inner-tip', x: 580, y: 520, width: 220, height: 160 },
    { name: 'left-middle-crossing', x: 340, y: 490, width: 260, height: 200 },
    { name: 'left-outer-end', x: 0, y: 480, width: 280, height: 220 },
    { name: 'right-inner-tip', x: 1120, y: 520, width: 220, height: 160 },
    { name: 'right-middle-crossing', x: 1320, y: 490, width: 260, height: 200 },
    { name: 'right-outer-end', x: 1640, y: 480, width: 280, height: 220 },
  ]

  for (const reg of regions) {
    const screenshot = await send('Page.captureScreenshot', {
      format: 'png',
      clip: {
        x: reg.x,
        y: scrollY + reg.y,
        width: reg.width,
        height: reg.height,
        scale: 1,
      }
    })
    fs.writeFileSync(`scripts/screenshots/${reg.name}.png`, Buffer.from(screenshot.data, 'base64'))
    console.log(`Captured ${reg.name}.png`)
  }

  const fullScreenshot = await send('Page.captureScreenshot', {
    format: 'png',
    clip: {
      x: 0,
      y: scrollY,
      width: 1920,
      height: 1080,
      scale: 1,
    }
  })
  fs.writeFileSync('scripts/screenshots/live-contact-inspect.png', Buffer.from(fullScreenshot.data, 'base64'))
  console.log('Captured live-contact-inspect.png')

  chrome.kill()
}

run().catch(console.error)
