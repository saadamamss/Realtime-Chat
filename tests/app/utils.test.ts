import { describe, it, expect } from 'vitest'
import {
  isImageFile,
  isVideoFile,
  isAudioFile,
  getFileIcon,
  getFileExtension,
  getFileName,
} from '../../app/utils/fileType'

describe('fileType utils', () => {
  describe('isImageFile', () => {
    it('returns true for image extensions', () => {
      expect(isImageFile('jpg')).toBe(true)
      expect(isImageFile('png')).toBe(true)
      expect(isImageFile('GIF')).toBe(true)
      expect(isImageFile('webp')).toBe(true)
      expect(isImageFile('svg')).toBe(true)
    })

    it('returns false for non-image extensions', () => {
      expect(isImageFile('mp4')).toBe(false)
      expect(isImageFile('txt')).toBe(false)
      expect(isImageFile(undefined)).toBe(false)
    })
  })

  describe('isVideoFile', () => {
    it('returns true for video extensions', () => {
      expect(isVideoFile('mp4')).toBe(true)
      expect(isVideoFile('MOV')).toBe(true)
      expect(isVideoFile('webm')).toBe(true)
    })

    it('returns false for non-video extensions', () => {
      expect(isVideoFile('jpg')).toBe(false)
      expect(isVideoFile(undefined)).toBe(false)
    })
  })

  describe('isAudioFile', () => {
    it('returns true for audio extensions', () => {
      expect(isAudioFile('mp3')).toBe(true)
      expect(isAudioFile('WAV')).toBe(true)
      expect(isAudioFile('flac')).toBe(true)
    })

    it('returns false for non-audio extensions', () => {
      expect(isAudioFile('jpg')).toBe(false)
      expect(isAudioFile(undefined)).toBe(false)
    })
  })

  describe('getFileIcon', () => {
    it('returns correct icons for known types', () => {
      expect(getFileIcon('pdf')).toBe('ph-file-pdf')
      expect(getFileIcon('docx')).toBe('ph-file-text')
      expect(getFileIcon('xlsx')).toBe('ph-file-spreadsheet')
      expect(getFileIcon('mp3')).toBe('ph-music-note')
      expect(getFileIcon('mp4')).toBe('ph-video')
      expect(getFileIcon('zip')).toBe('ph-archive')
    })

    it('returns default icon for unknown types', () => {
      expect(getFileIcon('xyz')).toBe('ph-file')
      expect(getFileIcon(undefined)).toBe('ph-file')
    })

    it('is case-insensitive', () => {
      expect(getFileIcon('PDF')).toBe('ph-file-pdf')
      expect(getFileIcon('DOCX')).toBe('ph-file-text')
    })
  })

  describe('getFileExtension', () => {
    it('extracts extension from filename', () => {
      expect(getFileExtension('photo.jpg')).toBe('jpg')
      expect(getFileExtension('archive.tar.gz')).toBe('gz')
      expect(getFileExtension('noext')).toBe('noext')
    })
  })

  describe('getFileName', () => {
    it('extracts filename from path', () => {
      expect(getFileName('/uploads/file.pdf')).toBe('file.pdf')
      expect(getFileName('file.txt')).toBe('file.txt')
    })

    it('returns default for empty path', () => {
      expect(getFileName('')).toBe('file')
    })
  })
})
