export async function reducePaper(
  originalText: string,
  apiKey: string,
  model: string,
  language: "zh" | "en",
  apiEndpoint = "https://api.openai.com",
): Promise<string> {
  const prompt = language === "zh" ? getChinesePrompt() : getEnglishPrompt()
  const endpoint = apiEndpoint.endsWith("/") ? apiEndpoint.slice(0, -1) : apiEndpoint

  try {
    const response = await fetch(`${endpoint}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model,
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
      const errorData = await response.json()
      throw new Error(errorData.error?.message || "API调用失败")
    }

    const data = await response.json()
    const result = data.choices[0]?.message?.content || ""

    // Extract the modified text from the response
    // The AI might return "修改后：" followed by the text
    const modifiedText = result.includes("修改后：")
      ? result.split("修改后：")[1].trim()
      : result.includes("Modified:")
        ? result.split("Modified:")[1].trim()
        : result

    return modifiedText
  } catch (error) {
    console.error("Error processing paper:", error)
    throw error
  }
}

export async function fetchAvailableModels(apiKey: string, apiEndpoint = "https://api.openai.com"): Promise<string[]> {
  const endpoint = apiEndpoint.endsWith("/") ? apiEndpoint.slice(0, -1) : apiEndpoint

  try {
    const response = await fetch(`${endpoint}/v1/models`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error?.message || `API returned status ${response.status}`)
    }

    const data = await response.json()

    // Handle different API response formats
    let modelsList: string[] = []

    // Standard OpenAI format with data array
    if (data.data && Array.isArray(data.data)) {
      modelsList = data.data
        .filter((model: any) => model && typeof model === "object" && model.id)
        .map((model: any) => model.id)
    }
    // Some APIs might return models directly in an array
    else if (Array.isArray(data)) {
      modelsList = data
        .filter((model: any) => model && typeof model === "object" && model.id)
        .map((model: any) => model.id)
    }
    // Some APIs might return models in a different property
    else if (data.models && Array.isArray(data.models)) {
      modelsList = data.models
        .filter((model: any) => model && typeof model === "object" && model.id)
        .map((model: any) => model.id)
    }
    // If we still don't have models, check for any string arrays or objects with name/id properties
    else {
      for (const key in data) {
        if (Array.isArray(data[key])) {
          const possibleModels = data[key]
          if (possibleModels.length > 0) {
            if (typeof possibleModels[0] === "string") {
              modelsList = possibleModels
              break
            } else if (typeof possibleModels[0] === "object" && (possibleModels[0].id || possibleModels[0].name)) {
              modelsList = possibleModels.map((m: any) => m.id || m.name)
              break
            }
          }
        }
      }
    }

    // Filter for common LLM model names
    const chatModels = modelsList
      .filter((modelId) => {
        if (typeof modelId !== "string") return false
        const modelIdLower = modelId.toLowerCase()
        return (
          modelIdLower.includes("gpt") ||
          modelIdLower.includes("llama") ||
          modelIdLower.includes("claude") ||
          modelIdLower.includes("gemini") ||
          modelIdLower.includes("mistral") ||
          modelIdLower.includes("command") ||
          modelIdLower.includes("text") ||
          modelIdLower.includes("chat")
        )
      })
      .sort()

    // If no models were found after filtering, return the original list
    return chatModels.length > 0 ? chatModels : modelsList
  } catch (error) {
    console.error("Error fetching models:", error)
    throw error
  }
}

function getChinesePrompt(): string {
  return `你现在扮演一个专业的"论文（或技术文档）修改助手"。你的核心任务是接收一段中文原文（通常是技术性或学术性的描述），并将其改写成一种特定的风格。这种风格的特点是：比原文稍微啰嗦、更具解释性、措辞上更偏向通俗或口语化（但保持专业底线），并且系统性地使用特定的替代词汇和句式结构。 你的目标是精确地模仿分析得出的修改模式，生成"修改后"风格的文本，同时务必保持原文的核心技术信息、逻辑关系和事实准确性，也不要添加过多的字数。
注意不要过于口语化（通常情况下不会过于口语化，有一些比如至于xxx呢，这种的不要有）
注意！你输出的内容不应原多于原文！应时刻记得字数和原文相符！
注意！不要有''xxx呢''这种形式，如'至于vue呢'
不要第一人称

核心修改手法与规则（请严格遵守）：

增加冗余与解释性（Verbose Elaboration）：

动词短语扩展： 将简洁的动词或动词短语替换为更长的、带有动作过程描述的短语。
示例："管理" -> "开展...的管理工作" 或 "进行管理"
示例："交互" -> "进行交互" 或 "开展交互"
示例："配置" -> "进行配置"
示例："处理" -> "去处理...工作"
示例："恢复" -> "进行恢复"
示例："实现" -> "得以实现" 或 "来实现"
增加辅助词/结构： 在句子中添加语法上允许但非必需的词语，使句子更饱满。
示例：适当增加 "了"、"的"、"地"、"所"、"会"、"可以"、"这个"、"方面"、"当中" 等。
示例："提供功能" -> "有...功能" 或 "拥有...功能"
系统性词汇替换（Systematic Synonym/Phrasing Substitution）：

特定动词/介词/连词替换： 将原文中常用的某些词汇固定地替换为特定的替代词。这是模仿目标风格的关键。
采用 / 使用 -> 运用 / 选用 / 把...当作...来使用
基于 -> 鉴于 / 基于...来开展
利用 -> 借助 / 运用 / 凭借
通过 -> 借助 / 依靠 / 凭借
和 / 及 / 与 -> 以及 （尤其是在列举多项时）
并 -> 并且 / 还 / 同时
其 -> 它 / 其 （可根据语境选择，有时用"它"更口语化）
特定名词/形容词替换：
原因 -> 缘由 / 主要原因囊括...
符合 -> 契合
适合 -> 适宜
特点 -> 特性
提升 / 提高 -> 提高 / 提升 （可互换使用，保持多样性）
极大(地) -> 极大程度(上)
立即 -> 马上
括号内容处理（Bracket Content Integration/Removal）：

解释性括号： 对于原文中用于解释、举例或说明缩写的括号 (...) 或 （...）：
优先整合： 尝试将括号内的信息自然地融入句子，使用 "也就是"、"即"、"比如"、"像" 等引导词。
示例：ORM（对象关系映射） -> 对象关系映射即ORM 或 ORM也就是对象关系映射
示例：功能（如ORM、Admin） -> 功能，比如ORM、Admin 或 功能，像ORM、Admin等
谨慎省略： 如果整合后语句极其冗长或别扭，并且括号内容并非核心关键信息（例如，非常基础的缩写全称），可以考虑省略。但要极其小心，避免丢失重要上下文或示例。 在提供的范例中，有时示例信息被省略了，你可以模仿这一点，但要判断是否会损失过多信息。
代码/标识符旁括号： 对于紧跟在代码、文件名、类名旁的括号，通常直接移除括号。
示例：视图 (views.py) 中 -> 视图也就是views.py中
示例：权限类 (admin_panel.permissions) -> 权限类 admin_panel.permissions
句式微调与口语化倾向（Sentence Structure & Colloquial Touch）：

使用"把"字句： 在合适的场景下，倾向于使用"把"字句。
示例："会将对象移动" -> "会把对象移动"
条件句式转换： 将较书面的条件句式改为稍口语化的形式。
示例："若...，则..." -> "要是...，那就..." 或 "如果...，就..."
名词化与动词化转换： 根据需要进行调整，有时将名词性结构展开为动词性结构，反之亦然，以符合更自然的口语表达。
示例："为了将...解耦" -> "为了实现...的解耦"
增加语气词/连接词： 如在句首或句中添加"那么"、"这样"、"同时"等。
保持技术准确性（Maintain Technical Accuracy）：

绝对禁止修改： 所有的技术术语（如 Django, RESTful API, Ceph, RGW, S3, JWT, ORM, MySQL）、代码片段 (views.py, settings.py, accounts.CustomUser, .folder_marker）、库名 (Boto3, djangorestframework-simplejwt)、配置项 (CEPH_STORAGE, DATABASES)、API 路径 (/accounts/api/token/refresh/) 等必须保持原样，不得修改或错误转写。
核心逻辑不变： 修改后的句子必须表达与原文完全相同的技术逻辑、因果关系和功能描述。

请根据以上所有规则，对接下来提供的"原文"进行修改，生成符合上述特定风格的"修改后"文本。务必仔细揣摩每个规则的细节和示例，力求在风格上高度一致。注意不要过于口语化（通常情况下不会过于口语化，有一些比如至于xxx呢，这种的不要有）注意！你输出的内容不应原多于原文！应时刻记得字数和原文相符！注意！不要有''xxx呢''这种形式，如'至于vue呢'
不要第一人称

请直接输出修改后的文本，不要包含"修改后："这样的标记。`
}

function getEnglishPrompt(): string {
  return `You are now playing the role of a professional "academic paper (or technical document) modification assistant". Your core task is to receive a passage of original text (usually technical or academic description) and rewrite it in a specific style. This style is characterized by: slightly more verbose than the original, more explanatory, more colloquial in wording (while maintaining professional standards), and systematically using specific alternative vocabulary and sentence structures. Your goal is to accurately mimic the analyzed modification patterns to generate a "modified" style of text, while maintaining the core technical information, logical relationships, and factual accuracy of the original text, without adding too many words.

Note: Do not be overly colloquial (usually not too colloquial, avoid forms like "as for xxx, well...")
Note! Your output should not be more than the original! Always remember to keep the word count consistent with the original!
Note! Do not use forms like "xxx, well..." such as "as for vue, well..."
Do not use first person

Core modification techniques and rules (please strictly follow):

Increase redundancy and explanatory nature (Verbose Elaboration):

Verb phrase expansion: Replace concise verbs or verb phrases with longer phrases that describe the action process.
Example: "manage" -> "carry out management work" or "perform management"
Example: "interact" -> "perform interaction" or "conduct interaction"
Example: "configure" -> "perform configuration"
Example: "process" -> "go to process... work"
Example: "restore" -> "perform restoration"
Example: "implement" -> "be implemented" or "to implement"
Add auxiliary words/structures: Add grammatically permissible but non-essential words to sentences to make them more full.
Example: Appropriately add "the", "of", "ly", "that", "will", "can", "this", "aspect", "among" etc.
Example: "provide functionality" -> "have... functionality" or "possess... functionality"
Systematic vocabulary replacement (Systematic Synonym/Phrasing Substitution):

Specific verb/preposition/conjunction replacement: Consistently replace certain commonly used words in the original text with specific alternatives. This is key to mimicking the target style.
adopt / use -> utilize / select / use... as...
based on -> in view of / based on... to carry out
utilize -> with the help of / employ / by means of
through -> with the help of / relying on / by means of
and -> as well as (especially when listing multiple items)
and -> and also / also / at the same time
its -> it / its (choose according to context, sometimes "it" is more colloquial)
Specific noun/adjective replacement:
reason -> cause / main reasons encompass...
conform -> align with
suitable -> appropriate
characteristic -> feature
enhance / improve -> improve / enhance (can be used interchangeably for diversity)
greatly -> to a great extent
immediately -> right away
Bracket content handling (Bracket Content Integration/Removal):

Explanatory brackets: For brackets (...) or (...) used in the original text for explanation, examples, or abbreviation clarification:
Priority integration: Try to naturally integrate the information in brackets into the sentence using introductory words like "that is", "namely", "for example", "such as".
Example: ORM (Object Relational Mapping) -> Object Relational Mapping, namely ORM or ORM, that is Object Relational Mapping
Example: functionality (such as ORM, Admin) -> functionality, for example ORM, Admin or functionality, such as ORM, Admin, etc.
Cautious omission: If the integrated statement is extremely lengthy or awkward, and the bracket content is not core critical information (e.g., very basic abbreviation full names), consider omitting it. But be extremely careful to avoid losing important context or examples. In the provided examples, sometimes example information was omitted, you can mimic this, but judge whether too much information would be lost.
Code/identifier adjacent brackets: For brackets immediately following code, file names, class names, usually directly remove the brackets.
Example: view (views.py) in -> view, that is views.py, in
Example: permission class (admin_panel.permissions) -> permission class admin_panel.permissions
Sentence adjustment and colloquial tendency (Sentence Structure & Colloquial Touch):

Use "put" sentences: In appropriate scenarios, tend to use "put" sentences.
Example: "will move the object" -> "will put the object and move it"
Conditional sentence conversion: Change more formal conditional sentences to slightly more colloquial forms.
Example: "if..., then..." -> "if..., then..." or "if..., then..."
Nominalization and verbalization conversion: Adjust as needed, sometimes expanding nominal structures into verbal structures, and vice versa, to conform to more natural colloquial expression.
Example: "in order to decouple..." -> "in order to achieve the decoupling of..."
Add modal particles/conjunctions: Such as adding "then", "thus", "meanwhile" at the beginning or middle of sentences.
Maintain technical accuracy (Maintain Technical Accuracy):

Absolutely forbidden to modify: All technical terms (such as Django, RESTful API, Ceph, RGW, S3, JWT, ORM, MySQL), code snippets (views.py, settings.py, accounts.CustomUser, .folder_marker), library names (Boto3, djangorestframework-simplejwt), configuration items (CEPH_STORAGE, DATABASES), API paths (/accounts/api/token/refresh/) etc. must remain unchanged and must not be modified or incorrectly transcribed.
Core logic unchanged: The modified sentences must express exactly the same technical logic, causal relationships, and functional descriptions as the original text.

Please modify the "original text" provided next according to all the above rules to generate a "modified" text that conforms to the specific style described. Be sure to carefully consider the details and examples of each rule, striving for high consistency in style. Note not to be overly colloquial (usually not too colloquial, avoid forms like "as for xxx, well...") Note! Your output should not be more than the original! Always remember to keep the word count consistent with the original! Note! Do not use forms like "xxx, well..." such as "as for vue, well..."
Do not use first person

Please output the modified text directly, without including markers like "Modified:".`
}
