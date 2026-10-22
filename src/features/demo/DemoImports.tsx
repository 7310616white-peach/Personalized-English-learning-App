import { loadDailyPreview } from '../../data/dailyPreview';
import { importPack } from '../../data/learning';
import example from '../../../public/examples/day-001.json';
export default function DemoImports({
  run,
  setMessage,
}: {
  run: (action: () => Promise<void>) => Promise<void>;
  setMessage: (message: string) => void;
}) {
  return (
    <>
      {' '}
      <button
        className="secondary"
        onClick={() =>
          run(async () => {
            await loadDailyPreview();
            setMessage('每日流程预览已载入，回到学习台试试六项任务。');
          })
        }
      >
        载入每日六项流程预览（含音频）
      </button>
      <button
        className="secondary"
        onClick={() =>
          run(async () => {
            await importPack(example);
            setMessage('示例题包已导入，可以开始练习。');
          })
        }
      >
        载入示例：10 个四级词 + 2 个科研词
      </button>
      <a href="/examples/day-001.json" download>
        下载题包格式示例 ↗
      </a>
    </>
  );
}
