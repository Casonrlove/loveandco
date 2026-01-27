import { Link } from 'react-router-dom';

const GiftCollection = () => {
  return (
    <section className="py-5">
      <div className="container">
        <h2 className="mb-4 text-center">Gift Collection</h2>
        <p className="text-center lead">Find the perfect personalized gift for any occasion.</p>
        <div className="row">
          {/* Placeholder for gift-related pictures */}
          <div className="col-md-4 mb-4">
            <img src="/images/Gift_1.PNG" alt="Gift Item 1" className="img-fluid rounded shadow-sm" />
          </div>
          <div className="col-md-4 mb-4">
            <img src="/images/Gift_3.PNG" alt="Gift Item 2" className="img-fluid rounded shadow-sm" />
          </div>
          <div className="col-md-4 mb-4">
            <img src="/images/Gift_4.jpg" alt="Gift Item 3" className="img-fluid rounded shadow-sm" />
          </div>
        </div>
        <div className="text-center mt-4">
          <Link to="/collections" className="btn btn-contact-submit">Back to Collections</Link>
        </div>
      </div>
    </section>
  );
};

export default GiftCollection;