# 题包、结果与备份协议

## 题包 v1

运行时的唯一协议定义在 `src/domain/models.ts`，可读示例见 `public/examples/day-001.json`。
版本不兼容时拒绝导入，不通过猜测字段悄悄转换。

| 字段          | 约束                                                               |
| ------------- | ------------------------------------------------------------------ |
| schemaVersion | 必须为数字 1                                                       |
| id            | 1–80 个字母、数字、下划线或短横线；全库唯一；内部生词本 ID 保留    |
| title         | 非空字符串                                                         |
| date          | 有效 YYYY-MM-DD 日期；作为题包标注与排序，不是学习任务自动发布时间 |
| words         | 单词数组，最多 500 条                                              |
| choices       | 选择题数组，最多 500 条                                            |

words 和 choices 可以分别为空，但题包总题数必须大于 0。
同包内所有题目 ID 唯一。重复题包 ID 拒绝覆盖，以免改变历史答案的含义。
单题包文件上限 10 MB，完整备份文件上限 50 MB。未约定字段拒绝导入；错误会显示字段位置。

单词字段：

- 必填：id、term、level（CET-4 / CET-6 / 科研英语）、meaning。
- 可选：phonetic、otherMeanings 数组、collocations 数组、example、exampleTranslation、confusion、acceptedAnswers 数组。
- 每日学习包应提供完整例句、搭配、辨析。自填生词允许暂时没有例句。
- acceptedAnswers 仅用于有依据的替代拼法，不要把错误拼写加进去。

选择题字段：

- id、prompt、options、answerId、explanation 必填；passage 可选。
- options 为 2–8 个 `{id, text}`；选项 ID 唯一，answerId 必须存在。
- 当前只支持单选；篇章阅读可使用 passage + 单选题，暂不支持多题共享篇章模型。

公开示例全部为原创学习材料，不包含未获许可的真题、论文全文或付费教材。

## 结果 v1

`format: english-pocket-results`，包含导出时间、原始答题、题干、阅读材料、选项与参考答案。
用于交给 ChatGPT 批改，不可作为恢复文件。多次作答保留为多条记录，不只导出最后一次。
文本导出使用相同信息，不包含整份词库和未提交草稿。

## 完整备份 v1

`format: english-pocket-backup`、`version: 1`，包含 packs、attempts、progress、drafts 全部四表。
备份保存原始题包，因此恢复后仍可判断历史作答语境。

恢复先校验已知版本、键唯一、题目引用和时间字段；确认后在事务中替换当前库。
结果文件、缺失题目、重复记录和未知版本均拒绝，原数据保持可用。
不支持 v1 与未知未来版本自动合并。请在恢复前另存当前备份。
