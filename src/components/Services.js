import React from 'react';

const Services = () => {
  return (
    <section className="py-5">
      <div className="container">
        <h2 className="text-center mb-4">Collections</h2>
        <div className="row">
          <div className="col-md-4 mb-4">
            <div className="card h-100">
              <div className="card-body text-center">
                <h5 className="card-title">Custom Embroidery</h5>
                <p className="card-text">Bring your unique designs to life on a wide range of fabrics and apparel.</p>
              </div>
            </div>
          </div>
          <div className="col-md-4 mb-4">
            <div className="card h-100">
              <div className="card-body text-center">
                <h5 className="card-title">Corporate Apparel</h5>
                <p className="card-text">Professional branding for your team uniforms, hats, and promotional items.</p>
              </div>
            </div>
          </div>
          <div className="col-md-4 mb-4">
            <div className="card h-100">
              <div className="card-body text-center">
                <h5 className="card-title">Digitizing Services</h5>
                <p className="card-text">Transforming your logos and artwork into high-quality embroidery files.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Services;
