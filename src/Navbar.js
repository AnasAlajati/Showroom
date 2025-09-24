// Navbar.js
import React from 'react';
import { Link } from 'react-router-dom';

const Navbar = () => {
  return (
    <nav className="bg-blue-600 shadow-lg">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center py-4">
          <h1 className="text-white text-2xl font-semibold">Circular Knitting Scheduling</h1>
          <ul className="flex space-x-8">
            <li><Link to="/machines" className="text-white hover:text-gray-200">Machines</Link></li>
            <li><Link to="/add-order" className="text-white hover:text-gray-200">Add Orders</Link></li>
          </ul>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
