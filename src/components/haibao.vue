<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import html2canvas from 'html2canvas'
import BaseSelect from './BaseSelect.vue'

const props = defineProps<{ records: any[], allColumns: any[] }>()
const emit = defineEmits(['update-cols'])

const posterRef = ref<HTMLElement | null>(null)
const theme = ref('swiss')
const bannerText = ref('冷哥上周战绩11中9！')
const footerText = ref('更多红单关注公众号：冷哥说球')
const hideColumns = ref<string[]>([])
const showStats = ref(true)

const showThemePanel = ref(true)
const showStylePanel = ref(false)
const configTab = ref<'header' | 'cell'>('header')

const localCols = ref<any[]>([])
watch(() => props.allColumns, (newCols) => {
  if (JSON.stringify(localCols.value.map(c => c.key)) !== JSON.stringify(newCols.map(c => c.key))) {
    localCols.value = JSON.parse(JSON.stringify(newCols))
  }
}, { immediate: true, deep: true })

const colNameMap = computed(() => {
  const map: Record<string, string> = {}
  localCols.value.forEach(c => { map[c.key] = c.name })
  return map
})

const draggedColIndex = ref<number | null>(null)
function onDragStart(index: number) { draggedColIndex.value = index }
function onDragOver(event: DragEvent) { event.preventDefault() }
function onDrop(index: number) {
  if (draggedColIndex.value === null || draggedColIndex.value === index) return
  const arr = [...localCols.value]
  const movedItem = arr.splice(draggedColIndex.value, 1)[0]
  arr.splice(index, 0, movedItem)
  localCols.value = arr
  draggedColIndex.value = null
  emit('update-cols', JSON.parse(JSON.stringify(arr)))
}

function getFontFamily(font: string) {
  if (!font || font === 'inherit') return ''
  if (font === 'yahei') return "'Microsoft YaHei', 'PingFang SC', sans-serif"
  if (font === 'kai') return "'Kaiti SC', 'STKaiti', 'KaiTi', serif"
  if (font === 'song') return "'Songti SC', 'SimSun', 'Times New Roman', serif"
  if (font === 'impact') return "'Impact', 'Arial Black', 'Microsoft YaHei', sans-serif"
  if (font === 'sans') return "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
  if (font === 'times') return "'Times New Roman', Times, serif"
  if (font === 'wenkai') return "'LXGW WenKai', 'Kaiti SC', 'STKaiti', serif"
  if (font === 'hannotate') return "'Hannotate SC', 'Hannotate TC', 'Kaiti SC', cursive"
  if (font === 'mashan') return "'Ma Shan Zheng', 'STKaiti', 'KaiTi', cursive"
  if (font === 'oswald') return "'Oswald', 'Impact', 'Arial Black', sans-serif"
  if (font === 'playfair') return "'Playfair Display', 'Songti SC', 'SimSun', serif"
  if (font === 'courier') return "'Courier New', Courier, monospace"
  if (font === 'notoserif') return "'Noto Serif SC', 'Songti SC', serif"
  if (font === 'zcool') return "'ZCOOL XiaoWei', 'Kaiti SC', serif"
  return ''
}

