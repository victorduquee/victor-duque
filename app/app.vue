<template>
  <div>
    <AppIntro v-if="showIntro" @done="showIntro = false" />
    <template v-else>
      <!-- Esquina superior izquierda -->
      <div class="corner corner--top-left" v-show="cornersVisible">
        <NuxtLink to="/" class="header-logo-box">
          <img src="/intro/Logo_estatico.svg" class="header-logo-img" alt="" />
        </NuxtLink>
        <NuxtLink to="/" class="header-name-box t-ui">Víctor Duque</NuxtLink>
      </div>

      <!-- Esquina superior derecha — desktop -->
      <nav class="corner corner--top-right t-ui nav--desktop" v-show="cornersVisible">
        <NuxtLink to="/" class="header-nav__item" :class="{ 'is-active': isWorksActive }">{{ t.works }}</NuxtLink>
        <NuxtLink to="/info" class="header-nav__item" :class="{ 'is-active': route.path === '/info' }">{{ t.info }}</NuxtLink>
        <NuxtLink to="/lab" class="header-nav__item" :class="{ 'is-active': route.path === '/lab' }">{{ t.lab }}</NuxtLink>
        <div class="contact-corner__wrap">
          <Transition name="contact-links">
            <div v-if="contactOpen" class="contact-corner__links">
              <a href="https://www.behance.net/victorduquegarcia" target="_blank" rel="noopener" class="header-nav__item">Behance</a>
              <a href="mailto:victorduquedesign@gmail.com" class="header-nav__item">Email</a>
              <a href="https://www.instagram.com/victorduque.ai/" target="_blank" rel="noopener" class="header-nav__item">Instagram</a>
            </div>
          </Transition>
          <button class="header-nav__item contact-corner__btn" :class="{ 'is-open': contactOpen }" @click="contactOpen = !contactOpen">
            {{ t.contact }} <span class="contact-corner__arrow">↑</span>
          </button>
        </div>
      </nav>

      <!-- Botón + — mobile -->
      <button
        class="mobile-menu-btn t-ui"
        v-show="cornersVisible"
        @click="mobileMenuOpen = !mobileMenuOpen"
        aria-label="Menú"
      >
        <span class="mobile-menu-btn__icon" :class="{ 'is-open': mobileMenuOpen }">
          <span class="mobile-menu-btn__bar mobile-menu-btn__bar--h"></span>
          <span class="mobile-menu-btn__bar mobile-menu-btn__bar--v"></span>
        </span>
      </button>

      <!-- Modal mobile -->
      <Transition name="mobile-menu">
        <div v-if="mobileMenuOpen" class="mobile-menu">
          <nav class="mobile-menu__nav">
            <NuxtLink to="/" class="mobile-menu__item t-menu" :class="{ 'is-active': isWorksActive }" @click="mobileMenuOpen = false">{{ t.works }}</NuxtLink>
            <NuxtLink to="/info" class="mobile-menu__item t-menu" :class="{ 'is-active': route.path === '/info' }" @click="mobileMenuOpen = false">{{ t.info }}</NuxtLink>
            <NuxtLink to="/lab" class="mobile-menu__item t-menu" :class="{ 'is-active': route.path === '/lab' }" @click="mobileMenuOpen = false">{{ t.lab }}</NuxtLink>
          </nav>
          <div class="mobile-menu__links">
            <a href="https://www.behance.net/victorduquegarcia" target="_blank" rel="noopener" class="mobile-menu__link t-ui">Behance</a>
            <a href="mailto:victorduquedesign@gmail.com" class="mobile-menu__link t-ui">Email</a>
            <a href="https://www.instagram.com/victorduque.ai/" target="_blank" rel="noopener" class="mobile-menu__link t-ui">Instagram</a>
          </div>
        </div>
      </Transition>

      <!-- Botón idioma — abajo derecha -->
      <button
        class="lang-btn t-ui"
        v-show="cornersVisible"
        @click="lang = lang === 'es' ? 'en' : 'es'"
      >{{ lang === 'es' ? 'EN' : 'ES' }}</button>

      <!-- Overlay transición -->
      <div ref="overlay" class="overlay" />
      <NuxtPage :transition="{
        name: 'page',
        mode: 'out-in',
        onLeave,
        onEnter,
        css: false
      }" />
    </template>
  </div>
</template>

<script setup>
import { gsap } from 'gsap'
import { translations } from '~/data/i18n.js'

