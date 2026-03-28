import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import '@/app/globals.css';

export const metadata: Metadata = {
  title: 'Bin',
  description: 'Capture everything. Let Bin do the organizing.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
