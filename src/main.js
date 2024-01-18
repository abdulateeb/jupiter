import './style.css'
import * as THREE from 'three'

function fitCanvas(canvas) {
  const parent = canvas.parentElement
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const w = parent.clientWidth
  const h = parent.clientHeight
  canvas.width = Math.floor(w * dpr)
  canvas.height = Math.floor(h * dpr)
  canvas.style.width = w + 'px'
  canvas.style.height = h + 'px'
  const ctx = canvas.getContext('2d')
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  return { ctx, w, h, dpr }
}


function mountShell() {
  const app = document.getElementById('app')
  app.innerHTML = `
    <header class="bar">
      <h1>Jupiter</h1>
      <div class="meta"><div>Pressure: <strong id="stat-p">0</strong></div><div>Pins: <strong id="stat-pins">0</strong></div><div>Stable: <strong id="stat-stable">0</strong></div></div>
    </header>
    <div class="stage-wrap">
      <canvas id="stage"></canvas>
      <div class="overlay show" id="overlay">
        <div class="card">
          <h2>Jupiter</h2>
          <p>Pin temporary anchors in a collapsing mantle chamber. Pressure rises with time. Secure three stable pins before the shell reseals.</p>
          <div class="row">
            <button class="btn" id="btn-start" type="button">Start</button>
          </div>
        </div>
      </div>
    </div>
    <footer class="bar">
      <span id="status">Ready</span>
      <button class="btn" id="btn-reset" type="button">Reset</button>
    </footer>
  `
  return {
    canvas: document.getElementById('stage'),
    overlay: document.getElementById('overlay'),
    status: document.getElementById('status'),
    btnStart: document.getElementById('btn-start'),
    btnReset: document.getElementById('btn-reset'),
    setStat(id, value) {
      const el = document.getElementById(id)
      if (el) el.textContent = String(value)
    }
  }
}

const state = { running: false, pressure: 0, pins: [], stable: 0, t: 0 }
