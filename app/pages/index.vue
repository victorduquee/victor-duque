<template>
  <div class="home-page" @mousemove="onMouseMove">
    <div class="cursor-anchor" :style="{ transform: `translate(${cursor.x}px, ${cursor.y}px)` }">
      <div class="cursor-label t-ui" :class="{ 'is-visible': cursor.visible }">{{ lang === 'en' ? 'View' : 'Ver' }}</div>
    </div>
    <div class="slider-wrap">
      <div class="slider" ref="slider" :class="{ 'slider--pre-intro': showIntroLetters, 'slider--fading': filterFading, 'slider--ready': slidesReady }">
        <NuxtLink
          v-for="(project, i) in loopedProjects"
          :key="`${project.slug}-${i}`"
          :to="`/projects/${project.slug}`"
          class="slide"
          :ref="el => { if (el) slides[i] = el.$el ?? el }"
          @mouseenter="slidesReady && (cursor.visible = true)"
          @mouseleave="cursor.visible = false"
        >
          <div class="slide__img">
            <div class="slide__img-inner">
              <img v-if="project.cover" :src="project.cover" :alt="project.title" loading="lazy" decoding="async" />
            </div>
          </div>
          <div class="slide__info-wrap">
            <div class="slide__info">
              <span class="slide__title">{{ project.title }}</span>
              <span class="slide__year">{{ project.year }}</span>
            </div>
          </div>
        </NuxtLink>
      </div>
    </div>

    <div v-if="showIntroLetters" class="intro-stage" ref="introStageEl">
      <div class="intro-block-wrap" ref="introLogoWrapEl">
        <div class="intro-logo-block" ref="introLogoEl">
          <img src="/intro/Logo_estatico.svg" class="intro-logo__img" alt="" />
        </div>
      </div>
      <div class="intro-block-wrap" ref="introPhotoWrapEl">
        <div class="intro-photo-block" ref="introPhotoEl">
          <img v-for="(src, i) in introPhotos" :key="i" :src="src" class="intro-photo__img" :style="{ zIndex: introPhotos.length - i }" />
        </div>
      </div>
      <div class="intro-block-wrap" ref="introNameWrapEl">
        <div class="intro-name-block" ref="introNameEl">
          <span class="t-label">Víctor Duque</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { gsap } from 'gsap'
import { projects } from '~/data/projects.js'

// Tracked on `window` (not module scope) so a re-imported chunk during SPA
// navigation can't reset it — only a real hard reload creates a fresh window.
function hasPlayedIntro() {
  return typeof window !== 'undefined' && window.__introPlayed === true
}
function markIntroPlayed() {
  if (typeof window !== 'undefined') window.__introPlayed = true
}

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

useSeoMeta({
  title: 'Víctor Duque — Diseñador gráfico',
  description: 'Portfolio de Víctor Duque, diseñador gráfico especializado en identidad visual y branding.',
  ogTitle: 'Víctor Duque — Diseñador gráfico',
  ogDescription: 'Portfolio de Víctor Duque, diseñador gráfico especializado en identidad visual y branding.',
  ogImage: '/thumbnails/ciuden.jpg',
  twitterCard: 'summary_large_image',
})

const lang = useLang()
const cursor = ref({ x: 0, y: 0, visible: false })
const slidesReady = ref(hasPlayedIntro())

function onMouseMove(e) {
  cursor.value.x = e.clientX
  cursor.value.y = e.clientY
}

const slider = ref(null)
const slides = ref([])
const cornersVisible = useState('cornersVisible', () => true)
const showIntroLetters = ref(!hasPlayedIntro())
const introStageEl = ref(null)
const introLogoWrapEl = ref(null)
const introPhotoWrapEl = ref(null)
const introNameWrapEl = ref(null)
const introLogoEl = ref(null)
const introPhotoEl = ref(null)
const introNameEl = ref(null)

const introPhotos = computed(() =>
  sortedProjects.filter(p => p.cover).slice(0, 4).map(p => p.cover)
)
const sortedProjects = [...projects].sort((a, b) => parseInt(b.year) - parseInt(a.year))
const loopedProjects = computed(() =>
  isMobile ? sortedProjects : [...sortedProjects, ...sortedProjects, ...sortedProjects]
)
const centeredLoopOffset = computed(() => projects.length)

cornersVisible.value = hasPlayedIntro()

let y = 0
let targetY = 0
let loopH = 0
let rafId = null
let wheelEnabled = false

function calcLoopH() {
  const a = slides.value[0]
  const b = slides.value[projects.length]
  if (!a || !b) return
  loopH = b.getBoundingClientRect().top - a.getBoundingClientRect().top
}

function initY() {
  if (!loopH) return
  y = targetY = -loopH
}

