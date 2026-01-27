import { useEffect } from 'react';
import { Route, BrowserRouter as Router, Routes, useLocation } from 'react-router-dom';
import About from './components/About';
import Contact from './components/Contact';
import Footer from './components/Footer';
import Header from './components/Header';
import Home from './components/Home';
import Services from './components/Services'; // This is now the Collections overview page
import BabyCollection from './components/collections/BabyCollection';
import HomeCollection from './components/collections/HomeCollection';
import GiftCollection from './components/collections/GiftCollection';

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

function App() {
  return (
    <Router>
      <ScrollToTop />
      <Header />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/collections" element={<Services />} />
          <Route path="/collections/baby" element={<BabyCollection />} />
          <Route path="/collections/home" element={<HomeCollection />} />
          <Route path="/collections/gift" element={<GiftCollection />} />
          <Route path="/contact" element={<Contact />} />
        </Routes>
      </main>
      <Footer />
    </Router>
  );
}

export default App;
