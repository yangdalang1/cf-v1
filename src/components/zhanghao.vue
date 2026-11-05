<script setup lang="ts">
import { ref } from 'vue'
import axios from 'axios'

const props = defineProps<{
  userList: any[]
  myId: number | null
}>()

const emit = defineEmits(['refresh'])
const newUser = ref({ username: '', password: '', role: 'user' })

async function addUser() {
  if (!newUser.value.username || !newUser.value.password) return alert('账号密码必填')
  try {
    await axios.post('/api/users', newUser.value)
    newUser.value = { username: '', password: '', role: 'user' }
    emit('refresh')
    alert('创建成功') // 会被 ToastConfirm 拦截为高级弹窗
  } catch (e: any) { alert(e.response?.data?.error || e.message) }
}

async function removeUser(id: number) {
  // ✅ 同样加上 await
  if (!await confirm('⚠️ 删除该账号会连带删除其所有战绩和字典，确定？')) return
  try {
    await axios.delete('/api/users/' + id)
    emit('refresh')
    alert('删除成功！')
  } catch (e: any) { alert(e.response?.data?.error || e.message) }
}

async function resetPassword(id: number, username: string) {
    const newPwd = await prompt(`请输入用户【${username}】的新密码：`)
  if (newPwd === null) return 
  if (!newPwd.trim()) return alert('密码不能为空')
  
  try {
    await axios.put(`/api/users/${id}/password`, { password: newPwd.trim() })
    alert(`用户【${username}】密码已重置！`)
  } catch (e: any) {
    alert(e.response?.data?.error || '修改失败')
  }
}
</script>

<template>
  <div class="animate-fade">
    <div class="glass-card">
      <div class="card-title">新建账号</div>
      <div class="add-row" style="gap:12px; flex-wrap:wrap;">
        <input v-model="newUser.username" placeholder="账号 (必填)" style="flex:1; min-width:160px; padding:12px 16px; border:1px solid #cbd5e1; border-radius:10px; outline:none;" />
        <input v-model="newUser.password" placeholder="密码 (必填)" style="flex:1; min-width:160px; padding:12px 16px; border:1px solid #cbd5e1; border-radius:10px; outline:none;" />
        <select v-model="newUser.role" style="width:160px; padding:12px 16px; border:1px solid #cbd5e1; border-radius:10px; outline:none; background:#f8fafc;">
          <option value="user">普通用户</option>
          <option value="admin">超级管理员</option>
        </select>
        <button class="btn-primary" style="width:120px;" @click="addUser">创建</button>
      </div>
      <p style="font-size:13px; color:#94a3b8; margin-top:10px;">提示：普通账号数据互相隔离；超管可切换查看所有人的数据。</p>
    </div>

    <div class="glass-card">
      <div class="card-title">账号列表</div>
      <div class="table-wrapper">
        <table class="modern-table">
          <thead>
            <tr><th>ID</th><th>账号</th><th>角色</th><th>操作</th></tr>
          </thead>
          <tbody>
            <tr v-for="u in userList" :key="u.id">
              <td>{{ u.id }}</td>
              <td style="font-weight: 600;">{{ u.username }}</td>
              <td>
                <span :class="u.role === 'admin' ? 'badge badge-red' : 'badge badge-cyan'">
                  {{ u.role === 'admin' ? '超级管理员' : '普通用户' }}
                </span>
              </td>
              <td>
                <button style="background:#f1f5f9; color:#475569; border:none; border-radius:6px; padding:6px 12px; font-size:13px; cursor:pointer; margin-right:8px;"
                  @click="resetPassword(u.id, u.username)">重置密码</button>
                <button style="background:#fef2f2;color:#ef4444;border:none;border-radius:6px;padding:6px 12px;font-size:13px;cursor:pointer;"
                  :disabled="u.id === myId" @click="removeUser(u.id)">
                  {{ u.id === myId ? '当前登录' : '删除账号' }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>