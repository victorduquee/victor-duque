<template>
  <section ref="rootEl" class="pg-root" :style="{ '--bg-tint': bgColor }" @mousemove="onMouseMove">
    <div class="cursor-anchor" :style="{ transform: `translate(${cursorLabel.x}px, ${cursorLabel.y}px)` }">
      <div class="cursor-label t-ui" :class="{ 'is-visible': cursorLabel.text }">{{ cursorLabel.text }}</div>
    </div>
    <div class="pg-columns" :style="{ '--col-count': colCount }" :class="{ 'is-ready': ready }">
      <div v-for="(col, ci) in activeColumns" :key="ci" class="pg-col">
        <div :ref="el => colInners[ci] = el" class="pg-col-inner">
          <div
            v-for="item in col.items"
            :key="item.id"
            class="pg-card"
            :data-id="item.id"
          >
            <video
              v-if="item.category === 'video'"
              :src="item.src"
              muted
              loop
              autoplay
              playsinline
              preload="auto"
            />
            <img
              v-else
              :src="item.cover ?? item.src"
              :alt="item.title"
            />
          </div>
        </div>
      </div>
    </div>

    <Transition name="modal">
      <div v-if="activeItem" class="modal-backdrop" @click.self="closeModal">
        <div class="modal-box">
          <button class="modal-close" @click="closeModal">✕</button>
          <div class="modal-media">
            <iframe
              v-if="activeItem.category === 'herramienta'"
              :src="activeItem.src"
              frameborder="0"
            />
            <video
              v-else-if="activeItem.category === 'video'"
              :src="activeItem.src"
              controls
              autoplay
              loop
              playsinline
              class="pg-modal__img"
            />
            <img v-else :src="activeItem.src" :alt="activeItem.title" />
          </div>
          <div class="modal-info">
            <span class="modal-category">{{ activeItem.category }}</span>
            <h2 class="modal-title">{{ activeItem.title }}</h2>
            <p class="modal-desc">{{ activeItem.desc }}</p>
          </div>
        </div>
      </div>
    </Transition>
  </section>
</template>

<script setup>
useSeoMeta({
  title: 'Lab — Víctor Duque',
  description: 'Exploraciones visuales, ilustraciones y experimentos de diseño de Víctor Duque.',
  ogTitle: 'Lab — Víctor Duque',
  ogDescription: 'Exploraciones visuales, ilustraciones y experimentos de diseño de Víctor Duque.',
  ogImage: '/thumbnails/ciuden.jpg',
  twitterCard: 'summary_large_image',
})
import gsap from 'gsap'
import { labItems } from '@/data/lab.js'

const SPEEDS      = [1, 0.85, 1.1, 0.9]
const FRICTION    = 0.90
const BREAKPOINTS = { sm: 560, md: 860 }

const isMobile = typeof window !== 'undefined' && window.matchMedia('(hover: none)').matches

const rootEl    = ref(null)
const colInners = ref([])
const colCount  = ref(4)

const activeColumns = computed(() =>
  Array.from({ length: colCount.value }, (_, ci) => ({
    items: labItems.filter((_, i) => i % colCount.value === ci),
  }))
)

let yPositions      = []
let velocities      = []
let originalHeights = []
let rafId           = null
let videoInterval   = null
let resizeObserver  = null
let isDragging      = false
let dragMoved       = false
let lastPointerY    = 0

const activeItem = ref(null)
const bgColor = ref('#fff')
const cursorLabel = ref({ text: '', x: 0, y: 0 })
const ready = ref(false)

function onMouseMove(e) {
  cursorLabel.value.x = e.clientX
  cursorLabel.value.y = e.clientY
}

function getDominantColor(img) {
  try {
    const canvas = document.createElement('canvas')
    canvas.width = 16
    canvas.height = 16
    const ctx = canvas.getContext('2d')
    ctx.drawImage(img, 0, 0, 16, 16)
    const data = ctx.getImageData(0, 0, 16, 16).data
    let r = 0, g = 0, b = 0, count = 0
    for (let i = 0; i < data.length; i += 4) {
      r += data[i]; g += data[i + 1]; b += data[i + 2]; count++
    }
    // Mezclar con blanco al 80% para un tinte suave como fondo
    const mix = 0.85
    r = Math.round(r / count * (1 - mix) + 255 * mix)
    g = Math.round(g / count * (1 - mix) + 255 * mix)
    b = Math.round(b / count * (1 - mix) + 255 * mix)
    return `rgb(${r},${g},${b})`
  } catch {
    return null
  }
}

