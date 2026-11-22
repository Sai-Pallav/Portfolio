/* global process, Buffer */
import fs from 'fs'
import path from 'path'
import { spawn } from 'child_process'

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const PORT = 9223
const TARGET_URL = 'http://localhost:5173/#contact'

async function launchChrome() {
  const tmpDir = path.join(process.env.TEMP || 'C:\\Windows\\Temp', 'chrome-profile-' + Date.now())
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

  // Wait for remote debugging to be ready
  for (let i = 0; i < 30; i++) {
    try {
      await new Promise(r => setTimeout(r, 200))
      const res = await fetch(`http://127.0.0.1:${PORT}/json/version`)
      if (res.ok) {
        console.log('✓ Chrome DevTools Protocol ready')
        return chrome
      }
    } catch {
      // retry
    }
  }
  throw new Error('Chrome failed to start within timeout')
}

function sendCDP(ws, method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = Math.floor(Math.random() * 1000000)
    const handler = (event) => {
      const msg = JSON.parse(event.data)
      if (msg.id === id) {
        ws.removeEventListener('message', handler)
        if (msg.error) reject(msg.error)
        else resolve(msg.result)
      }
    }
    ws.addEventListener('message', handler)
    ws.send(JSON.stringify({ id, method, params }))
  })
}

async function capture() {
  const chrome = await launchChrome()

  try {
    const pagesRes = await fetch(`http://127.0.0.1:${PORT}/json`)
    const pages = await pagesRes.json()
    const target = pages.find(p => p.type === 'page') || pages[0]
    if (!target) throw new Error('No page target found')

    console.log(`Connecting to page: ${target.webSocketDebuggerUrl}`)
    const ws = new WebSocket(target.webSocketDebuggerUrl)

    await new Promise((resolve, reject) => {
      ws.onopen = resolve
      ws.onerror = reject
    })

    await sendCDP(ws, 'Page.enable')
    await sendCDP(ws, 'Runtime.enable')
    await sendCDP(ws, 'Console.enable')

    console.log(`Navigating to ${TARGET_URL}...`)
    await sendCDP(ws, 'Page.navigate', { url: TARGET_URL })

    // Wait 3.5s for initial load and Three.js canvas initialization
    await new Promise(r => setTimeout(r, 3500))

    // Scroll directly into the contact globe and hide debug panel
    await sendCDP(ws, 'Runtime.evaluate', {
      expression: `
        (() => {
          const globe = document.getElementById('contact-globe-inner') || document.getElementById('contact');
          if (globe) {
            globe.scrollIntoView({ behavior: 'instant', block: 'center' });
          }
          document.querySelectorAll('div.fixed.z-50').forEach(el => {
            el.style.display = 'none';
          });
        })()
      `,
    })

    // Wait 2.5 seconds for Lenis and Three.js canvas to settle
    await new Promise(r => setTimeout(r, 2500))

    // Re-verify scroll position right before capturing
    await sendCDP(ws, 'Runtime.evaluate', {
      expression: `
        (() => {
          const globe = document.getElementById('contact-globe-inner') || document.getElementById('contact');
          if (globe) {
            globe.scrollIntoView({ behavior: 'instant', block: 'center' });
          }
        })()
      `,
    })
    await new Promise(r => setTimeout(r, 500))

    const outDir = path.resolve('scripts/screenshots')
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true })
    }

    // 1. Capture Desktop Moments (1920x1080)
    const moments = [
      { name: 'moment-00-initial', delayMs: 500, label: 'Desktop Initial (t ~ 0s)' },
      { name: 'moment-01-early-wave', delayMs: 3000, label: 'Desktop Early Wave Propagation (t ~ 3s)' },
      { name: 'moment-02-mid-prop', delayMs: 4000, label: 'Desktop Mid Outward Propagation (t ~ 7s)' },
      { name: 'moment-03-rot-transition', delayMs: 4500, label: 'Desktop 3D Corkscrew Roll (t ~ 11.5s)' },
    ]

    for (const moment of moments) {
      if (moment.delayMs > 0) {
        await new Promise(r => setTimeout(r, moment.delayMs))
      }
      console.log(`Capturing: ${moment.label}...`)
      const res = await sendCDP(ws, 'Page.captureScreenshot', { format: 'png' })
      const buf = Buffer.from(res.data, 'base64')
      const filePath = path.join(outDir, `${moment.name}.png`)
      fs.writeFileSync(filePath, buf)
      console.log(`  ✓ Saved ${filePath} (${(buf.length / 1024).toFixed(1)} KB)`)
    }

    // 2. Capture Tablet Viewport (1024x768)
    console.log('Switching to Tablet viewport (1024x768)...')
    await sendCDP(ws, 'Emulation.setDeviceMetricsOverride', {
      width: 1024,
      height: 768,
      deviceScaleFactor: 1,
      mobile: false,
    })
    await new Promise(r => setTimeout(r, 1500))
    await sendCDP(ws, 'Runtime.evaluate', {
      expression: `
        const el = document.getElementById('contact');
        if (el) el.scrollIntoView({ behavior: 'instant', block: 'center' });
      `,
    })
    await new Promise(r => setTimeout(r, 1000))
    const tabletRes = await sendCDP(ws, 'Page.captureScreenshot', { format: 'png' })
    const tabletBuf = Buffer.from(tabletRes.data, 'base64')
    const tabletPath = path.join(outDir, 'tablet-1024.png')
    fs.writeFileSync(tabletPath, tabletBuf)
    console.log(`  ✓ Saved ${tabletPath} (${(tabletBuf.length / 1024).toFixed(1)} KB)`)

    // 3. Capture Mobile Viewport (390x844)
    console.log('Switching to Mobile viewport (390x844)...')
    await sendCDP(ws, 'Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true,
    })
    await new Promise(r => setTimeout(r, 1500))
    await sendCDP(ws, 'Runtime.evaluate', {
      expression: `
        const el = document.getElementById('contact');
        if (el) el.scrollIntoView({ behavior: 'instant', block: 'center' });
      `,
    })
    await new Promise(r => setTimeout(r, 1000))
    const mobileRes = await sendCDP(ws, 'Page.captureScreenshot', { format: 'png' })
    const mobileBuf = Buffer.from(mobileRes.data, 'base64')
    const mobilePath = path.join(outDir, 'mobile-390.png')
    fs.writeFileSync(mobilePath, mobileBuf)
    console.log(`  ✓ Saved ${mobilePath} (${(mobileBuf.length / 1024).toFixed(1)} KB)`)

    // Validation
    const evalResult = await sendCDP(ws, 'Runtime.evaluate', {
      expression: `
        (() => {
          const canvases = document.querySelectorAll('canvas');
          const contactSec = document.getElementById('contact');
          const wireCanvas = contactSec ? contactSec.querySelector('canvas') : null;
          return {
            totalCanvases: canvases.length,
            hasContactSection: !!contactSec,
            hasWireCanvas: !!wireCanvas,
          };
        })()
      `,
      returnByValue: true,
    })

    console.log('\n─── DOM & WebGL Validation ───')
    console.log('Result:', JSON.stringify(evalResult.result.value, null, 2))

    ws.close()
  } finally {
    chrome.kill()
  }
}

capture().catch((err) => {
  console.error('Capture failed:', err)
  process.exit(1)
})