const showIntro = ref(false)
const overlay = ref(null)
const route = useRoute()
const cornersVisible = useState('cornersVisible', () => false)
const mobileMenuOpen = ref(false)
const contactOpen = ref(false)
const lang = useLang()
const t = computed(() => translations[lang.value].nav)

watch(() => route.path, () => { mobileMenuOpen.value = false; contactOpen.value = false })

const isWorksActive = computed(() =>
  route.path === '/'
)

onMounted(() => {
  if (route.path !== '/') {
    window.__introPlayed = true
    cornersVisible.value = true
  }
})

function onLeave(el, done) {
  gsap.set(overlay.value, { clipPath: 'inset(100% 0 0 0)' })
  gsap.to(overlay.value, {
    clipPath: 'inset(0% 0 0 0)',
    duration: 0.5,
    ease: 'power2.inOut',
    onComplete: done
  })
}

function onEnter(el, done) {
  gsap.to(overlay.value, {
    clipPath: 'inset(0% 0 100% 0)',
    duration: 0.5,
    delay: 0.1,
    ease: 'power2.inOut',
    onComplete: done
  })
}
</script>

<style>
/* ── Esquinas ── */
.corner {
  position: fixed;
  z-index: 100;
  display: flex;
  align-items: flex-start;
}

.corner--top-left {
  top: 1.5rem;
  left: 1.5rem;
  gap: 8px;
  height: 36px;
}

.corner--top-right {
  top: 1.5rem;
  right: 1.5rem;
  gap: 8px;
  height: 36px;
}


.header-logo-box {
  background: #20ff00;
  border-radius: 4px;
  display: flex;
  text-decoration: none;
  align-items: center;
  flex-shrink: 0;
  padding: 6px;
  height: 100%;
}

.header-logo-img {
  height: 24px;
  width: auto;
  display: block;
}

.header-name-box {
  background: rgba(235, 235, 235, 0.7);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-radius: 4px;
  display: flex;
  align-items: center;
  padding: 0 0.6rem;
  color: #000;
  text-decoration: none;
  white-space: nowrap;
  height: 100%
}


.header-nav__item {
  background: rgba(235, 235, 235, 0.7);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-radius: 4px;
  display: flex;
  align-items: center;
  height: 100%;
  padding: 0 0.6rem;
  color: #000;
  text-decoration: none;
  white-space: nowrap;
  transition: background 0.15s ease;
}

.header-nav__item:hover {
  background: rgba(216, 216, 216, 0.8);
}

.header-nav__item.is-active,
.header-nav__item.router-link-exact-active {
  background: #20ff00;
}

/* Botón idioma */
.lang-btn {
  position: fixed;
  bottom: 1.5rem;
  right: 1.5rem;
  z-index: 90;
  background: rgba(235, 235, 235, 0.7);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: none;
  border-radius: 4px;
  height: 36px;
  padding: 0 0.6rem;
  cursor: pointer;
  color: #000;
  transition: background 0.15s ease;
}

.lang-btn:hover {
  background: rgba(216, 216, 216, 0.8);
}


.works-filter__item[href] {
  color: #000;
  text-decoration: none;
}


/* ── Contacto ── */
.contact-corner__wrap {
  position: relative;
  display: flex;
  align-items: stretch;
  height: 100%;
}

.contact-corner__links {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
  z-index: 110;
}

.contact-corner__btn {
  border: none;
  cursor: pointer;
  gap: 0.4em;
}

.contact-corner__btn.is-open {
  color: #a8a8a8;
}

.contact-corner__arrow {
  display: inline-block;
  transition: transform 0.3s ease;
}

.contact-corner__btn.is-open .contact-corner__arrow {
  transform: rotate(180deg);
}

/* Transition links */
.contact-links-enter-active,
.contact-links-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}
.contact-links-enter-from,
.contact-links-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

/* ── Mobile menu button ── */
.mobile-menu-btn {
  display: none;
  position: fixed;
  top: 1.5rem;
  width: 36px;
  height: 36px;
  right: 1.5rem;
  z-index: 200;
  background: rgba(235, 235, 235, 0.7);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1.4rem;
  line-height: 1;
  align-items: center;
  justify-content: center;
  transition: transform 0.3s ease;
  color: #000;
}

.mobile-menu-btn__icon {
  display: block;
  position: relative;
  width: 16px;
  height: 16px;
  transition: transform 0.3s ease;
}

