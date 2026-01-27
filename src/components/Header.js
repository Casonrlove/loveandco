import Container from 'react-bootstrap/Container';
import Nav from 'react-bootstrap/Nav';
import Navbar from 'react-bootstrap/Navbar';
import { Link } from 'react-router-dom';

const Header = () => {
  return (
    <header>
      {/* Top Announcement Bar */}
      <div className="top-bar text-dark px-1 text-center">
        <div className container>
          <small>Turnaround Time: 2-3 weeks + shipping!</small>
        </div>
      </div>

      {/* Logo/Brand Section */}
      <div className="brand-section py-2 text-center">
        <div className="container">
          <Link className="navbar-brand" to="/">
            <img src="/images/Logo.png" alt="Love & Co. Embroidery Logo" style={{ height: '150px', maxWidth: '100%' }} />
          </Link>
          {/* Optional: Add a real image logo here later */}
        </div>
      </div>

      {/* Main Navigation Bar */}
      <Navbar expand="lg" variant="light" className="custom-navbar">
        <Container fluid>
          <Navbar.Toggle aria-controls="basic-navbar-nav" />
          <Navbar.Collapse id="basic-navbar-nav">
            <Nav className="mx-auto"> {/* Centered navigation */}
              <Nav.Link as={Link} to="/">Home</Nav.Link>
              <Nav.Link as={Link} to="/about">About</Nav.Link>
              <Nav.Link as={Link} to="/collections">Collections</Nav.Link>
              <Nav.Link as={Link} to="/contact">Contact</Nav.Link>
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>
    </header>
  );
};

export default Header;
