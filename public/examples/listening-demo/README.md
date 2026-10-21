# 原创体验题库

这是一套用于体验 App 的短练习，不是校内原题、CET 真题或难度测评。

- `library.json`：四段材料清单与配套朗读文本。
- `daily.json`：12 个词、2 道阅读选择、8 道听力选择与 4 道双空听写。
- `news.wav`、`conversation.wav`、`sleep.wav`、`survey.wav`：英语合成朗读。

推荐在 App 的“听力训练”点击“载入模拟体验题库（含音频）”。
手动导入则先在听力页面导入 library.json 与四个 WAV，再在“题包与数据”导入 daily.json。
不使用备份恢复导入体验内容，避免替换自己的学习数据。

题目与答案根据这里的原创文本编写，verified 表示已按配套文本核对，不能代表真人考试录音验证。
对话目前由同一合成声音朗读。原文和答案在 App 提交整组之后显示，JSON 本身不是加密试卷。

语音在 macOS 使用已安装的 Samantha 声音、每分钟 145 词生成；未调用网络语音或付费 API。
文本在 library.json，可重新合成，不需要读取私人文件。每个音轨可用以下命令生成：

```bash
say -v Samantha -r 145 -f transcript.txt -o speech-16.wav --file-format=WAVE --data-format=LEI16@16000
afconvert -f WAVE -d UI8@16000 speech-16.wav output.wav
```

WAV 使用 16 kHz、单声道、8 位 PCM，整体约 1.4 MB。真实课程材料继续仅在本地导入。
