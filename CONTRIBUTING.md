# 参与开发

欢迎同学提出改进。请保持小范围、可审阅的提交，并说明具体问题、改变后的行为、验证范围和未验证项。

- 先读 README、docs/ARCHITECTURE.md 与 docs/PACK_FORMAT.md。
- 页面按 feature 拆分，App 只做组装；不要把所有逻辑放进共享 utils 或单个页面。
- 纯规则放 domain；写入放 data 并保持事务；原生平台调用放 platform。
- 保留锁文件。修改依赖时说明原因，不顺便更新所有依赖。
- 维护源码保持可读，Prettier 目标行宽 100，不手工压缩代码。
- 使用虚构测试数据，不提交个人学习记录、备份、密钥、签名、缓存或论文全文。
- 改动数据协议必须考虑已有数据、备份兼容与恢复失败回滚。
- 不用 mock 成功状态掩盖存储失败，不把桌面浏览器通过写成真机已验证。

提交前运行：

```bash
pnpm test
pnpm build
pnpm format:check
```

涉及交互时运行 `pnpm test:e2e`。原生改动需要 Android 编译和受影响流程的真机验证。
详见 docs/TESTING.md。UI 小改不必写镜像实现的测试，事务与数据丢失风险必须有行为测试。
