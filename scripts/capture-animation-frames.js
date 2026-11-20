/* global process, Buffer */
import fs from 'fs'
import path from 'path'
import { spawn } from 'child_process'

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const PORT = 9223
const TARGET_URL = 'http://localhost:4173/#contact'

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

  chrome.stdout.on('data', d => console.log('CHROME OUT:', d.toString()))
  chrome.stderr.on('data', d => console.log('CHROME ERR:', d.toString()))

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

    const consoleLogs = []
    ws.addEventListener('message', (event) => {
      const msg = JSON.parse(event.data)
      if (msg.method === 'Runtime.consoleAPICalled') {
        const text = msg.params.args.map(a => a.value || a.description).join(' ')
        consoleLogs.push(`[Console ${msg.params.type}] ${text}`)
      }
    })

    console.log(`Navigating to ${TARGET_URL}...`)
    await sendCDP(ws, 'Page.navigate', { url: TARGET_URL })

    // Wait 3.5s for initial load and Three.js canvas initialization
    await new Promise(r => setTimeout(r, 3500))

    // Scroll directly into the #contact section
    await sendCDP(ws, 'Runtime.evaluate', {
      expression: `
        const el = document.getElementById('contact');
        if (el) {
          el.scrollIntoView({ behavior: 'instant', block: 'center' });
        }
      `,
    })

    // Wait 2 seconds for IntersectionObserver and in-view rendering to settle
    await new Promise(r => setTimeout(r, 2000))

    // Capture screenshots at multiple animation moments across cycles
    const moments = [
      { name: 'moment-00-initial', delayMs: 500, label: 'Initial State' },
      { name: 'moment-01-early-wave', delayMs: 2500, label: 'Early Wave Propagation (t ~ 2.5s)' },
      { name: 'moment-02-mid-prop', delayMs: 3000, label: 'Mid-Propagation (t ~ 5.5s)' },
      { name: 'moment-03-rot-transition', delayMs: 4000, label: 'Rotational Transition / Depth Roll (t ~ 9.5s)' },
      { name: 'moment-04-late-prop', delayMs: 4500, label: 'Late Propagation / Wave Crest (t ~ 14.0s)' },
      { name: 'moment-05-full-cycle', delayMs: 4000, label: 'Full Rotation Cycle Complete (t ~ 18.0s)' },
    ]

    const outDir = path.resolve('scripts/screenshots')
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true })
    }

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

    // Inspect WebGL canvas presence & context
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
            contactRect: contactSec ? { width: contactSec.offsetWidth, height: contactSec.offsetHeight } : null,
          };
        })()
      `,
      returnByValue: true,
    })

    console.log('\n─── DOM & WebGL Validation ───')
    console.log('Result:', JSON.stringify(evalResult.result.value, null, 2))

    if (consoleLogs.length > 0) {
      console.log('\n─── Browser Console Logs ───')
      consoleLogs.forEach(l => console.log(l))
    }

    ws.close()
  } finally {
    chrome.kill()
  }
}

capture().catch((err) => {
  console.error('Capture failed:', err)
  process.exit(1)
})
