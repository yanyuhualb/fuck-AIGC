import { type NextRequest, NextResponse } from "next/server"

// 用于调试API请求和响应的端点
export async function POST(request: NextRequest) {
  try {
    // 获取请求体
    const requestBody = await request.json()
    const { provider, endpoint, apiKey, modelId, text } = requestBody

    if (!provider || !endpoint || !apiKey || !modelId || !text) {
      return NextResponse.json({ error: "缺少必要参数" }, { status: 400 })
    }

    console.log(`调试请求: 提供商=${provider}, 模型=${modelId}, 文本长度=${text.length}`)

    let response
    let result

    // 根据提供商发送不同的请求
    if (provider === "gemini") {
      const apiVersion = "v1"
      const apiUrl = `${endpoint}/${apiVersion}/models/${modelId}:generateContent?key=${apiKey}`

      console.log(`调试Gemini API: ${endpoint}/${apiVersion}/models/${modelId}:generateContent`)

      // 简化的请求体，用于测试
      const requestData = {
        contents: [
          {
            role: "user",
            parts: [{ text: "Hello, please respond with a simple 'Hello, world!'" }],
          },
        ],
        generationConfig: {
          temperature: 0.7,
        },
      }

      response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestData),
      })
    } else if (provider === "openai") {
      const apiUrl = `${endpoint}/v1/chat/completions`

      console.log(`调试OpenAI API: ${apiUrl}`)

      // 简化的请求体，用于测试
      const requestData = {
        model: modelId,
        messages: [
          {
            role: "user",
            content: "Hello, please respond with a simple 'Hello, world!'",
          },
        ],
        temperature: 0.7,
      }

      response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(requestData),
      })
    } else {
      return NextResponse.json({ error: "不支持的API提供商" }, { status: 400 })
    }

    // 获取响应状态和头信息
    const status = response.status
    const headers = Object.fromEntries(response.headers.entries())
    const contentType = response.headers.get("content-type") || ""

    // 获取响应文本
    const responseText = await response.text()

    // 尝试解析JSON
    let responseJson = null
    try {
      if (
        responseText &&
        (contentType.includes("json") || responseText.startsWith("{") || responseText.startsWith("["))
      ) {
        responseJson = JSON.parse(responseText)
      }
    } catch (error) {
      console.error("无法解析响应JSON:", error)
    }

    // 返回调试信息
    return NextResponse.json({
      debug: {
        request: {
          provider,
          endpoint,
          modelId,
          textLength: text.length,
        },
        response: {
          status,
          headers,
          contentType,
          responseText: responseText.substring(0, 1000), // 限制长度
          responseJson,
          isJson: !!responseJson,
        },
      },
    })
  } catch (error) {
    console.error("调试API错误:", error)
    return NextResponse.json(
      {
        error: error.message || "调试失败",
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 },
    )
  }
}
