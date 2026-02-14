import { createSupabaseBrowserClient } from '@/lib/supabase';
import { redirect } from 'next/navigation';
import './globals.css';

export const metadata = {
  title: 'Flow Productions Portal',
  description: 'Social Media Agent Pipeline Portal',
  icons: {
    icon: '/logo.png',
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
