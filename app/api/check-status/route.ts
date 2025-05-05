import { NextResponse } from "next/server"

// 简单的API状态检查
export async function GET() {
  const status = {
    openai: "unknown",
    gemini: "unknown",
  }

  // 检查OpenAI API
  if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.length > 20) {
    try {
      const openaiEndpoint = process.env.OPENAI_API_ENDPOINT || "https://api.openai.com"
      const response = await fetch(`${openaiEndpoint}/v1/models`, {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        method: "GET",
      })

      status.openai = response.ok ? "available" : "unavailable"
    } catch (error) {
      console.error("OpenAI API状态检查失败:", error)
      status.openai = "unavailable"
    }
  }

  // 检查Gemini API
  if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.length > 20) {
    try {
      const geminiEndpoint = process.env.GEMINI_API_ENDPOINT || "https://generativelanguage.googleapis.com"
      const geminiModelId = process.env.GEMINI_MODEL_ID || "gemini-2.5-flash-preview-04-17"
      const apiVersion = "v1"

      const response = await fetch(`${geminiEndpoint}/${apiVersion}/models?key=${process.env.GEMINI_API_KEY}`, {
        method: "GET",
      })

      status.gemini = response.ok ? "available" : "unavailable"
    } catch (error) {
      console.error("Gemini API状态检查失败:", error)
      status.gemini = "unavailable"
    }
  }

  return NextResponse.json({ status })
}
