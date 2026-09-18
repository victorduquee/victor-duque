<template>
  <section ref="rootEl" class="pg-root" @mousemove="onMouseMove">
    <div v-if="!isTouchDevice" class="cursor-anchor" :style="{ transform: `translate(${cursorLabel.x}px, ${cursorLabel.y}px)` }">
      <div class="cursor-label t-ui" :class="{ 'is-visible': cursorLabel.text }">{{ cursorLabel.text }}</div>
    </div>
    <div class="pg-columns" :style="{ '--col-count': colCount }" :class="{ 'is-ready': ready }">
      <div v-for="(col, ci) in activeColumns" :key="ci" class="pg-col">
        <div :ref="el => colInners[ci] = el" class="pg-col-inner">
          <div v-for="item in col.items" :key="item.id" class="pg-card" :data-id="item.id">
            <video v-if="item.category === 'video'" :src="item.src" muted loop autoplay playsinline preload="auto" />
            <img v-else :src="item.cover ?? item.src" :alt="item.title" />
          </div>
        </div>
      </div>
    </div>

    <Transition name="modal">
      <div v-if="activeItem" class="modal-backdrop" @click="handleModalBackdropClick">
        <div class="modal-controls">
          <button class="modal-close" @click="closeModal" aria-label="Cerrar">
            <span class="modal-close__icon">
              <span class="modal-close__bar modal-close__bar--h"></span>
              <span class="modal-close__bar modal-close__bar--v"></span>
            </span>
          </button>
          <button class="modal-nav modal-nav--prev" type="button" aria-label="Anterior" @click.stop="navigateModal(-1)">
            <span aria-hidden="true">←</span>
          </button>
          <button class="modal-nav modal-nav--next" type="button" aria-label="Siguiente" @click.stop="navigateModal(1)">
            <span aria-hidden="true">→</span>
          </button>
        </div>
        <button v-if="!isTouchDevice && modalNavLabel" class="modal-cursor-label t-ui" :class="{ 'is-prev': modalNavLabel === 'Prev' }"
          :style="{ transform: `translate(${cursorLabel.x}px, ${cursorLabel.y}px)` }"
          @click="navigateModal(modalNavLabel === 'Prev' ? -1 : 1)" type="button">
          {{ modalNavLabel }}
        </button>
        <div class="modal-box">
          <div class="modal-media">
            <iframe v-if="activeItem.category === 'herramienta'" :src="activeItem.src" frameborder="0" />
            <video v-else-if="activeItem.category === 'video'" :src="activeItem.src" autoplay loop playsinline muted
              class="pg-modal__img" />
            <img v-else :src="activeItem.src" :alt="activeItem.title" />
          </div>
          <div class="modal-info">
            <h2 class="t-body">{{ activeItem.title }}</h2>
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

const SPEEDS = [1, 0.85, 1.1, 0.9]
const FRICTION = 0.90
const BREAKPOINTS = { sm: 560, md: 860 }

const isMobile = typeof window !== 'undefined' && window.matchMedia('(hover: none)').matches
const isTouchDevice = ref(false)

onMounted(() => {
  const mediaQuery = window.matchMedia('(hover: none)')
  const updateTouchMode = () => {
    isTouchDevice.value = mediaQuery.matches
    if (isTouchDevice.value) {
      cursorLabel.value.text = ''
      modalNavLabel.value = ''
      modalNavPos.value = { x: 0, y: 0 }
    }
  }

  updateTouchMode()
  mediaQuery.addEventListener?.('change', updateTouchMode)
})

const rootEl = ref(null)
const colInners = ref([])
const colCount = ref(4)

const activeColumns = computed(() =>
  Array.from({ length: colCount.value }, (_, ci) => ({
    items: labItems.filter((_, i) => i % colCount.value === ci),
  }))
)

let yPositions = []
let velocities = []
let originalHeights = []
let rafId = null
let videoInterval = null
let resizeObserver = null
let isDragging = false
let dragMoved = false
let lastPointerY = 0

const activeItem = ref(null)
const cursorLabel = ref({ text: '', x: 0, y: 0 })
const modalNavLabel = ref('')
const modalNavPos = ref({ x: 0, y: 0 })
const ready = ref(false)

