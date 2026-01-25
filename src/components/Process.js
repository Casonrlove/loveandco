import React from 'react';

const Process = () => {
  return (
    <section id="process" className="py-5">
      <div className="container">
        <h2 className="text-center">My Process</h2>
        <div className="row text-center">
          <div className="col-md-4">
            <div className="p-3">
              <h3>Step 1: Design</h3>
              <p>It all starts with a sketch. We'll work together to create the perfect design.</p>
            </div>
          </div>
          <div className="col-md-4">
            <div className="p-3">
              <h3>Step 2: Stitching</h3>
              <p>Each piece is carefully hand-stitched with high-quality threads.</p>
            </div>
          </div>
          <div className="col-md-4">
            <div className="p-3">
              <h3>Step 3: Finishing</h3>
              <p>The final piece is washed, pressed, and framed, ready to be displayed.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Process;