// 🌟 核心：分配每一列（表头+内容）的专属字体
// 结构: [表头, 日期, 项目, 赛事, 对阵, 赛果, 思路, 结果, 其他]
const semanticThemeFontMap: Record<string, string[]> = {
  // 1. 玻璃 (简约现代)
  ios:       ['sans', 'oswald', 'yahei', 'oswald', 'sans', 'impact', 'kai', 'sans', 'sans'],
  // 2. 晨雾
  mist:      ['sans', 'sans', 'wenkai', 'sans', 'hannotate', 'impact', 'sans', 'sans', 'sans'],
  // 3. 胡桃木 (古朴木质)
  news:      ['kai', 'times', 'zcool', 'playfair', 'wenkai', 'impact', 'mashan', 'kai', 'song'],
  // 4. 勃艮第红 (贵族酒红)
  midnight:  ['playfair', 'times', 'hannotate', 'playfair', 'wenkai', 'oswald', 'mashan', 'kai', 'song'],
  // 5. 电竞 (科技赛博)
  cyber:     ['impact', 'courier', 'oswald', 'courier', 'sans', 'impact', 'hannotate', 'sans', 'sans'],
  // 6. 体育报 (报纸油墨)
  gold:      ['notoserif', 'times', 'hannotate', 'playfair', 'wenkai', 'oswald', 'mashan', 'kai', 'song'],
  // 7. 蒂芙尼 (高级优雅)
  tiffany:   ['sans', 'oswald', 'hannotate', 'sans', 'wenkai', 'playfair', 'kai', 'sans', 'sans'],
  // 8. 霓虹 (赛博发光)
  neon:      ['impact', 'courier', 'oswald', 'courier', 'sans', 'impact', 'zcool', 'sans', 'sans'],
  // 9. 瑞士红 (包豪斯)
  swiss:     ['sans', 'oswald', 'yahei', 'sans', 'sans', 'impact', 'sans', 'sans', 'sans'],
  // 10. 黑金 (奢华黑金)
  blackgold: ['song', 'times', 'zcool', 'playfair', 'wenkai', 'oswald', 'mashan', 'kai', 'song'],
  // 11. 蒸汽波 (复古像素)
  retro:     ['impact', 'courier', 'zcool', 'courier', 'hannotate', 'impact', 'mashan', 'sans', 'courier'],
  // 12. 极简灰
  minimal:   ['sans', 'sans', 'hannotate', 'sans', 'wenkai', 'impact', 'kai', 'sans', 'sans'],
  // 13. 魔方格 (彩色块)
  rubik:     ['sans', 'oswald', 'wenkai', 'courier', 'hannotate', 'impact', 'zcool', 'sans', 'sans'],
  // 14. 冲刺红
  esports:   ['impact', 'courier', 'oswald', 'courier', 'hannotate', 'impact', 'mashan', 'sans', 'sans'],

  // === 新增 6 套完全独立字体分配 ===
  // 15. 水墨丹青 (山水墨迹)：全毛笔、文楷、仿宋交织
  ink:       ['mashan', 'courier', 'mashan', 'zcool', 'wenkai', 'impact', 'mashan', 'kai', 'wenkai'],
  // 16. 赛博票据 (小票等宽)：全等宽+手写+黑体
  receipt:   ['courier', 'courier', 'hannotate', 'courier', 'wenkai', 'impact', 'zcool', 'courier', 'courier'],
  // 17. 国潮锦鲤 (喜庆国潮)：毛笔大字+文楷
  koi:       ['mashan', 'oswald', 'zcool', 'wenkai', 'mashan', 'impact', 'hannotate', 'kai', 'wenkai'],
  // 18. 极客终端 (黑客代码)：等宽代码风
  terminal:  ['courier', 'courier', 'courier', 'courier', 'courier', 'impact', 'courier', 'courier', 'courier'],
  // 19. 中式喜报 (大红烫金)：全毛笔、粗黑
  vintage:   ['mashan', 'times', 'mashan', 'zcool', 'wenkai', 'impact', 'mashan', 'kai', 'song'],
  // 20. 手账贴纸 (手帐日记)：全手写体+可爱风
  journal:   ['hannotate', 'kai', 'hannotate', 'hannotate', 'wenkai', 'impact', 'hannotate', 'hannotate', 'sans'],

  // === 💥 新增 10 套炸裂配置 ===
  // 21. 枪火金属 (3D 浮雕字+金属拉丝)
  metal:     ['impact', 'impact', 'oswald', 'courier', 'sans', 'impact', 'hannotate', 'sans', 'sans'],
  // 22. 波普漫画 (高饱和+网点)
  pop:       ['impact', 'oswald', 'impact', 'sans', 'yahei', 'impact', 'sans', 'sans', 'sans'],
  // 23. 罪恶都市 (赛博紫蓝)
  vice:      ['sans', 'oswald', 'hannotate', 'oswald', 'wenkai', 'playfair', 'zcool', 'sans', 'sans'],
  // 24. 警告警戒 (黄黑警示带)
  hazard:    ['impact', 'impact', 'courier', 'courier', 'sans', 'impact', 'oswald', 'sans', 'sans'],
  // 25. 极简霓虹 (极简黑+高亮荧光)
  neon2:     ['sans', 'courier', 'wenkai', 'hannotate', 'sans', 'playfair', 'zcool', 'sans', 'sans'],
  // 26. 绝密档案 (机密钢印)
  secret:    ['courier', 'courier', 'courier', 'times', 'song', 'notoserif', 'hannotate', 'sans', 'courier'],
  // 27. 腥红之月 (暗黑血源)
  blood:     ['mashan', 'mashan', 'zcool', 'sans', 'wenkai', 'impact', 'mashan', 'sans', 'sans'],
  // 28. 赛博机甲 (未来装甲)
  mecha:     ['impact', 'oswald', 'courier', 'oswald', 'sans', 'impact', 'zcool', 'sans', 'sans'],
  // 29. 废土末世 (锈迹硬核)
  wasteland: ['courier', 'impact', 'hannotate', 'courier', 'sans', 'impact', 'mashan', 'sans', 'sans'],
  // 30. 极光幻境 (全息渐变)
  aurora:    ['sans', 'playfair', 'wenkai', 'oswald', 'sans', 'playfair', 'kai', 'sans', 'sans']
}

