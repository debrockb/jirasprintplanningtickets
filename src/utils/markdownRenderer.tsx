import React from 'react'

/**
 * Simple markdown renderer for field values
 * Supports: headers (h1-h3, #-###), bold (*text* or **text**), bullet points, line breaks
 */
export function renderMarkdown(text: string): React.ReactNode {
  if (!text || typeof text !== 'string') return text

  // Split by lines first
  const lines = text.split('\n')

  const elements: React.ReactNode[] = []

  lines.forEach((line, lineIndex) => {
    const trimmed = line.trim()

    // Check for headers (h1. h2. h3. or # ## ###)
    if (/^h1\.\s*/i.test(trimmed)) {
      elements.push(
        <div key={lineIndex} className="font-bold text-lg mt-2 mb-1">
          {renderInlineFormatting(trimmed.replace(/^h1\.\s*/i, ''))}
        </div>
      )
      return
    }
    if (/^h2\.\s*/i.test(trimmed)) {
      elements.push(
        <div key={lineIndex} className="font-bold text-base mt-2 mb-1">
          {renderInlineFormatting(trimmed.replace(/^h2\.\s*/i, ''))}
        </div>
      )
      return
    }
    if (/^h3\.\s*/i.test(trimmed)) {
      elements.push(
        <div key={lineIndex} className="font-semibold mt-1 mb-0.5">
          {renderInlineFormatting(trimmed.replace(/^h3\.\s*/i, ''))}
        </div>
      )
      return
    }

    // Markdown style headers
    if (/^###\s+/.test(trimmed)) {
      elements.push(
        <div key={lineIndex} className="font-semibold mt-1 mb-0.5">
          {renderInlineFormatting(trimmed.replace(/^###\s+/, ''))}
        </div>
      )
      return
    }
    if (/^##\s+/.test(trimmed)) {
      elements.push(
        <div key={lineIndex} className="font-bold text-base mt-2 mb-1">
          {renderInlineFormatting(trimmed.replace(/^##\s+/, ''))}
        </div>
      )
      return
    }
    if (/^#\s+/.test(trimmed)) {
      elements.push(
        <div key={lineIndex} className="font-bold text-lg mt-2 mb-1">
          {renderInlineFormatting(trimmed.replace(/^#\s+/, ''))}
        </div>
      )
      return
    }

    // Bullet points (- or *)
    if (/^[-*]\s+/.test(trimmed)) {
      elements.push(
        <div key={lineIndex} className="flex gap-1">
          <span className="flex-shrink-0">•</span>
          <span>{renderInlineFormatting(trimmed.replace(/^[-*]\s+/, ''))}</span>
        </div>
      )
      return
    }

    // Numbered lists
    if (/^\d+\.\s+/.test(trimmed)) {
      const match = trimmed.match(/^(\d+)\.\s+(.*)/)
      if (match) {
        elements.push(
          <div key={lineIndex} className="flex gap-1">
            <span className="flex-shrink-0">{match[1]}.</span>
            <span>{renderInlineFormatting(match[2])}</span>
          </div>
        )
        return
      }
    }

    // Empty line = spacing
    if (trimmed === '') {
      elements.push(<div key={lineIndex} className="h-1" />)
      return
    }

    // Regular text with inline formatting
    elements.push(
      <div key={lineIndex}>
        {renderInlineFormatting(line)}
      </div>
    )
  })

  return <>{elements}</>
}

/**
 * Render inline formatting: bold (*text* or **text**)
 */
function renderInlineFormatting(text: string): React.ReactNode {
  if (!text) return text

  const parts: React.ReactNode[] = []
  let remaining = text
  let keyIndex = 0

  // Process bold markers (**text** or *text*)
  while (remaining.length > 0) {
    // Try double asterisk first
    const doubleMatch = remaining.match(/\*\*([^*]+)\*\*/)
    // For single asterisk, avoid matching inside double asterisks
    const singleMatch = remaining.match(/(?:^|[^*])\*([^*]+)\*(?:[^*]|$)/)

    let match: RegExpMatchArray | null = null
    let matchOffset = 0

    if (doubleMatch && singleMatch) {
      // Use whichever comes first
      const doubleIdx = doubleMatch.index ?? Infinity
      // Single match may have a leading char, adjust index
      const singleIdx = (singleMatch.index ?? Infinity) + (singleMatch[0].startsWith('*') ? 0 : 1)

      if (doubleIdx <= singleIdx) {
        match = doubleMatch
      } else {
        match = singleMatch
        matchOffset = singleMatch[0].startsWith('*') ? 0 : 1
      }
    } else if (doubleMatch) {
      match = doubleMatch
    } else if (singleMatch) {
      match = singleMatch
      matchOffset = singleMatch[0].startsWith('*') ? 0 : 1
    }

    if (match && match.index !== undefined) {
      const actualIndex = match.index + matchOffset

      // Add text before match
      if (actualIndex > 0) {
        parts.push(remaining.substring(0, actualIndex))
      }

      // Add bold text
      parts.push(
        <strong key={keyIndex++} className="font-bold">
          {match[1]}
        </strong>
      )

      // Calculate where to continue from
      const matchLength = match === doubleMatch
        ? match[0].length
        : match[1].length + 2 // *content*
      remaining = remaining.substring(actualIndex + matchLength)
    } else {
      // No more matches
      parts.push(remaining)
      break
    }
  }

  return parts.length === 1 && typeof parts[0] === 'string' ? parts[0] : <>{parts}</>
}
