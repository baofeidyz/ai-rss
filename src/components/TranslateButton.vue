<script setup lang="ts">
import { ref } from 'vue'
import { useTranslate } from '../composables/useTranslate'

const props = defineProps<{
  title: string
  description: string
}>()

const { translate } = useTranslate()

const translatedTitle = ref('')
const translatedDesc = ref('')
const showTranslation = ref(false)
const loading = ref(false)

async function handleTranslate(e: Event) {
  e.stopPropagation()
  if (showTranslation.value) {
    showTranslation.value = false
    return
  }
  if (translatedTitle.value) {
    showTranslation.value = true
    return
  }
  loading.value = true
  try {
    const [t, d] = await Promise.all([
      translate(props.title),
      props.description ? translate(props.description) : Promise.resolve(''),
    ])
    translatedTitle.value = t
    translatedDesc.value = d
    showTranslation.value = true
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="translate-wrapper">
    <button class="translate-btn" :disabled="loading" @click="handleTranslate">
      {{ loading ? '...' : showTranslation ? '原文' : '译' }}
    </button>
    <div v-if="showTranslation" class="translation" @click.stop>
      <p class="translated-title">{{ translatedTitle }}</p>
      <p v-if="translatedDesc" class="translated-desc">{{ translatedDesc }}</p>
    </div>
  </div>
</template>

<style scoped>
.translate-wrapper {
  position: relative;
}

.translate-btn {
  font-size: 0.75rem;
  padding: 3px 10px;
  border: 1px solid var(--glass-border);
  border-radius: 20px;
  background: var(--glass-bg);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: background 0.2s;
}

.translate-btn:hover {
  background: var(--color-hover);
}

.translation {
  margin-top: 8px;
  padding: 10px 12px;
  background: var(--glass-bg);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
  border-radius: var(--glass-radius-xs);
  border: 1px solid var(--glass-border);
}

.translated-title {
  font-weight: 600;
  margin: 0 0 4px;
  font-size: 0.9rem;
}

.translated-desc {
  margin: 0;
  font-size: 0.82rem;
  color: var(--color-text-secondary);
  line-height: 1.5;
}
</style>
