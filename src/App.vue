<script setup lang="ts">
import './style.css'
import './poster.css'
import { ref, onMounted, computed, watch } from 'vue'
import axios from 'axios'
import Haibao from './components/haibao.vue'
import Zidian from './components/zidian.vue'
import Zhanghao from './components/zhanghao.vue'
import ToastConfirm from './components/ToastConfirm.vue'
import BaseSelect from './components/BaseSelect.vue'
import BaseDatePicker from './components/BaseDatePicker.vue'

// ========== 基础状态 ==========
const token = ref(localStorage.getItem('token') || '')
const isLogged = ref(!!token.value)
const username = ref('')
const password = ref('')
const currentTab = ref('records')
const isSidebarCollapsed = ref(false)
const showDictPanel = ref(false)
const showRecordForm = ref(localStorage.getItem('show_record_form') !== 'false')

// 👇 新增：隐藏战绩项目的状态
const hiddenProjects = ref<string[]>(JSON.parse(localStorage.getItem('hidden_projects') || '[]'))
watch(hiddenProjects, (val) => localStorage.setItem('hidden_projects', JSON.stringify(val)), { deep: true })

// 切换隐藏项目
const toggleHideProject = (projectName: string) => {
  if (hiddenProjects.value.includes(projectName)) {
    hiddenProjects.value = hiddenProjects.value.filter(p => p !== projectName)
  } else {
    hiddenProjects.value.push(projectName)
  }
}

watch(showRecordForm, (val) => localStorage.setItem('show_record_form', String(val)))

// ========== 全局 Toast ==========
const toast = ref({ show: false, msg: '', type: 'success' as 'success' | 'error' })
let toastTimer: any = null
function showToast(msg: string, type: 'success' | 'error' = 'success') {
  toast.value = { show: true, msg, type }
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toast.value.show = false }, 1200)
}

const loggingIn = ref(false)

// ========== 权限 ==========
const isAdmin = ref(localStorage.getItem('role') === 'admin')
const myId = ref<number | null>(Number(localStorage.getItem('userId')) || null)
const myUsername = ref(localStorage.getItem('username') || '')
const adminUserList = ref<any[]>([])
const userList = ref<any[]>([])
const targetUser = ref('全部')

// ========== 字典 ==========
const outcomes = ref<string[]>([])
const projects = ref<string[]>([])
const dynamicFields = ref<{ name: string, sort_order: number }[]>([])
const myOutcomes = ref<string[]>([])
const myProjects = ref<string[]>([])

const defaultColumns = [
  { key: 'date', name: '日期', visible: true },
  { key: 'project', name: '项目', visible: true },
  { key: 'match_info', name: '赛事', visible: true },
  { key: 'teams', name: '对阵双方', visible: true },
  { key: 'result', name: '赛果', visible: true },
  { key: 'thought', name: '思路', visible: true },
  { key: 'outcome', name: '结果', visible: true }
]
const columns = ref<any[]>(JSON.parse(localStorage.getItem('table_columns') || JSON.stringify(defaultColumns)))
watch(columns, (val) => localStorage.setItem('table_columns', JSON.stringify(val)), { deep: true })

const allColumns = computed(() => {
  const dynCols = dynamicFields.value.map(f => ({ key: `extra_${f.name}`, name: f.name, visible: true }))
  dynCols.forEach(dc => { if (!columns.value.find(c => c.key === dc.key)) columns.value.push(dc) })
  const currentKeys = ['date', 'project', 'match_info', 'teams', 'result', 'thought', 'outcome', ...dynCols.map(d => d.key)]
  return columns.value.filter(c => currentKeys.includes(c.key))
})

// ========== 列表与筛选 ==========
const records = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)

const filterProjects = ref<string[]>([])
const filterEvents = ref<string[]>([])
const filterOutcomes = ref<string[]>([])
const filterDateStart = ref('')
const filterDateEnd = ref('')

const filterOptions = ref<{ projects: string[], events: string[], outcomes: string[] }>({
  projects: [], events: [], outcomes: []
})

// ========== 隐藏功能 ==========
const hiddenIds = ref<number[]>([])
const activeMenuId = ref<number | null>(null)
const menuPosition = ref({ top: 0, left: 0 })

try {
  const stored = localStorage.getItem('hidden_records')
  if (stored) hiddenIds.value = JSON.parse(stored)
} catch (e) { hiddenIds.value = [] }

watch(hiddenIds, (val) => {
  localStorage.setItem('hidden_records', JSON.stringify(val))
}, { deep: true })

// 过滤表格数据（加入了隐藏项目的过滤）
const visibleRecords = computed(() => {
  return records.value.filter(r => {
    // 1. 过滤掉被单条隐藏的数据
    if (hiddenIds.value.includes(r.id)) return false
    // 2. 过滤掉被选中的隐藏项目
    if (hiddenProjects.value.includes(r.project)) return false
    return true
  })
})

function toggleMenu(id: number, event: MouseEvent) {
  if (activeMenuId.value === id) {
    activeMenuId.value = null
    return
  }
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  const spaceBelow = window.innerHeight - rect.bottom
  const isUp = spaceBelow < 180
  menuPosition.value = {
    top: isUp ? rect.top - 130 : rect.bottom + 6,
    left: rect.left - 60
  }
  activeMenuId.value = id
}

function hideRecord(id: number) {
  if (!hiddenIds.value.includes(id)) {
    hiddenIds.value.push(id)
    showToast('已隐藏该数据')
  }
  activeMenuId.value = null
}

function restoreAll() {
  if (hiddenIds.value.length === 0) return
  hiddenIds.value = []
  showToast('已恢复所有隐藏数据')
}

onMounted(() => {
  document.addEventListener('click', () => { activeMenuId.value = null })
})

const selectedIds = ref<number[]>([])
const toggleSelectAll = () => {
  if (selectedIds.value.length === visibleRecords.value.length && visibleRecords.value.length > 0) {
    selectedIds.value = []
  } else {
    selectedIds.value = visibleRecords.value.map(r => r.id)
  }
}

const form = ref<any>({
  date: new Date().toISOString().split('T')[0],
  project: '', match_info: '', teams: '', result: '', thought: '', outcome: '红', extra_data: {}
})

const showEditModal = ref(false)
const editForm = ref<any>({})

function openEdit(row: any) {
  editForm.value = JSON.parse(JSON.stringify(row))
  showEditModal.value = true
}

