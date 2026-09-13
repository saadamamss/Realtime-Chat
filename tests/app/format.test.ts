import { describe, it, expect } from 'vitest'
import { formatFileSize, formatDuration, chatDateFormat, formatTime } from '../../app/utils/format'

describe('format utils', () => {
  describe('formatFileSize', () => {
    it('formats bytes correctly', () => {
      expect(formatFileSize(0)).toBe('0 Bytes')
      expect(formatFileSize(100)).toBe('100 Bytes')
      expect(formatFileSize(1024)).toBe('1 KB')
      expect(formatFileSize(1048576)).toBe('1 MB')
      expect(formatFileSize(1073741824)).toBe('1 GB')
    })

    it('formats with decimals', () => {
      expect(formatFileSize(1536)).toBe('1.5 KB')
      expect(formatFileSize(2621440)).toBe('2.5 MB')
    })
  })

  describe('formatDuration', () => {
    it('formats seconds to mm:ss', () => {
      expect(formatDuration(0)).toBe('0:00')
      expect(formatDuration(30)).toBe('0:30')
      expect(formatDuration(60)).toBe('1:00')
      expect(formatDuration(90)).toBe('1:30')
      expect(formatDuration(3661)).toBe('61:01')
    })
  })

  describe('chatDateFormat', () => {
    it('returns Today for today', () => {
      const today = new Date().toISOString()
      expect(chatDateFormat(today)).toBe('Today')
    })

    it('returns Yesterday for yesterday', () => {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      expect(chatDateFormat(yesterday.toISOString())).toBe('Yesterday')
    })

    it('returns formatted date for older dates', () => {
      const result = chatDateFormat('2024-01-15T10:30:00Z')
      expect(result).toMatch(/Jan 15, 2024/)
    })
  })

  describe('formatTime', () => {
    it('formats time correctly', () => {
      const result = formatTime('2024-01-15T14:30:00Z')
      expect(result).toMatch(/\d{1,2}:\d{2}/)
    })
  })
})
