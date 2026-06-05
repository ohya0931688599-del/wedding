import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

export async function GET(req: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY is not set in environment variables.' })
    }

    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`)
    const data = await res.json()
    
    return NextResponse.json({ success: true, models: data })
  } catch (error: any) {
    console.error("Test AI Error:", error)
    return NextResponse.json({ 
      success: false, 
      errorName: error.name, 
      errorMessage: error.message,
      stack: error.stack 
    })
  }
}
