<template>
  <main class="model-recording">
    <canvas ref="canvasEl" class="model-recording__canvas" />
    <a
      v-if="downloadUrl"
      class="model-recording__download"
      :href="downloadUrl"
      download="about-model-turn.mp4"
    >
      Descargar MP4
    </a>
    <p v-if="recordingStatus" class="model-recording__status">{{ recordingStatus }}</p>
  </main>
</template>

<script setup>
const canvasEl = ref(null)
const downloadUrl = ref('')
const recordingStatus = ref('')

let THREE
let renderer
let scene
let camera
let model
let frameId
let resizeHandler
let mediaRecorder
let recordedChunks = []

const turnDuration = 8000

function resize() {
  const canvas = canvasEl.value
  if (!canvas || !renderer || !camera) return

  const width = canvas.clientWidth
  const height = canvas.clientHeight
  renderer.setSize(width, height, false)

  const frustum = 1.2
  const aspect = width / height
  camera.left = -frustum * aspect
  camera.right = frustum * aspect
  camera.top = frustum
  camera.bottom = -frustum
  camera.updateProjectionMatrix()
}

onMounted(async () => {
  const [threeModule, gltfModule, dracoModule, ktx2Module] = await Promise.all([
    import('three'),
    import('three/examples/jsm/loaders/GLTFLoader.js'),
    import('three/examples/jsm/loaders/DRACOLoader.js'),
    import('three/examples/jsm/loaders/KTX2Loader.js'),
  ])

  THREE = threeModule
  const { GLTFLoader } = gltfModule
  const { DRACOLoader } = dracoModule
  const { KTX2Loader } = ktx2Module
  const canvas = canvasEl.value

  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: false,
    alpha: false,
    powerPreference: 'high-performance',
  })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.NoToneMapping
  renderer.setClearColor(0xffffff, 1)

  scene = new THREE.Scene()
  camera = new THREE.OrthographicCamera(-1.2, 1.2, 1.2, -1.2, 0.1, 100)
  camera.position.set(0, 0.5, 14)
  camera.lookAt(0, 0, 0)
  scene.add(new THREE.HemisphereLight(0xffffff, 0x101010, 0.9))

  const loader = new GLTFLoader()
  const dracoLoader = new DRACOLoader()
  dracoLoader.setDecoderPath('https://cdn.jsdelivr.net/npm/three@0.184.0/examples/jsm/libs/draco/')
  loader.setDRACOLoader(dracoLoader)

  const ktx2Loader = new KTX2Loader()
  ktx2Loader.setTranscoderPath('https://cdn.jsdelivr.net/npm/three@0.184.0/examples/jsm/libs/basis/')
  ktx2Loader.detectSupport(renderer)
  loader.setKTX2Loader(ktx2Loader)

  loader.load('/model_high.glb', (gltf) => {
    model = gltf.scene

    const box = new THREE.Box3().setFromObject(model)
    const center = box.getCenter(new THREE.Vector3())
    const size = box.getSize(new THREE.Vector3())
    const maxAxis = Math.max(size.x, size.y, size.z)

    model.position.sub(center)
    model.position.y -= 0.4
    model.scale.setScalar(2.6 / maxAxis)
    scene.add(model)

    const stream = canvas.captureStream(60)
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : 'video/webm'
    mediaRecorder = new MediaRecorder(stream, { mimeType })
    recordedChunks = []
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) recordedChunks.push(event.data)
    }
    mediaRecorder.onstop = async () => {
      recordingStatus.value = 'Convirtiendo a MP4…'
      try {
        const [{ FFmpeg }, { fetchFile, toBlobURL }] = await Promise.all([
          import('@ffmpeg/ffmpeg'),
          import('@ffmpeg/util'),
        ])
        const ffmpeg = new FFmpeg()
        const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.10/dist/umd'
        await ffmpeg.load({
          coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
          wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
        })
        await ffmpeg.writeFile('input.webm', await fetchFile(new Blob(recordedChunks, { type: mimeType })))
        await ffmpeg.exec([
          '-i', 'input.webm',
          '-c:v', 'libx264',
          '-pix_fmt', 'yuv420p',
          '-movflags', '+faststart',
          'output.mp4',
        ])
        const data = await ffmpeg.readFile('output.mp4')
        const blob = new Blob([data], { type: 'video/mp4' })
        downloadUrl.value = URL.createObjectURL(blob)
        recordingStatus.value = 'MP4 listo. Pulsa “Descargar MP4” si la descarga no empieza automáticamente.'
        const link = document.createElement('a')
        link.href = downloadUrl.value
        link.download = 'about-model-turn.mp4'
        link.click()
        await ffmpeg.deleteFile('input.webm')
        await ffmpeg.deleteFile('output.mp4')
        ffmpeg.terminate()
      } catch (error) {
        recordingStatus.value = 'No se pudo generar el MP4. Revisa la consola para más detalles.'
        console.error('No se pudo convertir la grabación a MP4.', error)
      }
    }
    mediaRecorder.start()

    const startedAt = performance.now()
    const animateTurn = (now) => {
      const progress = Math.min((now - startedAt) / turnDuration, 1)
      model.rotation.y = progress * Math.PI * 2
      renderer.render(scene, camera)

      if (progress < 1) {
        frameId = requestAnimationFrame(animateTurn)
      } else if (mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop()
      }
    }

    frameId = requestAnimationFrame(animateTurn)
  }, undefined, (error) => {
    console.error('No se pudo cargar el modelo 3D para la grabación.', error)
  })

  resizeHandler = resize
  window.addEventListener('resize', resizeHandler)
  resize()
})

onUnmounted(() => {
  if (frameId) cancelAnimationFrame(frameId)
  if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop()
  if (resizeHandler) window.removeEventListener('resize', resizeHandler)
  if (downloadUrl.value) URL.revokeObjectURL(downloadUrl.value)
  renderer?.dispose()
})
</script>

<style scoped>
.model-recording {
  position: fixed;
  inset: 0;
  z-index: 1000;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background: #ffffff;
}

.model-recording__canvas {
  display: block;
  width: 100%;
  height: 100%;
}

.model-recording__download {
  position: fixed;
  right: 24px;
  bottom: 24px;
  padding: 12px 16px;
  border-radius: 4px;
  background: #000000;
  color: #ffffff;
  font: 800 1rem/1.2 Inter, sans-serif;
  text-decoration: none;
}

.model-recording__status {
  position: fixed;
  right: 24px;
  bottom: 76px;
  color: #000000;
  font: 500 0.8rem/1.2 Inter, sans-serif;
}
</style>
