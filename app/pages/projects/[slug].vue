<template>
  <div class="layout">
    <aside class="layout__left_wrapper layout">
      <div class="layout__left">
        <header class="project-header">
          <h1 class="project-title t-project-title"><LetterReveal :text="project.title" :delay="0.6" /></h1>
          <p class="project-desc t-body">{{ lang === 'en' && project.descriptionEn ? project.descriptionEn : project.description }}</p>
        </header>
        <div class="project-info">
          <div class="project-info-section">
            <p class="t-section-label">{{ tp.services }}</p>
            <ul class="project-tags">
              <li v-for="tag in project.tags" :key="tag" class="t-meta">{{ translateTag(tag) }}</li>
            </ul>
          </div>
          <div class="project-info-section">
            <p class="t-section-label">{{ tp.year }}</p>
            <p class="project-meta t-meta">{{ project.year }}</p>
          </div>
          <div class="project-info-section">
            <p class="t-section-label">{{ tp.team }}</p>
            <p class="project-meta t-meta">{{ translateTeam(project.team) }}</p>
          </div>
        </div>
      </div>
    </aside>

    <main class="layout__right">
      <div class="project-gallery">
        <div v-for="(item, i) in project.images" :key="i" :class="['gallery-item', `gallery-item--${item.size}`]">
          <img v-if="item.type !== 'video' && item.type !== 'youtube'" :src="item.src" :alt="item.alt" />
          <video v-else-if="item.type === 'video'" :src="item.src" :autoplay="item.autoplay !== false"
            :muted="item.muted !== false" :controls="item.controls === true" loop playsinline />
          <iframe v-else-if="item.type === 'youtube'" :src="`https://www.youtube.com/embed/${item.id}`" frameborder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowfullscreen />
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
import { projects } from '~/data/projects.js'
import { translations, tagMap } from '~/data/i18n.js'

const route = useRoute()
const lang = useLang()
const project = projects.find(p => p.slug === route.params.slug)
const tp = computed(() => translations[lang.value].project)

function translateTag(tag) {
  return lang.value === 'en' ? (tagMap.en[tag] ?? tag) : tag
}

function translateTeam(team) {
  if (lang.value === 'en' && team === 'Proyecto personal') return 'Personal project'
  return team
}

useHead({
  script: [{
    type: 'application/ld+json',
    innerHTML: JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'CreativeWork',
      name: project?.title,
      description: project?.description,
      creator: {
        '@type': 'Person',
        name: 'Víctor Duque',
        // CAMBIAR ESTO POR LA NUEVA URL
        url: 'https://victorduque.es',
      },
      dateCreated: project?.year,
      // CAMBIAR ESTO POR LA NUEVA URL
      image: project?.cover ? `https://victorduque.es${project.cover}` : undefined,
    }),
  }],
})

useSeoMeta({
  title: `${project?.title} — Víctor Duque`,
  description: project?.description,
  ogTitle: `${project?.title} — Víctor Duque`,
  ogDescription: project?.description,
  ogImage: project?.cover,
  twitterCard: 'summary_large_image',
})

const resetProjectScroll = () => {
  const { $lenis } = useNuxtApp()

  window.scrollTo(0, 0)
  $lenis?.scrollTo(0, { immediate: true })

  nextTick(() => {
    $lenis?.resize()
  })
}

onMounted(() => {
  resetProjectScroll()
})

watch(
  () => route.fullPath,
  () => {
    resetProjectScroll()
  },
  { flush: 'post' }
)
</script>

<style scoped>
.layout__left_wrapper {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 1;
  pointer-events: none;
}

.layout__left {
  @apply flex flex-col justify-between col-start-1 col-end-4;
  padding: 120px 0px 1.5rem 0px;
  gap:40px;
  pointer-events: all;
}

.layout__right {
  @apply col-start-5 col-end-13;
  min-height: 100vh;
  position: relative;
  z-index: 2;
}



.project-title {
  margin: 1rem 0;
}

.project-info{
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.project-info-section {
  display: grid;
  grid-template-columns: 1fr 1fr;
  align-items: start;
  padding: 12px;
  background: var(--panel);
  border-radius: 8px;
}

.project-tags {
  display: flex;
  flex-direction: column;
  list-style: none;
}

.project-gallery {
  padding: 120px 0px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.gallery-item iframe {
  width: 100%;
  height: 100%;
  display: block;
  aspect-ratio: 16/9;
}

img,
video {
  border-radius: 8px;
}

.gallery-item--full {
  grid-column: 1 / -1;
}



@media (max-width: 900px) {
  .layout__left_wrapper {
    @apply col-start-1 col-end-13;
    position: relative;
    width: 100%;
    height: auto;
    padding: 0 !important;
  }

  .layout__left {
    @apply col-start-1 col-end-13;
    margin-left: 0;
    padding-top: 120px;
  }

  .layout__right {
    @apply col-start-1 col-end-13;
    margin-left: 0;
  }

  .project-gallery {
    grid-template-columns: 1fr;
    padding-bottom: 120px;
    padding-top: 0px;
  }

  .gallery-item--full,
  .gallery-item--half {
    grid-column: 1 / -1;
  }
}
</style>