function onMouseMove(e) {
  if (isTouchDevice.value) {
    cursorLabel.value.text = ''
    modalNavLabel.value = ''
    modalNavPos.value = { x: 0, y: 0 }
    return
  }

  cursorLabel.value.x = e.clientX
  cursorLabel.value.y = e.clientY

  if (activeItem.value) {
    const label = e.clientX < window.innerWidth / 2 ? 'Prev' : 'Next'
    modalNavLabel.value = label
    const offsetX = label === 'Prev' ? -20 : 20
    modalNavPos.value = {
      x: e.clientX + offsetX,
      y: e.clientY + 18,
    }
  }
}

function onCardEnter(e) {
  if (isTouchDevice.value) return

  const card = e.currentTarget
  const item = labItems.find(p => p.id === card.dataset.id)
  if (item) cursorLabel.value.text = item.title
}

function onCardLeave() {
  cursorLabel.value.text = ''
}

function closeModal() {
  activeItem.value = null
  modalNavLabel.value = ''
  modalNavPos.value = { x: 0, y: 0 }
}

function handleModalBackdropClick(event) {
  if (!activeItem.value) return

  if (event.target.closest('.modal-close') || event.target.closest('.modal-cursor-label')) return

  if (event.target.closest('.modal-box')) {
    const direction = event.clientX < window.innerWidth / 2 ? -1 : 1
    navigateModal(direction)
    return
  }

  if (event.target !== event.currentTarget) return

  const direction = event.clientX < window.innerWidth / 2 ? -1 : 1
  navigateModal(direction)
}

function navigateModal(direction) {
  if (!activeItem.value) return

  const currentIndex = labItems.findIndex(item => item.id === activeItem.value.id)
  const nextIndex = currentIndex === -1
    ? 0
    : (currentIndex + direction + labItems.length) % labItems.length

  activeItem.value = labItems[nextIndex]
  const label = direction < 0 ? 'Prev' : 'Next'
  modalNavLabel.value = label
  modalNavPos.value = {
    x: cursorLabel.value.x + (label === 'Prev' ? -20 : 20),
    y: cursorLabel.value.y + 18,
  }
}

function onKeydown(e) {
  if (e.key === 'Escape') closeModal()
  if (!activeItem.value) return

  if (e.key === 'ArrowLeft') {
    navigateModal(-1)
  }
  if (e.key === 'ArrowRight') {
    navigateModal(1)
  }
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
      if (item) {
        activeItem.value = item
        const label = typeof window !== 'undefined' && cursorLabel.value.x < window.innerWidth / 2 ? 'Prev' : 'Next'
        modalNavLabel.value = label
        modalNavPos.value = {
          x: cursorLabel.value.x + (label === 'Prev' ? -20 : 20),
          y: cursorLabel.value.y + 18,
        }
      }
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
    while (current > 0) current -= h

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
    yPositions[i] = 0
    velocities[i] = 0
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
    inner.querySelectorAll('video').forEach(v => { v.muted = true; v.load(); v.play().catch(() => { }) })
  })
}

function onWheel(e) {
  if (activeItem.value) return
  e.preventDefault()
  addDelta(e.deltaY * 0.2)
}

function onPointerDown(e) {
  if (activeItem.value) return
  isDragging = true
  dragMoved = false
  lastPointerY = e.clientY ?? e.touches?.[0]?.clientY
}

function onPointerMove(e) {
  if (!isDragging) return
  const y = e.clientY ?? e.touches?.[0]?.clientY
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
    while (y > 0) y -= newH
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
    inner.querySelectorAll('video').forEach(v => { v.muted = true; v.load(); v.play().catch(() => { }) })
  })
}

