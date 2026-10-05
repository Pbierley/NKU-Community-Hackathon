const TERM_RE = /\b(Fall|Spring|Summer|Winter|Autumn)\s+(20\d{2})\b|\b(20\d{2})\s+(Fall|Spring|Summer|Winter|Autumn)\b/gi
const COURSE_RE = /\b([A-Z]{2,4})\s*-?\s*(\d{3}[A-Z]?)(?:\s*[-/]\s*(\d{3}))?\b/g
const TIME_RE = /\b(\d{1,2}:\d{2}\s*(?:a\.?m\.?|p\.?m\.?)?(?:\s*[-–]\s*\d{1,2}:\d{2}\s*(?:a\.?m\.?|p\.?m\.?)?)?)\b/i
const ONLINE_RE = /\b(online|zoom|web(?:\s+based)?|remote|tba|to be announced|arranged)\b/i

const DAY_WORDS = [
  [/\bthursdays?\b|\bthu(?:rs(?:day)?)?\.?\b/i, 'R'],
  [/\btuesdays?\b|\btue(?:s(?:day)?)?\.?\b/i, 'T'],
  [/\bmondays?\b|\bmon\.?\b/i, 'M'],
  [/\bwednesdays?\b|\bwed(?:nesday)?\.?\b/i, 'W'],
  [/\bfridays?\b|\bfri\.?\b/i, 'F'],
  [/\bsaturdays?\b|\bsat\.?\b/i, 'S'],
  [/\bsundays?\b|\bsun\.?\b/i, 'U'],
]

function semesterLabel(season, year) {
  const name = String(season).toLowerCase() === 'autumn' ? 'fall' : String(season).toLowerCase()
  return `${name.charAt(0).toUpperCase()}${name.slice(1)} ${year}`
}

function semesterFromText(text) {
  TERM_RE.lastIndex = 0
  const match = TERM_RE.exec(String(text ?? ''))
  if (!match) return ''
  return semesterLabel(match[1] || match[4], match[2] || match[3])
}

function semesterFromDate(value) {
  const digits = String(value ?? '').replace(/\D/g, '')
  if (digits.length < 8) return ''
  const year = Number(digits.slice(0, 4))
  const month = Number(digits.slice(4, 6))
  if (!year || !month) return ''
  const season = month >= 8 ? 'Fall' : month >= 5 ? 'Summer' : 'Spring'
  return `${season} ${year}`
}

function buildingLabels(buildings) {
  const labels = []
  for (const building of buildings ?? []) {
    const names = [building.name, ...(Array.isArray(building.Alias) ? building.Alias : [])]
    for (const name of names) {
      const label = String(name ?? '').trim()
      if (label.length < 2) continue
      labels.push({
        label,
        buildingId: building.id,
        buildingName: building.name,
        short: /^[A-Za-z]{2,4}$/.test(label),
      })
    }
  }
  return labels.sort((a, b) => b.label.length - a.label.length)
}

