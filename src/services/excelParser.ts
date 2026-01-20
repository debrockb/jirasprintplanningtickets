import * as XLSX from 'xlsx'
import { TicketRow } from '../types'

export interface ParseResult {
  rows: TicketRow[]
  columns: string[]
}

export async function parseExcelFile(file: File): Promise<ParseResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const data = e.target?.result
        const workbook = XLSX.read(data, { type: 'array' })

        // Get first sheet
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]

        // Convert to JSON with headers
        const jsonData = XLSX.utils.sheet_to_json<TicketRow>(worksheet, {
          defval: ''
        })

        // Extract column names from first row
        const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1')
        const columns: string[] = []

        for (let col = range.s.c; col <= range.e.c; col++) {
          const cellAddress = XLSX.utils.encode_cell({ r: range.s.r, c: col })
          const cell = worksheet[cellAddress]
          columns.push(cell ? String(cell.v) : `Column ${col + 1}`)
        }

        resolve({
          rows: jsonData,
          columns
        })
      } catch (error) {
        reject(error)
      }
    }

    reader.onerror = () => reject(reader.error)
    reader.readAsArrayBuffer(file)
  })
}

export function parseCSVString(csvString: string): ParseResult {
  const workbook = XLSX.read(csvString, { type: 'string' })
  const sheetName = workbook.SheetNames[0]
  const worksheet = workbook.Sheets[sheetName]

  const jsonData = XLSX.utils.sheet_to_json<TicketRow>(worksheet, {
    defval: ''
  })

  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1')
  const columns: string[] = []

  for (let col = range.s.c; col <= range.e.c; col++) {
    const cellAddress = XLSX.utils.encode_cell({ r: range.s.r, c: col })
    const cell = worksheet[cellAddress]
    columns.push(cell ? String(cell.v) : `Column ${col + 1}`)
  }

  return { rows: jsonData, columns }
}
