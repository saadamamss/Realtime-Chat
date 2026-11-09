import { v2 as cloudinary } from 'cloudinary'

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || '',
  api_key: process.env.CLOUDINARY_API_KEY || '',
  api_secret: process.env.CLOUDINARY_API_SECRET || '',
  secure: true,
})

export default cloudinary

// Cloudinary file upload service
export class CloudinaryService {
  private static instance: CloudinaryService
  private cloudinary = cloudinary

  static getInstance(): CloudinaryService {
    if (!CloudinaryService.instance) {
      CloudinaryService.instance = new CloudinaryService()
    }
    return CloudinaryService.instance
  }

  // Upload a buffer to Cloudinary (resource_type auto covers images, video,
  // audio and raw). Returns the permanent secure_url of the asset.
  async uploadFile(file: Buffer, filename: string, userId: string): Promise<string> {
    try {
      // Extract file extension (no leading dot)
      const ext = filename.split('.').pop()?.toLowerCase() || ''
      this.validateFile(file, ext)
      
      // Data-URI upload works for any buffer without temp files (verified
      // pattern: cloudinary.uploader.upload in test-with-image.mjs)
      const result = await this.cloudinary.uploader.upload(
        `data:application/octet-stream;base64,${file.toString('base64')}`,
        {
          folder: `chat-app/${userId}`,
          public_id: `${Date.now()}_${filename.replace(/[^\w.-]/g, '_')}`,
          resource_type: 'auto',
        }
      )
      return result.secure_url
    } catch (error) {
      console.error('Error uploading to Cloudinary:', error)
      throw error
    }
  }

  // Delete file from Cloudinary (needs the public id, not the URL)
  async deleteFile(publicId: string): Promise<void> {
    try {
      await this.cloudinary.uploader.destroy(publicId)
    } catch (error) {
      console.error('Error deleting from Cloudinary:', error)
      throw error
    }
  }

  // Get file info
  async getFileInfo(publicId: string): Promise<any> {
    try {
      const result = await this.cloudinary.api.resource(publicId)
      return result
    } catch (error) {
      console.error('Error getting file info:', error)
      throw error
    }
  }

  // List files in folder
  async listFiles(folder: string): Promise<any[]> {
    try {
      const result = await this.cloudinary.api.resources({
        type: 'upload',
        prefix: folder
      })
      return result.resources
    } catch (error) {
      console.error('Error listing files:', error)
      throw error
    }
  }

  // Validate file type and size
  private validateFile(buffer: Buffer, ext: string): void {
    const ALLOWED_EXTENSIONS = new Set([
      'jpg', 'jpeg', 'png', 'gif', 'webp',
      'mp4', 'webm', 'mov',
      'mp3', 'wav', 'ogg', 'm4a',
      'pdf',
      'zip', 'rar'
    ])

    const MAGIC_BYTES: Record<string, Buffer[]> = {
      '.jpg': [Buffer.from([0xFF, 0xD8, 0xFF])],
      '.jpeg': [Buffer.from([0xFF, 0xD8, 0xFF])],
      '.png': [Buffer.from([0x89, 0x50, 0x4E, 0x47])],
      '.gif': [Buffer.from('GIF87a'), Buffer.from('GIF89a')],
      '.webp': [Buffer.from('RIFF')],
      '.pdf': [Buffer.from('%PDF')],
      '.mp3': [Buffer.from('ID3'), Buffer.from([0xFF, 0xFB])],
      '.zip': [Buffer.from([0x50, 0x4B, 0x03, 0x04])],
    }

    // Check if extension is allowed
    if (!ALLOWED_EXTENSIONS.has(ext.toLowerCase())) {
      throw new Error(`File type .${ext} is not allowed`)
    }

    // Check file size limits
    const fileSize = buffer.length
    if (ext === 'mp4' || ext === 'mov' || ext === 'webm') {
      if (fileSize > 100 * 1024 * 1024) { // 100MB
        throw new Error('Video file must be less than 100MB')
      }
    } else if (ext === 'pdf' || ext === 'zip' || ext === 'rar') {
      if (fileSize > 10 * 1024 * 1024) { // 10MB
        throw new Error('Document file must be less than 10MB')
      }
    } else {
      if (fileSize > 10 * 1024 * 1024) { // 10MB
        throw new Error('Image file must be less than 10MB')
      }
    }

    // Validate file content
    const expected = MAGIC_BYTES[`.${ext}`]
    if (expected) {
      const isValid = expected.some(magic => buffer.subarray(0, magic.length).equals(magic))
      if (!isValid) {
        throw new Error('File content does not match extension')
      }
    }
  }
}

// Export singleton instance
export const cloudinaryService = CloudinaryService.getInstance()