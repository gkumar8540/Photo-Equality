import type { ReactNode } from 'react';

type SidebarNavigationProps = {
  children: ReactNode;
};

export function SidebarNavigation({ children }: SidebarNavigationProps) {
  return (
    <aside className="flex w-full flex-col border-r border-[#52606a] bg-[#202b34] p-4 lg:w-64">
      <nav aria-label="Sidebar navigation" className="flex flex-col gap-1">
        {children}
      </nav>
    </aside>
  );
}