function onCardEnter(e) {
  const card = e.currentTarget
  const img = card.querySelector('img')
  if (img?.complete) {
    if (!img._dominantColor) img._dominantColor = getDominantColor(img)
    if (img._dominantColor) bgColor.value = img._dominantColor
  }
  const item = labItems.find(p => p.id === card.dataset.id)
  if (item) cursorLabel.value.text = item.title
}

function onCardLeave() {
  bgColor.value = '#fff'
  cursorLabel.value.text = ''
}

function closeModal() {
  activeItem.value = null
}

function onKeydown(e) {
  if (e.key === 'Escape') closeModal()
}

// Añade listeners de click directamente en el DOM (originales + clones)
function attachCardListeners(inner) {
  inner.querySelectorAll('.pg-card').forEach(card => {
    card.removeEventListener('click', card._clickHandler)
    card.removeEventListener('mouseenter', card._enterHandler)
    card.removeEventListener('mouseleave', card._leaveHandler)

    card._clickHandler = () => {
      if (dragMoved) return
      const item = labItems.find(p => p.id === card.dataset.id)
      if (item) activeItem.value = item
    }
    card._enterHandler = onCardEnter
    card._leaveHandler = onCardLeave

    card.addEventListener('click', card._clickHandler)
    card.addEventListener('mouseenter', card._enterHandler)
    card.addEventListener('mouseleave', card._leaveHandler)
  })
}

function getColCount(width) {
  if (width < BREAKPOINTS.sm) return 2
  if (width < BREAKPOINTS.md) return 3
  return 4
}

function waitForImages(inner) {
  const imgs = [...inner.querySelectorAll('img')]
  if (!imgs.length) return Promise.resolve()
  return Promise.all(
    imgs.map(img =>
      img.complete
        ? Promise.resolve()
        : new Promise(res => { img.onload = res; img.onerror = res })
    )
  )
}

function addDelta(delta) {
  colInners.value.forEach((inner, i) => {
    if (!inner || !originalHeights[i]) return
    velocities[i] = (velocities[i] ?? 0) - delta * SPEEDS[i]
  })
}

function tick() {
  colInners.value.forEach((inner, i) => {
    if (!inner || !originalHeights[i]) return

    velocities[i] = (velocities[i] ?? 0) * FRICTION
    let current = (yPositions[i] ?? 0) + velocities[i]

    const h = originalHeights[i]
    while (current < -h) current += h
    while (current > 0)  current -= h

    yPositions[i] = current
    gsap.set(inner, { y: current })
  })

  rafId = requestAnimationFrame(tick)
}

async function reinit() {
  await nextTick()

  colInners.value.forEach((inner, i) => {
    if (!inner) return
    const originalCount = activeColumns.value[i]?.items.length ?? 0
    while (inner.children.length > originalCount) inner.removeChild(inner.lastChild)
    gsap.set(inner, { y: 0 })
    yPositions[i]  = 0
    velocities[i]  = 0
  })

  await Promise.all(
    colInners.value.map(inner => inner ? waitForImages(inner) : Promise.resolve())
  )
  await new Promise(r => requestAnimationFrame(r))

  colInners.value.forEach((inner, i) => {
    if (!inner) return
    const originalCount = activeColumns.value[i]?.items.length ?? 0

    // Clonar las veces necesarias para que el contenido llene siempre la pantalla
    const originals = [...inner.children]
    const firstClone = originals[0].cloneNode(true)
    inner.appendChild(firstClone)
    // Medir distancia exacta (decimal) entre el primer original y su clon
    const r1 = originals[0].getBoundingClientRect()
    const r2 = firstClone.getBoundingClientRect()
    originalHeights[i] = r2.top - r1.top
    inner.removeChild(firstClone)

    // Ahora clonar todas las veces necesarias
    const needed = window.innerHeight + originalHeights[i]
    let totalHeight = originalHeights[i]
    while (totalHeight < needed) {
      originals.forEach(child => inner.appendChild(child.cloneNode(true)))
      totalHeight += originalHeights[i]
    }

    // Listeners en todos: originales + clones
    attachCardListeners(inner)
    inner.querySelectorAll('video').forEach(v => { v.muted = true; v.load(); v.play().catch(() => {}) })
  })
}

