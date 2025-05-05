import { type NextRequest, NextResponse } from "next/server"
import { getChinesePrompt, getEnglishPrompt } from "@/lib/prompts"

// 硬编码的API凭证
const API_CREDENTIALS = {
  openai: {
    endpoint: process.env.OPENAI_API_ENDPOINT || "https://api.openai.com",
    apiKey: process.env.OPENAI_API_KEY || "",
    modelId: process.env.OPENAI_MODEL_ID || "gpt-4o",
  },
  gemini: {
    // 修正Gemini API端点
    endpoint: process.env.GEMINI_API_ENDPOINT || "https://generativelanguage.googleapis.com",
    apiKey: process.env.GEMINI_API_KEY || "",
    // 更新为环境变量中设置的Gemini模型ID
    modelId: process.env.GEMINI_MODEL_ID || "gemini-2.5-flash-preview-04-17",
    // 更新备用模型列表，包含最新的模型ID
    fallbackModels: [
      "gemini-2.5-flash-preview-04-17", // 最新的预览版本
      "gemini-1.5-flash",
      "gemini-1.5-pro",
      "gemini-pro",
      "gemini-1.0-pro",
    ],
  },
}

// 设置请求超时
const FETCH_TIMEOUT = 60000 // 60秒

// 检查是否处于开发环境
const isDevelopment = process.env.NODE_ENV === "development" || process.env.VERCEL_ENV === "preview"

// 带超时的fetch函数
async function fetchWithTimeout(url: string, options: RequestInit, timeout = 180000) { // 增加到 180 秒 (3 分钟)，匹配前端超时
  const controller = new AbortController()
  const { signal } = controller

  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch(url, {
      ...options,
      signal,
    })
    clearTimeout(timeoutId)
    return response
  } catch (error) {
    clearTimeout(timeoutId)
    // Check if error is an instance of Error before accessing properties
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`请求超时 (${timeout / 1000}秒)`)
    }
    throw error
  }
}

// 开发环境的模拟响应
function getMockResponse(text: string, language: string) {
  // 简单的模拟处理逻辑
  const processedText = text
    .split("。")
    .map((sentence) => {
      if (!sentence.trim()) return sentence
      // 简单替换一些词语和添加一些冗余
      return (
        sentence
          .replace(/使用/g, "运用")
          .replace(/通过/g, "借助")
          .replace(/可以/g, "可以")
          .replace(/提高/g, "提升")
          .replace(/特点/g, "特性") + "。"
      )
    })
    .join("")

  return processedText
}

export async function POST(request: NextRequest) {
  const startTime = Date.now(); // 添加开始时间日志
  console.log(`[${new Date(startTime).toISOString()}] /api/reduce request received.`);
  // 移除调试日志

  try {
    const { text, language, provider = "openai" } = await request.json()

    if (!text) {
      return NextResponse.json({ error: "请提供论文内容" }, { status: 400 })
    }

    // 选择API提供商
    const credentials = API_CREDENTIALS[provider as keyof typeof API_CREDENTIALS]

    // 检查API密钥是否有效
    if (
      !credentials ||
      !credentials.apiKey ||
      credentials.apiKey.includes("your_")
      // 移除长度检查，适应自定义 AI 服务的非标准密钥
      // credentials.apiKey.length < 20
    ) {
      console.warn(`API凭证未正确配置: ${provider}`)

      // 在开发环境中提供模拟响应
      if (isDevelopment) {
        console.log("使用开发环境模拟响应")
        const mockResult = getMockResponse(text, language)
        return NextResponse.json({
          result: mockResult,
          _devNote: "这是开发环境的模拟响应。请在生产环境中配置有效的API密钥。",
        })
      }

      return NextResponse.json(
        {
          error: `${provider} API密钥未正确配置。请在环境变量中设置有效的API密钥。`,
          details: isDevelopment ? "API密钥格式不正确或为默认值" : undefined,
        },
        { status: 500 },
      )
    }

    // 记录API请求信息（不包含敏感信息）
    console.log(`处理请求: 提供商=${provider}, 语言=${language}, 文本长度=${text.length}`)

    let result
    if (provider === "openai") {
      result = await reduceWithOpenAI(text, language, credentials)
    } else if (provider === "gemini") {
      // Ensure the correct type is passed to reduceWithGemini
      result = await reduceWithGemini(text, language, credentials as typeof API_CREDENTIALS.gemini)
    } else {
      return NextResponse.json({ error: "不支持的API提供商" }, { status: 400 })
    }

    const endTime = Date.now(); // 添加结束时间日志
    const duration = (endTime - startTime) / 1000; // 计算持续时间（秒）
    console.log(`[${new Date(endTime).toISOString()}] /api/reduce request processed successfully in ${duration} seconds.`);

    return NextResponse.json({ result })
  } catch (error) {
    const endTime = Date.now(); // 添加错误情况下的结束时间日志
    const duration = (endTime - startTime) / 1000;
    console.error(`[${new Date(endTime).toISOString()}] Error processing paper after ${duration} seconds:`, error);

    // 提取更友好的错误消息
    let errorMessage = "处理失败，请稍后再试"
    if (error instanceof Error) {
        errorMessage = error.message
    }

    // 处理常见的API错误
    if (typeof errorMessage === 'string' && errorMessage.includes("Incorrect API key provided")) {
      errorMessage = "API密钥无效。请检查您的API密钥设置。"
    } else if (errorMessage.includes("Rate limit")) {
      errorMessage = "API请求频率超限。请稍后再试。"
    } else if (errorMessage.includes("insufficient_quota") || errorMessage.includes("exceeded your quota")) {
      errorMessage = "API配额不足。请检查您的账户余额。"
    } else if (errorMessage.includes("not valid JSON")) {
      errorMessage = "API返回了无效的响应格式。请检查API端点配置。"
    } else if (errorMessage.includes("404")) {
      if (errorMessage.includes("Gemini")) {
        errorMessage = "Gemini API模型未找到。请检查模型ID和API端点配置。"
      } else {
        errorMessage = "API资源未找到。请检查API端点和模型ID配置。"
      }
    } else if (errorMessage.includes("所有Gemini模型尝试失败")) {
      errorMessage = "无法找到可用的Gemini模型。请检查您的API密钥权限和模型访问权限。"
    }

    return NextResponse.json(
      {
        error: errorMessage,
        // Ensure error is stringified correctly
        details: isDevelopment ? (error instanceof Error ? error.stack : String(error)) : undefined,
      },
      { status: 500 },
    )
  }
}

