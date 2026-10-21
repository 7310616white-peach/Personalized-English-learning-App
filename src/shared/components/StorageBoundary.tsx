import { Component, type ReactNode } from 'react';

export class StorageBoundary extends Component<{ children: ReactNode }, { error: boolean }> {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  render() {
    return this.state.error ? (
      <main className="storage-error card">
        <h1>暂时无法打开学习库</h1>
        <p>请检查是否处于限制存储的浏览模式，或设备空间是否不足。已保存的数据不会在此处被清除。</p>
        <button onClick={() => location.reload()}>重新尝试</button>
      </main>
    ) : (
      this.props.children
    );
  }
}