function onWheel(e) {
  if (activeItem.value) return
  e.preventDefault()
  addDelta(e.deltaY * 0.2)
}

function onPointerDown(e) {
  if (activeItem.value) return
  isDragging   = true
  dragMoved    = false
  lastPointerY = e.clientY ?? e.touches?.[0]?.clientY
}

function onPointerMove(e) {
  if (!isDragging) return
  const y  = e.clientY ?? e.touches?.[0]?.clientY
  const dy = y - lastPointerY
  if (Math.abs(dy) > 4) dragMoved = true
  lastPointerY = y
  addDelta(-dy * 0.3)
}

function onPointerUp() {
  isDragging = false
}

async function recalcHeights() {
  await nextTick()
  await new Promise(r => requestAnimationFrame(r))

  colInners.value.forEach((inner, i) => {
    if (!inner) return
    const originalCount = activeColumns.value[i]?.items.length ?? 0

    // Quitar clones anteriores
    while (inner.children.length > originalCount) inner.removeChild(inner.lastChild)

    // Medir nueva altura exacta con un clon temporal
    const originals = [...inner.children]
    if (!originals[0]) return
    const tempClone = originals[0].cloneNode(true)
    inner.appendChild(tempClone)
    const r1 = originals[0].getBoundingClientRect()
    const r2 = tempClone.getBoundingClientRect()
    const newH = r2.top - r1.top
    inner.removeChild(tempClone)

    if (!newH) return

    // Normalizar posición actual a la nueva altura sin resetear
    let y = yPositions[i] ?? 0
    while (y < -newH) y += newH
    while (y > 0)     y -= newH
    yPositions[i] = y
    gsap.set(inner, { y })

    originalHeights[i] = newH

    // Reclonar las veces necesarias
    const needed = window.innerHeight + newH
    let totalHeight = newH
    while (totalHeight < needed) {
      originals.forEach(child => inner.appendChild(child.cloneNode(true)))
      totalHeight += newH
    }

    attachCardListeners(inner)
    inner.querySelectorAll('video').forEach(v => { v.muted = true; v.load(); v.play().catch(() => {}) })
  })
}

onMounted(async () => {
  if (isMobile) {
    colCount.value = getColCount(rootEl.value.offsetWidth)
    await nextTick()
    rootEl.value.querySelectorAll('video').forEach(v => { v.muted = true; v.load(); v.play().catch(() => {}) })
    ready.value = true

    resizeObserver = new ResizeObserver(([entry]) => {
      colCount.value = getColCount(entry.contentRect.width)
    })
    resizeObserver.observe(rootEl.value)
    window.addEventListener('keydown', onKeydown)
    return
  }

  colCount.value = getColCount(rootEl.value.offsetWidth)
  await reinit()
  rafId = requestAnimationFrame(tick)
  ready.value = true

  videoInterval = setInterval(() => {
    if (!rootEl.value) return
    rootEl.value.querySelectorAll('video').forEach(v => {
      v.muted = true
      if (v.readyState === 0) v.load()
      if (v.paused) v.play().catch(() => {})
    })
  }, 300)

  resizeObserver = new ResizeObserver(async ([entry]) => {
    const width = entry.contentRect.width
    const next  = getColCount(width)
    if (next !== colCount.value) {
      colCount.value = next
      await reinit()
    } else {
      await recalcHeights()
    }
  })
  resizeObserver.observe(rootEl.value)

  const el = rootEl.value
  el.addEventListener('wheel',      onWheel,       { passive: false })
  el.addEventListener('mousedown',  onPointerDown)
  el.addEventListener('touchstart', onPointerDown, { passive: true })
  window.addEventListener('mousemove', onPointerMove)
  window.addEventListener('touchmove', onPointerMove, { passive: true })
  window.addEventListener('mouseup',   onPointerUp)
  window.addEventListener('touchend',  onPointerUp)
  window.addEventListener('keydown',   onKeydown)
})

