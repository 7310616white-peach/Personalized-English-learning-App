/** Describe the observed failure without blaming the database for a missing Web chunk. */
export function appFailure(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const name = error instanceof Error ? error.name : '';
  if (
    /dynamically imported module|loading chunk|importing a module script|failed to load module/i.test(
      message,
    )
  )
    return {
      title: '页面资源已更新',
      detail: '当前页面还在使用旧版资源，请重新加载。重新加载不会清理已保存的题包和学习记录。',
      action: '重新加载页面',
    };
  if (
    /database|indexeddb|学习库|存储/i.test(message) ||
    /DatabaseClosedError|VersionError|QuotaExceededError|SecurityError|InvalidStateError|OpenFailedError/.test(
      name,
    )
  )
    return {
      title: '暂时无法打开学习库',
      detail: '请检查浏览器存储限制或设备空间。应用不会在这里清空或重置已保存的数据。',
      action: '重新尝试',
    };
  return {
    title: '页面暂时无法打开',
    detail:
      '页面遇到问题，请重新打开。应用不会主动清空学习库；若问题重复出现，请保留错误发生时的操作步骤。',
    action: '重新尝试',
  };
}
