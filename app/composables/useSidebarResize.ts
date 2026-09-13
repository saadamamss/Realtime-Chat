const SIDEBAR_MIN = 260
const CHAT_MIN = 500
const SIDEBAR_DEFAULT = 340

export function useSidebarResize() {
  const sidebarWidth = ref(SIDEBAR_DEFAULT)
  const isDragging = ref(false)
  const windowWidth = ref(0)

  const isDrawer = computed(() => SIDEBAR_MIN + CHAT_MIN > windowWidth.value)

  function onResizeStart(e: MouseEvent) {
    isDragging.value = true
    e.preventDefault()
  }

  function onMouseMove(e: MouseEvent) {
    if (!isDragging.value) return
    let w = e.clientX
    if (w < SIDEBAR_MIN) w = SIDEBAR_MIN
    const maxW = windowWidth.value - CHAT_MIN
    if (w > maxW) w = maxW
    sidebarWidth.value = w
  }

  function onMouseUp() {
    if (isDragging.value) {
      isDragging.value = false
      localStorage.setItem('sidebar_width', String(sidebarWidth.value))
    }
  }

  function onResize() {
    windowWidth.value = window.innerWidth
    if (!isDrawer.value) {
      const maxW = window.innerWidth - CHAT_MIN
      if (sidebarWidth.value > maxW) sidebarWidth.value = maxW
    }
  }

  function initResize() {
    windowWidth.value = window.innerWidth
    const saved = localStorage.getItem('sidebar_width')
    if (saved) sidebarWidth.value = Math.max(SIDEBAR_MIN, parseInt(saved))
    window.addEventListener('resize', onResize)
  }

  function cleanupResize() {
    window.removeEventListener('resize', onResize)
  }

  return {
    sidebarWidth,
    isDragging,
    windowWidth,
    isDrawer,
    onResizeStart,
    onMouseMove,
    onMouseUp,
    initResize,
    cleanupResize,
  }
}