// ========== 批量导入 ==========
const showImportModal = ref(false)
const pasteData = ref('')
const isImporting = ref(false)

function openImport() { 
  pasteData.value = ''
  showImportModal.value = true 
}

async function submitImport() {
  if (!pasteData.value.trim()) return showToast('请先粘贴数据', 'error')
  if (isImporting.value) return
  
  const lines = pasteData.value.trim().split(/\r?\n/)
  const recordsToAdd = []
  
  for (let line of lines) {
    if (!line.trim()) continue
    let cols = line.split('\t')
    if (cols.length < 4) cols = line.split(',')
    if (cols.length < 4) cols = line.split(/\s{2,}/)

    if (cols.length >= 3) {
      const cleanCols = cols.map(c => c.trim())
      recordsToAdd.push({
        date: cleanCols[0] || new Date().toISOString().split('T')[0],
        project: cleanCols[1] || '默认项目',
        match_info: cleanCols[2] || '',
        teams: cleanCols[3] || '',
        result: cleanCols[4] || '',
        thought: cleanCols[5] || '',
        outcome: cleanCols[6] || '红',
        extra_data: '{}'
      })
    }
  }

  if (recordsToAdd.length === 0) return showToast('格式不对，未识别到有效数据', 'error')

  try {
    isImporting.value = true
    showToast(`正在极速导入 ${recordsToAdd.length} 条数据...`, 'success')
    await axios.post('/api/records/batch_add', { records: recordsToAdd })
    showImportModal.value = false
    await loadFilterOptions()
    loadRecords()
    showToast(`成功导入 ${recordsToAdd.length} 条数据！`)
  } catch (e: any) {
    showToast('导入失败: ' + (e.response?.data?.error || e.message), 'error')
  } finally {
    isImporting.value = false
  }
}

async function saveEdit() {
  if (!editForm.value.date || !editForm.value.match_info || !editForm.value.teams) return showToast('请填写必填项', 'error')
  try {
    await axios.put(`/api/records/${editForm.value.id}`, { ...editForm.value, extra_data: JSON.stringify(editForm.value.extra_data) })
    showEditModal.value = false
    await loadFilterOptions()
    loadRecords()
    showToast('修改保存成功！')
  } catch (e: any) { showToast('修改失败: ' + (e.response?.data?.error || e.message), 'error') }
}

axios.defaults.headers.common['Authorization'] = token.value ? `Bearer ${token.value}` : ''

// ========== 登录 ==========
async function login() {
  if (loggingIn.value) return
  loggingIn.value = true
  try {
    const res = await axios.post('/api/login', { username: username.value, password: password.value })
    if (res.data.ok) {
      token.value = res.data.token
      localStorage.setItem('token', token.value)
      localStorage.setItem('role', res.data.role)
      localStorage.setItem('userId', String(res.data.userId))
      localStorage.setItem('username', res.data.username)
      isAdmin.value = res.data.role === 'admin'
      myId.value = res.data.userId
      myUsername.value = res.data.username
      axios.defaults.headers.common['Authorization'] = `Bearer ${token.value}`
      isLogged.value = true
      await initData()
      if (isAdmin.value) loadAdminUsers()
      showToast('登录成功，欢迎回来！', 'success')
    }
  } catch (e: any) {
    showToast(e.response?.data?.error || '账号或密码错误', 'error')
  } finally {
    loggingIn.value = false
  }
}

function logout() {
  localStorage.removeItem('token'); localStorage.removeItem('role'); localStorage.removeItem('userId'); localStorage.removeItem('username')
  window.location.reload()
}

async function loadDict() {
  const resOut = await axios.get('/api/dict?type=outcome'); outcomes.value = resOut.data
  if (outcomes.value.length > 0 && !form.value.outcome) form.value.outcome = outcomes.value[0]
  const resPro = await axios.get('/api/dict?type=project'); projects.value = resPro.data
  if (projects.value.length > 0 && !form.value.project) form.value.project = projects.value[0]
  const resFields = await axios.get('/api/dict?type=fields'); dynamicFields.value = resFields.data
  dynamicFields.value.forEach(f => { if (form.value.extra_data[f.name] === undefined) form.value.extra_data[f.name] = '' })
  if (isAdmin.value && targetUser.value === '全部') {
    myOutcomes.value = [...outcomes.value]
    myProjects.value = [...projects.value]
  }
}

async function loadTargetUserDict() {
  if (!isAdmin.value) return
  if (targetUser.value === '全部') {
    outcomes.value = [...myOutcomes.value]
    projects.value = [...myProjects.value]
    return
  }
  try {
    const [resOut, resPro] = await Promise.all([
      axios.get(`/api/dict?type=outcome&user_id=${targetUser.value}`),
      axios.get(`/api/dict?type=project&user_id=${targetUser.value}`)
    ])
    outcomes.value = resOut.data
    projects.value = resPro.data
  } catch (e) {}
}

async function loadAdminUsers() {
  if (!isAdmin.value) return
  try {
    const res = await axios.get('/api/users')
    adminUserList.value = res.data
    userList.value = res.data
  } catch (e) {}
}

// ========== 筛选选项加载 ==========
let optionsAbort: AbortController | null = null
async function loadFilterOptions() {
  if (optionsAbort) optionsAbort.abort()
  optionsAbort = new AbortController()
  try {
    const payload: any = {
      projects: filterProjects.value,
      events: filterEvents.value,
      outcomes: filterOutcomes.value,
      start_date: filterDateStart.value,
      end_date: filterDateEnd.value
    }
    if (isAdmin.value) payload.target_user = targetUser.value
    const res = await axios.post('/api/records/filter-options', payload, { signal: optionsAbort.signal })
    filterOptions.value = res.data
  } catch (e: any) {
    if (e.name === 'CanceledError' || e.code === 'ERR_CANCELED') return
  }
}


// ========== 统一筛选变化 ==========
let filterTimer: any = null
function onFilterChange() {
  if (filterTimer) clearTimeout(filterTimer)
  filterTimer = setTimeout(async () => {
    Promise.all([
      loadFilterOptions(),
      loadRecords()
    ])
  }, 500)
}