// 匹配列对应的字体，按顺序：日期 -> 项目 -> 赛事 -> 对阵 -> 赛果 -> 思路 -> 结果
function getColumnFont(themeName: string, colKey: string, colName: string, type: 'header' | 'cell'): string {
  const fonts = semanticThemeFontMap[themeName]
  if (!fonts) return ''
  
  if (type === 'header') return getFontFamily(fonts[0])

  const n = (colName || '')
  const k = (colKey || '').toLowerCase()
  
  // 按语义及顺序匹配分配
  let idx = 8 // 默认其他列使用最后一种字体
  
  if (k === 'date' || /日期|时间/.test(n)) idx = 1
  else if (/项目/.test(n) || k === 'project') idx = 2
  else if (/赛事|联赛|比赛/.test(n) || k === 'league') idx = 3
  else if (/对阵|双方|球队|主客/.test(n) || k === 'match' || k === 'teams') idx = 4
  else if (k === 'result' || /比分|赛果/.test(n)) idx = 5
  else if (/思路|分析|推荐/.test(n) || k === 'idea') idx = 6 // 重点凸显思路
  else if (k === 'outcome' || /红黑|胜负|结果/.test(n)) idx = 7

  return getFontFamily(fonts[idx])
}

const customStyles = ref<Record<string, {
  header: { color: string, underline: boolean, italic: boolean, font: string, size: number },
  cell: { color: string, underline: boolean, italic: boolean, font: string, size: number }
}>>({})

const fontOptions = [
  { label: '跟随主题', value: 'inherit' },
  { label: '雅黑/苹方', value: 'yahei' },
  { label: '楷体', value: 'kai' },
  { label: '宋体', value: 'song' },
  { label: '黑体/Impact', value: 'impact' },
  { label: '霞鹜文楷', value: 'wenkai' },
  { label: '手写体', value: 'hannotate' },
  { label: '毛笔(马善政)', value: 'mashan' },
  { label: 'Oswald', value: 'oswald' },
  { label: 'Playfair', value: 'playfair' },
  { label: '等宽', value: 'courier' },
  { label: '思源宋体', value: 'notoserif' },
  { label: '站酷小薇', value: 'zcool' }
]

const getCellStyle = (colKey: string, type: 'header' | 'cell') => {
  const styles: Record<string, string> = {}
  const custom = customStyles.value[colKey]?.[type]

  styles.fontWeight = type === 'header' ? '800' : '600'
  if (custom?.color) styles.color = custom.color + ' !important'
  if (custom?.underline) styles.textDecoration = 'underline !important'
  if (custom?.italic) styles.fontStyle = 'italic !important'

  if (custom?.size && custom.size !== 0) {
    const baseSize = type === 'header' ? 15 : 17
    styles.fontSize = `calc(${baseSize}px + ${custom.size}px) !important`
  }

  // 🌟 核心应用：获取每一列独立的专属字体
  const colFont = getColumnFont(theme.value, colKey, colNameMap.value[colKey] || '', type)
  if (colFont) styles.fontFamily = colFont + ' !important'

  // 用户手动覆盖优先
  if (custom?.font && custom.font !== 'inherit') {
    styles.fontFamily = getFontFamily(custom.font) + ' !important'
  }

  return styles
}

const getNumberFontStyle = () => {
  const fonts = semanticThemeFontMap[theme.value]
  // 比分/结果列使用固定字体列（赛果）
  return fonts ? { fontFamily: getFontFamily(fonts[5]) + ' !important' } : {}
}

const getColor = (type: 'header' | 'cell', colKey: string) => {
  return customStyles.value[colKey]?.[type]?.color || ''
}

watch(() => localCols.value.map(c => c.key).join(','), () => {
  localCols.value.forEach(col => {
    if (!customStyles.value[col.key]) {
      customStyles.value[col.key] = {
        header: { color: '', underline: false, italic: false, font: 'inherit', size: 0 },
        cell: { color: '', underline: false, italic: false, font: 'inherit', size: 0 }
      }
    }
  })
}, { immediate: true })

function resetColumnStyle(colKey: string) {
  customStyles.value[colKey] = {
    header: { color: '', underline: false, italic: false, font: 'inherit', size: 0 },
    cell: { color: '', underline: false, italic: false, font: 'inherit', size: 0 }
  }
}

function resetAllStyles() {
  if (!confirm('确定要清空所有自定义样式，恢复默认套装吗？')) return
  localCols.value.forEach(col => resetColumnStyle(col.key))
}

