import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Issue Tracker',
  description: 'Internal issue tracker with Kanban board',
};

export default function RootLayout({
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

