import React, { useCallback, useState } from 'react'
import { parseExcelFile } from '../services/excelParser'
import { useDataStore } from '../stores/dataStore'

export function FileUpload() {
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const setData = useDataStore(state => state.setData)
  const rows = useDataStore(state => state.rows)

  const handleFile = useCallback(async (file: File) => {
    setError(null)
    try {
      const result = await parseExcelFile(file)
      setData(result.rows, result.columns)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse file')
    }
  }, [setData])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const file = e.dataTransfer.files[0]
    if (file) {
      handleFile(file)
    }
  }, [handleFile])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFile(file)
    }
  }, [handleFile])

  if (rows.length > 0) {
    return null
  }

  return (
    <div className="p-6">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`
          border-2 border-dashed rounded-lg p-12 text-center cursor-pointer
          transition-colors duration-200
          ${isDragging
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
          }
        `}
      >
        <input
          type="file"
          accept=".xlsx,.xls,.xlsm,.csv"
          onChange={handleInputChange}
          className="hidden"
          id="file-input"
        />
        <label htmlFor="file-input" className="cursor-pointer">
          <div className="text-4xl mb-4">📊</div>
          <p className="text-lg font-medium text-gray-700">
            Drop your Excel or CSV file here
          </p>
          <p className="text-sm text-gray-500 mt-2">
            or click to browse
          </p>
          <p className="text-xs text-gray-400 mt-4">
            Supported formats: .xlsx, .xlsm, .xls, .csv
          </p>
        </label>
      </div>

      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}
    </div>
  )
}
