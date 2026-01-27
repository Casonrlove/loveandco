import { Link } from 'react-router-dom';

const Services = () => {
  return (
    <section className="py-5">
      <div className="container">
        <h2 className="mb-4 text-center">Collections</h2>
        <div className="row">
          {/* Baby Collection Card */}
          <div className="col-md-4 mb-4">
            <div className="card h-100 shadow-sm">
              <img src="/images/Baby_1.PNG" className="card-img-top" alt="Baby Collection" />
              <div className="card-body text-center d-flex flex-column">
                <h5 className="card-title">Baby Collection</h5>
                <p className="card-text">Adorable and personalized embroidery for the little ones.</p>
                <Link to="/collections/baby" className="btn btn-contact-submit mt-auto">View Collection</Link>
              </div>
            </div>
          </div>
          {/* Home Collection Card */}
          <div className="col-md-4 mb-4">
            <div className="card h-100 shadow-sm">
              <img src="/images/Home_1.PNG" className="card-img-top" alt="Home Collection" />
              <div className="card-body text-center d-flex flex-column">
                <h5 className="card-title">Home Collection</h5>
                <p className="card-text">Elegant embroidery pieces to beautify your living space.</p>
                <Link to="/collections/home" className="btn btn-contact-submit mt-auto">View Collection</Link>
              </div>
            </div>
          </div>
          {/* Gift Collection Card */}
          <div className="col-md-4 mb-4">
            <div className="card h-100 shadow-sm">
              <img src="/images/Gift_1.PNG" className="card-img-top" alt="Gift Collection" />
              <div className="card-body text-center d-flex flex-column">
                <h5 className="card-title">Gift Collection</h5>
                <p className="card-text">Thoughtful and customized gifts for every special occasion.</p>
                <Link to="/collections/gift" className="btn btn-contact-submit mt-auto">View Collection</Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Services;
