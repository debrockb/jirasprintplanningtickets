import React, { useCallback, useState } from 'react'
import { loadWorkbook, parseSheet, WorkbookInfo } from '../services/excelParser'
import { useDataStore } from '../stores/dataStore'

export function FileUpload() {
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [workbookInfo, setWorkbookInfo] = useState<WorkbookInfo | null>(null)
  const [selectedSheet, setSelectedSheet] = useState<string>('')
  const setData = useDataStore(state => state.setData)
  const rows = useDataStore(state => state.rows)

  const handleFile = useCallback(async (file: File) => {
    setError(null)
    setWorkbookInfo(null)
    setSelectedSheet('')

    try {
      const info = await loadWorkbook(file)

      if (info.sheetNames.length === 1) {
        // Single sheet - load directly
        const result = parseSheet(info.workbook, info.sheetNames[0])
        setData(result.rows, result.columns)
      } else {
        // Multiple sheets - show selector
        setWorkbookInfo(info)
        setSelectedSheet(info.sheetNames[0])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse file')
    }
  }, [setData])

  const handleLoadSheet = useCallback(() => {
    if (!workbookInfo || !selectedSheet) return

    try {
      const result = parseSheet(workbookInfo.workbook, selectedSheet)
      setData(result.rows, result.columns)
      setWorkbookInfo(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse sheet')
    }
  }, [workbookInfo, selectedSheet, setData])

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

  const handleCancel = useCallback(() => {
    setWorkbookInfo(null)
    setSelectedSheet('')
  }, [])

  if (rows.length > 0) {
    return null
  }

  // Sheet selector modal
  if (workbookInfo) {
    return (
      <div className="p-6">
        <div className="bg-white rounded-lg shadow-lg p-6 max-w-md mx-auto">
          <h2 className="text-lg font-semibold mb-4">Select a Sheet</h2>
          <p className="text-sm text-gray-600 mb-4">
            This file contains {workbookInfo.sheetNames.length} sheets. Please select one to load:
          </p>

          <div className="space-y-2 mb-6 max-h-60 overflow-y-auto">
            {workbookInfo.sheetNames.map((name) => (
              <label
                key={name}
                className={`
                  flex items-center p-3 rounded border cursor-pointer
                  ${selectedSheet === name
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                  }
                `}
              >
                <input
                  type="radio"
                  name="sheet"
                  value={name}
                  checked={selectedSheet === name}
                  onChange={(e) => setSelectedSheet(e.target.value)}
                  className="mr-3"
                />
                <span className="font-medium">{name}</span>
              </label>
            ))}
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleCancel}
              className="flex-1 px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleLoadSheet}
              disabled={!selectedSheet}
              className="flex-1 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            >
              Load Sheet
            </button>
          </div>
        </div>
      </div>
    )
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
