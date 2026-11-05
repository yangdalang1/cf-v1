<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'

const props = withDefaults(defineProps<{
  modelValue: any
  options: { label: string, value: any }[]
  placeholder?: string
  multiple?: boolean
  disabled?: boolean
  width?: string
  height?: string
}>(), {
  placeholder: '请选择',
  multiple: false,
  disabled: false,
  width: '160px',
  height: '38px'
})

const emit = defineEmits(['update:modelValue', 'change'])
const open = ref(false)
const triggerRef = ref<HTMLElement | null>(null)
const panelRef = ref<HTMLElement | null>(null)
const panelStyle = ref<any>({})

const isMultiple = computed(() => props.multiple)
const selectedValues = computed(() => {
  if (isMultiple.value) return Array.isArray(props.modelValue) ? props.modelValue : []
  return props.modelValue !== null && props.modelValue !== undefined && props.modelValue !== '' ? [props.modelValue] : []
})

const displayText = computed(() => {
  if (selectedValues.value.length === 0) return props.placeholder
  const labels = props.options.filter(o => selectedValues.value.includes(o.value)).map(o => o.label)
  if (labels.length === 0) return props.placeholder
  if (!isMultiple.value) return labels[0]
  if (labels.length <= 2) return labels.join(', ')
  return `${labels[0]}, ${labels[1]} 等 ${labels.length} 项`
})

function togglePanel() {
  if (props.disabled) return
  open.value = !open.value
  if (open.value) nextTick(updatePosition)
}

function updatePosition() {
  if (!triggerRef.value) return
  const rect = triggerRef.value.getBoundingClientRect()
  const panelH = Math.min(280, props.options.length * 38 + 16)
  const spaceBelow = window.innerHeight - rect.bottom
  const showAbove = spaceBelow < panelH + 20 && rect.top > panelH + 20
  panelStyle.value = {
    position: 'fixed',
    left: rect.left + 'px',
    width: Math.max(rect.width, 180) + 'px',
    zIndex: 99999,
    top: showAbove ? (rect.top - panelH - 6) + 'px' : (rect.bottom + 6) + 'px'
  }
}

function selectItem(val: any) {
  if (isMultiple.value) {
    const arr = [...selectedValues.value]
    const idx = arr.indexOf(val)
    if (idx >= 0) arr.splice(idx, 1)
    else arr.push(val)
    emit('update:modelValue', arr)
    emit('change', arr)
  } else {
    emit('update:modelValue', val)
    emit('change', val)
    open.value = false
  }
}

function onDocClick(e: MouseEvent) {
  if (!open.value) return
  const t = e.target as Node
  if (triggerRef.value?.contains(t)) return
  if (panelRef.value?.contains(t)) return
  open.value = false
}

function onScrollResize() {
  if (open.value) updatePosition()
}

onMounted(() => {
  document.addEventListener('click', onDocClick, true)
  window.addEventListener('scroll', onScrollResize, true)
  window.addEventListener('resize', onScrollResize)
})
onUnmounted(() => {
  document.removeEventListener('click', onDocClick, true)
  window.removeEventListener('scroll', onScrollResize, true)
  window.removeEventListener('resize', onScrollResize)
})

watch(open, async (v) => {
  if (v) { await nextTick(); updatePosition() }
})
</script>

<template>
  <div ref="triggerRef" class="bselect-trigger" :class="{ 'is-open': open, 'is-disabled': disabled }" :style="{ width, height }" @click.stop="togglePanel">
    <span class="bselect-text" :class="{ 'is-placeholder': selectedValues.length === 0 }">{{ displayText }}</span>
    <svg class="bselect-arrow" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" :style="{ transform: open ? 'rotate(180deg)' : 'none' }"><polyline points="6 9 12 15 18 9"></polyline></svg>
  </div>

  <Teleport to="body">
    <Transition name="bselect-fade">
      <div v-if="open" ref="panelRef" class="bselect-panel" :style="panelStyle" @click.stop>
        <div class="bselect-list">
          <div v-for="opt in options" :key="String(opt.value)" class="bselect-item" :class="{ 'is-selected': selectedValues.includes(opt.value) }" @click="selectItem(opt.value)">
            <span class="bselect-item-label">{{ opt.label }}</span>
            <span v-if="selectedValues.includes(opt.value)" class="bselect-check">✓</span>
          </div>
          <div v-if="options.length === 0" class="bselect-empty">暂无选项</div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.bselect-trigger {
  padding: 0 12px; border: 1px solid #cbd5e1; border-radius: 8px;
  background: #f8fafc; color: #0f172a; font-size: 13px; cursor: pointer;
  display: inline-flex; align-items: center; justify-content: space-between; gap: 8px;
  box-sizing: border-box; transition: 0.2s; user-select: none;
}
.bselect-trigger:hover { border-color: #94a3b8; background: #fff; }
.bselect-trigger.is-open { border-color: #6366f1; background: #fff; box-shadow: 0 0 0 3px rgba(99,102,241,0.1); }
.bselect-trigger.is-disabled { opacity: 0.6; cursor: not-allowed; }
.bselect-text { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-align: left; }
.bselect-text.is-placeholder { color: #94a3b8; }
.bselect-arrow { color: #64748b; flex-shrink: 0; transition: 0.2s; }

.bselect-panel {
  background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px;
  box-shadow: 0 12px 36px rgba(15,23,42,0.12), 0 2px 8px rgba(0,0,0,0.04);
  padding: 6px; max-height: 280px; overflow-y: auto; overflow-x: hidden;
  scrollbar-width: thin; scrollbar-color: transparent transparent;
}
.bselect-panel:hover { scrollbar-color: #cbd5e1 transparent; }
.bselect-panel::-webkit-scrollbar { width: 6px; }
.bselect-panel::-webkit-scrollbar-track { background: transparent; }
.bselect-panel::-webkit-scrollbar-thumb { background: transparent; border-radius: 3px; }
.bselect-panel:hover::-webkit-scrollbar-thumb { background: #cbd5e1; }

.bselect-list { display: flex; flex-direction: column; }
.bselect-item {
  padding: 8px 10px; border-radius: 6px; font-size: 13px; color: #334155;
  cursor: pointer; display: flex; justify-content: space-between; align-items: center; gap: 8px;
  transition: 0.15s;
}
.bselect-item:hover { background: #eef2ff; color: #4f46e5; }
.bselect-item.is-selected { background: #eef2ff; color: #4f46e5; font-weight: 600; }
.bselect-item-label { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.bselect-check { color: #4f46e5; font-weight: 900; flex-shrink: 0; }
.bselect-empty { padding: 16px; text-align: center; color: #94a3b8; font-size: 12px; }

.bselect-fade-enter-active, .bselect-fade-leave-active { transition: opacity 0.15s, transform 0.15s; }
.bselect-fade-enter-from, .bselect-fade-leave-to { opacity: 0; transform: translateY(-4px); }
</style>