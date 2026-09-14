import type { ReactNode } from 'react';

type TopNavigationProps = {
  children: ReactNode;
};

export function TopNavigation({ children }: TopNavigationProps) {
  return (
    <nav aria-label="Primary navigation" className="order-3 flex min-w-0 basis-full items-center gap-1 overflow-x-auto rounded-lg border border-[#49545d] bg-[#28333c] px-1 md:order-none md:basis-auto">
      {children}
    </nav>
  );
}
