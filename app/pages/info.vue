<template>
  <div class="info layout">
    <!-- Left: scroll-controlled 3D model -->
    <aside class="info__model-col">
      <canvas ref="canvasEl" class="info__canvas" />
    </aside>

    <!-- Right: headline + content -->
    <div class="info__content">
      <h1 class="info__headline t-label">
        <LetterReveal :text="ti.headline" :delay="0.6" :stagger="0.015" :duration="0.3" />
      </h1>
      <section class="info__section">
        <p class="info__label t-section-label">{{ ti.sections.bio }}</p>
        <div class="info__section-content">
          <p class="info__body t-body">{{ ti.bio1 }}</p>
          <p class="info__body t-body">{{ ti.bio2 }}</p>
        </div>
      </section>

      <section class="info__section">
        <p class="info__label t-section-label">{{ ti.sections.disciplines }}</p>
        <ul class="info__list info__section-content">
          <li v-for="d in ti.disciplines" :key="d" class="t-body">{{ d }}</li>
        </ul>
      </section>

      <section class="info__section">
        <p class="info__label t-section-label">{{ ti.sections.tools }}</p>
        <ul class="info__list info__section-content">
          <li v-for="tool in ti.tools" :key="tool" class="t-body">{{ tool }}</li>
        </ul>
      </section>

      <section class="info__section">
        <p class="info__label t-section-label">{{ ti.sections.education }}</p>
        <div class="info__section-content">
          <div v-for="e in ti.education" :key="e.year" class="info__entry">
            <span class="info__entry-year t-section-label">{{ e.year }}</span>
            <span class="info__entry-text t-body">{{ e.text }}</span>
          </div>
        </div>
      </section>

      <section class="info__section">
        <p class="info__label t-section-label">{{ ti.sections.experience }}</p>
        <div class="info__section-content">
          <div v-for="e in ti.experience" :key="e.company" class="info__entry">
            <span class="info__entry-year t-section-label">{{ e.year }}</span>
            <span class="info__entry-text t-body">{{ e.company }}</span>
            <span class="info__entry-text t-body-2">{{ e.role }}</span>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js'
import { translations } from '~/data/i18n.js'

const lang = useLang()
const ti = computed(() => translations[lang.value].info)

useHead({
  script: [{
    type: 'application/ld+json',
    innerHTML: JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Person',
      name: 'Víctor Duque',
      jobTitle: 'Diseñador gráfico',
      url: 'https://victorduque.es',
      sameAs: [
        'https://www.behance.net/victorduquegarcia',
        'https://www.instagram.com/victorduque.ai/',
      ],
    }),
  }],
})

useHead({
  link: [{ rel: 'preload', href: '/model.glb', as: 'fetch', crossorigin: 'anonymous' }]
})

useSeoMeta({
  title: 'Info — Víctor Duque',
  description: 'Diseñador gráfico y creativo visual con base en Barcelona, especializado en identidad visual y branding.',
  ogTitle: 'Info — Víctor Duque',
  ogDescription: 'Diseñador gráfico y creativo visual con base en Barcelona, especializado en identidad visual y branding.',
  ogImage: '/thumbnails/ciuden.jpg',
  twitterCard: 'summary_large_image',
})

const canvasEl = ref(null)
const { $lenis } = useNuxtApp()

let renderer, scene, camera, model
let rafId = null
let targetRotY = 0
let currentRotY = 0
let isDragging = false
let lastPointerX = 0
let lastPointerY = 0
let dragDecided = false
let lastScroll = 0

function lerp(a, b, t) { return a + (b - a) * t }

function onPointerDown(e) {
  isDragging = true
  dragDecided = false
  lastPointerX = e.clientX
  lastPointerY = e.clientY
}

function onPointerMove(e) {
  if (!isDragging) return
  const dx = e.clientX - lastPointerX
  const dy = e.clientY - lastPointerY

  if (!dragDecided) {
    if (Math.abs(dx) < 4 && Math.abs(dy) < 4) return
    dragDecided = true
    // Si el gesto es más vertical que horizontal, cancelar drag
    if (Math.abs(dy) > Math.abs(dx)) {
      isDragging = false
      return
    }
  }

  targetRotY += dx * 0.01
  lastPointerX = e.clientX
  lastPointerY = e.clientY
}

function onPointerUp() {
  isDragging = false
  dragDecided = false
}

function onLenisScroll({ scroll }) {
  const delta = scroll - lastScroll
  lastScroll = scroll
  targetRotY += delta * 0.005
}

function tick() {
  if (!isDragging) targetRotY += 0.002
  currentRotY = lerp(currentRotY, targetRotY, 0.06)
  if (model) model.rotation.y = currentRotY
  renderer?.render(scene, camera)
  rafId = requestAnimationFrame(tick)
}

