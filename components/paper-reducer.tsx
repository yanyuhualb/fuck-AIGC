"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Copy, CheckCircle2, AlertCircle, Info } from "lucide-react"
import { useLanguage } from "@/lib/language-context"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export default function PaperReducer() {
  const [originalText, setOriginalText] = useState("")
  const [reducedText, setReducedText] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [provider, setProvider] = useState<"openai" | "gemini">("openai")
  const [copied, setCopied] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [isDevelopmentMode, setIsDevelopmentMode] = useState(false)
  const [apiStatus, setApiStatus] = useState<{
    openai: "unknown" | "available" | "unavailable"
    gemini: "unknown" | "available" | "unavailable"
  }>({
    openai: "unknown",
    gemini: "unknown",
  })
  const { toast } = useToast()
  const { language, translations } = useLanguage()

  // 检查API状态
  useEffect(() => {
    const checkApiStatus = async () => {
      try {
        const response = await fetch("/api/check-status", {
          method: "GET",
        }).catch(() => null)

        if (response && response.ok) {
          const data = await response.json()
          setApiStatus(data.status)
        }
      } catch (error) {
        console.error("无法检查API状态:", error)
      }
    }

    // 仅在生产环境中检查API状态
    if (process.env.NODE_ENV === "production") {
      checkApiStatus()
    }
  }, [])

  const handleSubmit = async () => {
    if (!originalText.trim()) {
      toast({
        title: translations.error,
        description: translations.pleaseEnterPaper,
        variant: "destructive",
      })
      return
    }

    setIsProcessing(true)
    setProgress(0)
    setError(null)
    setIsDevelopmentMode(false)

    // 模拟进度条
    const progressInterval = setInterval(() => {
      setProgress((prev: number) => { // Add type: number
        if (prev >= 95) {
          clearInterval(progressInterval)
          return prev
        }
        return prev + 5
      })
    }, 1000)

    try {
      // 移除调试日志
      const controller = new AbortController()
      const timeoutId = setTimeout(() => {
        // 移除调试日志
        controller.abort()
      }, 180000) // 增加到 180 秒，与后端超时保持一致

      const response = await fetch("/api/reduce", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: originalText,
          language,
          provider,
        }),
        signal: controller.signal,
      })

      // 移除调试日志
      clearTimeout(timeoutId)
      clearInterval(progressInterval)
      setProgress(100)

      // 安全地解析JSON响应
      let data
      try {
        const responseText = await response.text()
        console.log("API响应文本:", responseText.substring(0, 200)) // 记录前200个字符用于调试

        if (!responseText || responseText.trim() === "") {
          throw new Error(language === "zh" ? "服务器返回了空响应" : "Server returned an empty response")
        }

        try {
          data = JSON.parse(responseText)
        } catch (parseError) {
          console.error("JSON解析错误:", parseError)
          throw new Error(
            language === "zh"
              ? `服务器返回了无效的JSON格式: ${responseText.substring(0, 50)}...`
              : `Server returned invalid JSON format: ${responseText.substring(0, 50)}...`,
          )
        }
      } catch (textError) {
        console.error("读取响应文本失败:", textError)
        throw new Error(
          language === "zh"
            ? "无法读取服务器响应内容，请检查网络连接"
            : "Could not read server response, please check your network connection",
        )
      }

      if (!response.ok) {
        throw new Error(data.error || (language === "zh" ? "处理失败" : "Processing failed"))
      }

      setReducedText(data.result)

      // 检查是否是开发环境模拟响应
      if (data._devNote) {
        setIsDevelopmentMode(true)
      }

      // 更新API状态
      if (provider === "openai") {
        setApiStatus((prev: typeof apiStatus) => ({ ...prev, openai: "available" })) // Add type
      } else if (provider === "gemini") {
        setApiStatus((prev: typeof apiStatus) => ({ ...prev, gemini: "available" })) // Add type
      }

      // 自动切换到输出标签
      const outputTab = document.querySelector('[data-state="inactive"][value="output"]') as HTMLButtonElement
      if (outputTab) {
        outputTab.click()
      }
    } catch (error: any) {
      clearInterval(progressInterval)
      setProgress(0)

      // 更新API状态
      if (provider === "openai") {
        setApiStatus((prev: typeof apiStatus) => ({ ...prev, openai: "unavailable" })) // Add type
      } else if (provider === "gemini") {
        setApiStatus((prev: typeof apiStatus) => ({ ...prev, gemini: "unavailable" })) // Add type
      }

      // 移除调试日志
      
      const errorMessage =
        error.name === "AbortError"
          ? language === "zh"
            ? "请求超时，请稍后再试或尝试处理较短的文本"
            : "Request timeout. Please try again later or process shorter text."
          : error.message

      setError(errorMessage)

      toast({
        title: translations.processingFailed,
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(reducedText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{translations.title}</CardTitle>
          <CardDescription>{translations.description}</CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>{language === "zh" ? "处理错误" : "Processing Error"}</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {isDevelopmentMode && (
            <Alert className="mb-4 bg-yellow-50 dark:bg-yellow-900/20">
              <Info className="h-4 w-4" />
              <AlertTitle>{language === "zh" ? "开发模式" : "Development Mode"}</AlertTitle>
              <AlertDescription>
                {language === "zh"
                  ? "当前运行在开发/预览模式。API密钥未配置，返回的是模拟数据。"
                  : "Running in development/preview mode. API keys are not configured, returning mock data."}
              </AlertDescription>
            </Alert>
          )}

          <Tabs defaultValue="input" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="input">{translations.originalText}</TabsTrigger>
              <TabsTrigger value="output">{translations.reducedText}</TabsTrigger>
            </TabsList>
            <TabsContent value="input" className="space-y-4">
              <Textarea
                placeholder={translations.inputPlaceholder}
                className="min-h-[300px]"
                value={originalText}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setOriginalText(e.target.value)} // Add type
              />
              <div className="flex flex-col space-y-4">
                <div>
                  <h3 className="mb-2 text-sm font-medium">{language === "zh" ? "选择AI模型" : "Select AI Model"}</h3>
                  <RadioGroup
                    defaultValue="openai"
                    value={provider}
                    onValueChange={(value: string) => setProvider(value as "openai" | "gemini")} // Add type: string
                    className="flex space-x-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="openai" id="openai" />
                      <Label htmlFor="openai" className="flex items-center">
                        OpenAI
                        {apiStatus.openai === "available" && (
                          <span className="ml-2 h-2 w-2 rounded-full bg-green-500" title="API可用"></span>
                        )}
                        {apiStatus.openai === "unavailable" && (
                          <span className="ml-2 h-2 w-2 rounded-full bg-red-500" title="API不可用"></span>
                        )}
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="gemini" id="gemini" />
                      <Label htmlFor="gemini" className="flex items-center">
                        Google Gemini
                        {apiStatus.gemini === "available" && (
                          <span className="ml-2 h-2 w-2 rounded-full bg-green-500" title="API可用"></span>
                        )}
                        {apiStatus.gemini === "unavailable" && (
                          <span className="ml-2 h-2 w-2 rounded-full bg-red-500" title="API不可用"></span>
                        )}
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
              </div>
            </TabsContent>
            <TabsContent value="output" className="space-y-4">
              <div className="relative">
                <Textarea
                  placeholder={translations.outputPlaceholder}
                  className="min-h-[300px]"
                  value={reducedText}
                  readOnly
                />
                {reducedText && (
                  <Button
                    size="sm"
                    variant="secondary"
                    className="absolute right-2 top-2 flex items-center gap-1"
                    onClick={copyToClipboard}
                  >
                    {copied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    {copied ? translations.copied : translations.copy}
                  </Button>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          {isProcessing && (
            <div className="w-full space-y-2">
              <Progress value={progress} className="h-2 w-full" />
              <p className="text-xs text-center text-muted-foreground">
                {language === "zh" ? "正在处理中..." : "Processing..."}
              </p>
            </div>
          )}
          <Button className="w-full" onClick={handleSubmit} disabled={isProcessing}>
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {translations.processing}
              </>
            ) : (
              translations.process
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
