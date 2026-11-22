/* global process, Buffer */
import { spawn } from 'child_process'
import { writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const PORT = 9222
const TEMP_PROFILE = 'C:\\Users\\kotas\\AppData\\Local\\Temp\\chrome_perf_profile_' + Date.now()

async function main() {
  console.log('Launching Chrome...')
  const chrome = spawn(
    CHROME_PATH,
    [
      '--headless=new',
      `--remote-debugging-port=${PORT}`,
      `--user-data-dir=${TEMP_PROFILE}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--window-size=1920,1080',
      '--enable-webgl',
      '--ignore-gpu-blocklist',
    ],
    { stdio: ['ignore', 'pipe', 'pipe'] }
  )

  let wsUrl = null

  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Chrome launch timeout')), 10000)
    const onData = (data) => {
      const text = data.toString()
      const match = text.match(/DevTools listening on (ws:\/\/[^\s]+)/)
      if (match) {
        wsUrl = match[1]
        clearTimeout(timeout)
        resolve()
      }
    }
    chrome.stderr.on('data', onData)
    chrome.stdout.on('data', onData)
    chrome.on('error', reject)
  })

  console.log('CDP URL:', wsUrl)
  const urlObj = new URL(wsUrl)
  const httpBase = `http://${urlObj.host}`

  // Fetch target list to get the default page
  const targetsRes = await fetch(`${httpBase}/json/list`)
  const targets = await targetsRes.json()
  const pageTarget = targets.find((t) => t.type === 'page') || targets[0]
  const pageWsUrl = pageTarget.webSocketDebuggerUrl

  console.log('Connecting to page WebSocket:', pageWsUrl)
  const ws = new WebSocket(pageWsUrl)

  let reqId = 1
  const pending = new Map()

  function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = reqId++
      pending.set(id, { resolve, reject })
      ws.send(JSON.stringify({ id, method, params }))
    })
  }

  const consoleLogs = []
  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data)
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id)
      pending.delete(msg.id)
      if (msg.error) reject(msg.error)
      else resolve(msg.result)
    } else if (msg.method === 'Runtime.consoleAPICalled') {
      consoleLogs.push({ type: msg.params.type, args: msg.params.args.map((a) => a.value || a.description) })
    }
  }

  await new Promise((res) => (ws.onopen = res))

  await send('Page.enable')
  await send('Runtime.enable')

  console.log('Navigating to http://localhost:5173/#contact...')
  await send('Page.navigate', { url: 'http://localhost:5173/#contact' })

  // Wait for initial load
  await new Promise((r) => setTimeout(r, 2000))

  // Scroll to #contact via Lenis and trigger scroll event
  const scrollResult = await send('Runtime.evaluate', {
    expression: `
      (async function() {
        const el = document.getElementById('contact');
        if (window.lenis) {
          window.lenis.scrollTo('#contact', { immediate: true });
        }
        if (el) {
          el.scrollIntoView({ behavior: 'instant', block: 'center' });
        }
        window.dispatchEvent(new Event('scroll'));
        window.dispatchEvent(new Event('resize'));
        await new Promise(r => setTimeout(r, 600));
        window.dispatchEvent(new Event('scroll'));

        const rect = el ? el.getBoundingClientRect() : null;
        return {
          found: !!el,
          top: rect ? rect.top : 0,
          inView: el ? el.getAttribute('data-inview') : 'none'
        };
      })()
    `,
    awaitPromise: true,
    returnByValue: true,
  })
  console.log('Scroll result:', scrollResult.result.value)

  // Wait 3.5s for initial build, neural field generation, and animations to stabilize
  await new Promise((r) => setTimeout(r, 3500))

  // Profile FPS, frame time, draw calls, points, lines, geometries, etc.
  const profileResult = await send('Runtime.evaluate', {
    expression: `
      new Promise((resolve) => {
        // Measure FPS over 90 frames
        const frameTimes = [];
        let lastTime = performance.now();
        let frameCount = 0;

        function onFrame(now) {
          const dt = now - lastTime;
          lastTime = now;
          if (frameCount > 0) {
            frameTimes.push(dt);
          }
          frameCount++;
          if (frameCount < 90) {
            requestAnimationFrame(onFrame);
          } else {
            const avgDt = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
            const minDt = Math.min(...frameTimes);
            const maxDt = Math.max(...frameTimes);
            const fps = 1000 / avgDt;

            let rendererInfo = null;
            if (window.__neuralRenderer) {
              const gl = window.__neuralRenderer;
              rendererInfo = {
                calls: gl.info.render.calls,
                triangles: gl.info.render.triangles,
                points: gl.info.render.points,
                lines: gl.info.render.lines,
                frame: gl.info.render.frame,
                geometries: gl.info.memory.geometries,
                textures: gl.info.memory.textures
              };
            }

            resolve({
              fps: Number(fps.toFixed(2)),
              avgFrameTimeMs: Number(avgDt.toFixed(2)),
              minFrameTimeMs: Number(minDt.toFixed(2)),
              maxFrameTimeMs: Number(maxDt.toFixed(2)),
              buildTimes: window.__neuralBuildTimes || null,
              rendererInfo,
              hasRenderer: !!window.__neuralRenderer
            });
          }
        }
        requestAnimationFrame(onFrame);
      })
    `,
    awaitPromise: true,
    returnByValue: true,
  })

  console.log('\n--- PROFILE REPORT ---')
  console.log(JSON.stringify(profileResult.result.value, null, 2))

  console.log('\n--- BROWSER CONSOLE LOGS ---')
  const errors = consoleLogs.filter(l => l.type === 'error')
  console.log(`Total logs: ${consoleLogs.length}, Errors: ${errors.length}`)
  if (errors.length > 0) {
    console.error('Console errors:', JSON.stringify(errors, null, 2))
  }

  // Capture baseline screenshot
  const screenshotData = await send('Page.captureScreenshot', {
    format: 'png',
    captureBeyondViewport: false,
  })

  mkdirSync('screenshots', { recursive: true })
  const filename = process.argv[2] || 'after-contact.png'
  const screenshotPath = join('screenshots', filename)
  writeFileSync(screenshotPath, Buffer.from(screenshotData.data, 'base64'))
  console.log(`Saved screenshot to ${screenshotPath}`)

  ws.close()
  chrome.kill()
  process.exit(0)
}

main().catch((err) => {
  console.error('Error in runner:', err)
  process.exit(1)
})
