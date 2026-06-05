import { GoogleGenerativeAI } from '@google/generative-ai'
import fs from 'fs'

const apiKey = process.env.GEMINI_API_KEY || ''
const genAI = new GoogleGenerativeAI(apiKey)

function fileToGenerativePart(path: string, mimeType: string) {
  return {
    inlineData: {
      data: Buffer.from(fs.readFileSync(path)).toString("base64"),
      mimeType
    },
  }
}

export async function analyzeEmergencyPhoto(filePath: string, mode: number) {
  if (!apiKey) {
    // Simulated AI for testing if API key is not provided
    return {
      score: Math.floor(Math.random() * 50) + 50,
      comment: mode === 1 ? "這張照片拍得很有特色！新郎看起來非常帥氣（雖然可能是燈光的關係😜）。" : "天啊！這對新人太登對了，根本是天作之合！"
    }
  }

  try {
    // Using gemini-2.5-flash which is the current fast model
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" })

    let prompt = ''
    if (mode === 1) {
      prompt = `
      這是一場婚禮的緊急任務，賓客需要拍下「新郎」最帥氣的照片。
      請你扮演一個幽默、風趣、眼光極度嚴格且毒舌的婚禮攝影大師。
      
      【重要判斷規則】：
      1. 【非人類/截圖】：如果照片中根本沒出現人（例如螢幕截圖、風景照、物品），請給予極低分（0-30分），並搞笑吐槽（例如：「欸等等，新郎長得像一張截圖嗎？想呼弄我啊！」）。
      2. 【性別錯亂/大明星】：我們在找的是「新郎」。如果照片裡明顯是知名女星、或是女生，請給出不及格分數（30-50分），並吐槽：「等等，這位仙女是誰？我們要找的是穿西裝的新郎啊！」
      3. 【帥氣度與攝影技巧】：如果照片裡是男生，請嚴格根據以下標準評分：
         - 穿著西裝、表情自信、笑容燦爛、構圖好看：給予高分（80-100分），並大力稱讚。
         - 燈光昏暗、手震模糊、角度奇怪（例如死亡仰角）、表情呆滯或閉眼睛：請給予較低分數（40-70分），並發揮毒舌功力搞笑地批評攝影師的技術或新郎的表情。
      
      【極度重要】：評語字數請控制在 50 個字以內！
      
      請根據上述規則給出 0~100 不等的分數，並務必以 JSON 格式回傳，格式如下：
      {
        "score": 95,
        "comment": "新郎這個回眸一笑簡直迷倒眾生，恭喜新娘！"
      }
      `
    } else {
      prompt = `
      這是一場婚禮的緊急任務，賓客需要拍下「新郎與新娘一起的甜蜜合照」。
      請你扮演一個幽默、風趣、眼光極度嚴格且毒舌的婚禮攝影大師。
      
      【重要判斷規則】：
      1. 【非人類/截圖】：如果照片中根本沒出現人（例如螢幕截圖、風景照、物品），請給予極低分（0-30分），並搞笑吐槽（例如：「你們的合照是一道菜嗎？別想呼弄我！」）。
      2. 【缺少主角】：如果照片裡只有一個人（只有新郎或只有新娘），或者拍成別的賓客，請給出不及格分數（30-50分），並吐槽：「等等，另一半去哪了？逃婚了嗎？說好的合照呢！」
      3. 【甜蜜度與攝影技巧】：如果照片裡確實有新郎與新娘兩人，請嚴格根據以下標準評分：
         - 兩人表情幸福、互動甜蜜、笑容燦爛、構圖好看：給予高分（80-100分），並大力稱讚他們的登對。
         - 燈光昏暗、手震模糊、某一方被卡掉半張臉、表情呆滯或閉眼睛：請給予較低分數（40-70分），並發揮毒舌功力搞笑地批評攝影師的技術或他們的表情。
      
      【極度重要】：評語字數請控制在 50 個字以內！
      
      請根據上述規則給出 0~100 不等的分數，並務必以 JSON 格式回傳，格式如下：
      {
        "score": 95,
        "comment": "天啊！這畫面的粉紅泡泡都要滿出來了，完美捕捉！"
      }
      `
    }

    // Determine mimeType from extension
    const ext = filePath.split('.').pop()?.toLowerCase()
    let mimeType = 'image/jpeg'
    if (ext === 'png') mimeType = 'image/png'
    else if (ext === 'webp') mimeType = 'image/webp'

    const imagePart = fileToGenerativePart(filePath, mimeType)

    let retries = 2;
    let text = '';
    
    while (retries >= 0) {
      try {
        const result = await model.generateContent([prompt, imagePart])
        const response = await result.response
        text = response.text()
        break; // Success
      } catch (err: any) {
        if (retries === 0) throw err;
        console.warn(`AI API Error, retrying... (${retries} retries left):`, err.message);
        retries--;
        await new Promise(resolve => setTimeout(resolve, 1500)); // Wait 1.5s before retry
      }
    }
    
    // Clean up markdown json block if any
    text = text.replace(/```json/g, '').replace(/```/g, '').trim()
    let parsed: any = { score: 50, comment: "照片太有個性了，我暫時詞窮！" }
    try {
      parsed = JSON.parse(text)
    } catch (parseErr) {
      console.error("Failed to parse AI response JSON:", text);
    }
    
    return {
      score: parsed.score || 50,
      comment: parsed.comment || "太棒了！"
    }

  } catch (error) {
    console.error("AI Analysis Error:", error)
    return {
      score: 50,
      comment: "AI 評審被你們的光芒閃瞎了，暫時無法評分！"
    }
  }
}
