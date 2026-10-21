# 拾词 · Personalized English Learning App

一个面向个人的中文英语学习工具：本地保存、离线练习，无需注册。
使用 React、TypeScript、Vite 和 Capacitor，先维护可运行的 Web MVP，再验证 Android APK。

## 当前版本

已实现单词拼写、JSON 题包导入、选择题、间隔复习、错题记录、结果导出、完整备份恢复、阅读查词及听力训练。
示例包含 10 个 CET-4 单词、2 个科研英语词和 2 道原创选择题。
题包支持 CET-6 标签；完整六级课程、选词填空、信息匹配、翻译和写作尚未实现。

阅读题提交后可直接点原文/题干/选项中的英文词，弹出本地释义；听力提交后的原文同样支持。
查词使用已导入词汇、题包可选 glossary 语境释义和内置基础词表，未收录时明确提示并可主动打开在线词典。
独立“阅读查词”页面及导航已移除，收藏词及旧记录保留。
Android 外部阅读器若支持选中文字的 `ACTION_PROCESS_TEXT` 菜单，可通过“拾词查词”显示释义浮层。

练习页面非控件区域左右横滑都保存退出；Android 系统两侧返回采用 AndroidX 分发。
题包可通过文件选择、粘贴 JSON，以及 Android 文件分享/打开方式导入；确认前不会写入。
手机每日流程、音频对应和可复制提示词见 [手机使用说明](docs/PHONE_WORKFLOW.md)，App“题包与数据”也可直接查看。
Nothing OS 手势、原生文件分享和外部阅读器仍需真机验收，不把浏览器检查当成手机兼容性认证。

## 校内考试听力

想先体验：打开“听力训练”，点击“载入模拟体验题库（含音频）”。
包含四段原创英文合成朗读、8 道听力选择、4 道双空听写，另有 12 个单词和 2 道阅读选择。
重复载入保留已有记录；首次资源缓存完成后可离线载入和练习，不需要恢复或清空学习库。

已加入同一 App：材料清单 + WAV 本地导入、离线播放器、重播/循环/倍速、整组单选与听写、
答案/解析/原文提交后显示、错因备注、逐题复习、每日 v2 题包、结果导出和带音频的 ZIP 备份。
旧 v1 题包与记录保持可用。没有标准答案的原题标记待批改，AI 参考答案标记暂评。

使用步骤与限制见 [听力模块](docs/LISTENING.md)，原创格式示例见
[材料清单](public/examples/listening-library.json) 与 [每日题包](public/examples/listening-day.json)。
仓库不附带真实课程 PPT/WAV，需在本机导入；示例不能代替课程内容核对。
Android 音频与文件适配已写入，仍须真机验证；逐句精听界面留作后续。

## 本地运行

需要 Node.js 24+、pnpm 11.25.0。依赖安装遵循仓库锁文件。安装显式执行，运行脚本不会隐式重建或下载依赖。

```bash
pnpm install --frozen-lockfile
pnpm dev
```

打开终端显示的本机地址，默认是 `http://127.0.0.1:5173`。
启动不会导入模拟内容；在“题包与数据”中主动载入示例或选择自己的 JSON 文件。

验证生产构建与离线缓存：

```bash
pnpm build
pnpm preview --port 4173
```

首次联网打开生产预览并等待资源缓存完成后，可断网重开。
开发服务不提供离线缓存。保持相同协议、域名、端口，浏览器数据才能继续使用。
Android 打包时 Web 资源随 App 安装，无需访问开发服务。

## 代码从哪里看

```text
src/
  app/                    应用组装、导航外壳、本地数据订阅
  features/
    dashboard/            学习台
    practice/             答题界面与草稿/提交 Hook
    library/              词汇手册与错题本
    reading/              题后原位释义、浮层与基础词表
    listening/            听力导入、播放器、整组答题与复习
    transfer/             题包、结果、备份的交互
  domain/                 数据契约、判题、复习算法、队列与查词规则
  data/                   Dexie 数据库、事务与文件数据服务
  platform/               浏览器/Android 文件导出与外部选词桥接
  shared/                 通用组件与分区样式
public/examples/          原创示例题包
android/                  Capacitor 原生工程与选词插件
scripts/                  开发与数据契约工具
tests/                   核心测试与手机尺寸浏览器测试
docs/                    架构、数据格式、测试与后续计划
```

目录按职责分层，页面按功能组织。业务状态变更集中在数据服务；判题和复习规则可独立测试。
请从 [架构说明](docs/ARCHITECTURE.md)、[题包协议](docs/PACK_FORMAT.md) 和
[测试说明](docs/TESTING.md) 开始审阅。

## ChatGPT 协作流程

1. 将 [生成题包提示词](docs/PACK_PROMPT.md) 和 [格式示例](public/examples/day-001.json) 交给 ChatGPT。
2. 下载不含 Markdown 代码围栏的 JSON 文件，在 App 中导入。
3. 完成练习后导出文本或结果 JSON，再交给 ChatGPT 批改。
4. 另行导出完整备份，保存到 App 之外，用于重装和换机恢复。

不会连接 ChatGPT 账号，没有 API 密钥、模型请求、登录服务、分析埋点或付费接口。
AI 生成的题目与参考答案仍需要人工核对。

## 验证

```bash
pnpm test
pnpm build
pnpm format:check
pnpm exec playwright install chromium
pnpm test:e2e
```

浏览器测试使用独立的虚构数据，不读取个人学习库。
测试结果的范围与真机检查步骤见 [TESTING.md](docs/TESTING.md)。

## Android

原生工程已生成。安装符合 Capacitor 8 要求的 Android Studio 与 Android SDK 后：

```bash
pnpm android:sync
pnpm exec cap open android
```

也可在配置好 JDK/SDK 后运行 `cd android && ./gradlew assembleDebug`。
当前开发机尚未安装 Android SDK，因此本地尚未编译 APK。
0.3.0 已通过 [Android 云端构建与签名检查](https://github.com/7310616white-peach/Personalized-English-learning-App/actions/runs/39650128103)，
手机手势与外部文件接收尚未通过 Nothing 真机验收。
仓库提供 Android debug 构建工作流，相关主分支代码更新时运行，也支持手动触发；
实际成功与否以该次 Actions 日志为准，成功后从运行页面 Artifacts 下载 APK 压缩包。
CI 的 debug 签名用于体验，不承诺跨构建签名一致；更换构建或签名前先导出完整备份。
已确认 0.3.0 与旧 0.2.1 CI 测试包签名不同，不能直接覆盖；请保留旧安装，勿直接卸载或清理记录。
正式使用前完成 [Android 验收清单](docs/TESTING.md#android-真机验收)。
升级时应使用相同 applicationId 和签名，避免变成另一份 App 或无法覆盖安装。

## 数据保存

IndexedDB 保存在当前浏览器或 App 的本地空间。保存成功提示在事务提交后显示。
浏览器清理、存储回收、卸载和重装仍可能删除数据，不能用本地持久化代替外部备份。
恢复前先导出当前完整备份，恢复时明确确认替换；不支持自动云同步。
Android 系统自动备份已关闭，备份由使用者主动导出。

## 贡献与许可证

欢迎通过 Issue 和 Pull Request 提出改进。请阅读 [CONTRIBUTING.md](CONTRIBUTING.md)。
单 WAV 上限 128 MB，完整听力 ZIP 备份上限 256 MB；详细支持范围见听力模块文档。

源代码与原创示例使用 [MIT License](LICENSE)。请勿提交自己的学习结果、论文全文、备份、密钥或签名文件。
