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
    "meaning_zh": ["主要中文释义", "同义说法2", "同义说法3"],
    "pos": "词性（名詞/動詞/形容詞/副詞/表現）",
    "example_ja": "一个自然的例句（日语）",
    "example_zh": "例句中文翻译",
    "level": "${level}"
  }
]

确保：
1. romaji是标准Hepburn式罗马字，全部小写
2. meaning_zh必须是数组，提供3-5个常见中文释义变体，例如「大丈夫」→["没关系","没问题","不要紧","没事"]
3. 例句自然地体现主题场景
4. 不同词性均有覆盖
5. 严格返回JSON数组，无多余文字`;
}

export function expressionsPrompt(count = 5, topic?: string): string {
  const sceneDesc = topic
    ? `专注于「${topic}」场景的日语表达`
    : "涵盖多种生活和职场场景";
  return `你是日语表达专家。请生成${count}道日语表达练习题，${sceneDesc}。

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
1. 情景贴合所选场景，表达地道，适当体现敬语
2. romaji必须准确，全部小写
3. acceptable_answers可以为空数组`;
}

export function bjtQuestionsPrompt(count = 5, examType = "BJT"): string {
  type ExamConfig = { context: string; style: string; typeExample: string; typeNote: string; extraReq: string };
  const configs: Record<string, ExamConfig> = {
    "BJT": {
      context: "BJT商务日语考试，场景涵盖商务邮件、电话、会议、合同、敬语",
      style: "给出2-4句商务场景（邮件/会话/公告），然后针对场景提问（正确理解、判断、或选出合适回应）",
      typeExample: "listening_reading",
      typeNote: "type固定为 listening_reading",
      extraReq: "场景必须体现商务敬语和职场礼仪，选项包含敬语差异或语义细微差别",
    },
    "JLPT N1": {
      context: "JLPT N1日语能力测试，高级语法・词汇・读解，难度最高",
      style: "混合出题：语法填空（文中___に入る最もよいものを選べ）、词义选择（___の意味に最も近いものを選べ）、读解理解。语法题的scenario_ja是含___的完整句子，question_ja是「（　）に何を入れますか」",
      typeExample: "grammar",
      typeNote: "type按题型填写：语法题填 grammar，词汇题填 vocabulary，读解题填 reading",
      extraReq: "语法题使用N1高级文型（〜にもかかわらず、〜をもって、〜いかんにかかわらず等），词汇题选N1程度汉语词或四字熟语",
    },
    "JLPT N2": {
      context: "JLPT N2日语能力测试，中高级语法・词汇・读解",
      style: "混合出题：语法填空、词义选择、读解理解。语法题的scenario_ja是含___的完整句子，question_ja是「（　）に何を入れますか」",
      typeExample: "grammar",
      typeNote: "type按题型填写：语法题填 grammar，词汇题填 vocabulary，读解题填 reading",
      extraReq: "语法题使用N2文型（〜に対して、〜によって、〜わけにはいかない等），难度适中",
    },
    "JLPT N3": {
      context: "JLPT N3日语能力测试，中级语法・词汇・读解，日常和职场场景",
      style: "语法填空、词义选择、简短会话理解。语法题的scenario_ja是含___的完整句子，question_ja是「（　）に何を入れますか」",
      typeExample: "grammar",
      typeNote: "type按题型填写：语法题填 grammar，词汇题填 vocabulary，读解题填 reading",
      extraReq: "使用N3常用文型（〜てしまう、〜ために、〜ようにする等），贴近日常生活",
    },
    "JPT": {
      context: "JPT日语能力测试，综合阅读・语法・商务日常场景",
      style: "读解理解、语法选择、商务/日常场景填空混合出题",
      typeExample: "reading",
      typeNote: "type按题型填写：读解题填 reading，语法题填 grammar",
      extraReq: "JPT注重实用性，兼顾商务场景和日常表达",
    },
  };

  const cfg = configs[examType] ?? {
    context: `${examType}日语考试`,
    style: "综合阅读理解和语法题",
    typeExample: "reading",
    typeNote: "type填 reading 或 grammar",
    extraReq: "",
  };

  return `你是${examType}考试出题专家。请严格按照${examType}考试风格，生成${count}道高质量模拟题。

考试背景：${cfg.context}
出题风格：${cfg.style}

严格按照以下JSON数组格式返回，不要返回任何其他内容：
[
  {
    "type": "${cfg.typeExample}",
    "scenario_ja": "题目材料/场景/含___的语法句（日语）",
    "scenario_zh": "材料中文翻译（简短）",
    "question_ja": "问题（日语）",
    "question_zh": "问题（中文）",
    "options": [
      {"label": "A", "text_ja": "选项日语", "text_zh": "选项中文"},
      {"label": "B", "text_ja": "选项日语", "text_zh": "选项中文"},
      {"label": "C", "text_ja": "选项日语", "text_zh": "选项中文"},
      {"label": "D", "text_ja": "选项日语", "text_zh": "选项中文"}
    ],
    "answer": "正确选项label（A/B/C/D）",
    "explanation_zh": "解析：点明关键语法点/词义区别/考点，100字以内"
  }
]

要求：
1. 题目难度、场景、用词严格符合${examType}考试标准
2. ${cfg.typeNote}
3. ${cfg.extraReq}
4. 干扰项有迷惑性（形似但义不同，或语法相近但用法不同）
5. 每道题答案唯一且明确，解析指出关键考点
6. 只返回JSON数组，不要任何多余文字`;
}