function centerOnProject() {
  if (!loopH || !slider.value) return

  const targetSlide = slides.value[centeredLoopOffset.value]
  if (!targetSlide) return

  const desiredY = window.innerHeight / 2 - targetSlide.offsetTop - targetSlide.offsetHeight / 2

  y = targetY = desiredY
  wrapY()
  gsap.set(slider.value, { y })
}

function wrapY() {
  if (!loopH) return
  while (y <= -2 * loopH) { y += loopH; targetY += loopH }
  while (y > 0) { y -= loopH; targetY -= loopH }
}

const isMobile = typeof window !== 'undefined' && window.matchMedia('(hover: none)').matches

function animate() {
  y += (targetY - y) * 0.08
  wrapY()
  if (slider.value) gsap.set(slider.value, { y })
  rafId = requestAnimationFrame(animate)
}

const onWheel = (e) => {
  if (!wheelEnabled) return
  targetY -= e.deltaY
}

const onResize = () => {
  calcLoopH()
  centerOnProject()
}

function playIntro() {
  const all = slides.value.filter(Boolean)

  if (hasPlayedIntro()) {
    wheelEnabled = true

    cornersVisible.value = true
    const slideInfos = all.map(el => el.querySelector('.slide__info')).filter(Boolean)
    gsap.set(slideInfos, { y: 0, opacity: 1 })
    nextTick(calcLoopH)
    return
  }
  markIntroPlayed()

  const SIZE = window.innerWidth > 768 ? window.innerWidth / 20 : window.innerWidth / 12
  const RADIUS = SIZE * 0.1
  const PADDING = SIZE * 0.15
  const PADDING_V = SIZE * 0.009
  const PADDING_H = SIZE * 0.3
  const fontSize = SIZE - PADDING_V * 2

  const GAP = SIZE * 0.2
  introStageEl.value.style.gap = `${GAP}px`

  // Wrappers: clip overflow para la animación de entrada y salida
  gsap.set(introLogoWrapEl.value,  { overflow: 'hidden', height: SIZE })
  gsap.set(introPhotoWrapEl.value, { overflow: 'hidden', height: SIZE, width: 0, marginLeft: -GAP / 2, marginRight: -GAP / 2 })
  gsap.set(introNameWrapEl.value,  { overflow: 'hidden', height: SIZE })

  // Bloques interiores: tamaños, padding, y empiezan debajo del wrapper
  gsap.set(introLogoEl.value, { height: SIZE, padding: PADDING, borderRadius: RADIUS, y: SIZE })
  gsap.set(introPhotoEl.value, { width: SIZE, height: SIZE, overflow: 'hidden', borderRadius: RADIUS })
  gsap.set(introNameEl.value, { height: SIZE, borderRadius: RADIUS, paddingTop: PADDING_V, paddingBottom: PADDING_V, paddingLeft: PADDING_H, paddingRight: PADDING_H, y: SIZE })
  gsap.set(introNameEl.value.querySelector('.t-label'), { fontSize })

  const photoImgs = introPhotoEl.value.querySelectorAll('.intro-photo__img')
  gsap.set(photoImgs, { scale: 0 })

  // Galería: estado inicial para animación de entrada (solo slides visibles)
  const vh = window.innerHeight
  const visibleSlides = all.filter(el => {
    const r = el.getBoundingClientRect()
    return r.top < vh && r.bottom > 0
  })
  const slideImgs = visibleSlides.map(el => el.querySelector('.slide__img img')).filter(Boolean)
  const slideInfos = visibleSlides.map(el => el.querySelector('.slide__info')).filter(Boolean)
  gsap.set(all.map(el => el.querySelector('.slide__img img')).filter(Boolean), { y: '100%' })
  gsap.set(all.map(el => el.querySelector('.slide__info')).filter(Boolean), { y: '100%', opacity: 1 })

  const tl = gsap.timeline({
    onComplete: () => {
      showIntroLetters.value = false
      wheelEnabled = true
  
      cornersVisible.value = true

      // Los no visibles aparecen directamente sin animación
      const allImgs = all.map(el => el.querySelector('.slide__img img')).filter(Boolean)
      const allInfos = all.map(el => el.querySelector('.slide__info')).filter(Boolean)
      gsap.set(allImgs.filter(el => !slideImgs.includes(el)), { y: 0 })
      gsap.set(allInfos.filter(el => !slideInfos.includes(el)), { y: 0 })

      // Los visibles entran con animación
      gsap.to(slideImgs, {
        y: 0, duration: 0.9, ease: 'power3.out',
        stagger: { each: 0.08, from: 'start' }
      })
      setTimeout(() => { slidesReady.value = true }, 950)
      gsap.to(slideInfos, {
        y: 0, duration: 0.7, ease: 'power3.out',
        stagger: { each: 0.08, from: 'start' }, delay: 0.1
      })
    }
  })

  // 1. Logo y nombre suben enmascarados desde abajo
  tl.to([introLogoEl.value, introNameEl.value], {
    y: 0, duration: 0.7, ease: 'power3.out', stagger: 0.08
  })
  tl.to({}, { duration: 0.3 })

  // 2. El wrapper de fotos abre el hueco; el bloque interior sube enmascarado
  gsap.set(introPhotoEl.value, { y: SIZE })
  tl.to(introPhotoWrapEl.value, { width: SIZE, marginLeft: 0, marginRight: 0, duration: 0.6, ease: 'power3.inOut' })
  tl.to(introPhotoEl.value, { y: 0, duration: 0.5, ease: 'power3.out' }, '-=0.4')

  // 3. Fotos aparecen una a una dentro del hueco
  tl.to(photoImgs, {
    scale: 1, duration: 0.4, ease: 'power2.out',
    stagger: { each: 0.18, from: 'end' }
  }, '-=0.1')

  tl.to({}, { duration: 0.8 })

  // 4. Salen: bloques interiores suben enmascarados, fotos hacia abajo
  tl.to([introLogoEl.value, introPhotoEl.value, introNameEl.value], { y: -SIZE, duration: 0.55, ease: 'power3.in', stagger: 0.06 }, 'exit')
}

