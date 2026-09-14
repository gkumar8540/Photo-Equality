import type { ReactNode } from 'react';

type MobileNavigationProps = {
  children: ReactNode;
};

export function MobileNavigation({ children }: MobileNavigationProps) {
  return (
    <nav aria-label="Mobile navigation" className="flex items-center justify-around border-t border-[#5b6770] bg-[#2d3842] p-3 md:hidden">
      {children}
    </nav>
  );
}
