<template>
  <div ref="intro" class="intro">
    <p ref="text" class="intro__text">Víctor Duque</p>
  </div>
</template>

<script setup>
import { gsap } from 'gsap'

const emit = defineEmits(['done'])
const intro = ref(null)
const text = ref(null)

onMounted(() => {
  const tl = gsap.timeline()

  tl.from(text.value, {
    opacity: 0,
    y: 40,
    duration: 1,
    ease: 'power3.out'
  })
  .to(text.value, {
    opacity: 0,
    y: -40,
    duration: 0.8,
    ease: 'power3.in',
    delay: 0.8
  })
  .to(intro.value, {
    opacity: 0,
    duration: 0.6,
    ease: 'power2.out',
    onComplete: () => emit('done')
  })
})
</script>

<style scoped>
.intro {
  position: fixed;
  inset: 0;
  background: #000;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.intro__text {
  color: #fff;
  font-size: 3rem;
  font-family: 'Inter';
  letter-spacing: 0.1em;
}
</style>