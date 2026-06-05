const { GoogleGenerativeAI } = require('@google/generative-ai')

async function main() {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" })
    const result = await model.generateContent("Hello")
    console.log("Response:", result.response.text())
  } catch (error) {
    console.error("Pro Error:", error.message)
  }

  try {
    const model2 = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })
    const result2 = await model2.generateContent("Hello")
    console.log("Response Flash:", result2.response.text())
  } catch (error) {
    console.error("Flash Error:", error.message)
  }
}

main()
