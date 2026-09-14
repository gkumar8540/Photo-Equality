import type { ReactNode } from 'react';

type BreadcrumbNavigationProps = {
  children: ReactNode;
};

export function BreadcrumbNavigation({ children }: BreadcrumbNavigationProps) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-2 rounded-md border border-[#59646c] bg-[#303b43] px-4 py-2 text-sm text-[#d8d9d4]">
      {children}
    </nav>
  );
}
