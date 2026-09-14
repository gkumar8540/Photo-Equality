import type { ReactNode } from 'react';

type OrbitNavigationProps = {
  children: ReactNode;
};

export function OrbitNavigation({ children }: OrbitNavigationProps) {
  return (
    <nav aria-label="Orbit navigation" className="flex flex-wrap items-center gap-2 rounded-lg border border-[#66808d] bg-[#263f4b] p-2">
      {children}
    </nav>
  );
}
