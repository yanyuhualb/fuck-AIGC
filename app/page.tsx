import { Suspense } from "react"
import PaperReducer from "@/components/paper-reducer"
import LanguageToggle from "@/components/language-toggle"

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        <header className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">论文AIGC降低检测工具</h1>
          <LanguageToggle />
        </header>

        <div className="rounded-lg bg-white p-6 shadow-md dark:bg-gray-800">
          <Suspense fallback={<div>加载中...</div>}>
            <PaperReducer />
          </Suspense>
        </div>

        <footer className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
          <p>© {new Date().getFullYear()} 论文AIGC降低检测工具 | 所有权利保留</p>
        </footer>
      </div>
    </main>
  )
}
