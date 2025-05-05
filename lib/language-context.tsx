"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"

type LanguageType = "zh" | "en"

interface LanguageContextType {
  language: LanguageType
  setLanguage: (language: LanguageType) => void
  translations: Record<string, string>
}

const defaultTranslations = {
  // Header
  title: {
    zh: "论文AIGC降低检测工具",
    en: "Academic Paper AIGC Detection Reducer",
  },
  description: {
    zh: "通过特定技术降低论文AIGC检测率，保持原文核心信息和逻辑关系",
    en: "Reduce AIGC detection rate in academic papers while maintaining core information and logical relationships",
  },
  // Tabs
  originalText: {
    zh: "原始论文内容",
    en: "Original Paper Content",
  },
  reducedText: {
    zh: "处理后内容",
    en: "Processed Content",
  },
  // API Settings
  apiSettings: {
    zh: "API设置",
    en: "API Settings",
  },
  apiKey: {
    zh: "API密钥",
    en: "API Key",
  },
  apiEndpoint: {
    zh: "API端点",
    en: "API Endpoint",
  },
  saveKey: {
    zh: "保存设置",
    en: "Save Settings",
  },
  modelSelection: {
    zh: "模型选择",
    en: "Model Selection",
  },
  fetchModels: {
    zh: "获取模型列表",
    en: "Fetch Models",
  },
  // Actions
  process: {
    zh: "处理论文",
    en: "Process Paper",
  },
  processing: {
    zh: "处理中...",
    en: "Processing...",
  },
  copy: {
    zh: "复制结果",
    en: "Copy Result",
  },
  copied: {
    zh: "已复制",
    en: "Copied",
  },
  // Placeholders
  inputPlaceholder: {
    zh: "在此粘贴您的论文内容...",
    en: "Paste your paper content here...",
  },
  outputPlaceholder: {
    zh: "处理后的内容将显示在这里...",
    en: "Processed content will appear here...",
  },
  apiEndpointPlaceholder: {
    zh: "https://api.openai.com",
    en: "https://api.openai.com",
  },
  // Messages
  error: {
    zh: "错误",
    en: "Error",
  },
  pleaseEnterPaper: {
    zh: "请输入论文内容",
    en: "Please enter paper content",
  },
  pleaseSetApiKey: {
    zh: "请设置API密钥",
    en: "Please set your API key",
  },
  processingFailed: {
    zh: "处理失败",
    en: "Processing Failed",
  },
  settingsSaved: {
    zh: "设置已保存",
    en: "Settings Saved",
  },
  settingsSavedDesc: {
    zh: "您的API设置已成功保存",
    en: "Your API settings have been successfully saved",
  },
  fetchingModels: {
    zh: "获取模型列表中...",
    en: "Fetching models...",
  },
  fetchModelsFailed: {
    zh: "获取模型列表失败",
    en: "Failed to fetch models",
  },
  fetchModelsSuccess: {
    zh: "获取模型列表成功",
    en: "Models fetched successfully",
  },
}

const LanguageContext = createContext<LanguageContextType>({
  language: "zh",
  setLanguage: () => {},
  translations: {},
})

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<LanguageType>("zh")
  const [translations, setTranslations] = useState<Record<string, string>>({})

  useEffect(() => {
    // Get language from localStorage or default to Chinese
    const savedLanguage = localStorage.getItem("language") as LanguageType | null
    if (savedLanguage) {
      setLanguage(savedLanguage)
    }

    // Update translations
    const newTranslations: Record<string, string> = {}
    Object.keys(defaultTranslations).forEach((key) => {
      newTranslations[key] = defaultTranslations[key][savedLanguage || "zh"]
    })
    setTranslations(newTranslations)
  }, [])

  useEffect(() => {
    // Update translations when language changes
    const newTranslations: Record<string, string> = {}
    Object.keys(defaultTranslations).forEach((key) => {
      newTranslations[key] = defaultTranslations[key][language]
    })
    setTranslations(newTranslations)
  }, [language])

  return <LanguageContext.Provider value={{ language, setLanguage, translations }}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider")
  }
  return context
}

export function getTranslation(key: string, language: LanguageType): string {
  return defaultTranslations[key]?.[language] || key
}