const sortedRecords = computed(() => {
  return [...props.records].sort((a, b) => {
    const strA = String(a.date || '1970-01-01').replace(/\//g, '-')
    const strB = String(b.date || '1970-01-01').replace(/\//g, '-')
    const timeA = new Date(strA).getTime()
    const timeB = new Date(strB).getTime()
    if (!isNaN(timeA) && !isNaN(timeB) && timeA !== timeB) return timeB - timeA
    if (strA !== strB) return strB.localeCompare(strA)
    return (b.id || 0) - (a.id || 0)
  })
})

const stats = computed(() => {
  const list = sortedRecords.value
  const win = list.filter(r => r.outcome && r.outcome.includes('红')).length
  const lose = list.filter(r => r.outcome && !r.outcome.includes('红') && !r.outcome.includes('走')).length
  const total = list.length
  const winRate = total === 0 ? 0 : Math.round((win / total) * 100)
  return { total, win, lose, winRate }
})

async function captureImage() {
  if (!posterRef.value) return
  try {
    const canvas = await html2canvas(posterRef.value, { scale: 2, backgroundColor: null, useCORS: true })
    const link = document.createElement('a')
    link.href = canvas.toDataURL('image/png')
    link.download = `战绩图_${new Date().getTime()}.png`
    link.click()
    canvas.toBlob(async (blob) => {
      if (blob) {
        try {
          const item = new ClipboardItem({ 'image/png': blob })
          await navigator.clipboard.write([item])
          alert('截图已下载，并已复制到剪贴板！')
        } catch (err) {
          alert('截图已下载，但当前浏览器不支持自动复制。')
        }
      }
    }, 'image/png')
  } catch (err) { alert('截图失败') }
}

const themeList = [
  { value: 'ios', label: '玻璃', bg: 'linear-gradient(135deg, #eff6ff, #c7d2fe)', color: '#1e40af' },
  { value: 'mist', label: '晨雾', bg: 'linear-gradient(135deg, #f8fafc, #e2e8f0)', color: '#334155' },
  { value: 'news', label: '胡桃木', bg: 'linear-gradient(135deg, #3a2a22, #1a1310)', color: '#cba171' },
  { value: 'midnight', label: '勃艮第红', bg: 'linear-gradient(135deg, #4a0e1c, #2a0812)', color: '#fbbf24' },
  { value: 'cyber', label: '电竞', bg: 'linear-gradient(135deg, #040914, #0f172a)', color: '#06b6d4' },
  { value: 'gold', label: '体育报', bg: 'linear-gradient(135deg, #f5f2eb, #e7e0d0)', color: '#1c1917' },
  { value: 'tiffany', label: '蒂芙尼', bg: 'linear-gradient(135deg, #f0fdfa, #ccf0ed)', color: '#0abab5' },
  { value: 'neon', label: '霓虹', bg: 'linear-gradient(135deg, #12051f, #2d0a4e)', color: '#d946ef' },
  { value: 'swiss', label: '瑞士红', bg: 'linear-gradient(135deg, #ffffff, #f5f5f5)', color: '#ef4444' },
  { value: 'blackgold', label: '黑金', bg: 'linear-gradient(135deg, #050505, #1a1508)', color: '#eab308' },
  { value: 'retro', label: '蒸汽波', bg: 'linear-gradient(135deg, #fdf6e3, #f5e8c8)', color: '#c2410c' },
  { value: 'minimal', label: '极简灰', bg: 'linear-gradient(135deg, #ffffff, #e5e5e5)', color: '#000000' },
  { value: 'rubik', label: '魔方格', bg: 'linear-gradient(135deg, #111827, #4c1d95)', color: '#a78bfa' },
  { value: 'esports', label: '冲刺红', bg: 'linear-gradient(135deg, #0f0f11, #3f3f46)', color: '#ef4444' },
  { value: 'ink', label: '水墨丹青', bg: 'linear-gradient(135deg, #f5f1e8, #d6cbb8)', color: '#1c1917' },
  { value: 'receipt', label: '赛博票据', bg: 'linear-gradient(135deg, #e0f2fe, #bae6fd)', color: '#0369a1' },
  { value: 'koi', label: '国潮锦鲤', bg: 'linear-gradient(135deg, #fff7ed, #fed7aa)', color: '#c2410c' },
  { value: 'terminal', label: '极客终端', bg: 'linear-gradient(135deg, #0f1a0f, #052e16)', color: '#22c55e' },
  { value: 'vintage', label: '中式喜报', bg: 'linear-gradient(135deg, #fee2e2, #fecaca)', color: '#b91c1c' },
  { value: 'journal', label: '手账贴纸', bg: 'linear-gradient(135deg, #fdf2f8, #fbcfe8)', color: '#be185d' },
  
  // === 💥 炸裂的新 10 套 ===
  { value: 'metal', label: '枪火金属', bg: 'linear-gradient(135deg, #3f3f46, #18181b)', color: '#e4e4e7' },
  { value: 'pop', label: '波普漫画', bg: 'linear-gradient(135deg, #fef08a, #fca5a5)', color: '#ef4444' },
  { value: 'vice', label: '罪恶都市', bg: 'linear-gradient(135deg, #0f0c29, #302b63)', color: '#ff00cc' },
  { value: 'hazard', label: '警告警戒', bg: 'linear-gradient(135deg, #facc15, #ca8a04)', color: '#000000' },
  { value: 'neon2', label: '极简霓虹', bg: 'linear-gradient(135deg, #000000, #1e1e1e)', color: '#00ffff' },
  { value: 'secret', label: '绝密档案', bg: 'linear-gradient(135deg, #e8dfca, #d4c5a5)', color: '#b91c1c' },
  { value: 'blood', label: '腥红之月', bg: 'linear-gradient(135deg, #1a0505, #450a0a)', color: '#dc2626' },
  { value: 'mecha', label: '赛博机甲', bg: 'linear-gradient(135deg, #111827, #1e3a8a)', color: '#60a5fa' },
  { value: 'wasteland', label: '废土末世', bg: 'linear-gradient(135deg, #44403c, #292524)', color: '#d97706' },
  { value: 'aurora', label: '极光幻境', bg: 'linear-gradient(135deg, #a78bfa, #38bdf8)', color: '#ffffff' }
]
</script>

<template>
  <div class="animate-fade">
    <div class="glass-card" style="margin-bottom: 16px; padding: 20px;">
      <div style="display:flex; gap:12px; margin-bottom: 16px; align-items:center; flex-wrap:wrap;">
        <input v-model="bannerText" placeholder="主标题文案" style="flex:1; min-width:200px; max-width: 300px; padding:8px 12px; border:1px solid #cbd5e1; border-radius:8px; font-size:13px; outline:none; transition:0.2s;" onfocus="this.style.borderColor='#6366f1'" onblur="this.style.borderColor='#cbd5e1'" />
        <input v-model="footerText" placeholder="页脚水印" style="flex:1; min-width:200px; max-width: 300px; padding:8px 12px; border:1px solid #cbd5e1; border-radius:8px; font-size:13px; outline:none; transition:0.2s;" onfocus="this.style.borderColor='#6366f1'" onblur="this.style.borderColor='#cbd5e1'" />
        <div style="flex:1;"></div>
        <button @click="captureImage" style="background: #6366f1; color: white; border: none; padding: 0 20px; height:38px; border-radius: 8px; font-size: 13px; font-weight: bold; cursor: pointer; box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3); transition:0.2s; display:flex; align-items:center; gap:6px;" onmouseover="this.style.transform='translateY(-1px)'" onmouseout="this.style.transform='none'">📸 截图</button>
      </div>

      <div style="display:flex; align-items:center; gap:12px; background: #f8fafc; padding: 12px; border-radius: 10px; border: 1px dashed #cbd5e1; flex-wrap: wrap;">
        <label style="font-size:12px; font-weight:600; color:#64748b; display:flex; align-items:center; gap:6px; cursor:pointer;">
          <input type="checkbox" v-model="showStats" style="accent-color:#6366f1; cursor:pointer; width:14px; height:14px;" /> 统计条
        </label>
        <div style="width:1px; height:14px; background:#cbd5e1;"></div>
        <span style="font-size:12px; font-weight:600; color:#94a3b8;">☰ 拖拽排序 / 点击显隐</span>
        <div style="display:flex; flex-wrap:wrap; gap:8px; flex:1;">
          <div v-for="(col, index) in localCols" :key="col.key" draggable="true" @dragstart="onDragStart(index)" @dragover="onDragOver" @drop="onDrop(index)" @click="hideColumns.includes(col.key) ? hideColumns = hideColumns.filter(k => k !== col.key) : hideColumns.push(col.key)" :style="hideColumns.includes(col.key) ? 'background:#fff; color:#94a3b8; border:1px solid #e2e8f0; cursor:pointer; text-decoration: line-through;' : 'background:#e0e7ff; color:#4338ca; border:1px solid #c7d2fe; cursor:pointer;'" style="padding:4px 10px; border-radius:6px; font-size:12px; font-weight:600; user-select:none; transition:0.2s; display:flex; align-items:center; gap:4px;">
            <span style="opacity:0.4; cursor:grab;">☰</span> {{ col.name }}
          </div>
        </div>
      </div>
    </div>

    <div class="glass-card" style="margin-bottom: 16px; padding: 0; overflow: hidden;">
      <div @click="showThemePanel = !showThemePanel" style="display:flex; justify-content:space-between; align-items:center; padding: 16px 20px; cursor: pointer; user-select: none; background: #fff;">
        <div style="display:flex; align-items:center; gap:8px;"><span style="font-size:14px; font-weight:700; color:#0f172a;">🎨 海报风格套装</span></div>
        <div style="display:flex; align-items:center; gap:12px;">
          <span style="font-size: 13px; font-weight: 600; color: #64748b; display: flex; align-items: center; gap: 4px;">{{ showThemePanel ? '收起' : '展开' }}<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" :style="{ transform: showThemePanel ? 'rotate(180deg)' : 'none', transition: '0.2s' }"><polyline points="6 9 12 15 18 9"></polyline></svg></span>
        </div>
      </div>
      <div v-show="showThemePanel" style="padding: 0 20px 20px 20px; border-top: 1px dashed #e2e8f0;">
        <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(96px, 1fr)); gap:10px; margin-top: 16px;">
          <div v-for="t in themeList" :key="t.value" @click="theme = t.value" :style="{ background: t.bg, color: t.color, border: theme === t.value ? '2px solid #6366f1' : '1px solid #e2e8f0', boxShadow: theme === t.value ? '0 0 0 3px rgba(99,102,241,0.15)' : '0 2px 6px rgba(0,0,0,0.04)', position: 'relative', height: '56px', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 800 }">{{ t.label }}</div>
        </div>
      </div>
    </div>

    <div class="glass-card" style="margin-bottom: 16px; padding: 0; overflow: hidden;">
      <div @click="showStylePanel = !showStylePanel" style="display:flex; justify-content:space-between; align-items:center; padding: 16px 20px; cursor: pointer; user-select: none; background: #fff;">
        <div style="display:flex; align-items:center; gap:8px;">
          <span style="font-size:14px; font-weight:700; color:#0f172a;">⚙️ 单列深度定制</span>
          <span style="font-size:12px; color:#64748b; font-weight:500;">表头 / 内容样式微调</span>
        </div>
        <div style="display:flex; align-items:center; gap:12px;">
          <button @click.stop="resetAllStyles" style="background:#fff; border:1px solid #cbd5e1; color:#475569; padding:4px 10px; border-radius:6px; font-size:12px; font-weight:600; cursor:pointer; display:flex; align-items:center; gap:4px; transition:0.2s;" onmouseover="this.style.background='#fef2f2'; this.style.color='#ef4444'; this.style.borderColor='#fecaca'" onmouseout="this.style.background='#fff'; this.style.color='#475569'; this.style.borderColor='#cbd5e1'"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path></svg> 一键重置所有</button>
          <span style="font-size: 13px; font-weight: 600; color: #64748b; display: flex; align-items: center; gap: 4px;">{{ showStylePanel ? '收起' : '展开' }}<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" :style="{ transform: showStylePanel ? 'rotate(180deg)' : 'none', transition: '0.2s' }"><polyline points="6 9 12 15 18 9"></polyline></svg></span>
        </div>
      </div>
      <div v-show="showStylePanel" style="padding: 0 20px 20px 20px; border-top: 1px dashed #e2e8f0;">
        <div style="display:flex; justify-content:flex-start; margin-top: 16px; margin-bottom:16px;">
          <div style="display:inline-flex; background:#f1f5f9; padding:4px; border-radius:10px;">
            <div @click="configTab = 'header'" :style="configTab === 'header' ? 'background:#fff; color:#0f172a; box-shadow:0 1px 3px rgba(0,0,0,0.1);' : 'color:#64748b;'" style="padding:6px 16px; border-radius:8px; font-size:13px; font-weight:700; cursor:pointer; transition:0.2s; user-select:none;">表头样式</div>
            <div @click="configTab = 'cell'" :style="configTab === 'cell' ? 'background:#fff; color:#0f172a; box-shadow:0 1px 3px rgba(0,0,0,0.1);' : 'color:#64748b;'" style="padding:6px 16px; border-radius:8px; font-size:13px; font-weight:700; cursor:pointer; transition:0.2s; user-select:none;">内容样式</div>
          </div>
        </div>
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 12px;">
          <div v-for="col in localCols" :key="col.key" style="display:flex; flex-direction:column; background:#f8fafc; border-radius:12px; border:1px solid #e2e8f0; overflow:hidden; transition:0.2s;" onmouseover="this.style.borderColor='#c7d2fe'; this.style.boxShadow='0 4px 12px rgba(99,102,241,0.05)'" onmouseout="this.style.borderColor='#e2e8f0'; this.style.boxShadow='none'">
            <div style="display:flex; justify-content:space-between; align-items:center; padding: 10px 12px; background: #fff; border-bottom: 1px solid #f1f5f9;">
              <span style="font-size:13px; color:#1e293b; font-weight:700; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">{{ col.name }}</span>
              <button @click="resetColumnStyle(col.key)" style="background:transparent; border:none; cursor:pointer; padding:4px; color:#cbd5e1; display:flex; align-items:center; transition:0.2s; border-radius:4px;" title="还原此列默认" onmouseover="this.style.color='#ef4444'; this.style.background='#fef2f2'" onmouseout="this.style.color='#cbd5e1'; this.style.background='transparent'"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path></svg></button>
            </div>
            <div style="padding: 12px; display:flex; flex-direction:column; gap:10px;">
              <div style="background:#fff; border-radius:8px; border:1px solid #e2e8f0; padding: 0 4px; height: 32px; display:flex; align-items:center;">
                <BaseSelect v-if="configTab === 'header'" v-model="customStyles[col.key].header.font" :options="fontOptions" height="28px" style="width:100%;" />
                <BaseSelect v-if="configTab === 'cell'" v-model="customStyles[col.key].cell.font" :options="fontOptions" height="28px" style="width:100%;" />
              </div>
              <div style="display:flex; align-items:center; justify-content:space-between;">
                <div style="display:flex; background:#fff; border:1px solid #e2e8f0; border-radius:8px; overflow:hidden; height: 32px;">
                  <template v-if="configTab === 'header'">
                    <button @click="customStyles[col.key].header.underline = !customStyles[col.key].header.underline" :style="customStyles[col.key].header.underline ? 'background:#eef2ff; color:#4f46e5;' : 'background:transparent; color:#64748b;'" style="width:32px; border:none; height:100%; font-weight:700; font-size:13px; text-decoration:underline; cursor:pointer; transition:0.2s; border-right:1px solid #e2e8f0;">U</button>
                    <button @click="customStyles[col.key].header.italic = !customStyles[col.key].header.italic" :style="customStyles[col.key].header.italic ? 'background:#eef2ff; color:#4f46e5;' : 'background:transparent; color:#64748b;'" style="width:32px; border:none; height:100%; font-style:italic; font-weight:600; font-family:serif; font-size:13px; cursor:pointer; transition:0.2s;">I</button>
                  </template>
                  <template v-if="configTab === 'cell'">
                    <button @click="customStyles[col.key].cell.underline = !customStyles[col.key].cell.underline" :style="customStyles[col.key].cell.underline ? 'background:#eef2ff; color:#4f46e5;' : 'background:transparent; color:#64748b;'" style="width:32px; border:none; height:100%; font-weight:700; font-size:13px; text-decoration:underline; cursor:pointer; transition:0.2s; border-right:1px solid #e2e8f0;">U</button>
                    <button @click="customStyles[col.key].cell.italic = !customStyles[col.key].cell.italic" :style="customStyles[col.key].cell.italic ? 'background:#eef2ff; color:#4f46e5;' : 'background:transparent; color:#64748b;'" style="width:32px; border:none; height:100%; font-style:italic; font-weight:600; font-family:serif; font-size:13px; cursor:pointer; transition:0.2s;">I</button>
                  </template>
                </div>
                <div :style="`width:24px; height:24px; border-radius:50%; border:2px solid #fff; box-shadow: 0 1px 4px rgba(0,0,0,0.15), 0 0 0 1px #cbd5e1; overflow:hidden; position:relative; cursor:pointer; display:flex; align-items:center; justify-content:center; background: ${(configTab === 'header' ? customStyles[col.key].header.color : customStyles[col.key].cell.color) || 'transparent'}; transition:0.2s;`" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'" title="修改颜色">
                  <input type="color" :value="getColor(configTab, col.key)" @input="e => configTab === 'header' ? customStyles[col.key].header.color = (e.target as HTMLInputElement).value : customStyles[col.key].cell.color = (e.target as HTMLInputElement).value" style="position:absolute; width:200%; height:200%; top:-50%; left:-50%; padding:0; border:none; cursor:pointer; opacity: 0;" />
                  <div v-if="configTab === 'header' ? !customStyles[col.key].header.color : !customStyles[col.key].cell.color" style="font-size:10px; color:#94a3b8; pointer-events:none; font-weight:900;">A</div>
                </div>
              </div>
              <div style="background:#fff; border-radius:8px; border:1px solid #e2e8f0; padding: 0 4px; height: 32px; display:flex; align-items:center; justify-content:space-between;">
                <button @click="configTab === 'header' ? (customStyles[col.key].header.size -= 1) : (customStyles[col.key].cell.size -= 1)" style="border:none; background:transparent; width:24px; height:24px; border-radius:4px; cursor:pointer; color:#64748b; font-size:12px; font-weight:900; transition:0.2s; display:flex; align-items:center; justify-content:center;" onmouseover="this.style.background='#f1f5f9'; this.style.color='#4f46e5'" onmouseout="this.style.background='transparent'; this.style.color='#64748b'">A-</button>
                <span style="font-size:11px; font-weight:700; color:#4f46e5; pointer-events:none;">{{ configTab === 'header' ? (customStyles[col.key].header.size > 0 ? '+'+customStyles[col.key].header.size : customStyles[col.key].header.size) : (customStyles[col.key].cell.size > 0 ? '+'+customStyles[col.key].cell.size : customStyles[col.key].cell.size) }}</span>
                <button @click="configTab === 'header' ? (customStyles[col.key].header.size += 1) : (customStyles[col.key].cell.size += 1)" style="border:none; background:transparent; width:24px; height:24px; border-radius:4px; cursor:pointer; color:#64748b; font-size:12px; font-weight:900; transition:0.2s; display:flex; align-items:center; justify-content:center;" onmouseover="this.style.background='#f1f5f9'; this.style.color='#4f46e5'" onmouseout="this.style.background='transparent'; this.style.color='#64748b'">A+</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="poster-wrapper">
      <div ref="posterRef" :class="['poster-container', 'theme-' + theme]">
        <div class="poster-banner">
          <span class="banner-en">EXCLUSIVE MATCH REPORT</span>
          <div class="banner-cn">{{ bannerText }}</div>
        </div>

        <div v-if="showStats" class="poster-stats">
          <div class="stat-item"><span class="stat-label">总场次</span><span class="stat-num" :style="getNumberFontStyle()">{{ stats.total }}</span></div>
          <div class="stat-divider"></div>
          <div class="stat-item win"><span class="stat-label">红单</span><span class="stat-num" :style="getNumberFontStyle()">{{ stats.win }}</span></div>
          <div class="stat-divider"></div>
          <div class="stat-item lose"><span class="stat-label">黑单</span><span class="stat-num" :style="getNumberFontStyle()">{{ stats.lose }}</span></div>
          <div class="stat-divider"></div>
          <div class="stat-item rate"><span class="stat-label">胜率</span><span class="stat-num" :style="getNumberFontStyle()">{{ stats.winRate }}<span style="font-size: 16px; margin-left: 2px;">%</span></span></div>
        </div>

        <table class="poster-table">
          <thead>
            <tr>
              <th v-for="col in localCols" :key="col.key" v-show="!hideColumns.includes(col.key)" :style="[col.key === 'result' ? { width: '180px' } : {}, getCellStyle(col.key, 'header')]">{{ col.name }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in sortedRecords" :key="r.id">
              <td v-for="col in localCols" :key="col.key" v-show="!hideColumns.includes(col.key)" :style="[col.key === 'result' ? { width: '180px' } : {}, getCellStyle(col.key, 'cell')]">
                <template v-if="col.key === 'result'">
                  <div class="result-cell">
                    <span class="main-score" :style="getNumberFontStyle()">{{ r.result ? r.result.replace(/[（(].*[）)]/g, '').trim() : '-' }}</span>
                    <span class="sub-score" v-if="r.result && /[（(]/.test(r.result)" :style="getNumberFontStyle()">{{ r.result.match(/[（(](.*?)[）)]/)?.[1] || '' }}</span>
                  </div>
                </template>
                <span v-else-if="col.key === 'outcome'" :class="[r.outcome.includes('红') ? 'text-win' : (r.outcome.includes('走') ? 'text-draw' : 'text-lose')]">{{ r.outcome }}</span>
                <span v-else-if="col.key.startsWith('extra_')">{{ r.extra_data[col.name] || '-' }}</span>
                <span v-else-if="col.key === 'date'" :style="getNumberFontStyle()">{{ r.date.replace(/\//g, '-') }}</span>
                <span v-else>{{ r[col.key] }}</span>
              </td>
            </tr>
          </tbody>
        </table>
        <div class="poster-footer">{{ footerText }}</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 字体全在 script 动态下发，这里只做 banner 兜底 */
.theme-ink .banner-en, .theme-ink .banner-cn { font-family: 'Ma Shan Zheng', 'STKaiti', 'KaiTi', cursive !important; }
.theme-receipt .banner-en { font-family: 'Oswald', 'Impact', sans-serif !important; }
.theme-receipt .banner-cn { font-family: 'Oswald', 'Microsoft YaHei', sans-serif !important; }
.theme-koi .banner-en { font-family: 'Ma Shan Zheng', 'STKaiti', cursive !important; }
.theme-koi .banner-cn { font-family: 'Ma Shan Zheng', 'STKaiti', 'KaiTi', cursive !important; }
.theme-terminal .banner-en, .theme-terminal .banner-cn { font-family: 'Courier New', Courier, monospace !important; }
.theme-vintage .banner-en { font-family: 'Ma Shan Zheng', 'STKaiti', serif !important; }
.theme-vintage .banner-cn { font-family: 'Ma Shan Zheng', 'STKaiti', serif !important; }
.theme-journal .banner-en, .theme-journal .banner-cn { font-family: 'Hannotate SC', 'Kaiti SC', cursive !important; }
</style>