import { ref, computed, watch, onMounted, onBeforeUnmount, type Ref, type CSSProperties } from 'vue'

interface FeedItemData {
  title: string
  link: string
  description: string
  pubDate: string
  source: string
  titleZh?: string
  descriptionZh?: string
}

type OverscrollState = 'idle' | 'scrolling' | 'overscrolling'

interface UseOverscrollPreviewOptions {
  scrollContainerRef: Ref<HTMLElement | null>
  viewerBodyRef: Ref<HTMLElement | null>
  articles: Ref<FeedItemData[]>
  currentIndex: Ref<number>
  onNavigate: (index: number) => void
  disabled?: Ref<boolean>
  threshold?: number
  maxOverscroll?: number
}

export function useOverscrollPreview(options: UseOverscrollPreviewOptions) {
  const {
    scrollContainerRef,
    viewerBodyRef,
    articles,
    currentIndex,
    onNavigate,
    disabled = ref(false),
    threshold = 120,
    maxOverscroll = 250,
  } = options

  // State
  const state = ref<OverscrollState>('idle')
  const direction = ref<'prev' | 'next' | null>(null)
  const overscrollOffset = ref(0) // dampened value, always >= 0
  const isAnimating = ref(false)
  const isCommitting = ref(false)

  // Touch tracking (not reactive, internal only)
  let startY = 0
  let overscrollStartY = 0
  let wasAtTop = false
  let wasAtBottom = false
  let directionLocked = false

  // Damping function: rubber-band effect
  function dampen(raw: number): number {
    if (raw <= 0) return 0
    return maxOverscroll * (1 - Math.exp(-raw / (maxOverscroll * 0.6)))
  }

  function isAtTop(): boolean {
    const el = scrollContainerRef.value
    if (!el) return true
    return el.scrollTop <= 1
  }

  function isAtBottom(): boolean {
    const el = scrollContainerRef.value
    if (!el) return true
    return el.scrollTop + el.clientHeight >= el.scrollHeight - 1
  }

  function hasPrev(): boolean {
    return currentIndex.value > 0
  }

  function hasNext(): boolean {
    return currentIndex.value < articles.value.length - 1
  }

  function resetState() {
    state.value = 'idle'
    direction.value = null
    overscrollOffset.value = 0
    isAnimating.value = false
    isCommitting.value = false
    directionLocked = false
  }

  // --- Touch handlers ---

  function onTouchStart(e: TouchEvent) {
    if (disabled.value) return

    // If animating, cancel the animation immediately
    if (isAnimating.value || isCommitting.value) {
      resetState()
    }

    startY = e.touches[0].clientY
    wasAtTop = isAtTop()
    wasAtBottom = isAtBottom()
    state.value = 'idle'
    direction.value = null
    directionLocked = false
  }

  function onTouchMove(e: TouchEvent) {
    if (disabled.value) return

    const currentY = e.touches[0].clientY
    const totalDeltaY = currentY - startY

    if (state.value === 'idle') {
      // Determine direction after 10px of movement
      if (Math.abs(totalDeltaY) < 10) return

      if (totalDeltaY > 0 && wasAtTop && hasPrev()) {
        // Dragging down at top → show prev
        state.value = 'overscrolling'
        direction.value = 'prev'
        overscrollStartY = currentY
        directionLocked = true
        e.preventDefault()
      } else if (totalDeltaY < 0 && wasAtBottom && hasNext()) {
        // Dragging up at bottom → show next
        state.value = 'overscrolling'
        direction.value = 'next'
        overscrollStartY = currentY
        directionLocked = true
        e.preventDefault()
      } else {
        state.value = 'scrolling'
      }
    } else if (state.value === 'scrolling') {
      // Check if user has scrolled to a boundary and is now overscrolling
      const atTop = isAtTop()
      const atBottom = isAtBottom()

      if (totalDeltaY > 0 && atTop && hasPrev() && !directionLocked) {
        state.value = 'overscrolling'
        direction.value = 'prev'
        overscrollStartY = currentY
        directionLocked = true
        e.preventDefault()
      } else if (totalDeltaY < 0 && atBottom && hasNext() && !directionLocked) {
        state.value = 'overscrolling'
        direction.value = 'next'
        overscrollStartY = currentY
        directionLocked = true
        e.preventDefault()
      }
    } else if (state.value === 'overscrolling') {
      e.preventDefault()

      const rawDistance = direction.value === 'prev'
        ? currentY - overscrollStartY
        : overscrollStartY - currentY

      if (rawDistance <= 0) {
        // User reversed direction back into content
        overscrollOffset.value = 0
        state.value = 'scrolling'
        direction.value = null
        return
      }

      overscrollOffset.value = dampen(rawDistance)
    }
  }

  function onTouchEnd(_e: TouchEvent) {
    if (disabled.value) return

    if (state.value === 'overscrolling' && direction.value) {
      if (overscrollOffset.value >= threshold) {
        // Commit navigation
        isCommitting.value = true
        isAnimating.value = true

        // Animate to full reveal, then navigate
        const commitOffset = maxOverscroll + 50
        overscrollOffset.value = commitOffset

        const navigateIndex = direction.value === 'prev'
          ? currentIndex.value - 1
          : currentIndex.value + 1

        setTimeout(() => {
          onNavigate(navigateIndex)
          resetState()
        }, 300)
      } else {
        // Spring back
        isAnimating.value = true
        overscrollOffset.value = 0

        setTimeout(() => {
          resetState()
        }, 400)
      }
    } else {
      resetState()
    }
  }

  // --- Computed styles ---

  const overscrollReady = computed(() => overscrollOffset.value >= threshold)

  const contentStyle = computed<CSSProperties>(() => {
    if (overscrollOffset.value === 0 && !isAnimating.value) return {}

    const offset = overscrollOffset.value
    let translateY = 0

    if (direction.value === 'prev') {
      translateY = offset * 0.3 // content shifts down slightly
    } else if (direction.value === 'next') {
      translateY = -offset * 0.3 // content shifts up slightly
    }

    const style: CSSProperties = {
      transform: `translateY(${translateY}px)`,
      willChange: 'transform',
    }

    if (isAnimating.value && !isCommitting.value) {
      style.transition = 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)'
    } else if (isCommitting.value) {
      style.transition = 'transform 0.3s cubic-bezier(0.22, 1, 0.36, 1)'
    }

    return style
  })

  const topPreviewStyle = computed<CSSProperties>(() => {
    if (direction.value !== 'prev') {
      return {
        opacity: 0,
        transform: 'translateY(-100%)',
        pointerEvents: 'none' as const,
      }
    }

    const offset = overscrollOffset.value
    const opacity = Math.min(1, offset / 60)
    // Preview slides in from above
    const translateY = -100 + (offset / maxOverscroll) * 100

    const style: CSSProperties = {
      opacity,
      transform: `translateY(${Math.min(0, translateY)}%)`,
      willChange: 'transform, opacity',
      pointerEvents: 'none' as const,
    }

    if (isAnimating.value && !isCommitting.value) {
      style.transition = 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)'
    } else if (isCommitting.value) {
      style.transition = 'transform 0.3s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.3s cubic-bezier(0.22, 1, 0.36, 1)'
    }

    return style
  })

  const bottomPreviewStyle = computed<CSSProperties>(() => {
    if (direction.value !== 'next') {
      return {
        opacity: 0,
        transform: 'translateY(100%)',
        pointerEvents: 'none' as const,
      }
    }

    const offset = overscrollOffset.value
    const opacity = Math.min(1, offset / 60)
    // Preview slides in from below
    const translateY = 100 - (offset / maxOverscroll) * 100

    const style: CSSProperties = {
      opacity,
      transform: `translateY(${Math.max(0, translateY)}%)`,
      willChange: 'transform, opacity',
      pointerEvents: 'none' as const,
    }

    if (isAnimating.value && !isCommitting.value) {
      style.transition = 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)'
    } else if (isCommitting.value) {
      style.transition = 'transform 0.3s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.3s cubic-bezier(0.22, 1, 0.36, 1)'
    }

    return style
  })

  // --- Lifecycle ---

  let boundTouchMove: ((e: TouchEvent) => void) | null = null

  onMounted(() => {
    // Register touchmove as non-passive to allow preventDefault
    const body = viewerBodyRef.value
    if (body) {
      boundTouchMove = onTouchMove
      body.addEventListener('touchmove', boundTouchMove, { passive: false })
    }
  })

  onBeforeUnmount(() => {
    const body = viewerBodyRef.value
    if (body && boundTouchMove) {
      body.removeEventListener('touchmove', boundTouchMove)
    }
  })

  // Reset on article change
  watch(() => currentIndex.value, () => {
    resetState()
  })

  return {
    overscrollOffset,
    overscrollReady,
    direction,
    isAnimating,
    isCommitting,
    contentStyle,
    topPreviewStyle,
    bottomPreviewStyle,
    onTouchStart,
    onTouchEnd,
  }
}