function clearFilter(which: 'project' | 'event' | 'outcome' | 'date') {
  if (which === 'project') filterProjects.value = []
  else if (which === 'event') filterEvents.value = []
  else if (which === 'outcome') filterOutcomes.value = []
  else if (which === 'date') { filterDateStart.value = ''; filterDateEnd.value = '' }
}
function clearAllFilters() {
  filterProjects.value = []
  filterEvents.value = []
  filterOutcomes.value = []
  filterDateStart.value = ''
  filterDateEnd.value = ''
}

// ========== 记录加载 ==========
let recordsAbort: AbortController | null = null
async function loadRecords() {
  const fixDate = (d: string) => {
    if (!d) return '';
    const parts = d.split('-');
    return parts.length === 3 ? `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}` : d;
  };
  if (recordsAbort) recordsAbort.abort()
  recordsAbort = new AbortController()
  const params: any = {
    page: page.value,
    pageSize: pageSize.value,
    start_date: fixDate(filterDateStart.value),
    end_date: fixDate(filterDateEnd.value)
  }
  if (filterProjects.value.length) params.project = filterProjects.value.join(',')
  if (filterOutcomes.value.length) params.outcome = filterOutcomes.value.join(',')
  if (filterEvents.value.length) params.event = filterEvents.value.join(',')
  if (isAdmin.value) params.target_user = targetUser.value
  let res
  try {
    res = await axios.get('/api/records', { params, signal: recordsAbort.signal })
  } catch (e: any) {
    if (e.name === 'CanceledError' || e.code === 'ERR_CANCELED') return
    throw e
  }
  records.value = res.data.data.map((r: any) => ({ ...r, extra_data: r.extra_data ? JSON.parse(r.extra_data) : {} }))
  total.value = res.data.total
}

watch([filterProjects, filterEvents, filterOutcomes, filterDateStart, filterDateEnd, targetUser], onFilterChange, { deep: true })

watch(pageSize, () => {
  page.value = 1
  loadRecords()
})

// ========== 增删改 ==========
async function addRecord() {
  if (!form.value.date || !form.value.match_info || !form.value.teams) return showToast('请填写必填项', 'error')
  try {
    await axios.post('/api/records', { ...form.value, extra_data: JSON.stringify(form.value.extra_data) })
    form.value.match_info = ''; form.value.teams = ''; form.value.result = ''; form.value.thought = ''
    dynamicFields.value.forEach(f => form.value.extra_data[f.name] = '')
    loadRecords() 
    loadFilterOptions() 
    showToast('录入成功！')
  } catch (e: any) { showToast('录入失败: ' + (e.response?.data?.error || e.message), 'error') }
}

async function deleteSingle(id: number) {
  if (!await confirm('⚠️ 确定要删除这条数据吗？')) return
  try {
    await axios.delete('/api/records/' + id)
    await loadFilterOptions()
    loadRecords()
    showToast('删除成功！')
  } catch (e: any) { showToast('删除失败: ' + (e.response?.data?.error || e.message), 'error') }
}

async function batchDelete() {
  if (selectedIds.value.length === 0) return showToast('请先勾选要删除的数据', 'error')
  if (!await confirm(`⚠️ 警告：确定将选中的 ${selectedIds.value.length} 条数据删除吗？`)) return
  try {
    await axios.post('/api/records/batch_delete', { ids: selectedIds.value })
    selectedIds.value = []
    await loadFilterOptions()
    loadRecords()
    showToast('批量删除成功！')
  } catch (e: any) { showToast('批量删除失败: ' + (e.response?.data?.error || e.message), 'error') }
}

