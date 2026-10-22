# Android 1.0 发布流程

默认Web和Android构建隐藏所有内置示例载入及题型演示入口；开发者可显式使用 `pnpm build:demo`。
正常题包导入、听力材料导入、备份恢复、既有学习历史和拓展错题练习保留。
隐藏入口不删除数据库，也不自动移除用户已经导入的题包。

## 构建与签名分离

GitHub Actions 使用 `assembleRelease` 构建未签名release APK，并校验ZIP对齐；构建产物仅包含未签名APK和SDK的apksigner工具。
不在公开仓库、CI日志或公开Actions产物里放私人签名密钥。

本机使用官方Java运行时和SDK apksigner完成签名与验证：

```bash
node scripts/sign-android.mjs --java /absolute/path/to/java --apksigner /absolute/path/to/apksigner.jar --input /absolute/path/to/app-release-unsigned.apk --out /absolute/path/to/signed.apk
```

首次建立私人发布密钥时显式加 `--initialize-key`。只有首次使用，不作为找不到旧密钥的常规修复。
脚本将密钥和随机口令留在项目的 `private-signing/`（目录700、文件600），已被Git忽略。
保存整个私密目录的私人备份；未来更新必须用同一密钥，不能重新生成一个冒充兼容升级。
不要把私密目录放进源码ZIP、普通说明附件或云端公开产物。

1.0使用固定发布签名，applicationId继续为 `io.github.englishpocket.app`。
旧0.2/0.3/0.4随机debug签名与发布签名不同，不能直接覆盖；旧安装先保留，先导出并确认完整备份。
不能为解决安装冲突直接清空数据库或未备份卸载。

## 验证边界

执行核心测试、开发演示模式的完整流程、正式模式的入口隐藏/正常导入/错题复习测试、构建和格式检查。
最后检查实际APK的版本、applicationId、release非debug状态、Web资源与签名。
签名与构建通过不等于Nothing手机的手势、键盘、分享已通过真机验收；本次供当天试用。
