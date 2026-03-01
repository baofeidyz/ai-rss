<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'

interface FeedItemData {
  title: string
  link: string
  description: string
  pubDate: string
  source: string
  titleZh?: string
  descriptionZh?: string
}

const props = defineProps<{
  article: FeedItemData
  articles: FeedItemData[]
  currentIndex: number
}>()

const emit = defineEmits<{
  navigate: [index: number]
  close: []
}>()

const hasPrev = ref(false)
const hasNext = ref(false)

// View mode: 'content' (RSS summary) or 'iframe' (original page)
const viewMode = ref<'content' | 'iframe'>('content')
const iframeLoading = ref(false)
const iframeFailed = ref(false)

// Mobile detection
const isMobileView = ref(false)

function checkMobile() {
  isMobileView.value = window.innerWidth <= 768
}

// Adjacent articles for mobile bottom bar preview
const prevArticle = computed(() =>
  props.currentIndex > 0 ? props.articles[props.currentIndex - 1] : null
)
const nextArticle = computed(() =>
  props.currentIndex < props.articles.length - 1 ? props.articles[props.currentIndex + 1] : null
)

function updateNav() {
  hasPrev.value = props.currentIndex > 0
  hasNext.value = props.currentIndex < props.articles.length - 1
}

watch(() => props.currentIndex, updateNav, { immediate: true })

// Reset view mode when switching articles
watch(() => props.article.link, () => {
  viewMode.value = 'content'
  iframeLoading.value = false
  iframeFailed.value = false
})

function goPrev() {
  if (hasPrev.value) {
    emit('navigate', props.currentIndex - 1)
  }
}

function goNext() {
  if (hasNext.value) {
    emit('navigate', props.currentIndex + 1)
  }
}

function loadOriginalPage() {
  viewMode.value = 'iframe'
  iframeLoading.value = true
  iframeFailed.value = false
}

function handleIframeLoad() {
  // Check if the iframe actually loaded content or was blocked
  // The load event fires even for CORS-blocked pages, but the iframe may show error
  iframeLoading.value = false

  // Try to detect if the iframe loaded successfully
  try {
    const iframe = document.querySelector('.viewer-iframe') as HTMLIFrameElement
    if (iframe) {
      // Try accessing contentDocument - this will throw for cross-origin
      const doc = iframe.contentDocument || iframe.contentWindow?.document
      // If we can access it and it has no body or empty body, it likely failed
      if (doc && (!doc.body || doc.body.innerHTML === '')) {
        iframeFailed.value = true
      }
    }
  } catch {
    // Cross-origin: we can't check, but the page might still render
    // Keep iframeFailed as false - user sees the iframe content
  }
}

function handleIframeError() {
  iframeLoading.value = false
  iframeFailed.value = true
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'ArrowUp' || e.key === 'k') {
    e.preventDefault()
    goPrev()
  } else if (e.key === 'ArrowDown' || e.key === 'j') {
    e.preventDefault()
    goNext()
  } else if (e.key === 'Escape') {
    emit('close')
  }
}

function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return ''
  return date.toLocaleString()
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
  window.addEventListener('resize', checkMobile)
  checkMobile()
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown)
  window.removeEventListener('resize', checkMobile)
})
</script>

