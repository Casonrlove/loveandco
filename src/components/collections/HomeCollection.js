import { Link } from 'react-router-dom';

const HomeCollection = () => {
  return (
    <section className="py-5">
      <div className="container">
        <h2 className="mb-4 text-center">Home Collection</h2>
        <p className="text-center lead">Elevate your living space with our elegant home embroidery.</p>
        <div className="row">
          {/* Placeholder for home-related pictures */}
          <div className="col-md-4 mb-4">
            <img src="/images/Home_1.PNG" alt="Home Item 1" className="img-fluid rounded shadow-sm" />
          </div>
          <div className="col-md-4 mb-4">
            <img src="/images/Home_2.PNG" alt="Home Item 2" className="img-fluid rounded shadow-sm" />
          </div>
          <div className="col-md-4 mb-4">
            <img src="/images/Home_3.PNG" alt="Home Item 3" className="img-fluid rounded shadow-sm" />
          </div>
        </div>
        <div className="text-center mt-4">
          <Link to="/collections" className="btn btn-contact-submit">Back to Collections</Link>
        </div>
      </div>
    </section>
  );
};

export default HomeCollection;