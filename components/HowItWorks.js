import TurnaroundNote from './TurnaroundNote';

/**
 * The customer-facing order flow. Wording tracks the real pipeline:
 * pending review -> Venmo requested -> paid/queued -> started -> shipped.
 */
const steps = [
  {
    title: 'Choose your piece',
    body: 'Pick something from the collections or start a custom order. Names, monograms, thread colors and placement are all chosen as you go, so the details are set before anything is stitched.',
  },
  {
    title: 'I review your order',
    body: 'Nothing is charged up front. I check the details, quote anything custom, then send a Venmo request for the total.',
  },
  {
    title: 'It goes on the machine',
    body: 'Production starts once payment comes through. The ready-by date shown across the site is my real studio finish date, worked out from the nights I am actually at the machine.',
  },
  {
    title: 'Made and shipped',
    body: 'Each piece is stitched, checked and packed by hand. Shipped orders go out with a tracking number, and you can follow the whole process from your account.',
  },
];

export default function HowItWorks() {
  return (
    <section className="section section--band">
      <div className="container">
        <div className="section-head">
          <p className="eyebrow">How it works</p>
          <h2>From your idea to your doorstep</h2>
          <p className="lede">Every order is made to order, one at a time. Here is what happens after you send it.</p>
        </div>
        <ol className="step-grid">
          {steps.map((step, index) => (
            <li className="step" key={step.title}>
              <span className="step-number" aria-hidden="true">{index + 1}</span>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </li>
          ))}
        </ol>
        <TurnaroundNote />
      </div>
    </section>
  );
}