<template>
  <div class="article-viewer">
    <div class="viewer-header">
      <button class="back-btn" @click="$emit('close')">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M10 3L5 8l5 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span>返回</span>
      </button>
      <div class="viewer-title-area">
        <span class="viewer-source">{{ article.source }}</span>
        <h2 class="viewer-title">{{ article.titleZh || article.title }}</h2>
      </div>
      <div class="viewer-actions">
        <button class="nav-btn" :disabled="!hasPrev" @click="goPrev" title="上一篇 (↑)">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M3 9l4-4 4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
        <span class="nav-pos">{{ currentIndex + 1 }}/{{ articles.length }}</span>
        <button class="nav-btn" :disabled="!hasNext" @click="goNext" title="下一篇 (↓)">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M3 5l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
        <a class="open-link" :href="article.link" target="_blank" rel="noopener">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M5.5 2.5H3a.5.5 0 00-.5.5v8a.5.5 0 00.5.5h8a.5.5 0 00.5-.5V8.5M8.5 2.5h3v3M6 8l5.5-5.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span>新窗口</span>
        </a>
      </div>
    </div>

    <div class="viewer-body">
      <!-- Content mode: show RSS article summary -->
      <div
        v-if="viewMode === 'content'"
        class="article-content"
      >
        <article class="article-detail">
          <h1 class="article-title">{{ article.title }}</h1>
          <p v-if="article.titleZh && article.titleZh !== article.title" class="article-title-zh">
            {{ article.titleZh }}
          </p>
          <div class="article-meta">
            <span class="meta-source">{{ article.source }}</span>
            <span v-if="article.pubDate" class="meta-date">{{ formatDate(article.pubDate) }}</span>
          </div>
          <div v-if="article.description" class="article-desc">
            {{ article.description }}
          </div>
          <div v-if="article.descriptionZh" class="article-desc-zh">
            {{ article.descriptionZh }}
          </div>
          <div class="article-actions">
            <a class="action-btn primary" :href="article.link" target="_blank" rel="noopener">
              新窗口打开原文
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style="margin-left: 4px;">
                <path d="M5.5 2.5H3a.5.5 0 00-.5.5v8a.5.5 0 00.5.5h8a.5.5 0 00.5-.5V8.5M8.5 2.5h3v3M6 8l5.5-5.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </a>
            <button class="action-btn" @click="loadOriginalPage">
              尝试加载原始页面
            </button>
          </div>
        </article>
      </div>

      <!-- Iframe mode: load original page -->
      <template v-if="viewMode === 'iframe'">
        <div v-if="iframeLoading && !iframeFailed" class="iframe-loading">
          <div class="loading-spinner"></div>
          <span>正在加载原始页面...</span>
        </div>
        <div v-if="iframeFailed" class="iframe-failed">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
            <circle cx="24" cy="24" r="20" stroke="var(--color-text-secondary)" stroke-width="1.5" opacity="0.3"/>
            <path d="M16 16l16 16M32 16L16 32" stroke="var(--color-text-secondary)" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
          <p>页面加载失败，该网站可能禁止了嵌入访问。</p>
          <div class="article-actions center">
            <a class="action-btn primary" :href="article.link" target="_blank" rel="noopener">
              新窗口打开原文
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style="margin-left: 4px;">
                <path d="M5.5 2.5H3a.5.5 0 00-.5.5v8a.5.5 0 00.5.5h8a.5.5 0 00.5-.5V8.5M8.5 2.5h3v3M6 8l5.5-5.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </a>
            <button class="action-btn" @click="viewMode = 'content'">返回摘要</button>
          </div>
        </div>
        <iframe
          v-show="!iframeFailed"
          :key="article.link"
          :src="article.link"
          class="viewer-iframe"
          sandbox="allow-scripts allow-same-origin allow-popups"
          referrerpolicy="no-referrer"
          @load="handleIframeLoad"
          @error="handleIframeError"
        />
      </template>
    </div>

    <!-- Mobile bottom navigation bar -->
    <div v-if="isMobileView" class="mobile-nav-bar">
      <button class="mobile-nav-btn" :disabled="!hasPrev" @click="goPrev">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M12 15l-5-5 5-5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span v-if="prevArticle" class="mobile-nav-label">{{ prevArticle.titleZh || prevArticle.title }}</span>
        <span v-else class="mobile-nav-label">没有上一篇</span>
      </button>
      <span class="mobile-nav-pos">{{ currentIndex + 1 }} / {{ articles.length }}</span>
      <button class="mobile-nav-btn mobile-nav-btn--next" :disabled="!hasNext" @click="goNext">
        <span v-if="nextArticle" class="mobile-nav-label">{{ nextArticle.titleZh || nextArticle.title }}</span>
        <span v-else class="mobile-nav-label">没有下一篇</span>
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M8 5l5 5-5 5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
    </div>
  </div>
</template>

<style scoped>
.article-viewer {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 53px);
  background: var(--color-bg);
}

.viewer-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 16px;
  border-bottom: 1px solid var(--color-border);
  background: var(--glass-bg);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
  flex-shrink: 0;
  min-height: 44px;
}

.back-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.85rem;
  padding: 6px 12px;
  border: 1px solid var(--glass-border);
  border-radius: var(--glass-radius-xs);
  background: var(--glass-bg);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
  color: var(--color-accent);
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
  transition: background 0.2s;
}

.back-btn:hover {
  background: var(--color-hover);
}

.viewer-title-area {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.viewer-source {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-accent);
  background: var(--color-accent-bg);
  padding: 2px 10px;
  border-radius: 20px;
  white-space: nowrap;
  flex-shrink: 0;
}

.viewer-title {
  font-size: 0.9rem;
  font-weight: 500;
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.viewer-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.nav-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: 1px solid var(--glass-border);
  border-radius: var(--glass-radius-xs);
  background: var(--glass-bg);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
  color: var(--color-text);
  cursor: pointer;
  transition: background 0.2s;
}

.nav-btn:hover:not(:disabled) {
  background: var(--color-hover);
}

.nav-btn:disabled {
  opacity: 0.3;
  cursor: default;
}

.nav-pos {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  white-space: nowrap;
  min-width: 40px;
  text-align: center;
}

.open-link {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.8rem;
  padding: 6px 12px;
  border: 1px solid var(--glass-border);
  border-radius: var(--glass-radius-xs);
  background: var(--glass-bg);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
  color: var(--color-accent);
  text-decoration: none;
  white-space: nowrap;
  transition: background 0.2s;
}

.open-link:hover {
  background: var(--color-accent-bg);
}

.viewer-body {
  flex: 1;
  position: relative;
  overflow: hidden;
}

/* Article content mode */
.article-content {
  height: 100%;
  overflow-y: auto;
  padding: 32px;
}

.article-detail {
  max-width: 720px;
  margin: 0 auto;
}