function resize() {
  const canvas = canvasEl.value
  if (!canvas || !renderer || !camera) return
  const w = canvas.clientWidth
  const h = canvas.clientHeight
  renderer.setSize(w, h, false)
  const frustum = 1.2
  const aspect = w / h
  camera.left   = -frustum * aspect
  camera.right  =  frustum * aspect
  camera.top    =  frustum
  camera.bottom = -frustum
  camera.updateProjectionMatrix()
}

onMounted(() => {
  const canvas = canvasEl.value
  if (!canvas) return

  // Renderer
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.NeutralToneMapping
  renderer.toneMappingExposure = 1.0

  // Scene
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x20ff00)

  // Environment HDRI
  const pmrem = new THREE.PMREMGenerator(renderer)
  pmrem.compileEquirectangularShader()
  new RGBELoader().load('/studio.hdr', (hdr) => {
    scene.environment = pmrem.fromEquirectangular(hdr).texture
    hdr.dispose()
    pmrem.dispose()
  })

  // Camera
  const frustum = 1.2
  camera = new THREE.OrthographicCamera(-frustum, frustum, frustum, -frustum, 0.1, 100)
  camera.position.set(0, 0.5, 14)
  camera.lookAt(0, 0, 0)

  const ambient = new THREE.AmbientLight(0xffffff, 0.5)
  scene.add(ambient)

  // Load model
  const loader = new GLTFLoader()
  loader.load('/model.glb', (gltf) => {
    model = gltf.scene

    // Centrar y escalar para que quepa bien
    const box = new THREE.Box3().setFromObject(model)
    const center = box.getCenter(new THREE.Vector3())
    const size = box.getSize(new THREE.Vector3())
    const maxAxis = Math.max(size.x, size.y, size.z)
    model.position.sub(center)
    model.position.y -= 0.4
    model.scale.setScalar(2.6 / maxAxis)

    scene.add(model)
  })

  canvas.addEventListener('pointerdown', onPointerDown)
  canvas.addEventListener('pointermove', onPointerMove)
  canvas.addEventListener('pointerup', onPointerUp)
  canvas.addEventListener('pointercancel', onPointerUp)
  canvas.style.cursor = 'grab'

  resize()
  window.addEventListener('resize', resize)
  $lenis?.on('scroll', onLenisScroll)

  nextTick(() => {
    $lenis?.resize()
    resize()
  })

  tick()
})

onUnmounted(() => {
  if (rafId) cancelAnimationFrame(rafId)
  $lenis?.off('scroll', onLenisScroll)
  window.removeEventListener('resize', resize)
  const canvas = canvasEl.value
  if (canvas) {
    canvas.removeEventListener('pointerdown', onPointerDown)
    canvas.removeEventListener('pointermove', onPointerMove)
    canvas.removeEventListener('pointerup', onPointerUp)
    canvas.removeEventListener('pointercancel', onPointerUp)
  }
  renderer?.dispose()
})
</script>

<style scoped>
.info {
  height: auto;
  min-height: 100vh;
  align-items: start;
}

/* ── Left column ── */
.info__model-col {
  @apply col-start-1 col-end-5;
  position: sticky;
  top: 0;
  height: 100vh;
  padding: 100px 0;
  display: flex;
  align-items: start;
  justify-content: center;
}


.info__canvas {
  width: 100%;
  aspect-ratio: 1 / 1;
  border-radius: 8px;
  display: block;
  touch-action: none;
  background: #20ff00;
}

/* ── Right column ── */
.info__content {
  @apply col-start-7 col-end-13;
  padding: 100px 0 100px 0;
  display: flex;
  flex-direction: column;
  gap: 6rem;
}

.info__section {
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: 1rem;
  align-items: start;
}

.info__section-content {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}

.info__label {
  padding-top: 0.15em;
}

.info__body a {
  color: inherit;
  text-decoration: underline;
  text-underline-offset: 3px;
}

.info__list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  font-size: 1rem;
  line-height: 1.4;
}

.info__entry {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  align-items: baseline;
  margin-bottom: 1.2rem;
}

.info__entry-year {
  opacity: 0.4;
  white-space: nowrap;
}

.info__entry-text {}

/* ── Responsive ── */
@media (max-width: 400px) {
  .info__section {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .info {
    display: flex;
    flex-direction: column;
  }

  .info__model-col {
    position: relative;
    height: auto;
    width: 100%;
    padding: 120px 0 0 0;
  }



  .info__content {
    padding: 2rem 0 6rem;
    gap: 3rem;
  }
}
</style>
