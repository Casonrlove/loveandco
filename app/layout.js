import './globals.css';
import { Cormorant_Garamond, Nunito_Sans } from 'next/font/google';
import { getPublicWebsite } from '@/lib/public-data';
import Footer from '@/components/Footer';
import Header from '@/components/Header';

const cormorant = Cormorant_Garamond({ subsets: ['latin'], style: ['normal', 'italic'], display: 'swap', variable: '--font-cormorant' });
const nunito = Nunito_Sans({ subsets: ['latin'], axes: ['opsz'], display: 'swap', variable: '--font-nunito' });

export const revalidate = 900;

export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://loveandco.vercel.app'),
  title: { default: 'Love & Co. Embroidery', template: '%s · Love & Co. Embroidery' },
  description: 'Custom embroidered keepsakes, made with care.',
  openGraph: { siteName: 'Love & Co. Embroidery', type: 'website', images: ['/images/homepage.jpg'] },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#eef4f8',
};

export default async function RootLayout({ children }) {
  const website = await getPublicWebsite();

  return (
    <html lang="en" data-scroll-behavior="smooth" className={`${cormorant.variable} ${nunito.variable}`}>
      <body>
        <a className="skip-link" href="#main-content">Skip to content</a>
        <Header announcement={website.announcement} ordersOpen={website.ordersOpen} pausedMessage={website.pausedMessage} />
        <div id="main-content" tabIndex={-1}>{children}</div>
        <Footer info={website.info} />
      </body>
    </html>
  );
}
