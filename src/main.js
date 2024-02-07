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
let ui, renderer, scene, camera, shell, clock
function initThree() {
  const wrap = document.querySelector('.stage-wrap')
  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
  renderer.setSize(wrap.clientWidth, wrap.clientHeight)
  const old = document.getElementById('stage')
  if (old) old.replaceWith(renderer.domElement)
  renderer.domElement.id = 'stage'
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x14141c)
  camera = new THREE.PerspectiveCamera(50, wrap.clientWidth / wrap.clientHeight, 0.1, 100)
  camera.position.set(0, 1.4, 5.2)
  camera.lookAt(0, 0, 0)
  scene.add(new THREE.HemisphereLight(0xd8d0c0, 0x2a2218, 1.1))
  const dir = new THREE.DirectionalLight(0xcbb896, 0.7)
  dir.position.set(3, 5, 2)
  scene.add(dir)
  shell = new THREE.Mesh(
    new THREE.IcosahedronGeometry(2.2, 2),
    new THREE.MeshStandardMaterial({ color: 0x8a6a3d, flatShading: true, transparent: true, opacity: 0.35, side: THREE.DoubleSide })
  )
  scene.add(shell)
  const floor = new THREE.Mesh(new THREE.CircleGeometry(2.1, 32), new THREE.MeshStandardMaterial({ color: 0x2a241c, flatShading: true }))
  floor.rotation.x = -Math.PI / 2
  floor.position.y = -1.4
  scene.add(floor)
  clock = new THREE.Clock()
  window.addEventListener('resize', () => {
    const w = wrap.clientWidth, h = wrap.clientHeight
    camera.aspect = w / h
    camera.updateProjectionMatrix()
    renderer.setSize(w, h)
  })
}
function reset() {
  for (const p of state.pins) scene.remove(p.mesh)
  state.pins = []
  state.pressure = 0
  state.stable = 0
  state.t = 0
  ui.setStat('stat-p', 0)
  ui.setStat('stat-pins', 0)
  ui.setStat('stat-stable', 0)
}
function placePin(point) {
  if (state.pins.length >= 6) return
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.1, 0.5, 6),
    new THREE.MeshStandardMaterial({ color: 0xd8d6e2, flatShading: true, transparent: true })
  )
  mesh.position.copy(point)
  mesh.lookAt(0, 0, 0)
  mesh.rotateX(Math.PI / 2)
  scene.add(mesh)
  const quality = Math.max(0, 1 - Math.abs(point.length() - 2.05) * 2)
  state.pins.push({ mesh, life: 8 + quality * 6, quality })
  ui.setStat('stat-pins', state.pins.length)
}
function update(dt) {
  if (!state.running) return
  state.t += dt
  state.pressure = Math.min(100, state.t * 4.2)
  ui.setStat('stat-p', Math.floor(state.pressure))
  shell.rotation.y += dt * 0.15
  shell.scale.setScalar(1 + Math.sin(state.t * 1.3) * 0.02 * (state.pressure / 50))
  let stable = 0
  for (const p of state.pins) {
    p.life -= dt * (0.7 + state.pressure * 0.015)
    p.mesh.material.opacity = Math.max(0.2, p.life / 10)
    if (p.life > 3 && p.quality > 0.45) stable++
  }
  state.pins = state.pins.filter((p) => {
    if (p.life <= 0) { scene.remove(p.mesh); return false }
    return true
  })
  state.stable = stable
  ui.setStat('stat-stable', stable)
  ui.setStat('stat-pins', state.pins.length)
  if (stable >= 3 && state.pressure < 90) {
    state.running = false
    ui.status.textContent = 'Chamber held. Exit route open.'
    ui.overlay.classList.add('show')
  } else if (state.pressure >= 100) {
    state.running = false
    ui.status.textContent = 'Pressure resealed the chamber.'
    ui.overlay.classList.add('show')
  }
}
function onClick(ev) {
  if (!state.running) return
  const rect = renderer.domElement.getBoundingClientRect()
  const mouse = new THREE.Vector2(
    ((ev.clientX - rect.left) / rect.width) * 2 - 1,
    -((ev.clientY - rect.top) / rect.height) * 2 + 1
  )
  const ray = new THREE.Raycaster()
  ray.setFromCamera(mouse, camera)
  const hits = ray.intersectObject(shell)
  if (hits[0]) placePin(hits[0].point.clone())
}
function loop() {
  update(Math.min(0.05, clock.getDelta()))
  renderer.render(scene, camera)
  requestAnimationFrame(loop)
}
ui = mountShell()
initThree()
reset()
renderer.domElement.addEventListener('click', onClick)
ui.btnStart.addEventListener('click', () => { reset(); state.running = true; ui.overlay.classList.remove('show'); ui.status.textContent = 'Click shell to pin anchors' })
ui.btnReset.addEventListener('click', () => { reset(); state.running = false; ui.overlay.classList.add('show') })
requestAnimationFrame(loop)
void 12;
