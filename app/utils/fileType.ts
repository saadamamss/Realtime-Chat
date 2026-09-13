export const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp']
export const VIDEO_EXTENSIONS = ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv']
export const AUDIO_EXTENSIONS = ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac']

export const isImageFile = (ext: string | undefined) => ext ? IMAGE_EXTENSIONS.includes(ext.toLowerCase()) : false
export const isVideoFile = (ext: string | undefined) => ext ? VIDEO_EXTENSIONS.includes(ext.toLowerCase()) : false
export const isAudioFile = (ext: string | undefined) => ext ? AUDIO_EXTENSIONS.includes(ext.toLowerCase()) : false

export const getFileIcon = (ext: string | undefined) => {
  const iconMap: Record<string, string> = {
    pdf: 'ph-file-pdf', doc: 'ph-file-text', docx: 'ph-file-text',
    xls: 'ph-file-spreadsheet', xlsx: 'ph-file-spreadsheet',
    ppt: 'ph-file-presentation', pptx: 'ph-file-presentation',
    jpg: 'ph-image', webp: 'ph-image', jpeg: 'ph-image', png: 'ph-image',
    gif: 'ph-image', svg: 'ph-image', bmp: 'ph-image',
    mp3: 'ph-music-note', wav: 'ph-music-note', ogg: 'ph-music-note',
    m4a: 'ph-music-note', aac: 'ph-music-note', flac: 'ph-music-note',
    mp4: 'ph-video', avi: 'ph-video', mov: 'ph-video',
    wmv: 'ph-video', webm: 'ph-video', mkv: 'ph-video',
    zip: 'ph-archive', rar: 'ph-archive',
  }
  return (ext && iconMap[ext.toLowerCase()]) || 'ph-file'
}

export const getFileExtension = (filename: string) => filename.split('.').pop()?.toLowerCase() || ''

export const getFileName = (filePath: string) => filePath.split('/').pop() || 'file'