onMounted(() => {
  nextTick(() => {
    if (!isMobile) {
      calcLoopH()
      initY()
      centerOnProject()
      animate()
    }
    playIntro()
  })

  if (!isMobile) {
    window.addEventListener('wheel', onWheel, { passive: true })
    window.addEventListener('resize', onResize)
  }
})

onUnmounted(() => {
  if (rafId) cancelAnimationFrame(rafId)
  if (!isMobile) {
    window.removeEventListener('wheel', onWheel)
    window.removeEventListener('resize', onResize)
  }
  cornersVisible.value = true
})
</script>

<style scoped>
.home-page {
  height: 100vh;
  overflow: hidden;
}

.slider-wrap {
  height: 100%;
  display: flex;
  justify-content: center;
  overflow: hidden;
}

@media (hover: none) {
  .home-page {
    height: auto;
    overflow: visible;
  }

  .slider-wrap {
    height: auto;
    overflow: visible;
    padding: 120px 0 120px;
  }
}

.slider {
  display: flex;
  flex-direction: column;
  gap: 3rem;
  padding: 0;
  will-change: transform;
  backface-visibility: hidden;
  transition: opacity 0.25s ease;
}

.slider--fading {
  opacity: 0;
}

.slider--pre-intro .slide {
  opacity: 0;
  pointer-events: none;
}

.slide {
  transition: opacity 0.3s ease, filter 0.3s ease;
}

.slide {
  width: 30vw;
  color: #000;
  text-decoration: none;
  display: block;
}

.slide__img {
  width: 100%;
  aspect-ratio: 1/1;
  border-radius: 8px;
  overflow: hidden;
}

.slide__img-inner {
  width: 100%;
  height: 100%;
  transition: transform 0.3s ease;
}

@media (hover: hover) {
  .slider--ready .slide:hover .slide__img-inner {
    transform: scale(0.92);
  }
}

.slide__img img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 8px;
}

.slide__info-wrap {
  overflow: hidden;
  padding-top: 0.75rem;
}

.slide__info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  opacity: 0;
  font-size: 1.2rem;
  font-weight: 600;
}

.slide__year {
  opacity: 0.5;
  background: #ebebeb;
  border-radius: 8px;
  padding: 0px 8px;
}

@media (max-width: 1200px) {
  .slide { width: 35vw; }
}
@media (max-width: 900px) {
  .slide { width: 40vw; }
}
@media (max-width: 640px) {
  .slide { width: calc(100vw - 3rem); }
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

.intro-stage {
  position: fixed;
  inset: 0;
  z-index: 300;
  pointer-events: none;
  display: flex;
  align-items: center;
  justify-content: center;
}

.intro-block-wrap {
  overflow: hidden;
  flex-shrink: 0;
  height: 0;
}

.intro-logo-block {
  background: #20ff00;
  flex-shrink: 0;
  overflow: hidden;
  border-radius: 12px;
  transform: translateY(100%);
}

.intro-logo__img {
  width: auto;
  height: 100%;
  display: block;
}

.intro-photo-block {
  position: relative;
  flex-shrink: 0;
  overflow: hidden;
  border-radius: 12px;
}

.intro-photo__img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.intro-name-block {
  background: #ebebeb;
  display: flex;
  align-items: center;
  padding: 0;
  white-space: nowrap;
  flex-shrink: 0;
  border-radius: 12px;
  transform: translateY(100%);
}

.intro-name-block .t-label {
  font-weight: 800;
  letter-spacing: -0.03em;
  text-transform: none;
}

</style>