function exportToExcel() {
  if (records.value.length === 0) return showToast('当前没有数据可导出', 'error')
  const headers = ['日期', '项目', '赛事', '对阵双方', '赛果', '思路', '红黑']
  if (isAdmin.value && targetUser.value === '全部') headers.unshift('所属用户')
  dynamicFields.value.forEach(f => headers.push(f.name))
  const rows = records.value.map(r => {
    const row: string[] = []
    if (isAdmin.value && targetUser.value === '全部') {
      const uName = adminUserList.value.find(u => u.id === r.user_id)?.username || String(r.user_id)
      row.push(uName)
    }
    row.push(r.date.replace(/\//g, '-'), r.project || '', r.match_info || '', r.teams || '', r.result || '', r.thought || '', r.outcome || '')
    dynamicFields.value.forEach(f => { row.push(r.extra_data[f.name] || '') })
    return row
  })
  let csvContent = '\ufeff' + headers.join(',') + '\n'
  rows.forEach(row => {
    const escapedRow = row.map(cell => `"${String(cell).replace(/"/g, '""')}"`)
    csvContent += escapedRow.join(',') + '\n'
  })
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `战绩导出_${new Date().getTime()}.csv`
  link.click()
  URL.revokeObjectURL(link.href)
  showToast('导出成功，请查看下载！')
}

async function initData() {
  await loadDict()
  await loadFilterOptions()
  await loadRecords()
}

onMounted(() => { 
  if (isLogged.value) { 
    initData()
    if (isAdmin.value) loadAdminUsers() 
  }
  setTimeout(() => {
    const loader = document.getElementById('global-loader')
    if (loader) loader.style.display = 'none'
  }, 100)
})
</script>

<template>
  <!-- 登录页 -->
  <div v-if="!isLogged" class="login-page">
    <div class="login-box">
      <div class="brand">Apex<span>Stats</span></div>
      <p class="subtitle">专属战绩管理空间</p>
      <input v-model="username" placeholder="账号" style="width:100%;padding:10px;margin-bottom:10px;" />
      <input v-model="password" type="password" placeholder="密码" @keyup.enter="login" style="width:100%;padding:10px;margin-bottom:20px;" />
      <button class="btn-primary" @click="login" :disabled="loggingIn" style="width:100%;padding:12px;opacity: loggingIn ? 0.7 : 1; cursor: loggingIn ? 'not-allowed' : 'pointer';">
        {{ loggingIn ? '登录中...' : '登 录' }}
      </button>
    </div>
  </div>

  <!-- 主界面 -->
  <div v-else class="layout">
    <aside class="sidebar" :class="{ 'collapsed': isSidebarCollapsed }">
      <div class="sidebar-brand" :class="{ 'collapsed-brand': isSidebarCollapsed }">
        <div class="dot"></div>
        <span v-if="!isSidebarCollapsed">ApexStats</span>
        <button class="toggle-btn" @click="isSidebarCollapsed = !isSidebarCollapsed">
          {{ isSidebarCollapsed ? '☰' : '«' }}
        </button>
      </div>
      <nav class="menu">
        <a href="#" :class="{ active: currentTab === 'records' }" @click.prevent="currentTab = 'records'"><span class="icon">📝</span> <span v-if="!isSidebarCollapsed">战绩录入</span></a>
        <a href="#" :class="{ active: currentTab === 'front' }" @click.prevent="currentTab = 'front'"><span class="icon">📸</span> <span v-if="!isSidebarCollapsed">海报面板</span></a>
        <a v-if="isAdmin" href="#" :class="{ active: currentTab === 'users' }" @click.prevent="currentTab = 'users'"><span class="icon">👥</span> <span v-if="!isSidebarCollapsed">账号管理</span></a>
      </nav>
      <div class="sidebar-footer" v-if="!isSidebarCollapsed">
        <div class="user-info">
          <div class="avatar">{{ myUsername.charAt(0).toUpperCase() || 'A' }}</div>
          <div class="user-meta">
            <div class="user-name">{{ myUsername || '管理员' }}</div>
            <div class="user-role">{{ isAdmin ? '超级管理员' : '普通用户' }}</div>
          </div>
        </div>
        <button class="logout-btn" @click="logout"><span class="logout-icon">🚪</span> 退出登录</button>
      </div>
    </aside>

    <main class="main-content">
      <header class="top-bar">
        <h2>{{ currentTab === 'records' ? '战绩面板' : (currentTab === 'users' ? '账号管理' : '海报生成') }}</h2>
      </header>

      <div class="content-scroll">
        <div v-if="currentTab === 'records'" class="animate-fade">
          <!-- 极速录入 -->
          <div style="margin-bottom: 16px;">
            <div @click="showRecordForm = !showRecordForm"
                 style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 20px; height: 56px; padding: 0 20px; display: flex; justify-content: space-between; align-items: center; cursor: pointer; user-select: none; position: relative; z-index: 2; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02); transition: 0.2s;"
                 :style="showRecordForm ? 'border-bottom-left-radius: 0; border-bottom-right-radius: 0; border-bottom: 1px dashed #e2e8f0;' : ''">
              <span style="font-size: 16px; font-weight: 700; color: #0f172a; display: flex; align-items: center; gap: 6px;">⚡ 极速录入</span>
              <div style="display: flex; align-items: center; gap: 12px;">
                <button style="background: #ecfdf5; color: #10b981; border: 1px solid #a7f3d0; border-radius: 6px; height: 32px; padding: 0 12px; font-size: 12px; font-weight: 600; cursor: pointer; transition: 0.2s;" onmouseover="this.style.background='#d1fae5'" onmouseout="this.style.background='#ecfdf5'" @click.stop="exportToExcel">📥 导出表格</button>
                <button style="background: #eef2ff; color: #6366f1; border: 1px solid #c7d2fe; border-radius: 6px; height: 32px; padding: 0 12px; font-size: 12px; font-weight: 600; cursor: pointer; transition: 0.2s;" onmouseover="this.style.background='#e0e7ff'" onmouseout="this.style.background='#eef2ff'" @click.stop="openImport">📋 批量导入</button>
                <div style="font-size: 13px; font-weight: 600; color: #64748b; display: flex; align-items: center; gap: 4px; margin-left: 8px;">
                  {{ showRecordForm ? '收起' : '展开' }}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" :style="{ transform: showRecordForm ? 'rotate(180deg)' : 'none', transition: '0.2s' }"><polyline points="6 9 12 15 18 9"></polyline></svg>
                </div>
              </div>
            </div>

            <div v-show="showRecordForm" style="background: #ffffff; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 20px 20px; padding: 20px; position: relative; z-index: 50; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02);">
              <div class="form-grid">
                <div class="input-field">
                  <label>日期</label>
                  <BaseDatePicker v-model="form.date" style="height:42px;" />
                </div>
                <div class="input-field">
                  <label>项目</label>
                  <BaseSelect v-model="form.project" :options="projects.map(p => ({ label: p, value: p }))" placeholder="请选择项目" style="height:42px;width:100%;" />
                </div>
                <div class="input-field">
                  <label>赛事</label>
                  <textarea v-model="form.match_info" rows="1" placeholder="序号/赛事/时间" class="auto-textarea" style="min-height: 42px; padding: 10px 14px; border: 1px solid #cbd5e1; border-radius: 10px; font-size: 14px; background: #f8fafc; color: #0f172a; outline: none; transition: 0.2s; resize: none; line-height: 1.4;" onfocus="this.style.borderColor='#6366f1'; this.style.background='#fff'; this.style.boxShadow='0 0 0 4px rgba(99, 102, 241, 0.1)'" onblur="this.style.borderColor='#cbd5e1'; this.style.background='#f8fafc'; this.style.boxShadow='none'"></textarea>
                </div>
                <div class="input-field">
                  <label>对阵双方</label>
                  <textarea v-model="form.teams" rows="1" placeholder="主队vs客队" class="auto-textarea" style="min-height: 42px; padding: 10px 14px; border: 1px solid #cbd5e1; border-radius: 10px; font-size: 14px; background: #f8fafc; color: #0f172a; outline: none; transition: 0.2s; resize: none; line-height: 1.4;" onfocus="this.style.borderColor='#6366f1'; this.style.background='#fff'; this.style.boxShadow='0 0 0 4px rgba(99, 102, 241, 0.1)'" onblur="this.style.borderColor='#cbd5e1'; this.style.background='#f8fafc'; this.style.boxShadow='none'"></textarea>
                </div>
                <div class="input-field">
                  <label>赛果</label>
                  <textarea v-model="form.result" rows="1" placeholder="如 2:1" class="auto-textarea" style="min-height: 42px; padding: 10px 14px; border: 1px solid #cbd5e1; border-radius: 10px; font-size: 14px; background: #f8fafc; color: #0f172a; outline: none; transition: 0.2s; resize: none; line-height: 1.4;" onfocus="this.style.borderColor='#6366f1'; this.style.background='#fff'; this.style.boxShadow='0 0 0 4px rgba(99, 102, 241, 0.1)'" onblur="this.style.borderColor='#cbd5e1'; this.style.background='#f8fafc'; this.style.boxShadow='none'"></textarea>
                </div>
                <div class="input-field">
                  <label>思路</label>
                  <textarea v-model="form.thought" rows="1" placeholder="如 让胜 / 大球" class="auto-textarea" style="min-height: 42px; padding: 10px 14px; border: 1px solid #cbd5e1; border-radius: 10px; font-size: 14px; background: #f8fafc; color: #0f172a; outline: none; transition: 0.2s; resize: none; line-height: 1.4;" onfocus="this.style.borderColor='#6366f1'; this.style.background='#fff'; this.style.boxShadow='0 0 0 4px rgba(99, 102, 241, 0.1)'" onblur="this.style.borderColor='#cbd5e1'; this.style.background='#f8fafc'; this.style.boxShadow='none'"></textarea>
                </div>
                <div class="input-field">
                  <label>红黑</label>
                  <BaseSelect v-model="form.outcome" :options="outcomes.map(o => ({ label: o, value: o }))" placeholder="请选择" style="height:42px;width:100%;">
                    <template #default="{ option }">
                      <span :style="option.value === '红' ? 'color:#ef4444;font-weight:bold;' : (option.value === '黑' ? 'color:#334155;font-weight:bold;' : (option.value.includes('走') ? 'color:#0ea5e9;font-weight:bold;' : 'color:#64748b;'))">{{ option.label }}</span>
                    </template>
                  </BaseSelect>
                </div>
                <div class="input-field" v-for="field in dynamicFields" :key="field.name">
                  <label>{{ field.name }}</label>
                  <input v-model="form.extra_data[field.name]" :placeholder="`输入${field.name}`" style="height: 42px; padding: 0 14px; border: 1px solid #cbd5e1; border-radius: 10px; font-size: 14px; background: #f8fafc; color: #0f172a; outline: none; transition: 0.2s;" onfocus="this.style.borderColor='#6366f1'; this.style.background='#fff'; this.style.boxShadow='0 0 0 4px rgba(99, 102, 241, 0.1)'" onblur="this.style.borderColor='#cbd5e1'; this.style.background='#f8fafc'; this.style.boxShadow='none'" />
                </div>
                <div class="input-field action-field">
                  <button class="btn-primary" @click="addRecord" style="height: 42px; padding: 0 24px; font-size: 15px; font-weight: 600; border-radius: 10px; box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3); transition: 0.2s;" onmouseover="this.style.transform='translateY(-1px)'" onmouseout="this.style.transform='none'">+ 保存录入</button>
                </div>
              </div>
            </div>
          </div>

          <!-- 表单配置 -->
          <div style="margin-bottom: 24px;">
            <div @click="showDictPanel = !showDictPanel" style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 20px; height: 56px; padding: 0 20px; display: flex; justify-content: space-between; align-items: center; cursor: pointer; user-select: none; position: relative; z-index: 2; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02); transition: 0.2s;" :style="showDictPanel ? 'border-bottom-left-radius: 0; border-bottom-right-radius: 0; border-bottom: 1px dashed #e2e8f0;' : ''">
              <span style="font-size: 16px; font-weight: 700; color: #0f172a; display: flex; align-items: center; gap: 6px;">⚙️ 表单配置 <span style="font-size:12px; font-weight:500; color:#94a3b8; margin-left:4px;">赛果 / 项目 / 动态字段</span></span>
              <div style="font-size: 13px; font-weight: 600; color: #64748b; display: flex; align-items: center; gap: 4px;">
                {{ showDictPanel ? '收起' : '展开' }}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" :style="{ transform: showDictPanel ? 'rotate(180deg)' : 'none', transition: '0.2s' }"><polyline points="6 9 12 15 18 9"></polyline></svg>
              </div>
            </div>
            <div v-show="showDictPanel" style="background: #ffffff; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 20px 20px; padding: 20px; position: relative; z-index: 1; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02);">
              
              <!-- 👇 新增的隐藏战绩项目勾选框 -->
              <div style="margin-bottom: 24px; padding-bottom: 20px; border-bottom: 1px dashed #e2e8f0;">
                <div style="font-size: 13px; font-weight: 600; color: #475569; margin-bottom: 12px;">🚫 隐藏展示项目 (勾选的项目将不在表格中显示)</div>
                <div style="display: flex; flex-wrap: wrap; gap: 12px;">
                  <label v-for="p in projects" :key="p" style="display: flex; align-items: center; gap: 6px; cursor: pointer; font-size: 13px; color: #1e293b;">
                    <input type="checkbox" :checked="hiddenProjects.includes(p)" @change="toggleHideProject(p)" style="width: 16px; height: 16px; accent-color: #ef4444; cursor: pointer;" />
                    {{ p }}
                  </label>
                </div>
              </div>

              <Zidian embedded :outcomes="outcomes" :projects="projects" :dynamic-fields="dynamicFields" @refresh="loadDict" />
            </div>
          </div>

          <!-- 历史数据表格 -->
          <div class="glass-card">
            <!-- 历史数据头部：终极高级质感重构 -->
            <div class="card-header" style="display:flex; flex-direction:column; gap:16px; margin-bottom:20px;">
              
              <!-- 第一行：标题 + 右侧操作按钮 -->
              <div style="display:flex; justify-content:space-between; align-items:center; width:100%;">
                <div class="card-title" style="margin:0;">历史数据</div>
                <div style="display:flex; gap:12px; align-items:center;">
                  <button style="background:#fff; border:1px solid #cbd5e1; color:#475569; height:38px; padding:0 16px; border-radius:8px; font-size:13px; font-weight:600; cursor:pointer; transition:0.2s;" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='#fff'" @click="clearAllFilters">清除所有筛选</button>
                  <button v-if="hiddenIds.length > 0" style="background:#fef3c7; border:1px solid #fcd34d; color:#d97706; height:38px; padding:0 16px; border-radius:8px; font-size:13px; font-weight:600; cursor:pointer; transition:0.2s;" onmouseover="this.style.background='#fde68a'" onmouseout="this.style.background='#fef3c7'" @click="restoreAll">
  取消隐藏 ({{ hiddenIds.length }})
