import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs/promises'
import { analyzeEmergencyPhoto } from '@/lib/ai'
import prisma from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    const token = formData.get('token') as string
    const modeStr = formData.get('mode') as string
    const mode = parseInt(modeStr) || 1

    if (!file || !token) {
      return NextResponse.json({ error: 'Missing file or token' }, { status: 400 })
    }

    const table = await prisma.table.findUnique({ where: { token } })
    if (!table) {
      return NextResponse.json({ error: 'Table not found' }, { status: 404 })
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    let publicUrl = ''
    let filePathForAI = ''

    // Render Persistent Disk mount path is /data
    const isRender = process.env.RENDER === 'true';
    const baseUploadsDir = isRender ? '/data/uploads' : path.join(process.cwd(), 'data', 'uploads');
    
    try { await fs.access(baseUploadsDir) } catch { await fs.mkdir(baseUploadsDir, { recursive: true }) }
    
    const tableDir = path.join(baseUploadsDir, `table_${table.id}`)
    try { await fs.access(tableDir) } catch { await fs.mkdir(tableDir, { recursive: true }) }
    
    const ext = file.name.split('.').pop() || 'jpg'
    const fileName = `emergency_${Date.now()}.${ext}`
    const filePath = path.join(tableDir, fileName)
    
    await fs.writeFile(filePath, buffer)
    
    // Use custom API route to serve image safely
    publicUrl = `/api/images/table_${table.id}/${fileName}`
    filePathForAI = filePath

    // Analyze with AI
    const aiResult = await analyzeEmergencyPhoto(filePathForAI, mode)

    // Save submission to database
    await prisma.emergencySubmission.create({
      data: {
        tableId: table.id,
        imageUrl: publicUrl,
        score: aiResult.score,
        comment: aiResult.comment,
        mode: mode
      }
    })

    return NextResponse.json({ success: true, aiResult })
  } catch (error) {
    console.error('Upload Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
