
const Contact = () => {
  return (
    <section className="py-5">
      <div className="container">
        <h2 className="text-center">Contact</h2>
        <div className="row">
          <div className="col-md-8 mx-auto">
            <div className="mb-4">
              {/* <p>Email: <a href="mailto:loveandcoembroidery@gmail.com">loveandcoembroidery@gmail.com</a></p> */}
              {/* <p>Phone: <a href="tel:555-123-4567">(555) 123-4567</a> (placeholder)</p> */}
              {/* <p>Instagram: <a href="https://www.instagram.com/loveandcoembroidery" target="_blank" rel="noopener noreferrer">@loveandcoembroidery</a></p> */}
              <p className="mt-4">Have a custom project in mind or a question about an order? I’d love to hear from you.
Fill out the form below with a few details, and I’ll be in touch soon to bring your vision to life.
</p>
            </div>
          </div>
        </div>
        <div className="row">
          <div className="col-md-8 mx-auto">
            <form name="contact" method="POST" data-netlify="true">
              <input type="hidden" name="form-name" value="contact" />
              <div className="mb-3">
                <label htmlFor="name" className="form-label">Name</label>
                <input type="text" className="form-control" id="name" name="name" required />
              </div>
              <div className="mb-3">
                <label htmlFor="email" className="form-label">Email address</label>
                <input type="email" className="form-control" id="email" name="email" required />
              </div>
              <div className="mb-3">
                <label htmlFor="phone" className="form-label">Phone Number</label>
                <input type="tel" className="form-control" id="phone" name="phone" />
              </div>
              <div className="mb-3">
                <label htmlFor="company" className="form-label">Company Name (Optional)</label>
                <input type="text" className="form-control" id="company" name="company" />
              </div>
              <div className="mb-3">
                <label htmlFor="service" className="form-label">Service Needed</label>
                <select className="form-select" id="service" name="service" required>
                  <option value="">Select a service</option>
                  <option value="custom">Custom Embroidery</option>
                  <option value="corporate">Corporate Apparel</option>
                  <option value="digitizing">Digitizing Services</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="mb-3">
                <label htmlFor="quantity" className="form-label">Quantity (e.g., "12 shirts", "50 hats")</label>
                <input type="text" className="form-control" id="quantity" name="quantity" />
              </div>
              <div className="mb-3">
                <label htmlFor="message" className="form-label">Details of your Request</label>
                <textarea className="form-control" id="message" name="message" rows="5" required></textarea>
              </div>
              <button type="submit" className="btn btn-contact-submit">Send Message</button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Contact;