onUnmounted(() => {
  cancelAnimationFrame(rafId)
  clearInterval(videoInterval)
  resizeObserver?.disconnect()
  window.removeEventListener('keydown', onKeydown)
  if (isMobile) return
  const el = rootEl.value
  if (!el) return
  el.removeEventListener('wheel',      onWheel)
  el.removeEventListener('mousedown',  onPointerDown)
  el.removeEventListener('touchstart', onPointerDown)
  window.removeEventListener('mousemove', onPointerMove)
  window.removeEventListener('touchmove', onPointerMove)
  window.removeEventListener('mouseup',   onPointerUp)
  window.removeEventListener('touchend',  onPointerUp)
})
</script>

<style scoped>
.pg-root {
  position: relative;
  width: 100%;
  height: 100vh;
  overflow: hidden;
  cursor: ns-resize;
  background: var(--bg-tint, #fff);
  transition: background 0.6s ease;
}

@media (hover: none) {
  .pg-root {
    height: auto;
    overflow: visible;
    cursor: auto;
  }
}

.cursor-anchor {
  position: fixed;
  top: 0;
  left: 0;
  pointer-events: none;
  z-index: 500;
}

@media (hover: none) {
  .cursor-anchor { display: none; }
}

.cursor-label {
  background: #1c1c1c;
  color: #fff;
  border-radius: 4px;
  padding: 2px 8px;
  white-space: nowrap;
  transform-origin: top left;
  scale: 0;
  opacity: 0;
  transition: scale 0.2s ease, opacity 0.2s ease;
  margin-top: 10px;
  margin-left: 10px;
}

.cursor-label.is-visible {
  scale: 1;
  opacity: 1;
}

.pg-columns {
  position: absolute;
  inset: 0;
  display: grid;
  gap: calc(var(--spacing) * 4);
  padding: 0 1.5rem;
  grid-template-columns: repeat(var(--col-count), 1fr);
  opacity: 0;
  transition: opacity 0.6s ease;
}

.pg-columns.is-ready {
  opacity: 1;
}

@media (hover: none) {
  .pg-columns {
    position: static;
    padding: 120px 1.5rem 120px;
  }
}

.pg-col {
  position: relative;
  overflow: hidden;
}

.pg-col-inner {
  position: absolute;
  inset: 0 0 auto 0;
  display: flex;
  gap: calc(var(--spacing) * 4);
  flex-direction: column;
  will-change: transform;
}

@media (hover: none) {
  .pg-col {
    overflow: visible;
    height: auto;
  }

  .pg-col-inner {
    position: static;
    will-change: auto;
  }
}

.pg-card {
  width: 100%;
  aspect-ratio: 1 / 1;
  overflow: hidden;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.pg-card video,
.pg-card img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 8px;
  display: block;
  transition: scale 0.3s ease;
  pointer-events: none; /* el click siempre lo recibe .pg-card, nunca el img */
}

@media (hover: hover) {
  .pg-card:hover video,
  .pg-card:hover img {
    scale: 0.92;
  }
}

.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  cursor: default;
}

.modal-box {
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 860px;
  max-height: 90vh;
  background: #1a1a1a;
  border-radius: 6px;
  overflow: hidden;
}

.modal-close {
  position: absolute;
  top: 1rem;
  right: 1rem;
  z-index: 10;
  background: rgba(0, 0, 0, 0.5);
  border: none;
  color: #fff;
  font-size: 1rem;
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}

.modal-close:hover {
  background: rgba(255, 255, 255, 0.15);
}

.modal-media {
  width: 100%;
  aspect-ratio: 1 / 1;
  overflow: hidden;
  background: #111;
  flex-shrink: 0;
}

.modal-media iframe {
  width: 100%;
  height: 100%;
  border: none;
  display: block;
}

.modal-media img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.modal-info {
  padding: 1.25rem 1.5rem 1.5rem;
  flex-shrink: 0;
}

.modal-category {
  font-size: 10px;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: #888;
}

.modal-title {
  font-size: 1.4rem;
  font-weight: 700;
  color: #fff;
  margin: 0.25rem 0 0.5rem;
}

.modal-desc {
  font-size: 0.9rem;
  color: #aaa;
  line-height: 1.6;
  margin: 0;
}

.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.25s ease;
}

.modal-enter-active .modal-box,
.modal-leave-active .modal-box {
  transition: transform 0.25s ease, opacity 0.25s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .modal-box,
.modal-leave-to .modal-box {
  transform: translateY(12px);
  opacity: 0;
}
</style>