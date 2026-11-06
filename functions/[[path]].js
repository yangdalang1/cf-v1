// ========== 赛事名解析（前后端规则必须一致） ==========
function parseEvent(matchInfo) {
  if (!matchInfo) return ''
  const parts = String(matchInfo).split('/')
  return (parts.length >= 2 ? parts[1] : parts[0]).trim()
}

export async function onRequest(context) {
  const { request, env } = context
  const { pathname } = new URL(request.url)
  const { searchParams } = new URL(request.url)

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
  }

  if (request.method === 'OPTIONS') return new Response(null, { headers })
  if (!pathname.startsWith('/api/')) return context.next()

  // 1. 建表
  await env.DB.batch([
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE NOT NULL, password TEXT NOT NULL, role TEXT DEFAULT 'user')`),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS records (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, date TEXT NOT NULL, project TEXT NOT NULL, match_info TEXT NOT NULL, teams TEXT NOT NULL, result TEXT, thought TEXT, outcome TEXT NOT NULL, extra_data TEXT, created_at TEXT DEFAULT (datetime('now')))`),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS dictionaries (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, type TEXT NOT NULL, value TEXT NOT NULL, sort_order INTEGER DEFAULT 0)`)
  ])
  await env.DB.prepare(`INSERT OR IGNORE INTO users (username, password, role) VALUES ('admin', '123456', 'admin')`).run()

  // 2. 登录
  if (pathname === '/api/login' && request.method === 'POST') {
    const body = await request.json()
    const user = await env.DB.prepare('SELECT id, username, role FROM users WHERE username = ? AND password = ?').bind(body.username, body.password).first()
    if (user) {
      const token = btoa(`${user.id}:${user.username}:${user.role}:${Date.now()}`)
      return new Response(JSON.stringify({ ok: true, token, role: user.role, username: user.username, userId: user.id }), { headers })
    }
    return new Response(JSON.stringify({ ok: false, error: '账号或密码错误' }), { status: 401, headers })
  }

  // 3. 鉴权
  const authHeader = request.headers.get('Authorization')
  let currentUserId = null
  let currentUserRole = null
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const decoded = atob(authHeader.split(' ')[1])
      currentUserId = parseInt(decoded.split(':')[0])
      currentUserRole = decoded.split(':')[2]
    } catch (e) { return new Response(JSON.stringify({ error: '无效Token' }), { status: 401, headers }) }
  }
  if (!currentUserId) return new Response(JSON.stringify({ error: '请先登录' }), { status: 401, headers })

  // ========== 用户管理 ==========
  if (pathname === '/api/users' && request.method === 'GET') {
    if (currentUserRole !== 'admin') return new Response(JSON.stringify({ error: '无权限' }), { status: 403, headers })
    const { results } = await env.DB.prepare('SELECT id, username, role FROM users ORDER BY id ASC').all()
    return new Response(JSON.stringify(results), { headers })
  }

  if (pathname === '/api/users' && request.method === 'POST') {
    if (currentUserRole !== 'admin') return new Response(JSON.stringify({ error: '无权限' }), { status: 403, headers })
    try {
      const body = await request.json()
      if (!body.username || !body.password) return new Response(JSON.stringify({ error: '账号密码必填' }), { status: 400, headers })
      await env.DB.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)')
        .bind(body.username.trim(), body.password, body.role === 'admin' ? 'admin' : 'user').run()
      return new Response(JSON.stringify({ ok: true }), { headers })
    } catch (err) {
      if (String(err.message).includes('UNIQUE')) return new Response(JSON.stringify({ error: '账号已存在' }), { status: 400, headers })
      return new Response(JSON.stringify({ error: err.message }), { status: 500, headers })
    }
  }

  if (pathname.startsWith('/api/users/') && pathname.endsWith('/password') && request.method === 'PUT') {
    if (currentUserRole !== 'admin') return new Response(JSON.stringify({ error: '无权限' }), { status: 403, headers })
    try {
      const parts = pathname.split('/')
      const id = parts[parts.length - 2]
      const body = await request.json()
      if (!body.password) return new Response(JSON.stringify({ error: '密码不能为空' }), { status: 400, headers })
      await env.DB.prepare('UPDATE users SET password = ? WHERE id = ?').bind(body.password, id).run()
      return new Response(JSON.stringify({ ok: true }), { headers })
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), { status: 500, headers })
    }
  }

  if (pathname.startsWith('/api/users/') && request.method === 'DELETE') {
    if (currentUserRole !== 'admin') return new Response(JSON.stringify({ error: '无权限' }), { status: 403, headers })
    const id = pathname.split('/').pop()
    if (parseInt(id) === currentUserId) return new Response(JSON.stringify({ error: '不能删除自己' }), { status: 400, headers })
    await env.DB.batch([
      env.DB.prepare('DELETE FROM records WHERE user_id = ?').bind(id),
      env.DB.prepare('DELETE FROM dictionaries WHERE user_id = ?').bind(id),
      env.DB.prepare('DELETE FROM users WHERE id = ?').bind(id)
    ])
    return new Response(JSON.stringify({ ok: true }), { headers })
  }

  // ========== 字典管理 ==========
  if (pathname === '/api/dict' && request.method === 'GET') {
    const type = searchParams.get('type')
    const targetUserId = searchParams.get('user_id')
    const dictUserId = (currentUserRole === 'admin' && targetUserId) ? parseInt(targetUserId) : currentUserId
    const { results } = await env.DB.prepare('SELECT * FROM dictionaries WHERE user_id = ? AND type = ? ORDER BY sort_order ASC').bind(dictUserId, type).all()
    if (results.length === 0) {
      if (type === 'outcome') return new Response(JSON.stringify(['红', '黑', '走', '赢半', '输半', '腰斩']), { headers })
      if (type === 'project') return new Response(JSON.stringify(['拍案叫绝', '惊鸿', '启明星']), { headers })
      if (type === 'fields') return new Response(JSON.stringify([]), { headers })
    }
    if (type === 'fields') return new Response(JSON.stringify(results.map(r => ({ name: r.value, sort_order: r.sort_order }))), { headers })
    return new Response(JSON.stringify(results.map(r => r.value)), { headers })
  }

  if (pathname === '/api/dict' && request.method === 'POST') {
    try {
      const body = await request.json()
      await env.DB.prepare('DELETE FROM dictionaries WHERE user_id = ? AND type = ?').bind(currentUserId, body.type).run()
      if (body.values && body.values.length > 0) {
        const stmt = env.DB.prepare('INSERT INTO dictionaries (user_id, type, value, sort_order) VALUES (?, ?, ?, ?)')
        let batch = []
        if (body.type === 'fields') batch = body.values.map((item, index) => stmt.bind(currentUserId, body.type, item.name, index))
        else batch = body.values.map((val, index) => stmt.bind(currentUserId, body.type, val, index))
        await env.DB.batch(batch)
      }
      return new Response(JSON.stringify({ ok: true }), { headers })
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), { status: 500, headers })
    }
  }

  // ========== 战绩管理 ==========
    // 极速批量导入接口
  if (pathname === '/api/records/batch_add' && request.method === 'POST') {
    try {
      const { records } = await request.json()
      if (!records || records.length === 0) {
        return new Response(JSON.stringify({ error: '没有数据' }), { status: 400, headers })
      }

      const stmt = env.DB.prepare(`
        INSERT INTO records (user_id, date, project, match_info, teams, result, thought, outcome, extra_data) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)

      // 构建批量队列
      const batch = records.map(r => {
        // 处理日期格式（和单条录入保持一致）
        const parts = (r.date || '').replace(/\//g, '-').split('-')
        const dateStr = parts.length === 3 ? `${parts[0]}/${parts[1].padStart(2, '0')}/${parts[2].padStart(2, '0')}` : r.date
        
        return stmt.bind(
          currentUserId, 
          dateStr, 
          r.project, 
          r.match_info, 
          r.teams, 
          r.result || '', 
          r.thought || '', 
          r.outcome, 
          r.extra_data || '{}'
        )
      })

      // 一次性告诉数据库：把这批数据全写进去
      await env.DB.batch(batch)

      return new Response(JSON.stringify({ ok: true, count: records.length }), { headers })
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), { status: 500, headers })
    }
  }

  // 新增：筛选可选项（全量 + 联动收窄）
  if (pathname === '/api/records/filter-options' && request.method === 'POST') {
    try {
      const body = await request.json()
      const selProjects = Array.isArray(body.projects) ? body.projects : []
      const selEvents = Array.isArray(body.events) ? body.events : []
      const selOutcomes = Array.isArray(body.outcomes) ? body.outcomes : []
      const start_date = body.start_date || ''
      const end_date = body.end_date || ''
      const target_user = body.target_user

      let userWhere = ''; let userParams = []
      if (currentUserRole === 'admin') {
        if (target_user && target_user !== '全部' && target_user !== 'all') {
          userWhere = ' AND user_id = ?'; userParams.push(parseInt(target_user))
        }
      } else {
        userWhere = ' AND user_id = ?'; userParams.push(currentUserId)
      }

      let dateWhere = ''; let dateParams = []
      const fixDate = (d) => {
        if (!d) return ''
        const [y, m, dd] = d.split('-')
        if (!y || !m || !dd) return ''
        return `${y}/${m.padStart(2, '0')}/${dd.padStart(2, '0')}`
      }
      const sd = fixDate(start_date); const ed = fixDate(end_date)
      if (sd) { dateWhere += ' AND date >= ?'; dateParams.push(sd) }
      if (ed) { dateWhere += ' AND date <= ?'; dateParams.push(ed) }

      async function distinctCol(col, extraWhere, extraParams) {
        const sql = `SELECT DISTINCT ${col} AS v FROM records WHERE 1=1${userWhere}${dateWhere}${extraWhere}`
        const { results } = await env.DB.prepare(sql).bind(...userParams, ...dateParams, ...extraParams).all()
        return results.map(r => r.v).filter(v => v !== null && v !== undefined && v !== '')
      }

      // 项目选项：排除项目自身
      let projExtra = ''; let projParams = []
      if (selOutcomes.length > 0) { projExtra += ` AND outcome IN (${selOutcomes.map(() => '?').join(',')})`; projParams.push(...selOutcomes) }
      if (selEvents.length > 0) { projExtra += ' AND (' + selEvents.map(() => 'match_info LIKE ?').join(' OR ') + ')'; projParams.push(...selEvents.map(e => `%${e}%`)) }
      const projects = await distinctCol('project', projExtra, projParams)

      // 红黑选项：排除红黑自身
      let outExtra = ''; let outParams = []
      if (selProjects.length > 0) { outExtra += ` AND project IN (${selProjects.map(() => '?').join(',')})`; outParams.push(...selProjects) }
      if (selEvents.length > 0) { outExtra += ' AND (' + selEvents.map(() => 'match_info LIKE ?').join(' OR ') + ')'; outParams.push(...selEvents.map(e => `%${e}%`)) }
      const outcomes = await distinctCol('outcome', outExtra, outParams)

      // 赛事选项：排除赛事自身
      let evExtra = ''; let evParams = []
      if (selProjects.length > 0) { evExtra += ` AND project IN (${selProjects.map(() => '?').join(',')})`; evParams.push(...selProjects) }
      if (selOutcomes.length > 0) { evExtra += ` AND outcome IN (${selOutcomes.map(() => '?').join(',')})`; evParams.push(...selOutcomes) }
      const sqlEv = `SELECT DISTINCT match_info FROM records WHERE 1=1${userWhere}${dateWhere}${evExtra} LIMIT 1000`
      const { results: evRows } = await env.DB.prepare(sqlEv).bind(...userParams, ...dateParams, ...evParams).all()
      const evSet = new Set()
      evRows.forEach(r => { const name = parseEvent(r.match_info); if (name) evSet.add(name) })
      const events = Array.from(evSet).sort((a, b) => a.localeCompare(b, 'zh'))

      return new Response(JSON.stringify({
        projects: projects.sort((a, b) => a.localeCompare(b, 'zh')),
        events,
        outcomes: outcomes.sort((a, b) => a.localeCompare(b, 'zh'))
      }), { headers })
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), { status: 500, headers })
    }
  }

  if (pathname === '/api/records' && request.method === 'GET') {
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '20')
    let start_date = searchParams.get('start_date')
    let end_date = searchParams.get('end_date')
    const target_user = searchParams.get('target_user')

    const parseMulti = (key) => {
      const all = searchParams.getAll(key)
      const flat = all.flatMap(v => String(v).split(','))
      return flat.map(s => s.trim()).filter(Boolean)
    }
    const projects = parseMulti('project')
    const outcomes = parseMulti('outcome')
    const events = parseMulti('event')

    if (start_date) {
      const [y, m, d] = start_date.split('-');
      start_date = `${y}/${m.padStart(2, '0')}/${d.padStart(2, '0')}`;
    }
    if (end_date) {
      const [y, m, d] = end_date.split('-');
      end_date = `${y}/${m.padStart(2, '0')}/${d.padStart(2, '0')}`;
    }

    let sql = 'SELECT * FROM records WHERE 1=1'
    let countSql = 'SELECT COUNT(*) as total FROM records WHERE 1=1'
    let params = []

    if (currentUserRole === 'admin') {
      if (target_user && target_user !== '全部' && target_user !== 'all') {
        sql += ' AND user_id = ?'; countSql += ' AND user_id = ?'; params.push(parseInt(target_user))
      }
    } else {
      sql += ' AND user_id = ?'; countSql += ' AND user_id = ?'; params.push(currentUserId)
    }

    if (projects.length > 0) {
      const ph = projects.map(() => '?').join(',')
      sql += ` AND project IN (${ph})`; countSql += ` AND project IN (${ph})`; params.push(...projects)
    }
    if (outcomes.length > 0) {
      const ph = outcomes.map(() => '?').join(',')
      sql += ` AND outcome IN (${ph})`; countSql += ` AND outcome IN (${ph})`; params.push(...outcomes)
    }
    if (events.length > 0) {
      const orPart = '(' + events.map(() => 'match_info LIKE ?').join(' OR ') + ')'
      sql += ` AND ${orPart}`; countSql += ` AND ${orPart}`; params.push(...events.map(e => `%${e}%`))
    }

    if (start_date) { sql += ' AND date >= ?'; countSql += ' AND date >= ?'; params.push(start_date) }
    if (end_date) { sql += ' AND date <= ?'; countSql += ' AND date <= ?'; params.push(end_date) }

    sql += " ORDER BY date(replace(date, '/', '-')) DESC, id DESC LIMIT ? OFFSET ?"
    params.push(pageSize, (page - 1) * pageSize)

    const { results } = await env.DB.prepare(sql).bind(...params).all()
    const countResult = await env.DB.prepare(countSql).bind(...params.slice(0, -2)).first()
    return new Response(JSON.stringify({ data: results, total: countResult.total }), { headers })
  }

  if (pathname === '/api/records' && request.method === 'POST') {
    try {
      const body = await request.json()
      const parts = (body.date || '').replace(/\//g, '-').split('-');
      const dateStr = parts.length === 3 ? `${parts[0]}/${parts[1].padStart(2, '0')}/${parts[2].padStart(2, '0')}` : body.date;
      await env.DB.prepare('INSERT INTO records (user_id, date, project, match_info, teams, result, thought, outcome, extra_data) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
        .bind(currentUserId, dateStr, body.project, body.match_info, body.teams, body.result || '', body.thought || '', body.outcome, body.extra_data || '{}').run()
      return new Response(JSON.stringify({ ok: true }), { headers })
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), { status: 500, headers })
    }
  }

  if (pathname === '/api/records/batch_delete' && request.method === 'POST') {
    const { ids } = await request.json()
    if (!ids || ids.length === 0) return new Response(JSON.stringify({ error: '未选择' }), { status: 400, headers })
    const stmt = env.DB.prepare('DELETE FROM records WHERE id = ? AND (user_id = ? OR ? = "admin")')
    const batch = ids.map(id => stmt.bind(id, currentUserId, currentUserRole))
    await env.DB.batch(batch)
    return new Response(JSON.stringify({ ok: true }), { headers })
  }

  if (pathname.startsWith('/api/records/')) {
    const id = pathname.split('/').pop()
    if (request.method === 'PUT') {
      const body = await request.json()
      const parts = (body.date || '').replace(/\//g, '-').split('-');
      const dateStr = parts.length === 3 ? `${parts[0]}/${parts[1].padStart(2, '0')}/${parts[2].padStart(2, '0')}` : body.date;
      await env.DB.prepare(`
        UPDATE records SET date = ?, project = ?, match_info = ?, teams = ?, result = ?, thought = ?, outcome = ?, extra_data = ? 
        WHERE id = ? AND (user_id = ? OR ? = 'admin')
      `).bind(
        dateStr, body.project, body.match_info, body.teams, body.result || '', body.thought || '', body.outcome, body.extra_data || '{}',
        id, currentUserId, currentUserRole
      ).run()
      return new Response(JSON.stringify({ ok: true }), { headers })
    }
    if (request.method === 'DELETE') {
      await env.DB.prepare('DELETE FROM records WHERE id = ? AND (user_id = ? OR ? = \'admin\')')
        .bind(id, currentUserId, currentUserRole).run()
      return new Response(JSON.stringify({ ok: true }), { headers })
    }
  }

  return new Response(JSON.stringify({ error: 'API Not Found' }), { status: 404, headers })
}