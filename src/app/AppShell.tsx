import { useEffect, useRef, type ReactNode } from 'react';
import { pages, mobilePages, type Page } from './navigation';

export function AppShell({
  page,
  practicing,
  onNavigate,
  children,
}: {
  page: Page;
  practicing: boolean;
  onNavigate: (page: Page) => void;
  children: ReactNode;
}) {
  const main = useRef<HTMLElement>(null);
  useEffect(() => {
    document.title = `${practicing ? '练习中' : pages.find((p) => p.id === page)?.title} · 拾词`;
    main.current?.focus({ preventScroll: true });
  }, [page, practicing]);
  const navigation = (items: typeof pages) =>
    items.map((p) => (
      <button
        key={p.id}
        aria-current={page === p.id ? 'page' : undefined}
        disabled={practicing}
        onClick={() => onNavigate(p.id)}
      >
        <span className="nav-icon" aria-hidden="true">
          {p.icon}
        </span>
        {p.title}
      </button>
    ));
  return (
    <div className={'app-shell' + (practicing ? ' is-practicing' : '')}>
      <a className="skip-link" href="#main-content">
        跳至主要内容
      </a>
      <aside className="sidebar">
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            if (!practicing) onNavigate('home');
          }}
        >
          <img src="/icon.svg" alt="" />
          <span>
            拾词<small>ENGLISH POCKET</small>
          </span>
        </a>
        <p className="sidebar-caption">每天一点，慢慢走远</p>
        <nav aria-label="主导航">{navigation(pages)}</nav>
        <div className="local-note">
          <span className="status-dot" />
          本地学习空间<small>无需登录 · 自己的节奏</small>
        </div>
      </aside>
      <main id="main-content" tabIndex={-1} ref={main}>
        <header className="topbar">
          <span>{practicing ? '练习中' : pages.find((p) => p.id === page)?.title}</span>
          <span>离线优先</span>
        </header>
        <div className="main-content">{children}</div>
      </main>
      <nav className="mobile-nav" aria-label="手机导航">
        {navigation(mobilePages)}
      </nav>
    </div>
  );
}
