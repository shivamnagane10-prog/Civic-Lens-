import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'CivicLens AI — Municipal Intelligence & Rapid Dispatch',
  description: 'AI-assisted civic infrastructure monitoring, classification and crew dispatch system.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" crossOrigin="" />
      </head>
      <body className="antialiased font-sans">{children}</body>
    </html>
  );
}