</button>
                  <button class="btn-primary" style="width:auto; padding:0 16px; background:#ef4444; height:38px; border-radius:8px; font-weight:600; display:flex; align-items:center; justify-content:center; box-shadow:0 4px 12px rgba(239, 68, 68, 0.3);" onmouseover="this.style.transform='translateY(-1px)'" onmouseout="this.style.transform='none'" @click="batchDelete">批量删除</button>
                </div>
              </div>

                            <!-- 第二行：一体化分组胶囊筛选栏 (已修复) -->
              <div class="filter-toolbar">
                
                <BaseSelect v-if="isAdmin" v-model="targetUser" :options="[{ label: '全部用户', value: '全部' }, ...adminUserList.map(u => ({ label: u.username + (u.role === 'admin' ? '（超管）' : ''), value: String(u.id) }))]" style="width:130px;" />

                <!-- 项目 -->
                <div class="filter-item">
                  <BaseSelect v-model="filterProjects" :options="filterOptions.projects.map(p => ({ label: p, value: p }))" multiple placeholder="全部项目" />
                  <div class="filter-divider"></div>
                  <button class="filter-clear" @click="clearFilter('project')">✕</button>
                </div>

                <!-- 赛事 -->
                <div class="filter-item">
                  <BaseSelect v-model="filterEvents" :options="filterOptions.events.map(e => ({ label: e, value: e }))" multiple placeholder="全部赛事" />
                  <div class="filter-divider"></div>
                  <button class="filter-clear" @click="clearFilter('event')">✕</button>
                </div>

                <!-- 结果 -->
                <div class="filter-item">
                  <BaseSelect v-model="filterOutcomes" :options="filterOptions.outcomes.map(o => ({ label: o, value: o }))" multiple placeholder="全部结果" />
                  <div class="filter-divider"></div>
                  <button class="filter-clear" @click="clearFilter('outcome')">✕</button>
                </div>

                <!-- 日期 (强制固定 260px，绝不缩水) -->
                <div class="filter-item">
                  <BaseDatePicker v-model="filterDateStart" :end-value="filterDateEnd" range placeholder="全部日期" style="width: 260px !important;" @update:endValue="(v: string) => filterDateEnd = v" @change="(v: any) => { filterDateStart = v.start; filterDateEnd = v.end }" />
                  <div class="filter-divider"></div>
                  <button class="filter-clear" @click="clearFilter('date')">✕</button>
                </div>

              </div>
            </div>

                        <div class="table-wrapper">
              <table class="modern-table">
                <!-- 👇 新增：精准控制列宽，彻底告别 nth-child 错位 -->
                                <colgroup>
                  <col style="width: 48px;" />
                  <col v-if="isAdmin && targetUser === '全部'" style="width: 90px;" />
                  <col v-for="col in allColumns" :key="col.key" :style="{ 
                    width: col.key === 'date' ? '110px' : 
                           col.key === 'project' ? '120px' : 
                           col.key === 'match_info' ? '160px' : 
                           col.key === 'teams' ? '200px' : 
                           col.key === 'result' ? '80px' : 
                           col.key === 'thought' ? '160px' : 
                           col.key === 'outcome' ? '80px' : '100px' 
                  }" />
                  <col style="width: 150px;" />
                </colgroup>
                <thead>

                  <tr>
                    <th style="width:40px;"><input type="checkbox" @change="toggleSelectAll" :checked="records?.length > 0 && selectedIds?.length === records?.length" /></th>
                    <th v-if="isAdmin && targetUser === '全部'">用户</th>
                    <th v-for="col in allColumns" :key="col.key">{{ col.name }}</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="r in visibleRecords" :key="r.id">
                    <td><input type="checkbox" :value="r.id" v-model="selectedIds" @click.stop /></td>
                    <td v-if="isAdmin && targetUser === '全部'">
                      <span class="tag-project">{{ adminUserList.find(u => u.id === r.user_id)?.username || r.user_id }}</span>
                    </td>
                    <td v-for="col in allColumns" :key="col.key">
                      <span v-if="col.key === 'project'" class="tag-project">{{ r.project }}</span>
                      <span v-else-if="col.key === 'outcome'">
                        <span v-for="(o, idx) in r.outcome.split('\n')" :key="idx" :class="['badge', o.includes('红') ? 'badge-red' : (o.includes('走') ? 'badge-cyan' : 'badge-dark')]" style="display: block; margin: 2px auto; width: max-content; padding: 4px 10px; border-radius: 6px; font-size: 13px; font-weight: 600; color: white;">{{ o }}</span>
                      </span>
                      <div v-else-if="col.key === 'result'" style="display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; justify-content: center; gap: 4px;">
                        <span style="grid-column: 2; font-weight: 800; font-size: 15px; white-space: pre-wrap; text-align: center;">{{ r.result ? r.result.replace(/[（(].*[）)]/g, '').trim() : '-' }}</span>
                        <span v-if="r.result && /[（(]/.test(r.result)" style="grid-column: 3; font-size: 11px; font-weight: 700; padding: 2px 6px; border-radius: 4px; background: #f1f5f9; color: #64748b; border: 1px solid #e2e8f0; white-space: nowrap;">{{ r.result.match(/[（(](.*?)[）)]/)?.[1] || '' }}</span>
                      </div>
                      <!-- 强制赛事列不折行，并给个合理的最小宽度 -->
                      <span v-else-if="col.key === 'match_info'">{{ r.match_info }}</span>
                      <span v-else-if="col.key.startsWith('extra_')">{{ r.extra_data[col.name] || '-' }}</span>
                      <span v-else-if="col.key === 'date'">{{ r.date.replace(/\//g, '-') }}</span>
                      <span v-else>{{ r[col.key] }}</span>
                    </td>
                                                            <td style="white-space: nowrap;">
                      <div style="display: inline-flex; justify-content: center;">
                        <!-- 三个点按钮 -->
                        <button @click.stop="toggleMenu(r.id, $event)" style="background: #f8fafc; border: 1px solid #cbd5e1; color: #475569; border-radius: 6px; width: 32px; height: 28px; font-size: 16px; font-weight: 900; line-height: 1; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: 0.2s;" onmouseover="this.style.background='#e2e8f0'" onmouseout="this.style.background='#f8fafc'">
                          •••
                        </button>
                      </div>
                    </td>
                  </tr>
                  <tr v-if="visibleRecords.length === 0"><td :colspan="allColumns.length + 2 + (isAdmin && targetUser === '全部' ? 1 : 0)" class="empty-state">暂无数据</td></tr>
                </tbody>
              </table>
            </div>

            <!-- 分页器：单页到底已删除，50条修复 -->
            <div class="pagination" style="display:flex; justify-content:flex-end; gap:10px; margin-top:15px; align-items:center;">
              <button class="page-btn" :disabled="page <= 1" @click="page--; loadRecords()">上一页</button>
              <span>{{ page }} / {{ Math.ceil(total / pageSize) || 1 }}</span>
              <button class="page-btn" :disabled="page >= Math.ceil(total / pageSize)" @click="page++; loadRecords()">下一页</button>
              
              <BaseSelect 
                v-model="pageSize" 
                :options="[{label: '10条/页', value: 10}, {label: '20条/页', value: 20}, {label: '50条/页', value: 50}]" 
                style="width:110px;" 
              />
            </div>
          </div>
        </div>

        <Zhanghao v-if="currentTab === 'users' && isAdmin" :user-list="userList" :my-id="myId" @refresh="loadAdminUsers" />
        <Haibao v-if="currentTab === 'front'" :records="records" :all-columns="allColumns" @update-cols="(cols: any[]) => columns = cols" />
      </div>
    </main>

    <!-- 编辑弹窗 -->
    <div v-if="showEditModal" class="modal-overlay">
      <div class="modal-content" @click.stop>
        <h3>修改战绩</h3>
        <div class="form-grid" style="grid-template-columns: repeat(2, 1fr); margin-bottom: 20px; gap:16px;">
          <div class="input-field"><label>日期</label><BaseDatePicker v-model="editForm.date" style="height:42px;" /></div>
          <div class="input-field"><label>项目</label><BaseSelect v-model="editForm.project" :options="projects.map(p => ({ label: p, value: p }))" placeholder="请选择项目" style="height:42px;width:100%;" /></div>
          <div class="input-field"><label>赛事</label><textarea v-model="editForm.match_info" rows="2" class="auto-textarea" style="min-height: 42px; padding: 10px 14px; border: 1px solid #cbd5e1; border-radius: 10px; font-size: 14px; background: #f8fafc; color: #0f172a; outline: none; resize: none; line-height: 1.4;"></textarea></div>
          <div class="input-field"><label>对阵双方</label><textarea v-model="editForm.teams" rows="2" class="auto-textarea" style="min-height: 42px; padding: 10px 14px; border: 1px solid #cbd5e1; border-radius: 10px; font-size: 14px; background: #f8fafc; color: #0f172a; outline: none; resize: none; line-height: 1.4;"></textarea></div>
          <div class="input-field"><label>赛果</label><textarea v-model="editForm.result" rows="2" class="auto-textarea" style="min-height: 42px; padding: 10px 14px; border: 1px solid #cbd5e1; border-radius: 10px; font-size: 14px; background: #f8fafc; color: #0f172a; outline: none; resize: none; line-height: 1.4;"></textarea></div>
          <div class="input-field"><label>思路</label><textarea v-model="editForm.thought" rows="2" class="auto-textarea" style="min-height: 42px; padding: 10px 14px; border: 1px solid #cbd5e1; border-radius: 10px; font-size: 14px; background: #f8fafc; color: #0f172a; outline: none; resize: none; line-height: 1.4;"></textarea></div>
          <div class="input-field">
            <label>红黑</label>
            <BaseSelect v-model="editForm.outcome" :options="outcomes.map(o => ({ label: o, value: o }))" placeholder="请选择" style="height:42px;width:100%;">
              <template #default="{ option }">
                <span :style="option.value === '红' ? 'color:#ef4444;font-weight:bold;' : (option.value === '黑' ? 'color:#334155;font-weight:bold;' : (option.value.includes('走') ? 'color:#0ea5e9;font-weight:bold;' : 'color:#64748b;'))">{{ option.label }}</span>
              </template>
            </BaseSelect>
          </div>
          <div class="input-field" v-for="field in dynamicFields" :key="field.name">
            <label>{{ field.name }}</label>
            <input v-model="editForm.extra_data[field.name]" style="height: 42px; padding: 0 14px; border: 1px solid #cbd5e1; border-radius: 10px; font-size: 14px; background: #f8fafc; color: #0f172a; outline: none;" />
          </div>
        </div>
        <div style="display:flex; justify-content:flex-end; gap:12px;">
          <button style="background: #f1f5f9; color: #475569; border: none; border-radius: 8px; padding: 0 24px; height: 42px; font-weight: 600; cursor: pointer; transition: 0.2s;" @click="showEditModal = false">取消</button>
          <button class="btn-primary" style="width:auto; height: 42px; padding: 0 24px; font-size: 14px;" @click="saveEdit">保存修改</button>
        </div>
      </div>
    </div>

    <!-- 批量导入弹窗 -->
    <div v-if="showImportModal" class="modal-overlay">
      <div class="modal-content" @click.stop>
        <h3>📋 批量粘贴导入</h3>
        <p style="font-size: 13px; color: #64748b; margin-bottom: 16px; line-height: 1.6;">
          请直接从 WPS 或 Excel 中复制多行数据粘贴到下方。<br>
          <b>列的顺序必须是：</b>日期 → 项目 → 赛事 → 对阵双方 → 赛果 → 思路 → 结果。<br>
          如果某列为空，请留空。动态字段默认留空。
        </p>
        <textarea v-model="pasteData" rows="8" placeholder="2026-11-02&#9;拍案叫绝&#9;016/英超&#9;利物浦vs阿森纳&#9;1:0&#9;胜&#9;红" style="width: 100%; padding: 14px; border: 1px solid #cbd5e1; border-radius: 10px; font-family: monospace; font-size: 13px; outline: none; resize: vertical; background: #f8fafc;"></textarea>
        <div style="display:flex; justify-content:flex-end; gap:12px; margin-top: 24px;">
          <button style="background: #f1f5f9; color: #475569; border: none; border-radius: 8px; padding: 0 24px; height: 42px; font-weight: 600; cursor: pointer;" @click="showImportModal = false">取消</button>
          <button class="btn-primary" :disabled="isImporting" style="width:auto; height: 42px; padding: 0 24px; font-size: 14px; opacity: isImporting ? 0.7 : 1; cursor: isImporting ? 'not-allowed' : 'pointer';" @click="submitImport">
  {{ isImporting ? '极速导入中...' : '开始导入' }}
</button>
        </div>
      </div>
    </div>

    <ToastConfirm />
        <!-- 新增：下拉菜单挂载在 body，彻底解决被表格遮挡的问题 -->
    <Teleport to="body">
      <div v-if="activeMenuId !== null" 
           @click.stop 
           :style="{ 
             position: 'fixed', 
             top: menuPosition.top + 'px', 
             left: menuPosition.left + 'px', 
             zIndex: 99999,
             background: '#fff', 
             border: '1px solid #e2e8f0', 
             borderRadius: '8px', 
             boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', 
             minWidth: '100px', 
             padding: '4px', 
             display: 'flex', 
             flexDirection: 'column' 
           }">
        <button @click="openEdit(visibleRecords.find(r => r.id === activeMenuId)); activeMenuId = null" style="background: transparent; border: none; text-align: left; padding: 8px 12px; border-radius: 6px; font-size: 13px; color: #4f46e5; cursor: pointer; transition: 0.2s;" onmouseover="this.style.background='#eef2ff'" onmouseout="this.style.background='transparent'">✏️ 编辑</button>
        <button @click="hideRecord(activeMenuId)" style="background: transparent; border: none; text-align: left; padding: 8px 12px; border-radius: 6px; font-size: 13px; color: #d97706; cursor: pointer; transition: 0.2s;" onmouseover="this.style.background='#fef3c7'" onmouseout="this.style.background='transparent'">👁️ 隐藏</button>
        <button @click="deleteSingle(activeMenuId); activeMenuId = null" style="background: transparent; border: none; text-align: left; padding: 8px 12px; border-radius: 6px; font-size: 13px; color: #ef4444; cursor: pointer; transition: 0.2s;" onmouseover="this.style.background='#fef2f2'" onmouseout="this.style.background='transparent'">🗑️ 删除</button>
      </div>
    </Teleport>
  </div>

  <Teleport to="body">
    <div v-if="toast.show" style="position: fixed; top: 24px; right: 24px; z-index: 99999; pointer-events: none; overflow: hidden; padding: 10px;">
      <Transition name="toast-slide" appear>
        <div v-if="toast.show"
             :style="{
               background: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(10px)',
               padding: '14px 20px', borderRadius: '12px', fontSize: '14px', fontWeight: 600,
               color: '#1e293b', boxShadow: '0 10px 30px -5px rgba(0, 0, 0, 0.1), inset 0 0 0 1px rgba(255,255,255,0.5)',
               display: 'flex', alignItems: 'center', gap: '12px',
               borderLeft: toast.type === 'success' ? '4px solid #10b981' : '4px solid #ef4444',
               pointerEvents: 'auto'
             }">
          <div :style="{
            width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: toast.type === 'success' ? '#d1fae5' : '#fee2e2', color: toast.type === 'success' ? '#10b981' : '#ef4444', flexShrink: 0
          }">
            <svg v-if="toast.type === 'success'" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
            <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </div>
          {{ toast.msg }}
        </div>
      </Transition>
    </div>
  </Teleport>

  <Teleport to="body">
    <ToastConfirm v-if="!isLogged" />
  </Teleport>
