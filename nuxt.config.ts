import tailwindcss from "@tailwindcss/vite";


export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
  vite: {
    plugins: [
      tailwindcss(),
    ],
  },
  
  css: ['~/assets/css/main.css'],

  app: {
    pageTransition: { name: 'page', mode: 'out-in' },
    head: {
      htmlAttrs: { lang: 'es' },
      meta: [
        { name: 'robots', content: 'index, follow' },
      ],
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
        { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon.png' },
        { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' },
      ],
    },
  },

  modules: ['@nuxtjs/sitemap'],


  // CAMBIAR ESTO POR LA NUEVA URL
  site: {
    url: 'https://victorduque.es',
  },

  ignore: ['**/pages/_old/**'],

  nitro: {
    prerender: {
      crawlLinks: true,
      routes: ['/'],
      ignore: ['/_old/**'],
    },
  },



})