import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs/promises'

export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  try {
    const { path: imagePathArr } = await params
    const imagePath = imagePathArr.join('/')
    
    const isRender = process.env.RENDER === 'true'
    const baseUploadsDir = isRender ? '/data/uploads' : path.join(process.cwd(), 'data', 'uploads')
    
    // Prevent directory traversal attacks
    const normalizedPath = path.normalize(imagePath).replace(/^(\.\.(\/|\\|$))+/, '')
    const fullPath = path.join(baseUploadsDir, normalizedPath)
    
    // Ensure the requested file is inside baseUploadsDir
    if (!fullPath.startsWith(path.resolve(baseUploadsDir))) {
      return new NextResponse('Forbidden', { status: 403 })
    }

    try {
      const fileBuffer = await fs.readFile(fullPath)
      
      const ext = fullPath.split('.').pop()?.toLowerCase() || 'jpg'
      let mimeType = 'image/jpeg'
      if (ext === 'png') mimeType = 'image/png'
      else if (ext === 'webp') mimeType = 'image/webp'
      else if (ext === 'gif') mimeType = 'image/gif'

      return new NextResponse(fileBuffer, {
        headers: {
          'Content-Type': mimeType,
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      })
    } catch (err) {
      return new NextResponse('Image not found', { status: 404 })
    }
  } catch (error) {
    console.error('Image Serve Error:', error)
    return new NextResponse('Internal server error', { status: 500 })
  }
}
