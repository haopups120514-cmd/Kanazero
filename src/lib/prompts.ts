function topicContext(topic: string): string {
  if (topic.startsWith("JLPT")) {
    const n = topic.replace("JLPT ", "");
    return `日语能力考试${n}级别词汇，注重考试高频词，例句贴近考试场景`;
  }
  if (topic === "BJT商务日语") {
    return "BJT商务日语考试高频词汇，例句体现商务场景";
  }
  if (topic === "日常会話") return "日常口语常用词，例句贴近生活场景";
  if (topic === "職場・ビジネス") return "职场和商务场景常用词，包含敬语和商务表达";
  if (topic === "買い物・レストラン") return "购物和餐厅场景常用词，包含点餐、结账、询价等";
  if (topic === "旅行・交通") return "旅行和交通场景词汇，包含问路、订票、交通工具等";
  if (topic === "病院・健康") return "医院和健康相关词汇，包含症状、就诊、药品等";
  if (topic === "ニュース日本語") return "新闻日语常用词，包含时事、社会、经济等领域";
  if (topic === "IT・テクノロジー") return "IT和科技领域日语词汇，包含编程、网络、设备等";
  if (topic === "敬語マスター") return "日语敬语表达，包含尊敬语、谦让语、丁宁语";
  return `${topic}相关日语词汇`;
}

export function wordsPrompt(topic: string, level: string, count = 20): string {
  return `你是日语教学专家。请根据以下要求生成${count}个日语单词。

主题：${topic}
背景：${topicContext(topic)}
难度级别：${level}

严格按照以下JSON数组格式返回，不要返回任何其他内容，不要加markdown代码块：
[
  {
    "word": "日语写法（汉字或假名）",
    "kana": "平假名读音",
    "romaji": "罗马字拼写（小写，单词间用空格分隔）",
    "meaning_zh": "中文释义（简洁）",
    "pos": "词性（名詞/動詞/形容詞/副詞/表現）",
    "example_ja": "一个自然的例句（日语）",
    "example_zh": "例句中文翻译",
    "level": "${level}"
  }
]

确保：
1. romaji是标准Hepburn式罗马字，全部小写
2. 例句自然地体现主题场景
3. 不同词性均有覆盖
4. 严格返回JSON数组，无多余文字`;
}

export function expressionsPrompt(count = 5): string {
  return `你是日语表达专家。请生成${count}道日语表达练习题，涵盖多种生活和职场场景。

严格按照以下JSON数组格式返回，不要返回任何其他内容：
[
  {
    "scenario_zh": "中文情景描述，说明应该说什么",
    "answer_ja": "正确的日语表达",
    "answer_kana": "平假名读音",
    "answer_romaji": "标准Hepburn罗马字（小写，词间加空格）",
    "acceptable_answers": ["其他可接受的表达方式的romaji"],
    "explanation_zh": "简短解析，说明为何这样表达"
  }
]

要求：
1. 情景多样：涵盖日常会话、职场、购物、旅行等场景
2. 表达地道，适当体现敬语
3. romaji必须准确，全部小写
4. acceptable_answers可以为空数组`;
}

export function bjtQuestionsPrompt(count = 5): string {
  return `你是BJT商务日语出题专家。请生成${count}道BJT听読解パート的模拟题。

严格按照以下JSON数组格式返回，不要返回任何其他内容：
[
  {
    "type": "listening_reading",
    "scenario_ja": "场景描述（2-3句日语）",
    "scenario_zh": "场景中文翻译",
    "question_ja": "问题（日语）",
    "question_zh": "问题（中文）",
    "options": [
      {"label": "A", "text_ja": "选项日语", "text_zh": "选项中文"},
      {"label": "B", "text_ja": "选项日语", "text_zh": "选项中文"},
      {"label": "C", "text_ja": "选项日语", "text_zh": "选项中文"},
      {"label": "D", "text_ja": "选项日语", "text_zh": "选项中文"}
    ],
    "answer": "正确选项label（A/B/C/D）",
    "explanation_zh": "解析（为何这个选项正确）"
  }
]

要求：
1. 场景真实，涵盖商务邮件、电话、会议、合同等场景
2. 干扰项有迷惑性但明显区分
3. 解析清晰，指出关键词或语法点`;
}
