import { cetLabels, cetTypesForDate } from '../../domain/daily';
import { localDate } from '../../domain/queue';

export const setupPrompt = `以后请在“每日英语”里为我的“拾词”App 生成学习文件，不依赖 Codex 对话内容。

每日生成 UTF-8 JSON 文件 daily-YYYYMMDD.json，给我真实可下载的附件。不要把答案写在下载前的聊天说明里。
如果当前无法创建附件，明确说明，再给纯 JSON；不要编造下载链接。我可复制 JSON 到拾词的“粘贴题包 JSON”。

每日内容按我的六项学习台安排：
01 今日词汇：10个CET-4词＋2个生物统计/科研词。
02 间隔复习：由App按已有答题记录安排，不要靠新建重复题包代替复习。
03 听力训练：每天都做，有校考先校考，否则四级；只引用已提供的听力索引，不臆造录音。
04 四级习题每日练：仔细阅读、选词填空、信息匹配每天三选二，默认按下面日历轮换；段落翻译每三天一次。不要安排作文，想写时我会单独提出。
05 每日文献阅读练：一段生物统计/科研英文＋2道理解题；可用已提供文献，或明确标注原创模拟摘要，不能编造论文或DOI。区分相关与因果。
06 每日翻译一句：一个科研/日常中文句子译成英文，与段落翻译分开；附参考译文和表达讲解。
另附一篇120–180词原创范文和表达说明，收在范文栏，供阅读积累，不要求写作文。

日期轮换从2026-10-22为第0天，每三个自然日循环：
余数0：仔细阅读＋选词填空；余数1：信息匹配＋仔细阅读；余数2：选词填空＋信息匹配，再加一篇段落翻译。
例如2026-10-22为余数0，10-23为1，10-24为2，10-25回到0。按用户手机当地日期，不能用UTC日期提前换日。
仔细阅读可一篇3–5题；选词填空10空15词；匹配一篇10题；总体以能持续完成为准。
无听力素材时 listening=[]，先完成单词和阅读。科研表述区分相关与因果。

严格遵守拾词 v3（仍兼容旧v1/v2）：
顶层仅使用 schemaVersion(3)、id、title、date(YYYY-MM-DD)、words、choices、listening、written、daily，以及可选 glossary。
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

written 是拓展任务数组。每项必填 id、type、title、instructions、source（注明原创/来源，不把仿真写成真题）。
1. type="word-bank"：passage 用 [[q1]] 标记每空；options:[{id,text}]；questions:[{id:"q1",prompt:"第1空",answerId:"A",explanation:"..."}]。每题恰好一个空标记；答案引用选项ID，不重复用词。
2. type="matching"：paragraphs:[{id:"A",text:"段落原文"},...]；questions:[{id:"q1",prompt:"英文陈述",answerId:"A",explanation:"..."}]。答案引用段落ID，允许重复。
3. type="translation"：prompt 为中文原文，reference 为参考译文，explanation 为要点。
4. type="writing"：prompt 为作文题目，reference 为范文，explanation 为思路，minWords:120,maxWords:180。
选词/匹配本地按参考答案判分；作文/翻译仅保存为待批改，不自动打分。写作不放入每日任务，只有我单独要求时才添加。

daily 必须用于把内容放进六项任务：
{cet:[...],researchChoiceIds:["research01","research02"],sentenceTaskId:"sentence01",modelEssays:[...]}
cet 是当天2或3个任务：仔细阅读填 {"type":"choice","choiceIds":["cet01",...] }；选词/匹配/段落翻译填 {"type":"word-bank或matching或translation","taskId":"对应written任务ID"}。
只放当天的阅读搭配，余数2再加段落翻译；不放writing。各任务ID必须真正存在，文献与仔细阅读不能引用同一题。
文献题放choices，完整英文短文放passage；daily.researchChoiceIds指向它们。原文中注明真实来源或原创模拟，不能把虚构摘要当论文。
每日一句是独立type=translation任务，daily.sentenceTaskId引用它；不能和段落翻译共用同一任务。
daily.modelEssays每篇必填{id,title,topic,body,notes,source}；body范文，notes中文表达与结构，source标来源/原创。

glossary 尽量覆盖科研原文里的难词，以便提交后点词查询。
可下载协议示例在拾词“我的”查看。只给JSON附件；字段完全按本提示词，生成后逐项验证引用。

若需要首次导入听力：请先根据我提供的实际 WAV 文件名和 PPT，单独创建 library.json，不把音频塞进 JSON。
清单字段仅 format="english-pocket-listening-library"、schemaVersion=1、id、title、target(campus/CET-4/CET-6)、tracks。
每音轨字段 id、unit、section(news-report/conversation/passage-1/passage-2)、title、audioFile(原WAV完整文件名，不带路径)、transcript、segments:[]。
transcript 未知用 {"status":"missing","text":null}；推断文本用 draft；只有核对录音后用 verified。不能把不确定的PPT内容当真实原文。
材料库/音轨 ID 一次确定后保持不变；同一音轨不换录音。

生成前自查 JSON、字段、日期、唯一ID、选项答案、听写空位和已知音轨引用。按当天轮换填好daily.cet，并包含文献题、独立每日一句和范文。音频不够就明确告诉我去补充，不要假装每日听力完成。
我交回答题结果后，请逐题批改，区分本地暂评和确认答案，再调整明天的练习量。
首次收到此设置时，先简短确认；如果还不知道我已经导入哪些音频，请让我发送拾词导出的“听力索引”，不要虚构索引。`;

export function dailyPromptForDate(now = new Date()) {
  const day = localDate(now);
  const types = cetTypesForDate(day)
    .map((t) => cetLabels[t])
    .join('＋');
  return `按已约定的拾词v3每日流程，生成${day}可下载JSON附件，所有ID使用新日期：10个四级词＋2个科研词；每天听力（校考优先，引用真实听力索引）；今天四级安排为${types}；一段文献/科研英文加2题，原文标真实来源或原创模拟；每天独立翻译一句；另附一篇阅读用范文与表达说明。不要安排作文。daily.cet放今天的2或3项任务，researchChoiceIds引用文献选择题，sentenceTaskId指向独立句子翻译，modelEssays存范文；各引用都必须有效，文献题与四级阅读分开。附glossary。没有可用录音则listening=[]并明确提醒补充，不虚构音频，不猜校考标准答案；未核对听力参考用draft。检查JSON和协议，不在下载前透露答案。`;
}
