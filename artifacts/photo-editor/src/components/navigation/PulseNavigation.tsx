import type { ReactNode } from 'react';

type PulseNavigationProps = {
  children: ReactNode;
};

export function PulseNavigation({ children }: PulseNavigationProps) {
  return (
    <nav aria-label="Pulse navigation" className="flex items-center justify-between gap-3 border-l-4 border-[#f3ad61] bg-[#493525] px-4 py-3">
      {children}
    </nav>
  );
}
