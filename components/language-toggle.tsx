"use client"
import { Button } from "@/components/ui/button"
import { Languages } from "lucide-react"
import { useLanguage } from "@/lib/language-context"

export default function LanguageToggle() {
  const { language, setLanguage } = useLanguage()

  const toggleLanguage = () => {
    const newLanguage = language === "zh" ? "en" : "zh"
    setLanguage(newLanguage)
    localStorage.setItem("language", newLanguage)
  }

  return (
    <Button variant="outline" size="sm" onClick={toggleLanguage} className="flex items-center gap-2">
      <Languages className="h-4 w-4" />
      {language === "zh" ? "English" : "中文"}
    </Button>
  )
}
