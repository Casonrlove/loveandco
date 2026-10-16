import { getPublicWebsite } from '@/lib/public-data';
export const metadata = { title: 'Shop information' };
export default async function ShopInfoPage() {
  const { info } = await getPublicWebsite();
  return <main className="shop-info-page"><p className="eyebrow">A LITTLE HELP</p><h1>Good to know</h1>
    {[['faqs','Frequently asked questions'],['care','Caring for your embroidery'],['turnaroundPolicy','Turnaround & ordering']].map(([key,title]) => <section className="studio-panel" key={key} id={key}><h2>{title}</h2><p className="inquiry-text">{info[key] || 'Contact me for details.'}</p></section>)}
    <section className="studio-panel"><h2>Contact & local pickup</h2>{info.contactEmail && <p><a href={`mailto:${info.contactEmail}`}>{info.contactEmail}</a></p>}{info.contactPhone && <p>{info.contactPhone}</p>}{info.pickupEnabled && <p className="inquiry-text">{info.pickupInstructions}</p>}<a href="/contact">Send me a message</a></section>
  </main>;
}
