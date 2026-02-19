'use client';

import { type ReactNode } from 'react';
import { Drawer as DrawerPrimitive } from 'vaul';
import AppNav from '@/components/AppNav';

interface MobileDrawerProps {
  children: ReactNode;
}

export default function MobileDrawer({ children }: MobileDrawerProps) {
  return (
    <DrawerPrimitive.Root
      open
      modal={false}
      dismissible={false}
      handleOnly
      snapPoints={[0.15, 0.5, 0.92]}
      activeSnapPoint={0.5}
    >
      <DrawerPrimitive.Portal>
        <DrawerPrimitive.Content
          className="fixed inset-x-0 bottom-0 z-50 flex h-auto flex-col rounded-t-lg border-t bg-background max-h-[92vh] focus:outline-none"
        >
          <DrawerPrimitive.Title className="sr-only">Navigation</DrawerPrimitive.Title>
          <DrawerPrimitive.Handle className="bg-muted mx-auto mt-4 mb-1 h-1.5 w-[60px] shrink-0 rounded-full" />
          <nav className="px-4 pt-1 pb-2">
            <AppNav showLabels />
          </nav>
          <div className="overflow-y-auto flex-1 px-4 pb-4">
            {children}
          </div>
        </DrawerPrimitive.Content>
      </DrawerPrimitive.Portal>
    </DrawerPrimitive.Root>
  );
}
