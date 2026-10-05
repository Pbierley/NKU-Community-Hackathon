import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'

function rowsFromItems(items) {
  const rows = []
  for (const item of items) {
    const text = String(item.str ?? '').replace(/\s+/g, ' ').trim()
    if (!text) continue
    const x = item.transform?.[4] ?? 0
    const y = item.transform?.[5] ?? 0
    const row = rows.find((candidate) => Math.abs(candidate.y - y) < 4)
    if (row) row.cells.push({ x, text })
    else rows.push({ y, cells: [{ x, text }] })
  }
  rows.sort((a, b) => b.y - a.y)
  return rows
    .map((row) => row.cells.sort((a, b) => a.x - b.x).map((cell) => cell.text).join(' '))
    .join('\n')
}

export async function extractPdfText(buffer) {
  const bytes = buffer instanceof Uint8Array && !Buffer.isBuffer(buffer)
    ? buffer
    : Uint8Array.from(buffer)
  const doc = await getDocument({
    data: bytes,
    isEvalSupported: false,
    useSystemFonts: true,
    disableFontFace: true,
  }).promise
  const pages = []
  for (let number = 1; number <= doc.numPages; number++) {
    const page = await doc.getPage(number)
    const content = await page.getTextContent()
    pages.push(rowsFromItems(content.items))
  }
  return pages.filter(Boolean).join('\n')
}
