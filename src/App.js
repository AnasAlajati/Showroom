import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Home from './Home';
import AddOrder from './AddOrder';
import Machines from './Machines';
import Fabric from './Fabric';
import NewOrder from './NewOrder';
import { FabricsProvider } from './FabricsContext';
import FPage from './Fpage';

const App = () => {
  return (
    <FabricsProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/new-order" element={<NewOrder />} /> {/* Use 'element' for rendering */}
          <Route path="/add-order" element={<AddOrder />} />
          <Route path="/machines" element={<Machines />} />
          <Route path="/fabric/:fabricId" element={<FPage />} />
          

        </Routes>
      </Router>
    </FabricsProvider>
  );
};

export default App;
