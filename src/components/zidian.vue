<script setup lang="ts">
import { ref } from 'vue'
import axios from 'axios'

const props = defineProps<{
  outcomes: string[]
  projects: string[]
  dynamicFields: any[]
  embedded?: boolean
}>()

// 新增了 toast 事件
const emit = defineEmits(['refresh', 'toast'])

const newOutcome = ref('')
const newProject = ref('')
const newField = ref('')

async function saveDict(type: string, values: any[]) { 
  await axios.post('/api/dict', { type, values })
  emit('refresh') 
}

async function addDictItem(type: string, val: string) {
  if (!val) return
  if (type === 'fields') await saveDict(type, [...props.dynamicFields, { name: val, sort_order: props.dynamicFields.length }])
  else await saveDict(type, [...(type === 'outcome' ? props.outcomes : props.projects), val])
  
  // 添加成功的提示
  emit('toast', `成功添加：${val}`, 'success')

  if (type === 'outcome') newOutcome.value = ''
  else if (type === 'project') newProject.value = ''
  else newField.value = ''
}

async function removeDictItem(type: string, index: number) {
  if (!await confirm('确定要删除这一项吗？')) return
  
  let deletedItem = ''
  if (type === 'fields') { 
    const arr = [...props.dynamicFields]
    deletedItem = arr[index].name
    arr.splice(index, 1)
    await saveDict(type, arr)
  } else { 
    const arr = [...(type === 'outcome' ? props.outcomes : props.projects)]
    deletedItem = arr[index]
    arr.splice(index, 1)
    await saveDict(type, arr) 
  }
  
  // 删除成功的提示
  emit('toast', `已删除：${deletedItem}`, 'success')
}
</script>

<template>
  <div :class="embedded ? 'zidian-embedded' : 'animate-fade'">
    <div :class="embedded ? 'zidian-3-col' : 'glass-card'">
      <div class="config-panel">
        <div class="panel-header">红黑赛果</div>
        <div class="panel-body">
          <div class="tag-list">
            <span v-for="(item, index) in outcomes" :key="index" class="dict-tag">
              {{ item }} 
              <span class="close" @click="removeDictItem('outcome', index)">×</span>
            </span>
          </div>
        </div>
        <div class="panel-footer">
          <input v-model="newOutcome" placeholder="新赛果 (如 腰斩)" @keyup.enter="addDictItem('outcome', newOutcome)" />
          <button class="btn-dark" @click="addDictItem('outcome', newOutcome)">添加</button>
        </div>
      </div>

      <div class="config-panel">
        <div class="panel-header">所属项目</div>
        <div class="panel-body">
          <div class="tag-list">
            <span v-for="(item, index) in projects" :key="index" class="dict-tag">
              {{ item }} 
              <span class="close" @click="removeDictItem('project', index)">×</span>
            </span>
          </div>
        </div>
        <div class="panel-footer">
          <input v-model="newProject" placeholder="新项目" @keyup.enter="addDictItem('project', newProject)" />
          <button class="btn-dark" @click="addDictItem('project', newProject)">添加</button>
        </div>
      </div>

      <div class="config-panel">
        <div class="panel-header">动态表单字段</div>
        <div class="panel-body">
          <div class="tag-list">
            <span v-for="(item, index) in dynamicFields" :key="index" class="dict-tag">
              {{ item.name }} 
              <span class="close" @click="removeDictItem('fields', index)">×</span>
            </span>
          </div>
        </div>
        <div class="panel-footer">
          <input v-model="newField" placeholder="新字段名 (如 赔率)" @keyup.enter="addDictItem('fields', newField)" />
          <button class="btn-primary" @click="addDictItem('fields', newField)">增加列</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.zidian-embedded { width: 100%; }
.zidian-embedded .zidian-3-col { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
@media (max-width: 1024px) { .zidian-embedded .zidian-3-col { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 768px) { .zidian-embedded .zidian-3-col { grid-template-columns: 1fr; } }

.zidian-embedded .config-panel { display: flex; flex-direction: column; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; }
.glass-card { background: #fff; padding: 24px; border-radius: 20px; border: 1px solid #e2e8f0; margin-bottom: 24px; }

.panel-header { font-size: 13px; font-weight: 700; color: #334155; margin-bottom: 12px; }
.panel-body { flex: 1; margin-bottom: 16px; min-height: 60px; }
.panel-footer { display: flex; gap: 8px; border-top: 1px dashed #cbd5e1; padding-top: 12px; margin-top: auto; }

.tag-list { display: flex; flex-wrap: wrap; gap: 6px; align-content: flex-start; }
.dict-tag { display: inline-flex; align-items: center; padding: 4px 8px; background: #ffffff; color: #334155; border-radius: 6px; font-size: 12px; border: 1px solid #e2e8f0; box-shadow: 0 1px 2px rgba(0,0,0,0.02); }
.dict-tag .close { color: #ef4444; cursor: pointer; font-weight: bold; font-size: 14px; margin-left: 4px; line-height: 1; }
.dict-tag .close:hover { color: #b91c1c; }

.panel-footer input { flex: 1; padding: 0 10px; height: 32px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; outline: none; transition: 0.2s; background: #ffffff; width: 100%; min-width: 0; }
.panel-footer input:focus { border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1); }

.panel-footer button { width: 64px; height: 32px; border-radius: 6px; font-weight: 600; font-size: 13px; cursor: pointer; border: none; transition: 0.2s; flex-shrink: 0; padding: 0; }
.panel-footer button:hover { transform: translateY(-1px); }

.btn-dark { background: #1e293b; color: white; }
.btn-dark:hover { background: #0f172a; }
.btn-primary { background: #6366f1; color: white; }
.btn-primary:hover { background: #4f46e5; }
</style>