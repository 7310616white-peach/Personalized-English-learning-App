# 给每日英语的手机提示词

首次设置和日常短提示词也能在 App“题包与数据”直接复制或导出。

## 首次设置

以后请在“每日英语”里为我的“拾词”App 生成学习文件，不依赖 Codex 对话内容。

每日生成 UTF-8 JSON 文件 daily-YYYYMMDD.json，给我真实可下载的附件。不要把答案写在下载前的聊天说明里。
如果当前无法创建附件，明确说明，再给纯 JSON；不要编造下载链接。我可复制 JSON 到拾词的“粘贴题包 JSON”。

每日内容：10 个 CET-4 词＋2 个生物统计/科研词，2–5 道原创阅读单选，按可用音频增加少量听力选择/听写。不要臆造不存在的录音。
无听力素材时 listening=[]，先完成单词和阅读。科研表述区分相关与因果。

严格遵守拾词 v2：
顶层仅使用 schemaVersion(2)、id、title、date(YYYY-MM-DD)、words、choices、listening，以及可选 glossary。
所有 ID 仅字母、数字、短横线、下划线，最多80字符；每日包用新ID。
words 每项必填 id、term、level(CET-4/CET-6/科研英语)、meaning；可提供 phonetic、otherMeanings(数组)、collocations(数组)、example、exampleTranslation、confusion、acceptedAnswers(数组)。
choices 每项必填 id、prompt、options([{id,text},...])、answerId、explanation；阅读放 passage。单选2–8项，答案必须存在。
glossary 是阅读/听力语境中可能不熟的词释义，格式与 words 相同，不算每日12个新词；供提交后的原文点词查询，尽量覆盖难词、词形与熟词生义，不复制完整商业词典。

listening 每组：id、libraryId、trackId、questions。
libraryId/trackId 必须来自我已导入并给你的“听力索引”；每天只引用音轨，不重新生成音频或修改材料清单。
听力题共用 id、origin(course-original/chatgpt-extra)、type、prompt、grading。
单选 type=listening-choice，另有 options:[{id,text},...]。
听写 type=listening-cloze，prompt 用 {{b1}} 等空位且每空只出现一次，blankIds:["b1",...]。
无标准答案的校内原题 grading={"status":"missing"}，不要猜一个答案充当标准答案。
未核对的参考单选 grading={"status":"draft","answerId":"B","explanation":"..."}。
未核对听写 grading={"status":"draft","acceptedAnswers":{"b1":["online"]},"explanation":"..."}。
只有确实人工核对后才用 verified。AI 新拟题先用 draft。
同一材料库的同一题ID必须永久对应相同题干、选项和评分内容；改题用新ID。复用原题时内容逐字保持一致。

最小结构示例（只示意结构，实际每日仍要10＋2词）：
{"schemaVersion":2,"id":"daily-YYYYMMDD","title":"今日英语","date":"YYYY-MM-DD","words":[{"id":"w01","term":"evidence","level":"CET-4","meaning":"n. 证据；依据","example":"We need more evidence.","exampleTranslation":"我们需要更多证据。","otherMeanings":[],"collocations":["provide evidence 提供证据"],"confusion":"通常不可数","acceptedAnswers":[]}],"choices":[{"id":"r01","passage":"Students use evidence to support an argument.","prompt":"What supports an argument?","options":[{"id":"A","text":"Evidence"},{"id":"B","text":"Noise"}],"answerId":"A","explanation":"原文指出使用证据支持论点。"}],"glossary":[{"id":"g01","term":"argument","level":"CET-4","meaning":"n. 论点；论证；争论"}],"listening":[]}

若需要首次导入听力：请先根据我提供的实际 WAV 文件名和 PPT，单独创建 library.json，不把音频塞进 JSON。
清单字段仅 format="english-pocket-listening-library"、schemaVersion=1、id、title、target(campus/CET-4/CET-6)、tracks。
每音轨字段 id、unit、section(news-report/conversation/passage-1/passage-2)、title、audioFile(原WAV完整文件名，不带路径)、transcript、segments:[]。
transcript 未知用 {"status":"missing","text":null}；推断文本用 draft；只有核对录音后用 verified。不能把不确定的PPT内容当真实原文。
材料库/音轨 ID 一次确定后保持不变；同一音轨不换录音。

生成前自查 JSON、字段、日期、唯一ID、选项答案、听写空位和已知音轨引用。不要增加作文/翻译等当前未实现题型。
我交回答题结果后，请逐题批改，区分本地暂评和确认答案，再调整明天的练习量。
首次收到此设置时，先简短确认；如果还不知道我已经导入哪些音频，请让我发送拾词导出的“听力索引”，不要虚构索引。

## 每天使用

按我们约定的拾词 v2 协议，生成今天的可下载 daily-YYYYMMDD.json：10个四级词＋2个生物统计/科研词，少量原创阅读单选，并根据已有听力索引安排校内听力练习。为文中的难词附 glossary，供答题后点词查询。没有可用音轨就 listening=[]。无标准答案的原题用 missing，未核对参考答案用 draft。自查格式和答案；不要在聊天说明中提前透露答案。

## v3 拓展练习

App“题包与数据”内可复制的提示词已升级为 v3，按需轮换选词、匹配、翻译、写作。
新格式见 [四级体验协议](CET_EXPERIENCE.md)，旧v1/v2仍可导入。