.article-title {
  font-size: 1.5rem;
  font-weight: 700;
  line-height: 1.4;
  margin: 0 0 8px;
  letter-spacing: -0.02em;
}

.article-title-zh {
  font-size: 1.2rem;
  color: var(--color-text-secondary);
  margin: 0 0 16px;
  line-height: 1.4;
}

.article-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--color-border);
}

.meta-source {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-accent);
  background: var(--color-accent-bg);
  padding: 3px 12px;
  border-radius: 20px;
}

.meta-date {
  font-size: 0.85rem;
  color: var(--color-text-secondary);
}

.article-desc {
  font-size: 1rem;
  line-height: 1.8;
  color: var(--color-text);
  margin-bottom: 16px;
  white-space: pre-line;
}

.article-desc-zh {
  font-size: 0.95rem;
  line-height: 1.8;
  color: var(--color-text-secondary);
  margin-bottom: 24px;
  padding: 16px;
  background: var(--glass-bg);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
  border: 1px solid var(--glass-border);
  border-radius: var(--glass-radius-sm);
  white-space: pre-line;
}

.article-actions {
  display: flex;
  gap: 12px;
  margin-top: 24px;
}

.article-actions.center {
  justify-content: center;
}

.action-btn {
  display: inline-flex;
  align-items: center;
  font-size: 0.9rem;
  padding: 10px 20px;
  border: 1px solid var(--glass-border);
  border-radius: var(--glass-radius-sm);
  background: var(--glass-bg);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
  color: var(--color-text);
  cursor: pointer;
  text-decoration: none;
  transition: background 0.2s, box-shadow 0.2s;
  box-shadow: var(--glass-shadow);
}

.action-btn:hover {
  background: var(--color-hover);
  box-shadow: var(--glass-shadow-elevated);
}

.action-btn.primary {
  background: var(--color-accent);
  color: #fff;
  border-color: var(--color-accent);
  box-shadow: 0 2px 12px rgba(0, 122, 255, 0.2);
}

.action-btn.primary:hover {
  opacity: 0.9;
  box-shadow: 0 4px 16px rgba(0, 122, 255, 0.3);
}

/* Iframe mode */
.viewer-iframe {
  width: 100%;
  height: 100%;
  border: none;
}

.iframe-loading {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  font-size: 0.95rem;
  color: var(--color-text-secondary);
}

.loading-spinner {
  width: 28px;
  height: 28px;
  border: 2.5px solid var(--color-border);
  border-top-color: var(--color-accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.iframe-failed {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  color: var(--color-text-secondary);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.iframe-failed p {
  margin: 0;
}

/* Mobile bottom navigation bar */
.mobile-nav-bar {
  display: none;
}

@media (max-width: 768px) {
  .article-viewer {
    height: calc(100vh - 53px);
  }

  .viewer-header {
    flex-wrap: wrap;
    gap: 8px;
    padding: 8px 12px;
  }

  .viewer-title-area {
    order: 2;
    width: 100%;
    flex-basis: 100%;
  }

  .viewer-title {
    font-size: 0.85rem;
  }

  .viewer-actions {
    order: 1;
  }

  .article-content {
    padding: 20px 16px;
    padding-bottom: 80px;
  }

  .article-title {
    font-size: 1.2rem;
  }

  .article-title-zh {
    font-size: 1rem;
  }

  /* Hide desktop nav controls on mobile */
  .nav-btn {
    display: none;
  }

  .nav-pos {
    display: none;
  }

  .article-actions {
    flex-direction: column;
  }

  .action-btn {
    text-align: center;
    justify-content: center;
  }

  /* Mobile bottom navigation bar */
  .mobile-nav-bar {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    background: var(--glass-bg-heavy);
    backdrop-filter: blur(var(--glass-blur-heavy));
    -webkit-backdrop-filter: blur(var(--glass-blur-heavy));
    border-top: 1px solid var(--glass-border);
    flex-shrink: 0;
    min-height: 52px;
  }

  .mobile-nav-btn {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 10px;
    border: 1px solid var(--glass-border);
    border-radius: var(--glass-radius-xs);
    background: var(--glass-bg);
    backdrop-filter: blur(var(--glass-blur));
    -webkit-backdrop-filter: blur(var(--glass-blur));
    color: var(--color-accent);
    cursor: pointer;
    transition: background 0.2s;
    min-width: 0;
  }

  .mobile-nav-btn:hover:not(:disabled) {
    background: var(--color-hover);
  }

  .mobile-nav-btn:disabled {
    opacity: 0.3;
    cursor: default;
  }

  .mobile-nav-btn svg {
    flex-shrink: 0;
  }

  .mobile-nav-btn--next {
    justify-content: flex-end;
    text-align: right;
  }

  .mobile-nav-label {
    font-size: 0.75rem;
    line-height: 1.3;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    min-width: 0;
  }

  .mobile-nav-pos {
    font-size: 0.7rem;
    color: var(--color-text-secondary);
    white-space: nowrap;
    flex-shrink: 0;
  }

  /* Adjust viewer body height to account for bottom bar */
  .viewer-body {
    flex: 1;
    min-height: 0;
  }
}
</style>
