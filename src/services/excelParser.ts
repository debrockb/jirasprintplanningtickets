import * as XLSX from 'xlsx'
import { TicketRow } from '../types'

export interface ParseResult {
  rows: TicketRow[]
  columns: string[]
}

export interface WorkbookInfo {
  sheetNames: string[]
  workbook: XLSX.WorkBook
}

export async function loadWorkbook(file: File): Promise<WorkbookInfo> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const data = e.target?.result
        const workbook = XLSX.read(data, { type: 'array' })

        resolve({
          sheetNames: workbook.SheetNames,
          workbook
        })
      } catch (error) {
        reject(error)
      }
    }

    reader.onerror = () => reject(reader.error)
    reader.readAsArrayBuffer(file)
  })
}

export function parseSheet(workbook: XLSX.WorkBook, sheetName: string): ParseResult {
  const worksheet = workbook.Sheets[sheetName]

  if (!worksheet) {
    throw new Error(`Sheet "${sheetName}" not found`)
  }

  // Convert to JSON with headers
  const jsonData = XLSX.utils.sheet_to_json<TicketRow>(worksheet, {
    defval: ''
  })

  // Extract column names from first row
  const ref = worksheet['!ref']
  if (!ref) {
    return { rows: [], columns: [] }
  }

  const range = XLSX.utils.decode_range(ref)
  const columns: string[] = []

  for (let col = range.s.c; col <= range.e.c; col++) {
    const cellAddress = XLSX.utils.encode_cell({ r: range.s.r, c: col })
    const cell = worksheet[cellAddress]
    columns.push(cell ? String(cell.v) : `Column ${col + 1}`)
  }

  return {
    rows: jsonData,
    columns
  }
}

// Legacy function for backward compatibility
export async function parseExcelFile(file: File): Promise<ParseResult> {
  const { workbook, sheetNames } = await loadWorkbook(file)
  return parseSheet(workbook, sheetNames[0])
}

export function parseCSVString(csvString: string): ParseResult {
  const workbook = XLSX.read(csvString, { type: 'string' })
  const sheetName = workbook.SheetNames[0]
  return parseSheet(workbook, sheetName)
}
