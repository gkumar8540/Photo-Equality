import type { ReactNode } from 'react';

type BottomNavigationProps = {
  children: ReactNode;
};

export function BottomNavigation({ children }: BottomNavigationProps) {
  return (
    <nav aria-label="Bottom navigation" className="flex items-center justify-center gap-4 border-t border-[#59636c] bg-[#26333d] p-3">
      {children}
    </nav>
  );
}