</template>

<style scoped>
.slide-fade-enter-active { transition: all 0.3s ease-out; }
.slide-fade-leave-active { transition: all 0.2s cubic-bezier(1, 0.5, 0.8, 1); }
.slide-fade-enter-from, .slide-fade-leave-to { transform: translateX(20px); opacity: 0; }

/* ====== 极速录入网格优化（仅针对页面上的表单） ====== */
.animate-fade > div > .form-grid,
.content-scroll > div > .form-grid { 
  grid-template-columns: repeat(4, 1fr) !important; 
}

/* ====== 修复编辑弹窗被挤压的问题 ====== */
.modal-content .form-grid {
  grid-template-columns: repeat(2, 1fr) !important;
  overflow: visible !important; /* 解除隐藏 */
}
/* 强制弹窗里的输入框取消表格的 nowrap 限制，允许文字在里面正常显示 */
.modal-content .input-field,
.modal-content .input-field input,
.modal-content .input-field textarea,
.modal-content .input-field :deep(.bselect-trigger),
.modal-content .input-field :deep(.bdate-trigger) {
  white-space: normal !important;
  overflow: visible !important;
}
.input-field :deep(.bselect-trigger), .input-field :deep(.bdate-trigger) { width: 100% !important; height: 42px !important; }
.input-field.action-field { grid-column: span 1; }
.input-field.action-field button { width: 100% !important; }