.mobile-menu-btn__icon.is-open {
  transform: rotate(45deg);
}

.mobile-menu-btn__bar {
  position: absolute;
  background: #000;
  border-radius: 1px;
}

.mobile-menu-btn__bar--h {
  width: 16px;
  height: 4px;
  top: 50%;
  left: 0;
  transform: translateY(-50%);
}

.mobile-menu-btn__bar--v {
  width: 4px;
  height: 16px;
  left: 50%;
  top: 0;
  transform: translateX(-50%);
}

/* ── Mobile modal ── */
.mobile-menu {
  position: fixed;
  inset: 0;
  z-index: 150;
  background: #fff;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 120px 1.5rem 1.5rem 1.5rem;
}

.mobile-menu__nav {
  display: flex;
  flex-direction: column;
}

.mobile-menu__item {
  color: #000;
  text-decoration: none;
  font-size: clamp(3rem, 14vw, 6rem);
  font-weight: 800;
  line-height: 1;
  letter-spacing: -0.03em;
  text-transform: none;
  display: inline-block;
  width: 100%;
  align-self: flex-start;
}

.mobile-menu__item.is-active {
  background: #20ff00;
  border-radius: 8px;
  padding: 0 0.1em;
}

.mobile-menu__links {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  align-items: flex-start;
}

.mobile-menu__link {
  background: #ebebeb;
  border-radius: 4px;
  font-family: 'Inter', sans-serif;
  font-size: 1.8rem;
  line-height: 1.2;
  font-weight: 700;
  letter-spacing: -0.5px;
  padding: 0 0.6rem;
}

.mobile-menu__link:hover {
  opacity: 1;
}

/* ── Transition ── */
.mobile-menu-enter-active {
  transition: opacity 0.3s ease;
}
.mobile-menu-leave-active {
  transition: opacity 0.35s ease 0.1s;
}
.mobile-menu-enter-from,
.mobile-menu-leave-to {
  opacity: 0;
}

.mobile-menu-enter-active .mobile-menu__item {
  transition: opacity 0.35s ease, transform 0.35s ease;
}
.mobile-menu-enter-from .mobile-menu__item {
  opacity: 0;
  transform: translateX(-24px);
}
.mobile-menu-enter-active .mobile-menu__item:nth-child(1) { transition-delay: 0.05s; }
.mobile-menu-enter-active .mobile-menu__item:nth-child(2) { transition-delay: 0.12s; }
.mobile-menu-enter-active .mobile-menu__item:nth-child(3) { transition-delay: 0.19s; }

.mobile-menu-enter-active .mobile-menu__links {
  transition: opacity 0.35s ease 0.25s, transform 0.35s ease 0.25s;
}
.mobile-menu-enter-from .mobile-menu__links {
  opacity: 0;
  transform: translateX(-16px);
}

.mobile-menu-leave-active .mobile-menu__item {
  transition: opacity 0.25s ease, transform 0.25s ease;
}
.mobile-menu-leave-to .mobile-menu__item {
  opacity: 0;
  transform: translateX(-24px);
}
.mobile-menu-leave-active .mobile-menu__item:nth-child(1) { transition-delay: 0s; }
.mobile-menu-leave-active .mobile-menu__item:nth-child(2) { transition-delay: 0.05s; }
.mobile-menu-leave-active .mobile-menu__item:nth-child(3) { transition-delay: 0.1s; }

.mobile-menu-leave-active .mobile-menu__links {
  transition: opacity 0.2s ease;
}
.mobile-menu-leave-to .mobile-menu__links {
  opacity: 0;
}

@media (max-width: 900px) {
  .nav--desktop { display: none !important; }
  .mobile-menu-btn { display: flex; }
  .contact-corner { display: none; }
}

@media (max-width: 900px) and (orientation: landscape) {
  .mobile-menu {
    padding-top: 5rem;
    padding-bottom: 1.5rem;
  }

  .mobile-menu__item {
    font-size: clamp(2rem, 8vw, 3.5rem);
  }

  .mobile-menu__links {
    flex-direction: row;
    gap: 0.5rem;
  }
}

/* Overlay transición */
.overlay {
  position: fixed;
  inset: 0;
  background: #eee;
  z-index: 50;
  pointer-events: none;
  clip-path: inset(100% 0 0 0);
}

</style>
