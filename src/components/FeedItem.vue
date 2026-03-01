<script setup lang="ts">
import { computed } from 'vue'
import TranslateButton from './TranslateButton.vue'
import { useReadStatus } from '../composables/useReadStatus'

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
  item: FeedItemData
  compact?: boolean
  active?: boolean
  readingMode?: boolean
}>()

const emit = defineEmits<{
  select: [item: FeedItemData]
}>()

const { isRead, markAsRead } = useReadStatus()

const read = computed(() => isRead(props.item.link))

function relativeTime(dateStr: string): string {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return ''
  const now = Date.now()
  const diff = now - date.getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}小时前`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}天前`
  const months = Math.floor(days / 30)
  return `${months}个月前`
}

function absoluteTime(dateStr: string): string {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return ''
  return date.toLocaleString()
}

function handleClick() {
  markAsRead(props.item.link)
  emit('select', props.item)
}
</script>

<template>
  <article
    class="feed-item"
    :class="{ read, compact, active }"
    @click="handleClick"
  >
    <template v-if="compact">
      <h3 class="title compact-title">
        <span v-if="!read" class="unread-dot" />
        {{ item.titleZh || item.title }}
      </h3>
    </template>
    <template v-else>
      <div class="feed-item-header">
        <span class="source-badge">{{ item.source }}</span>
        <span class="time" :title="absoluteTime(item.pubDate)">
          {{ relativeTime(item.pubDate) }}
        </span>
      </div>
      <h3 class="title">
        <span v-if="!read" class="unread-dot" />
        {{ item.title }}
      </h3>
      <p v-if="item.titleZh" class="title-zh">{{ item.titleZh }}</p>
      <p v-if="item.description" class="description">{{ item.description }}</p>
      <p v-if="item.descriptionZh" class="description-zh">{{ item.descriptionZh }}</p>
      <div class="feed-item-footer">
        <TranslateButton :title="item.title" :description="item.description" />
      </div>
    </template>
  </article>
</template>

<style scoped>
.feed-item {
  padding: 16px;
  border: 1px solid var(--glass-border);
  border-radius: var(--glass-radius-sm);
  margin-bottom: 12px;
  cursor: pointer;
  transition: box-shadow 0.2s, border-color 0.2s, background 0.2s;
  background: var(--glass-bg);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
  box-shadow: var(--glass-shadow);
}

.feed-item:hover {
  border-color: rgba(0, 122, 255, 0.2);
  box-shadow: var(--glass-shadow-elevated);
}

.feed-item.read {
  opacity: 0.6;
}

.feed-item.compact {
  padding: 8px 12px;
  margin-bottom: 2px;
  border: none;
  border-radius: var(--glass-radius-xs);
  border-left: 3px solid transparent;
  box-shadow: none;
  background: transparent;
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
}

.feed-item.compact:hover {
  background: var(--color-hover);
  box-shadow: none;
  border-color: transparent;
}

.feed-item.compact.active {
  background: var(--color-active);
  border-left-color: var(--color-accent);
  opacity: 1;
}

.feed-item.compact.read {
  opacity: 0.5;
}

.feed-item.compact.active.read {
  opacity: 1;
}

.compact-title {
  font-size: 0.85rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin: 0;
}

.feed-item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.source-badge {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-accent);
  background: var(--color-accent-bg);
  padding: 2px 10px;
  border-radius: 20px;
}

.time {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
}

.title {
  font-size: 1rem;
  font-weight: 600;
  margin: 0 0 4px;
  line-height: 1.4;
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.title-zh {
  font-size: 0.9rem;
  color: var(--color-text-secondary);
  margin: 0 0 8px;
  line-height: 1.4;
}

.unread-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-accent);
  flex-shrink: 0;
  position: relative;
  top: -1px;
}

.description {
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  margin: 0 0 4px;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.description-zh {
  font-size: 0.82rem;
  color: var(--color-text-secondary);
  margin: 0 0 8px;
  line-height: 1.5;
  opacity: 0.75;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.feed-item-footer {
  display: flex;
  justify-content: flex-end;
}
</style>