/* ====== 筛选栏布局 ====== */
.filter-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  /* 锁定高度，解决切换用户高度抖动的问题 */
  min-height: 40px; 
}

/* 统一外框，解决“看不清”问题：白底 + 灰色细边框 */
.filter-item {
  display: flex;
  align-items: center;
  background: #ffffff;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  height: 38px;
  padding-left: 8px;
  transition: border-color 0.2s;
  position: relative;
}
.filter-item:hover, .filter-item:focus-within {
  border-color: #6366f1;
}

/* 中间竖线分割 */
.filter-divider {
  width: 1px;
  height: 16px;
  background: #e2e8f0;
  margin: 0 4px;
}

/* 右侧的 ✕ 按钮 */
.filter-clear {
  background: transparent;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  transition: 0.2s;
  padding: 0;
}
.filter-clear:hover {
  color: #ef4444;
  background: #fef2f2;
}

/* ====== 完美穿透：解决日期拉不长的根源 ====== */
/* 针对包裹了 filter-item 的子组件，去掉边框和最小宽度限制 */
:deep(.filter-item .bselect-trigger),
:deep(.filter-item .bdate-trigger) {
  border: none !important;
  background: transparent !important;
  box-shadow: none !important;
  height: 36px !important;
  padding: 0 !important;
  width: 110px !important; /* 下拉框默认宽度 */
}

/* 强制覆盖日期组件原本写死的 min-width，并让其占满容器 */
:deep(.filter-item .bdate-trigger) {
  width: 100% !important;
  min-width: 0 !important; 
}

/* 日期组件内部的文字大小 */
:deep(.filter-item .bdate-text),
:deep(.filter-item .bselect-text) {
  font-size: 13px !important;
  color: #334155 !important;
}

/* 让管理员的“全部用户”选择框稍微有点特色 */
:deep(.filter-toolbar > .bselect-trigger) {
  background: #eef2ff !important;
  border-color: #c7d2fe !important;
  color: #4f46e5 !important;
  font-weight: 600;
}

</style>