<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'

const props = withDefaults(defineProps<{
  modelValue: string
  placeholder?: string
  range?: boolean
  endValue?: string
}>(), {
  placeholder: '选择日期',
  range: false,
  endValue: ''
})

const emit = defineEmits(['update:modelValue', 'update:endValue', 'change'])
const open = ref(false)
const triggerRef = ref<HTMLElement | null>(null)
const panelRef = ref<HTMLElement | null>(null)
const panelStyle = ref<any>({})
const viewDate = ref(new Date())

const startStr = ref(props.modelValue)
const endStr = ref(props.endValue)

function parseDate(s: string): Date | null {
  if (!s) return null
  const [y, m, d] = s.split('-').map(Number)
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d)
}

function fmt(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

const displayText = computed(() => {
  if (props.range) {
    if (!startStr.value && !endStr.value) return props.placeholder
    return `${startStr.value || '开始'} ~ ${endStr.value || '结束'}`
  }
  return startStr.value || props.placeholder
})

const year = computed(() => viewDate.value.getFullYear())
const month = computed(() => viewDate.value.getMonth())

const days = computed(() => {
  const first = new Date(year.value, month.value, 1)
  const startWeekday = first.getDay()
  const daysInMonth = new Date(year.value, month.value + 1, 0).getDate()
  const prevDays = new Date(year.value, month.value, 0).getDate()
  const arr: { day: number, date: Date, current: boolean }[] = []
  for (let i = startWeekday - 1; i >= 0; i--) {
    const d = new Date(year.value, month.value - 1, prevDays - i)
    arr.push({ day: prevDays - i, date: d, current: false })
  }
  for (let i = 1; i <= daysInMonth; i++) {
    arr.push({ day: i, date: new Date(year.value, month.value, i), current: true })
  }
  const rest = 42 - arr.length
  for (let i = 1; i <= rest; i++) {
    arr.push({ day: i, date: new Date(year.value, month.value + 1, i), current: false })
  }
  return arr
})

function isInRange(d: Date) {
  if (!props.range || !startStr.value || !endStr.value) return false
  const s = parseDate(startStr.value)?.getTime() || 0
  const e = parseDate(endStr.value)?.getTime() || 0
  const t = d.getTime()
  return t >= s && t <= e
}

function isSelected(d: Date) {
  const t = fmt(d)
  return t === startStr.value || (props.range && t === endStr.value)
}

function pickDate(d: Date) {
  const s = fmt(d)
  if (!props.range) {
    startStr.value = s
    emit('update:modelValue', s)
    emit('change', s)
    open.value = false
    return
  }
  if (!startStr.value || (startStr.value && endStr.value)) {
    startStr.value = s
    endStr.value = ''
    emit('update:modelValue', s)
    emit('update:endValue', '')
  } else {
    if (s < startStr.value) {
      endStr.value = startStr.value
      startStr.value = s
    } else {
      endStr.value = s
    }
    emit('update:modelValue', startStr.value)
    emit('update:endValue', endStr.value)
    emit('change', { start: startStr.value, end: endStr.value })
    open.value = false
  }
}

function prevMonth() { viewDate.value = new Date(year.value, month.value - 1, 1) }
function nextMonth() { viewDate.value = new Date(year.value, month.value + 1, 1) }
function clear() {
  startStr.value = ''; endStr.value = ''
  emit('update:modelValue', ''); emit('update:endValue', '')
  emit('change', { start: '', end: '' })
  open.value = false
}

function togglePanel() {
  open.value = !open.value
  if (open.value) {
    if (startStr.value) {
      const d = parseDate(startStr.value)
      if (d) viewDate.value = d
    }
    nextTick(updatePosition)
  }
}

function updatePosition() {
  if (!triggerRef.value) return
  const rect = triggerRef.value.getBoundingClientRect()
  const panelH = 340
  const spaceBelow = window.innerHeight - rect.bottom
  const showAbove = spaceBelow < panelH + 20 && rect.top > panelH + 20
  panelStyle.value = {
    position: 'fixed',
    left: Math.min(rect.left, window.innerWidth - 300 - 12) + 'px',
    zIndex: 99999,
    top: showAbove ? (rect.top - panelH - 6) + 'px' : (rect.bottom + 6) + 'px'
  }
}

function onDocClick(e: MouseEvent) {
  if (!open.value) return
  const t = e.target as Node
  if (triggerRef.value?.contains(t)) return
  if (panelRef.value?.contains(t)) return
  open.value = false
}

function onScrollResize() { if (open.value) updatePosition() }

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

watch(() => props.modelValue, v => { startStr.value = v })
watch(() => props.endValue, v => { endStr.value = v })
</script>

<template>
  <div ref="triggerRef" class="bdate-trigger" :class="{ 'is-open': open }" @click.stop="togglePanel">
    <span class="bdate-text" :class="{ 'is-placeholder': displayText === placeholder }">{{ displayText }}</span>
    <svg class="bdate-icon" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
  </div>

  <Teleport to="body">
    <Transition name="bdate-fade">
      <div v-if="open" ref="panelRef" class="bdate-panel" :style="panelStyle" @click.stop>
        <div class="bdate-header">
          <button class="bdate-nav" @click="prevMonth">‹</button>
          <span class="bdate-title">{{ year }} 年 {{ month + 1 }} 月</span>
          <button class="bdate-nav" @click="nextMonth">›</button>
        </div>
        <div class="bdate-week">
          <span v-for="w in ['日','一','二','三','四','五','六']" :key="w">{{ w }}</span>
        </div>
        <div class="bdate-grid">
          <div v-for="(d, i) in days" :key="i"
            class="bdate-cell"
            :class="{
              'is-other': !d.current,
              'is-selected': isSelected(d.date),
              'is-in-range': isInRange(d.date),
              'is-today': fmt(new Date()) === fmt(d.date)
            }"
            @click="pickDate(d.date)">{{ d.day }}</div>
        </div>
        <div class="bdate-footer">
          <span class="bdate-hint">{{ range ? '依次点选开始与结束' : '选择日期' }}</span>
          <button class="bdate-clear" @click="clear">清空</button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.bdate-trigger {
  height: 38px; padding: 0 12px; border: 1px solid #cbd5e1; border-radius: 8px;
  background: #f8fafc; color: #0f172a; font-size: 13px; cursor: pointer;
  display: inline-flex; align-items: center; justify-content: space-between; gap: 8px;
  box-sizing: border-box; transition: 0.2s; user-select: none; min-width: 140px;
}
.bdate-trigger:hover { border-color: #94a3b8; background: #fff; }
.bdate-trigger.is-open { border-color: #6366f1; background: #fff; box-shadow: 0 0 0 3px rgba(99,102,241,0.1); }
.bdate-text { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.bdate-text.is-placeholder { color: #94a3b8; }
.bdate-icon { color: #64748b; flex-shrink: 0; }

.bdate-panel {
  width: 288px; background: #fff; border: 1px solid #e2e8f0; border-radius: 12px;
  box-shadow: 0 12px 36px rgba(15,23,42,0.15), 0 2px 8px rgba(0,0,0,0.04);
  padding: 12px; z-index: 99999;
}
.bdate-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
.bdate-title { font-size: 13px; font-weight: 700; color: #0f172a; }
.bdate-nav { width: 26px; height: 26px; border: 1px solid #e2e8f0; background: #f8fafc; border-radius: 6px; cursor: pointer; color: #475569; font-size: 16px; line-height: 1; padding: 0; }
.bdate-nav:hover { background: #eef2ff; color: #4f46e5; border-color: #c7d2fe; }
.bdate-week { display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; margin-bottom: 4px; }
.bdate-week span { text-align: center; font-size: 11px; color: #94a3b8; font-weight: 600; padding: 4px 0; }
.bdate-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; }
.bdate-cell {
  height: 32px; display: flex; align-items: center; justify-content: center;
  font-size: 12px; color: #334155; border-radius: 6px; cursor: pointer; transition: 0.15s;
}
.bdate-cell:hover { background: #eef2ff; color: #4f46e5; }
.bdate-cell.is-other { color: #cbd5e1; }
.bdate-cell.is-today { font-weight: 800; color: #6366f1; }
.bdate-cell.is-in-range { background: #e0e7ff; color: #4338ca; }
.bdate-cell.is-selected { background: #6366f1; color: #fff; font-weight: 700; }
.bdate-footer { display: flex; align-items: center; justify-content: space-between; margin-top: 10px; padding-top: 10px; border-top: 1px dashed #e2e8f0; }
.bdate-hint { font-size: 11px; color: #94a3b8; }
.bdate-clear { background: #f1f5f9; color: #475569; border: none; border-radius: 6px; padding: 4px 10px; font-size: 12px; cursor: pointer; }
.bdate-clear:hover { background: #e2e8f0; }

.bdate-fade-enter-active, .bdate-fade-leave-active { transition: opacity 0.15s, transform 0.15s; }
.bdate-fade-enter-from, .bdate-fade-leave-to { opacity: 0; transform: translateY(-4px); }
</style>