// 安全地解析JSON，处理非JSON响应
async function safeParseJSON(response: Response) { // Add Response type
  try {
    // 获取响应文本
    const text = await response.text()
    console.log("API响应原始文本:", text.substring(0, 500)) // 记录前500个字符用于调试

    // 如果文本为空，抛出错误
    if (!text || text.trim() === "") {
      throw new Error("API返回了空响应")
    }

    // 尝试解析JSON
    try {
      return JSON.parse(text)
    } catch (e) {
      console.error("JSON解析错误:", e)
      throw new Error(`无法解析API响应: ${text.substring(0, 100)}...`)
    }
  } catch (e) {
    console.error("读取响应文本失败:", e)
    throw new Error("无法读取API响应内容")
  }
}

async function reduceWithOpenAI(
  originalText: string,
  language: "zh" | "en",
  credentials: typeof API_CREDENTIALS.openai,
) {
  const prompt = language === "zh" ? getChinesePrompt() : getEnglishPrompt()
  const endpoint = credentials.endpoint.endsWith("/") ? credentials.endpoint.slice(0, -1) : credentials.endpoint

  try {
    console.log(`调用OpenAI API: ${endpoint}/v1/chat/completions`)

    const response = await fetchWithTimeout(`${endpoint}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${credentials.apiKey}`,
      },
      body: JSON.stringify({
        model: credentials.modelId,
        messages: [
          {
            role: "system",
            content: prompt,
          },
          {
            role: "user",
            content: `原文：${originalText}`,
          },
        ],
        temperature: 0.7,
      }),
    })

    if (!response.ok) {
      // 使用安全的JSON解析
      let errorMessage = `OpenAI API返回错误 (${response.status})`

      try {
        const errorData = await safeParseJSON(response)
        errorMessage = errorData.error?.message || errorMessage
      } catch (e) {
        // 如果解析失败，使用原始错误
        const errorText = await response.text().catch(() => "无法读取错误响应")
        errorMessage = `${errorMessage}: ${errorText.substring(0, 200)}`
      }

      console.error(`OpenAI API错误: ${errorMessage}`)
      throw new Error(errorMessage)
    }

    // 使用安全的JSON解析
    const data = await safeParseJSON(response)
    const result = data.choices[0]?.message?.content || ""

    // Extract the modified text from the response
    const modifiedText = result.includes("修改后：")
      ? result.split("修改后：")[1].trim()
      : result.includes("Modified:")
        ? result.split("Modified:")[1].trim()
        : result

    return modifiedText
  } catch (error) {
    console.error(`OpenAI API调用失败:`, error)
    // Check if error is an instance of Error before accessing message
    if (error instanceof Error && error.message.includes("fetch failed")) {
      throw new Error(`无法连接到OpenAI API，请检查网络连接和API端点配置`)
    }
    throw error
  }
}

