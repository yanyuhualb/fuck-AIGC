"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export default function ApiDiagnostics() {
  const [provider, setProvider] = useState<"openai" | "gemini">("openai")
  const [endpoint, setEndpoint] = useState("")
  const [apiKey, setApiKey] = useState("")
  const [modelId, setModelId] = useState("")
  const [testText, setTestText] = useState("这是一个测试文本，用于诊断API连接问题。")
  const [isLoading, setIsLoading] = useState(false)
  const [diagnosticResult, setDiagnosticResult] = useState<any>(null)
  const { toast } = useToast()

  // 设置默认值
  useState(() => {
    if (provider === "openai") {
      setEndpoint("https://api.openai.com")
      setModelId("gpt-4o")
    } else {
      setEndpoint("https://generativelanguage.googleapis.com")
      setModelId("gemini-2.5-flash-preview-04-17")
    }
  })

  // 当提供商改变时更新默认值
  const handleProviderChange = (value: "openai" | "gemini") => {
    setProvider(value)
    if (value === "openai") {
      setEndpoint("https://api.openai.com")
      setModelId("gpt-4o")
    } else {
      setEndpoint("https://generativelanguage.googleapis.com")
      setModelId("gemini-2.5-flash-preview-04-17")
    }
  }

  const runDiagnostics = async () => {
    if (!endpoint || !apiKey || !modelId || !testText) {
      toast({
        title: "错误",
        description: "请填写所有必要字段",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    setDiagnosticResult(null)

    try {
      const response = await fetch("/api/debug", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          provider,
          endpoint,
          apiKey,
          modelId,
          text: testText,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "诊断失败")
      }

      setDiagnosticResult(data.debug)
      toast({
        title: "诊断完成",
        description: `API状态: ${data.debug.response.status}`,
      })
    } catch (error) {
      console.error("API诊断错误:", error)
      toast({
        title: "诊断失败",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>API诊断工具</CardTitle>
        <CardDescription>测试API连接并诊断问题</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>选择API提供商</Label>
          <RadioGroup
            defaultValue="openai"
            value={provider}
            onValueChange={(value) => handleProviderChange(value as "openai" | "gemini")}
            className="flex space-x-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="openai" id="openai-diag" />
              <Label htmlFor="openai-diag">OpenAI</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="gemini" id="gemini-diag" />
              <Label htmlFor="gemini-diag">Google Gemini</Label>
            </div>
          </RadioGroup>
        </div>

        <div className="space-y-2">
          <Label htmlFor="endpoint">API端点</Label>
          <Input
            id="endpoint"
            value={endpoint}
            onChange={(e) => setEndpoint(e.target.value)}
            placeholder="https://api.openai.com"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="apiKey">API密钥</Label>
          <Input
            id="apiKey"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            type="password"
            placeholder="sk-..."
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="modelId">模型ID</Label>
          <Input
            id="modelId"
            value={modelId}
            onChange={(e) => setModelId(e.target.value)}
            placeholder="gpt-4o 或 gemini-2.5-flash-preview-04-17"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="testText">测试文本</Label>
          <Textarea
            id="testText"
            value={testText}
            onChange={(e) => setTestText(e.target.value)}
            placeholder="输入测试文本..."
            rows={3}
          />
        </div>

        {diagnosticResult && (
          <div className="mt-4 space-y-2 rounded-md bg-gray-50 p-4 dark:bg-gray-800">
            <h3 className="font-medium">诊断结果</h3>
            <div className="space-y-1 text-sm">
              <p>
                <strong>状态码:</strong> {diagnosticResult.response.status}
              </p>
              <p>
                <strong>内容类型:</strong> {diagnosticResult.response.contentType}
              </p>
              <p>
                <strong>是否为JSON:</strong> {diagnosticResult.response.isJson ? "是" : "否"}
              </p>
              <div className="mt-2">
                <p className="font-medium">响应预览:</p>
                <pre className="mt-1 max-h-40 overflow-auto rounded bg-gray-100 p-2 text-xs dark:bg-gray-900">
                  {diagnosticResult.response.responseText}
                </pre>
              </div>
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button onClick={runDiagnostics} disabled={isLoading} className="w-full">
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              正在诊断...
            </>
          ) : (
            "运行诊断"
          )}
        </Button>
      </CardFooter>
    </Card>
  )
}
