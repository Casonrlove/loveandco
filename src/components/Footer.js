import React from 'react';
import { Instagram, Envelope } from 'react-bootstrap-icons';

const Footer = () => {
  return (
    <footer className="bg-dark text-white p-4 text-center">
      <div className="container">
        <p>&copy; {new Date().getFullYear()} Love & Co. Embroidery. All Rights Reserved.</p>
        <div>
          <a href="mailto:loveandcoembroidery@gmail.com" className="text-white me-3">
            <Envelope size={24} />
          </a>
          <a href="https://www.instagram.com/loveandcoembroidery" target="_blank" rel="noopener noreferrer" className="text-white me-3">
            <Instagram size={24} />
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
