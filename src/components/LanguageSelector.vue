<script setup lang="ts">
import { useTranslate, LANGUAGES } from '../composables/useTranslate'

const { targetLang, setLanguage } = useTranslate()
</script>

<template>
  <select class="lang-select" :value="targetLang" @change="setLanguage(($event.target as HTMLSelectElement).value)">
    <option v-for="lang in LANGUAGES" :key="lang.code" :value="lang.code">
      {{ lang.name }}
    </option>
  </select>
</template>

<style scoped>
.lang-select {
  font-size: 0.8rem;
  padding: 6px 10px;
  border: 1px solid var(--glass-border);
  border-radius: var(--glass-radius-xs);
  background: var(--glass-bg);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
  color: var(--color-text);
  cursor: pointer;
  transition: background 0.2s;
}

.lang-select:hover {
  background: var(--color-hover);
}
</style>