function roomAfter(text, index, length) {
  const after = text.slice(index + length, index + length + 32)
  const match = after.match(/^\s*(?:[,:-]\s*)?(?:(?:room|rm\.?|bldg\.?|building)\s*[:#-]?\s*)?(\d{2,4}[A-Z]?)\b/i)
  return match?.[1] ?? ''
}

function findLocation(text, labels) {
  const source = String(text ?? '')
  for (const item of labels) {
    const flags = item.short ? 'g' : 'gi'
    const re = new RegExp(`\\b${item.label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, flags)
    const match = re.exec(source)
    if (!match) continue
    if (item.short && item.label === item.label.toUpperCase()) {
      const room = roomAfter(source, match.index, match[0].length)
      if (!room && match[0].length < 3) continue
      return place(item, room)
    }
    return place(item, roomAfter(source, match.index, match[0].length))
  }
  const online = source.match(ONLINE_RE)
  if (online) return { location: online[1].replace(/\s+/g, ' '), buildingId: null, buildingName: '' }
  return { location: '', buildingId: null, buildingName: '' }
}

function place(item, room) {
  return {
    location: room ? `${item.buildingName} ${room}` : item.buildingName,
    buildingId: item.buildingId ?? null,
    buildingName: item.buildingName,
  }
}

function courseOnLine(line, shortCodes) {
  COURSE_RE.lastIndex = 0
  let match
  while ((match = COURSE_RE.exec(line))) {
    const subject = match[1].toUpperCase()
    if (shortCodes.has(subject)) continue
    const section = match[3] ? `-${match[3]}` : ''
    return {
      code: `${subject} ${match[2]}${section}`,
      index: match.index,
      length: match[0].length,
    }
  }
  return null
}

function daysFrom(text) {
  const found = new Set()
  for (const [re, letter] of DAY_WORDS) {
    if (re.test(text)) found.add(letter)
  }
  if (found.size > 0) return 'MTWRFSU'.split('').filter((letter) => found.has(letter)).join('')
  const code = String(text).match(/(?:^|[\s,|])([MTWRFSU]{1,7})(?=\s+\d{1,2}:\d{2}|\s*$)/)
  return code?.[1] ?? ''
}

function cleanTitle(line, course, locationText) {
  let title = line.slice(course.index + course.length)
  title = title.replace(TIME_RE, ' ')
  title = title.replace(ONLINE_RE, ' ')
  if (locationText) title = title.replace(locationText, ' ')
  title = title.replace(/\b\d+(?:\.\d+)?\s*(?:credits?|cr)?\b/gi, ' ')
  title = title.replace(/(?:^|[\s,|])[MTWRFSU]{1,7}(?=\s|$)/g, ' ')
  title = title.replace(/^[\s,:|\-–]+|[\s,:|\-–]+$/g, '').replace(/\s+/g, ' ').trim()
  return title.slice(0, 120)
}

function escapeReg(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function classRecord(draft, labels) {
  const block = draft.lines.join('\n')
  const located = findLocation(block, labels)
  const time = block.match(TIME_RE)?.[1]?.replace(/\s+/g, ' ') ?? ''
  const days = daysFrom(block)
  let title = draft.title
  if (located.location) title = title.replace(new RegExp(escapeReg(located.location), 'ig'), ' ')
  if (located.buildingName) title = title.replace(new RegExp(escapeReg(located.buildingName), 'ig'), ' ')
  title = title.replace(/\s+/g, ' ').trim()
  return {
    code: draft.code,
    title,
    days,
    time,
    location: located.location,
    buildingId: located.buildingId,
    buildingName: located.buildingName,
  }
}

function groupSemesters(classes) {
  const byName = new Map()
  for (const item of classes) {
    const name = item.term || 'Schedule'
    const list = byName.get(name) ?? []
    const key = `${item.code}|${item.location}`
    const existing = list.find((row) => `${row.code}|${row.location}` === key)
    if (existing) {
      if (!existing.title && item.title) existing.title = item.title
      if (!existing.time && item.time) existing.time = item.time
      if (item.days) {
        const both = new Set(`${existing.days}${item.days}`)
        existing.days = 'MTWRFSU'.split('').filter((letter) => both.has(letter)).join('')
      }
    } else {
      list.push({
        code: item.code,
        title: item.title,
        days: item.days,
        time: item.time,
        location: item.location,
        buildingId: item.buildingId,
        buildingName: item.buildingName,
      })
    }
    byName.set(name, list)
  }
  return [...byName.entries()].slice(0, 12).map(([name, rows]) => ({
    name,
    classes: rows.slice(0, 40),
  }))
}

function parsePlain(text, labels, shortCodes) {
  const classes = []
  let term = semesterFromText(text) || 'Schedule'
  let draft = null

  function flush() {
    if (!draft) return
    classes.push({ term: draft.term, ...classRecord(draft, labels) })
    draft = null
  }

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line) continue
    const termName = semesterFromText(line)
    const course = courseOnLine(line, shortCodes)
    if (termName && !course) {
      flush()
      term = termName
      continue
    }
    if (course) {
      flush()
      if (termName) term = termName
      draft = { term, code: course.code, title: cleanTitle(line, course, ''), lines: [line] }
      continue
    }
    if (draft) draft.lines.push(line)
  }
  flush()
  return classes
}

function headerIndex(headers, names) {
  return headers.findIndex((header) => names.includes(header.toLowerCase().replace(/[^a-z]/g, '')))
}

function parseCsvRows(text) {
  const rows = []
  let row = []
  let cell = ''
  let quoted = false
  const src = text.replace(/^\uFEFF/, '')
  for (let i = 0; i < src.length; i++) {
    const ch = src[i]
    if (quoted) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          cell += '"'
          i += 1
        } else quoted = false
      } else cell += ch
    } else if (ch === '"') quoted = true
    else if (ch === ',' || ch === '\t') {
      row.push(cell.trim())
      cell = ''
    } else if (ch === '\n') {
      row.push(cell.trim())
      rows.push(row)
      row = []
      cell = ''
    } else if (ch !== '\r') cell += ch
  }
  if (cell || row.length) {
    row.push(cell.trim())
    rows.push(row)
  }
  return rows.filter((cells) => cells.some(Boolean))
}

function parseCsv(text, labels) {
  const rows = parseCsvRows(text)
  if (rows.length < 2) return []
  const headers = rows[0].map((cell) => cell.toLowerCase().replace(/[^a-z]/g, ''))
  const courseCol = headerIndex(headers, ['course', 'coursecode', 'class', 'subject'])
  const titleCol = headerIndex(headers, ['title', 'coursetitle', 'classname', 'name'])
  const daysCol = headerIndex(headers, ['days', 'day', 'meetingdays'])
  const timeCol = headerIndex(headers, ['time', 'meetingtime', 'hours'])
  const locationCol = headerIndex(headers, ['location', 'where', 'place'])
  const buildingCol = headerIndex(headers, ['building', 'bldg'])
  const roomCol = headerIndex(headers, ['room'])
  const termCol = headerIndex(headers, ['term', 'semester'])
  if (courseCol === -1 || (locationCol === -1 && buildingCol === -1)) return []

  const classes = []
  for (const cells of rows.slice(1)) {
    const codeLine = cells[courseCol] ?? ''
    const course = courseOnLine(codeLine, new Set()) || courseOnLine(`${codeLine} ${cells[titleCol] ?? ''}`, new Set())
    if (!course) continue
    const rawLocation = [cells[locationCol], cells[buildingCol], cells[roomCol]].filter(Boolean).join(' ')
    const located = findLocation(rawLocation, labels)
    const term = semesterFromText(cells[termCol] ?? '') || semesterFromText(text) || 'Schedule'
    classes.push({
      term,
      code: course.code,
      title: (cells[titleCol] ?? '').trim() || cleanTitle(codeLine, course, ''),
      days: daysFrom(cells[daysCol] ?? ''),
      time: (cells[timeCol] ?? '').trim(),
      location: located.location || rawLocation.trim(),
      buildingId: located.buildingId,
      buildingName: located.buildingName,
    })
  }
  return classes
}

function unfoldIcs(text) {
  return text.replace(/\r\n/g, '\n').replace(/\n[ \t]/g, '')
}

function icsField(block, name) {
  const match = block.match(new RegExp(`^${name}(?:;[^:]*)?:(.*)$`, 'im'))
  return match?.[1]?.trim() ?? ''
}

function parseIcs(text, labels) {
  const source = unfoldIcs(text)
  const classes = []
  for (const block of source.split('BEGIN:VEVENT').slice(1)) {
    const summary = icsField(block, 'SUMMARY')
    const course = courseOnLine(summary, new Set())
    if (!course) continue
    const locationText = icsField(block, 'LOCATION')
    const located = findLocation(locationText, labels)
    const start = icsField(block, 'DTSTART')
    const byDay = block.match(/BYDAY=([A-Z,]+)/i)?.[1] ?? ''
    const dayLetters = { MO: 'M', TU: 'T', WE: 'W', TH: 'R', FR: 'F', SA: 'S', SU: 'U' }
    const days = byDay
      ? byDay.split(',').map((day) => dayLetters[day.trim().toUpperCase()] ?? '').join('')
      : daysFrom(summary)
    const digits = start.replace(/\D/g, '')
    const hour = Number(digits.slice(8, 10))
    const time = digits.length >= 12
      ? `${hour % 12 || 12}:${digits.slice(10, 12)} ${hour >= 12 ? 'PM' : 'AM'}`
      : ''
    classes.push({
      term: semesterFromDate(start) || semesterFromText(summary) || 'Schedule',
      code: course.code,
      title: cleanTitle(summary, course, ''),
      days,
      time,
      location: located.location || locationText,
      buildingId: located.buildingId,
      buildingName: located.buildingName,
    })
  }
  return classes
}

function stripHtml(text) {
  if (!/<[a-z!/]/i.test(text)) return text
  return text
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|tr|li|h\d)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
}

export function parseSchedule(text, buildings = [], filename = '') {
  const raw = String(text ?? '')
  const labels = buildingLabels(buildings)
  const shortCodes = new Set(labels.filter((item) => item.short).map((item) => item.label.toUpperCase()))
  const source = stripHtml(raw)
  let classes = []
  if (/BEGIN:VCALENDAR/i.test(source)) classes = parseIcs(source, labels)
  else classes = parseCsv(source, labels)
  if (classes.length === 0) classes = parsePlain(source, labels, shortCodes)
  const semesters = groupSemesters(classes.filter((item) => item.code))
  const named = semesterFromText(filename)
  if (!named) return semesters
  return semesters.map((semester) => (
    semester.name === 'Schedule' ? { ...semester, name: named } : semester
  ))
}
