import { Link } from 'react-router-dom';

const BabyCollection = () => {
  return (
    <section className="py-5">
      <div className="container">
        <h2 className="mb-4 text-center">Baby Collection</h2>
        <p className="text-center lead">Discover our adorable baby embroidery collection.</p>
        <div className="row">
          {/* Placeholder for baby-related pictures */}
          <div className="col-md-4 mb-4">
            <img src="/images/Baby_1.PNG" alt="Baby Item 1" className="img-fluid rounded shadow-sm" />
          </div>
          <div className="col-md-4 mb-4">
            <img src="/images/Baby_2.PNG" alt="Baby Item 2" className="img-fluid rounded shadow-sm" />
          </div>
          <div className="col-md-4 mb-4">
            <img src="/images/Baby_4.png" alt="Baby Item 3" className="img-fluid rounded shadow-sm" />
          </div>
        </div>
        <div className="text-center mt-4">
          <Link to="/collections" className="btn btn-contact-submit">Back to Collections</Link>
        </div>
      </div>
    </section>
  );
};

export default BabyCollection;