onMounted(async () => {
  if (isMobile) {
    colCount.value = getColCount(rootEl.value.offsetWidth)
    await nextTick()
    attachCardListeners(rootEl.value)
    rootEl.value.querySelectorAll('video').forEach(v => { v.muted = true; v.load(); v.play().catch(() => { }) })
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
      if (v.paused) v.play().catch(() => { })
    })
  }, 300)

  resizeObserver = new ResizeObserver(async ([entry]) => {
    const width = entry.contentRect.width
    const next = getColCount(width)
    if (next !== colCount.value) {
      colCount.value = next
      await reinit()
    } else {
      await recalcHeights()
    }
  })
  resizeObserver.observe(rootEl.value)

  const el = rootEl.value
  el.addEventListener('wheel', onWheel, { passive: false })
  el.addEventListener('mousedown', onPointerDown)
  el.addEventListener('touchstart', onPointerDown, { passive: true })
  window.addEventListener('mousemove', onPointerMove)
  window.addEventListener('touchmove', onPointerMove, { passive: true })
  window.addEventListener('mouseup', onPointerUp)
  window.addEventListener('touchend', onPointerUp)
  window.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  cancelAnimationFrame(rafId)
  clearInterval(videoInterval)
  resizeObserver?.disconnect()
  window.removeEventListener('keydown', onKeydown)
  if (isMobile) return
  const el = rootEl.value
  if (!el) return
  el.removeEventListener('wheel', onWheel)
  el.removeEventListener('mousedown', onPointerDown)
  el.removeEventListener('touchstart', onPointerDown)
  window.removeEventListener('mousemove', onPointerMove)
  window.removeEventListener('touchmove', onPointerMove)
  window.removeEventListener('mouseup', onPointerUp)
  window.removeEventListener('touchend', onPointerUp)
})
</script>

<style scoped>
.pg-root {
  position: relative;
  width: 100%;
  height: 100vh;
  overflow: hidden;
  cursor: ns-resize;
  background: transparent;
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
  .cursor-anchor,
  .cursor-label,
  .modal-cursor-label {
    display: none !important;
  }
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

:global(html[data-theme='dark']) .cursor-label,
:global(html[data-theme='dark']) .modal-cursor-label,
html[data-theme='dark'] .cursor-label,
html[data-theme='dark'] .modal-cursor-label {
  background: #fff;
  color: #000;
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
  pointer-events: none;
  /* el click siempre lo recibe .pg-card, nunca el img */
}

video {
  controls: false;
}

@media (hover: hover) {

  .pg-card:hover video,
  .pg-card:hover img {
    scale: 0.92;
  }
}

.modal-controls {
  position: fixed;
  bottom: 1.5rem;
  left: 1.5rem;
  z-index: 200;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 80;
  background: var(--bg);
  color: var(--text);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  cursor: default;
  transition: background 0.2s ease, color 0.2s ease;
}

.modal-box {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  margin: 0 auto;
}

.modal-close {
  position: relative;
  width: 36px;
  height: 36px;
  z-index: 200;
  background: var(--panel);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: none;
  border-radius: 4px;
  cursor: pointer;
  color: var(--text);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s ease, transform 0.15s ease;
  padding: 0;
}

.modal-nav {
  position: relative;
  width: 36px;
  height: 36px;
  z-index: 200;
  background: var(--panel);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: none;
  border-radius: 4px;
  cursor: pointer;
  color: var(--text);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s ease, transform 0.15s ease;
  padding: 0;
  font-size: 1.4rem;
  line-height: 1;
  font-weight: 900;
}

.modal-nav span {
  font-weight: 900;
}

.modal-nav:hover,
.modal-close:hover {
  background: var(--panel-hover);
}

.modal-nav:active,
.modal-close:active {
  transform: scale(0.97);
}

.modal-close__icon {
  position: relative;
  width: 16px;
  height: 16px;
  display: block;
  transform: rotate(45deg);
}

.modal-close__bar {
  position: absolute;
  background: var(--text);
  border-radius: 1px;
}

.modal-close__bar--h {
  width: 16px;
  height: 4px;
  top: 50%;
  left: 0;
  transform: translateY(-50%);
}

.modal-close__bar--v {
  width: 4px;
  height: 16px;
  left: 50%;
  top: 0;
  transform: translateX(-50%);
}

.modal-cursor-label {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 200;
  background: #1c1c1c;
  color: #fff;
  border-radius: 4px;
  padding: 2px 8px;
  white-space: nowrap;
  transform-origin: top left;
  margin-top: 10px;
  margin-left: 10px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  pointer-events: auto;
}

.modal-media {
  width: 100%;
  aspect-ratio: 1 / 1;
  max-height: calc(100vh - 20rem);
  overflow: hidden;
  background: var(--bg-alt);
  border-radius: 6px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
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
  padding: 1rem 0rem 0rem 0rem;
  flex-shrink: 0;
  color: inherit;
}

.modal-title {
  color: inherit;
}

.modal-category {
  font-size: 10px;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: var(--text-soft);
}

.modal-desc {
  font-size: 0.9rem;
  color: inherit;
  opacity: 0.8;
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