async function reduceWithGemini(
  originalText: string,
  language: "zh" | "en",
  credentials: typeof API_CREDENTIALS.gemini,
) {
  const prompt = language === "zh" ? getChinesePrompt() : getEnglishPrompt()
  const endpoint = credentials.endpoint.endsWith("/") ? credentials.endpoint.slice(0, -1) : credentials.endpoint
  const apiVersion = "v1"

  // 记录当前使用的模型ID
  console.log(`当前配置的Gemini模型ID: ${credentials.modelId}`)
  console.log(`备用模型列表: ${credentials.fallbackModels.join(", ")}`)

  // 确保主模型也在尝试列表中
  const modelsToTry = [credentials.modelId]

  // 添加备用模型，但避免重复
  credentials.fallbackModels.forEach((model) => {
    if (!modelsToTry.includes(model)) {
      modelsToTry.push(model)
    }
  })

  let lastError = null

  // 尝试每个模型，直到成功或全部失败
  for (const modelId of modelsToTry) {
    try {
      // 构建API URL - 确保格式正确
      const apiUrl = `${endpoint}/${apiVersion}/models/${modelId}:generateContent?key=${credentials.apiKey}`

      console.log(`尝试调用Gemini API模型 ${modelId}`)
      console.log(`完整API URL: ${endpoint}/${apiVersion}/models/${modelId}:generateContent (不含API密钥)`)

      const response = await fetchWithTimeout(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: prompt }, { text: `原文：${originalText}` }],
            },
          ],
          generationConfig: {
            temperature: 0.7,
          },
        }),
      })

      // 首先检查响应状态
      if (!response.ok) {
        const status = response.status
        let errorMessage = `Gemini API返回错误 (${status})`

        // 尝试读取响应文本
        let responseText = ""
        try {
          responseText = await response.text()
          console.log(`Gemini API错误响应 (${modelId}): ${responseText.substring(0, 500)}`)

          // 尝试解析JSON
          if (responseText && (responseText.startsWith("{") || responseText.startsWith("["))) {
            try {
              const errorData = JSON.parse(responseText)
              if (errorData.error && errorData.error.message) {
                errorMessage = errorData.error.message
              }
            } catch (parseError) {
              console.error("无法解析错误响应JSON:", parseError)
            }
          }
        } catch (textError) {
          console.error("无法读取错误响应文本:", textError)
        }

        // 如果是404错误，尝试下一个模型
        if (status === 404) {
          lastError = new Error(`Gemini模型 ${modelId} 未找到或不可用`)
          continue
        }

        throw new Error(errorMessage)
      }

      // 读取响应文本
      const responseText = await response.text()
      console.log(`Gemini API响应 (${modelId}): ${responseText.substring(0, 200)}...`)

      // 解析JSON
      let data
      try {
        data = JSON.parse(responseText)
      } catch (parseError) {
        console.error("无法解析Gemini API响应JSON:", parseError)
        throw new Error(`无法解析Gemini API响应: ${responseText.substring(0, 100)}...`)
      }

      // 从Gemini响应中提取文本
      let result = ""
      if (
        data.candidates &&
        data.candidates.length > 0 &&
        data.candidates[0].content &&
        data.candidates[0].content.parts &&
        data.candidates[0].content.parts.length > 0
      ) {
        result = data.candidates[0].content.parts[0].text || ""
      } else {
        console.error("Gemini API响应格式不符合预期:", data)
        throw new Error("Gemini API响应格式不符合预期，无法提取生成的文本")
      }

      // 提取修改后的文本
      const modifiedText = result.includes("修改后：")
        ? result.split("修改后：")[1].trim()
        : result.includes("Modified:")
          ? result.split("Modified:")[1].trim()
          : result

      console.log(`成功使用Gemini模型 ${modelId}`)
      return modifiedText
    } catch (error) {
      console.error(`Gemini API (${modelId}) 调用失败:`, error)
      lastError = error
      // 继续尝试下一个模型
    }
  }

  // 如果所有模型都失败，抛出更详细的错误
  // Check if lastError is an Error instance before accessing message
  if (lastError instanceof Error) {
    console.error("所有Gemini模型尝试失败，详细错误:", lastError)
    throw new Error(`所有Gemini模型尝试失败: ${lastError.message}`)
  } else if (lastError) {
    console.error("所有Gemini模型尝试失败，未知错误类型:", lastError)
    throw new Error(`所有Gemini模型尝试失败: ${String(lastError)}`)
  } else {
    // This case should ideally not happen if the loop ran at least once,
    // but added for robustness.
    throw new Error(`无法连接到Gemini API或所有模型尝试均未返回明确错误`)
  }
}
