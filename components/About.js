import Link from 'next/link';
import HowItWorks from './HowItWorks';

export default function About() {
  return (
    <main>
      <section className="section">
        <div className="container">
          <div className="about-story">
            <img src="/images/wedding_picture.JPG" alt="Anna Love, the heart and hands behind Love &amp; Co." />
            <div className="prose">
              <p className="eyebrow">About</p>
              <h1>Hi there, I’m Anna</h1>
              <p className="lede">The heart and hands behind Love &amp; Co. Embroidery.</p>
              <p>What started as a love for thoughtful details and meaningful keepsakes has grown into a small business dedicated to creating custom embroidered pieces that feel personal, timeless, and made just for you.</p>
              <p>When I’m not behind the embroidery machine, you’ll usually find me sipping on a good cup of coffee, baking something in my kitchen, or soaking up time with the people I love most. I’m inspired by slow moments, soft colors, and the beauty found in simple, intentional details.</p>
              <p>At Love &amp; Co. Embroidery, it’s always about the little things, because those are the ones that matter most. Every piece is created with care, creativity, and a whole lot of love, so it feels just as special as the moment it’s meant for.</p>
              <div className="about-actions">
                <Link className="btn btn--primary" href="/shop">Shop the collections</Link>
                <Link className="btn btn--secondary" href="/custom">Start a custom piece</Link>
              </div>
            </div>
          </div>
        </div>
      </section>
      <HowItWorks />
    </main>
  );
}
