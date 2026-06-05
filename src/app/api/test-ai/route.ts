import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

export async function GET(req: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY is not set in environment variables.' })
    }

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })

    const prompt = "Please reply with 'Hello, API is working!' if you can read this."
    
    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()

    return NextResponse.json({ success: true, message: text, apiKeyLength: apiKey.length })
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
