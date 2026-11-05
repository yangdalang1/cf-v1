<template>
  <Transition name="fade">
    <div v-if="visible" class="toast-overlay">
      <Transition name="slide-up">
        <div v-if="visible" class="toast-box">
          <!-- 弹窗内容 -->
          <div class="toast-header">
            <div class="toast-icon" :class="type">
              <svg v-if="type === 'alert'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
              <svg v-if="type === 'confirm'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
            </div>
            <div class="toast-message">{{ message }}</div>
          </div>

          <!-- 输入框区域 (仅 prompt 出现) -->
          <div v-if="type === 'prompt'" class="toast-input-wrap">
            <input v-model="inputValue" ref="inputRef" @keyup.enter="handleOk" type="text" class="toast-input" placeholder="请输入..." />
          </div>

          <!-- 按钮区域 -->
          <div class="toast-actions">
            <button v-if="type !== 'alert'" class="btn-cancel" @click="handleCancel">取消</button>
            <button class="btn-ok" @click="handleOk">确定</button>
          </div>
        </div>
      </Transition>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, nextTick, watch } from 'vue'

const visible = ref(false)
const message = ref('')
const type = ref<'alert' | 'confirm' | 'prompt'>('alert')
const inputValue = ref('')
const inputRef = ref<HTMLInputElement | null>(null)

let resolvePromise: (value: any) => void

// 劫持原生 alert
window.alert = (msg: string) => {
  message.value = msg
  type.value = 'alert'
  inputValue.value = ''
  visible.value = true
}

// 劫持原生 confirm
window.confirm = (msg: string) => {
  message.value = msg
  type.value = 'confirm'
  inputValue.value = ''
  visible.value = true
  return new Promise<boolean>((resolve) => {
    resolvePromise = resolve
  })
}

// 劫持原生 prompt
window.prompt = (msg: string, defaultValue?: string) => {
  message.value = msg
  type.value = 'prompt'
  inputValue.value = defaultValue || ''
  visible.value = true
  return new Promise<string | null>((resolve) => {
    resolvePromise = resolve
  })
}

watch(visible, async (val) => {
  if (val && type.value === 'prompt') {
    await nextTick()
    inputRef.value?.focus()
  }
})

const handleOk = () => {
  visible.value = false
  if (resolvePromise) {
    if (type.value === 'confirm') resolvePromise(true)
    else if (type.value === 'prompt') resolvePromise(inputValue.value)
  }
}

const handleCancel = () => {
  visible.value = false
  if (resolvePromise) {
    if (type.value === 'confirm') resolvePromise(false)
    else if (type.value === 'prompt') resolvePromise(null)
  }
}
</script>

<style scoped>
/* 磨砂遮罩 */
.toast-overlay {
  position: fixed; inset: 0; z-index: 10000;
  background: rgba(15, 23, 42, 0.4);
  backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
  display: flex; align-items: center; justify-content: center;
}

/* 弹窗主体 */
.toast-box {
  width: 340px;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 20px;
  padding: 24px;
  box-shadow: 0 24px 48px -12px rgba(0, 0, 0, 0.25), inset 0 1px 0 rgba(255, 255, 255, 1);
  border: 1px solid rgba(255, 255, 255, 0.5);
}

.toast-header {
  display: flex; flex-direction: column; align-items: center; gap: 12px;
  margin-bottom: 20px; text-align: center;
}

.toast-icon {
  width: 48px; height: 48px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
}
.toast-icon svg { width: 24px; height: 24px; }
.toast-icon.alert { background: #fee2e2; color: #ef4444; }
.toast-icon.confirm { background: #fef3c7; color: #d97706; }
.toast-icon.prompt { background: #eef2ff; color: #6366f1; }

.toast-message {
  font-size: 15px; font-weight: 600; color: #1e293b; line-height: 1.5;
}

.toast-input-wrap {
  margin-bottom: 20px;
}

.toast-input {
  width: 100%; height: 42px; padding: 0 14px;
  border: 1px solid #cbd5e1; border-radius: 10px;
  font-size: 14px; outline: none; transition: 0.2s;
  background: #f8fafc; color: #0f172a;
}
.toast-input:focus {
  border-color: #6366f1; background: #ffffff;
  box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1);
}

.toast-actions {
  display: flex; gap: 12px;
}

.toast-actions button {
  flex: 1; height: 42px; border-radius: 10px;
  font-size: 14px; font-weight: 700; cursor: pointer; border: none;
  transition: 0.2s;
}

.btn-cancel { background: #f1f5f9; color: #475569; }
.btn-cancel:hover { background: #e2e8f0; }

.btn-ok { background: linear-gradient(135deg, #6366f1, #4f46e5); color: white; box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3); }
.btn-ok:hover { transform: translateY(-1px); box-shadow: 0 6px 16px rgba(99, 102, 241, 0.4); }

/* 动画 */
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

.slide-up-enter-active, .slide-up-leave-active { transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
.slide-up-enter-from, .slide-up-leave-to { opacity: 0; transform: translateY(20px) scale(0.95); }
</style>