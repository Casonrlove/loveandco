import Carousel from 'react-bootstrap/Carousel'; // Import Carousel
import { Link } from 'react-router-dom';

const Home = () => {
  return (
    <> {/* Use React Fragment to return multiple top-level elements */}
      {/* Existing Hero Section */}
    <section className="hero-section text-white text-center d-flex align-items-center" style={{ backgroundImage: "url('/images/hunter.JPG')", backgroundSize: '100% auto', backgroundRepeat: 'no-repeat', backgroundPosition: 'center', minHeight: '60vh' }}>
        <div className="background-overlay d-flex align-items-center w-100 h-100">
          <div className="container">
            {/* All text elements removed as requested */}
          </div>
        </div>
      </section>

      {/* Welcome Message Section */}
      <section className="py-5 welcome-section-bg">
        <div className="container">
          <div className="row align-items-center">
            <div className="col-md-6 mb-4">
              <img src='/images/wedding_picture.JPG' className="img-fluid" alt="Anna Love - Owner" style={{ maxHeight: '600px', maxWidth: '100%', height: 'auto' }} />
            </div>
            <div className="col-md-6">
              <h2 className="text-accent-blue">Welcome to Love & Co. Embroidery</h2>
              {/* <p className="lead mb-4">Where bespoke embroidery meets timeless design.</p> */}

              {
                <p className="mb-3">
                Hi friends & welcome to @loveandcoembroidery! From the bottom of my heart THANK YOU for being here. Whether it’s a gift, a keepsake, or a little something to make you smile, I’d love to create something you’ll love for years to come. If you see anything you’d like or have something in mind - shoot me a message! I’d love to work with you!💌🪡🧵
              </p>
              /* <p className="mb-3">
                Hi friends & welcome to @loveandcoembroidery! From the bottom of my heart THANK YOU for being here.
              </p>
              <p className="mb-3">
                Whether it’s a gift, a keepsake, or a little something to make you smile, I’d love to create something you’ll love for years to come.
              </p>
              <p className="mb-4">
                If you see anything you’d like or have something in mind - shoot me a message! I’d love to work with you!💌🪡🧵
              </p> */}

              <Link to="/contact" className="btn btn-contact-submit btn-lg mt-3">Get in Touch </Link>
            </div>
          </div>
        </div>
      </section>

      {/* New Carousel Section */}
      <section className="py-5">
        <div className="container">
          <h2 className="text-center mb-4 text-accent-blue">Featured Products</h2>
          <Carousel>
            <Carousel.Item>
              <img
                className="d-block mx-auto"
                src="/images/Scroll_1.jpg"
                alt="First slide"
                style={{ maxWidth: '600px', height: 'auto' }}
              />
              <Carousel.Caption>
                {/* <h3>Custom Projects</h3>
                <p>Beautiful bespoke embroidery for any occasion.</p> */}
              </Carousel.Caption>
            </Carousel.Item>
            <Carousel.Item>
              <img
                className="d-block mx-auto"
                src="/images/Scroll_2.jpg"
                alt="Second slide"
                style={{ maxWidth: '600px', height: 'auto' }}
              />
              <Carousel.Caption>
                {/* <h3>Personalized Gifts</h3>
                <p>Thoughtful and unique items for your loved ones.</p> */}
              </Carousel.Caption>
            </Carousel.Item>
            <Carousel.Item>
              <img
                className="d-block mx-auto"
                src="/images/Scroll_3.jpg"
                alt="Third slide"
                style={{ maxWidth: '600px', height: 'auto' }}
              />
              <Carousel.Caption>
                {/* <h3>Heirloom Quality</h3>
                <p>Creating cherished pieces that last for generations.</p> */}
              </Carousel.Caption>
            </Carousel.Item>
            <Carousel.Item>
              <img
                className="d-block mx-auto"
                src="/images/Gift_4.jpg"
                alt="Third slide"
                style={{ maxWidth: '600px', height: 'auto' }}
              />
              <Carousel.Caption>
                {/* <h3>Heirloom Quality</h3>
                <p>Creating cherished pieces that last for generations.</p> */}
              </Carousel.Caption>
            </Carousel.Item>

            <Carousel.Item>
              <img
                className="d-block mx-auto"
                src="/images/Home_1.PNG"
                alt="Third slide"
                style={{ maxWidth: '600px', height: 'auto' }}
              />
              <Carousel.Caption>
                {/* <h3>Heirloom Quality</h3>
                <p>Creating cherished pieces that last for generations.</p> */}
              </Carousel.Caption>
            </Carousel.Item>

            <Carousel.Item>
              <img
                className="d-block mx-auto"
                src="/images/Baby_4.png"
                alt="Third slide"
                style={{ maxWidth: '600px', height: 'auto' }}
              />
              <Carousel.Caption>
                {/* <h3>Heirloom Quality</h3>
                <p>Creating cherished pieces that last for generations.</p> */}
              </Carousel.Caption>
            </Carousel.Item>

            <Carousel.Item>
              <img
                className="d-block mx-auto"
                src="/images/Baby_2.PNG"
                alt="Third slide"
                style={{ maxWidth: '600px', height: 'auto' }}
              />
              <Carousel.Caption>
                {/* <h3>Heirloom Quality</h3>
                <p>Creating cherished pieces that last for generations.</p> */}
              </Carousel.Caption>
            </Carousel.Item>
          </Carousel>
        </div>
      </section>
    </>
  );
};

export default Home;


