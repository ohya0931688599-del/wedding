import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs'
import archiver from 'archiver'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const baseUploadsDir = path.join(process.cwd(), 'uploads')
    
    if (!fs.existsSync(baseUploadsDir)) {
      return new NextResponse('目前還沒有任何照片喔！', { status: 404 })
    }

    const archive = archiver('zip', {
      zlib: { level: 5 } // 平衡壓縮率與速度
    })

    const stream = new ReadableStream({
      start(controller) {
        archive.on('data', (chunk) => controller.enqueue(chunk))
        archive.on('end', () => controller.close())
        archive.on('error', (err) => controller.error(err))
      }
    })

    archive.directory(baseUploadsDir, false)
    archive.finalize()

    const now = new Date()
    const dateStr = `${now.getFullYear()}${(now.getMonth()+1).toString().padStart(2,'0')}${now.getDate().toString().padStart(2,'0')}`

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="wedding_photos_${dateStr}.zip"`
      }
    })
  } catch (error) {
    console.error('Download API Error:', error)
    return new NextResponse('Internal server error', { status: 500 })
  }
}
