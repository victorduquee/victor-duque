<template>
  <span class="letter-reveal">
    <template v-for="(word, wi) in words" :key="wi">
      <span class="letter-word">
        <span v-for="(char, ci) in word" :key="ci" class="letter-mask">
          <span class="letter" :ref="el => { if (el) letterEls.push(el) }">{{ char }}</span>
        </span>
        <span v-if="wi < words.length - 1" class="letter-space">&nbsp;</span>
      </span>
    </template>
  </span>
</template>

<script setup>
import { gsap } from 'gsap'

const props = defineProps({
  text: { type: String, required: true },
  delay: { type: Number, default: 0 },
  stagger: { type: Number, default: 0.045 },
  duration: { type: Number, default: 0.55 },
})

const words = computed(() => props.text.split(' ').map(w => w.split('')))
const letterEls = ref([])

onBeforeUpdate(() => { letterEls.value = [] })

onMounted(() => {
  nextTick(() => {
    const els = letterEls.value.filter(Boolean)
    if (!els.length) return
    gsap.from(els, {
      y: '140%',
      duration: props.duration,
      ease: 'power3.out',
      stagger: props.stagger,
      delay: props.delay,
    })
  })
})
</script>

<style scoped>
.letter-reveal {
  display: inline;
}

.letter-word {
  display: inline-block;
  white-space: nowrap;
}

.letter-space {
  display: inline;
}

.letter-mask {
  display: inline-block;
  overflow: hidden;
  vertical-align: bottom;
  line-height: 1;
  padding-top: 0.1em;
  padding-bottom: 0.25em;
  margin-bottom: -0.25em;
}

.letter {
  display: inline-block;
}
</style>
