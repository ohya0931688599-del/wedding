import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const filename = `puzzle_${Date.now()}.jpg`
    const uploadDir = path.join(process.cwd(), 'uploads')
    
    // Ensure upload dir exists
    try {
      await mkdir(uploadDir, { recursive: true })
    } catch (e) {
      // Ignore
    }
    
    const filePath = path.join(uploadDir, filename)
    await writeFile(filePath, buffer)
    
    const imageUrl = `/api/images/${filename}`
    
    return NextResponse.json({ success: true, url: imageUrl })

  } catch (error: any) {
    console.error("Admin Upload Error:", error)
    return NextResponse.json({ error: error.message || 'Upload failed' }, { status: 500 })
  }
}
