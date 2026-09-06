import './globals.css';
import { getPublicWebsite } from '@/lib/public-data';
import Footer from '@/components/Footer';
import Header from '@/components/Header';
import { getPublicTurnaround } from '@/lib/schedule-service';

export const revalidate = 900;

export const metadata = {
  title: 'Love & Co. Embroidery',
  description: 'Custom embroidered keepsakes, made with care.',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#eef4f8',
};

export default async function RootLayout({ children }) {
  const [turnaround, website] = await Promise.all([getPublicTurnaround(), getPublicWebsite()]);

  return (
    <html lang="en" data-scroll-behavior="smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        <a className="skip-link" href="#main-content">Skip to content</a>
        <Header turnaround={turnaround} />
        {(website.announcement || !website.ordersOpen) && <aside className="shop-announcement" aria-label="Shop announcement">{website.announcement && <p>{website.announcement}</p>}{!website.ordersOpen && <p>{website.pausedMessage}</p>}</aside>}
        <div id="main-content" tabIndex={-1}>{children}</div>
        <Footer />
      </body>
    </html>
  );
}
