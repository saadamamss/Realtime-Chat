import { ref } from 'vue'

export const useCloudinary = () => {
  const uploading = ref(false)
  const error = ref(null)
  
  // Upload file to Cloudinary
  const uploadFile = async (file: File, userId: string) => {
    try {
      uploading.value = true
      error.value = null
      
      const formData = new FormData()
      formData.append('file', file)
      formData.append('upload_preset', 'chat-app-upload') // Create this in Cloudinary dashboard
      formData.append('folder', `chat-app/${userId}`)
      formData.append('cloud_name', process.env.CLOUDINARY_CLOUD_NAME)
      
      const response = await fetch(`https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/upload`, {
        method: 'POST',
        body: formData
      })
      
      if (!response.ok) {
        throw new Error('Upload failed')
      }
      
      const data = await response.json()
      return data.secure_url
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      uploading.value = false
    }
  }
  
  // Get file preview URL
  const getFileUrl = (url: string, transformations = {}) => {
    if (!url) return ''
    
    // Extract public ID from Cloudinary URL
    const cloudinaryUrl = new URL(url)
    const pathParts = cloudinaryUrl.pathname.split('/')
    const publicId = pathParts[pathParts.length - 1].split('.')[0]
    
    // Build transformed URL
    const baseUrl = `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload/`
    const transformationString = Object.entries(transformations)
      .map(([key, value]) => `${key}_${value}`)
      .join(',')
    
    return `${baseUrl}${transformationString}/${publicId}.jpg`
  }
  
  // Validate file before upload
  const validateFile = (file: File): { valid: boolean; error?: string } => {
    const maxSize = 10 * 1024 * 1024 // 10MB
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'video/mp4',
      'video/webm',
      'video/quicktime',
      'audio/mpeg',
      'audio/wav',
      'application/pdf',
      'application/zip',
      'application/x-rar-compressed'
    ]
    
    if (file.size > maxSize) {
      return {
        valid: false,
        error: 'File size must be less than 10MB'
      }
    }
    
    if (!allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: 'File type not supported'
      }
    }
    
    return { valid: true }
  }
  
  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (!bytes) return ''
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    if (bytes === 0) return '0 Bytes'
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
  }
  
  // Get file icon based on type
  const getFileIcon = (fileType: string): string => {
    if (fileType.startsWith('image/')) return '🖼️'
    if (fileType.startsWith('video/')) return '🎬'
    if (fileType.startsWith('audio/')) return '🎵'
    if (fileType === 'application/pdf') return '📄'
    if (fileType.includes('zip') || fileType.includes('rar')) return '📦'
    return '📎'
  }
  
  return {
    uploading,
    error,
    uploadFile,
    getFileUrl,
    validateFile,
    formatFileSize,
    getFileIcon
  }
}