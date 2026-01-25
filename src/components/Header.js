import { Link } from 'react-router-dom';

const Header = () => {
  return (
    <header style={{ position: 'fixed', width: '100%', top: 0, zIndex: 1030 }}>
      {/* Top Announcement Bar */}
      <div className="top-bar text-dark p-1 text-center">
        <div className="container">
          <small>Free Shipping on Orders Over $75!</small>
        </div>
      </div>

      {/* Logo/Brand Section */}
      <div className="brand-section py-4 text-center">
        <div className="container">
          <Link className="navbar-brand" to="/">
            <img src="/images/homepage.jpg" alt="Love & Co. Embroidery Logo" style={{ height: '250px', maxWidth: '100%' }} />
          </Link>
          {/* Optional: Add a real image logo here later */}
        </div>
      </div>

      {/* Main Navigation Bar */}
      <nav className="navbar navbar-expand-lg navbar-light">
        <div className="container-fluid">
          {/* Toggler button for responsive navigation */}
          <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav" aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
            <span className="navbar-toggler-icon"></span>
          </button>
          <div className="collapse navbar-collapse" id="navbarNav">
            <ul className="navbar-nav mx-auto"> {/* Centered navigation */}
              <li className="nav-item">
                <Link className="nav-link" to="/">Home</Link>
              </li>
              <li className="nav-item">
                <Link className="nav-link" to="/about">About</Link>
              </li>
              <li className="nav-item">
                <Link className="nav-link" to="/collections">Collections</Link>
              </li>
              <li className="nav-item">
                <Link className="nav-link" to="/contact">Contact</Link>
              </li>
            </ul>
          </div>
        </div>
      </nav>
    </header>
  );
};

export default Header;
