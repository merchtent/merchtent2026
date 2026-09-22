// app/old-page/page.tsx
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  robots: { index: false, follow: true },
  alternates: { canonical: '/artists' },
};

export default function Page() {
    redirect('/artists/spank-the-90s');
}
