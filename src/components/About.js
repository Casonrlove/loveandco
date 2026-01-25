import React from 'react';

const About = () => {
  return (
    <section className="py-5">
      <div className="container">
        <div className="row align-items-center">
          <div className="col-md-6 order-md-2">
            <img src="https://picsum.photos/500/400" className="img-fluid" alt="About Love & Co. Embroidery" />
          </div>
          <div className="col-md-6 order-md-1">
            <h2 className="mb-4">About</h2>
            <p>
              Love & Co. Embroidery is dedicated to providing high-quality, custom embroidery services for businesses, organizations, and individuals. With years of experience and a passion for craftsmanship, we transform your designs and logos into stunning, durable embroidered apparel and accessories.
            </p>
            <p>
              Our commitment to excellence ensures every stitch is perfect, delivering results that not only look great but also stand the test of time. We pride ourselves on our attention to detail, personalized customer service, and efficient project turnaround.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default About;
