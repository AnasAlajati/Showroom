import React, { useState } from 'react';

const AddOrder = () => {
  const [machineName, setMachineName] = useState('');
  const [fabricType, setFabricType] = useState('');
  const [quantity, setQuantity] = useState('');
  const [productionPerDay, setProductionPerDay] = useState('');
  const [productionDay, setProductionDay] = useState('');

  // Sample lists for machines and fabrics
  const machines = [
    'Mayer34a',
    'OR34b',
    'Mayer20c',
    // Add more machines as needed
  ];

  const fabrics = [
    'جكار ليكرا مسيح 5*4',
    'ببغ ولفل مسيح',
    'جكار قطن 4*4',
    // Add more fabrics as needed
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    // Logic to add the new order to your scheduling system will go here
    console.log({ machineName, fabricType, quantity, productionPerDay, productionDay });

    // Reset form fields
    setMachineName('');
    setFabricType('');
    setQuantity('');
    setProductionPerDay('');
    setProductionDay('');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <h1 className="text-3xl font-bold mb-6">Add New Order</h1>
      <form onSubmit={handleSubmit} className="bg-white shadow-md rounded-lg p-6">
        <div className="mb-4">
          <label className="block text-gray-700 mb-2">Machine Name</label>
          <select
            value={machineName}
            onChange={(e) => setMachineName(e.target.value)}
            className="border border-gray-300 rounded-md w-full p-2"
            required
          >
            <option value="">Select a machine</option>
            {machines.map((machine, index) => (
              <option key={index} value={machine}>
                {machine}
              </option>
            ))}
          </select>
        </div>

        <div className="mb-4">
          <label className="block text-gray-700 mb-2">Fabric Type</label>
          <select
            value={fabricType}
            onChange={(e) => setFabricType(e.target.value)}
            className="border border-gray-300 rounded-md w-full p-2"
            required
          >
            <option value="">Select a fabric</option>
            {fabrics.map((fabric, index) => (
              <option key={index} value={fabric}>
                {fabric}
              </option>
            ))}
          </select>
        </div>

        <div className="mb-4">
          <label className="block text-gray-700 mb-2">Quantity (KG)</label>
          <input
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="border border-gray-300 rounded-md w-full p-2"
            required
          />
        </div>
        
        <div className="mb-4">
          <label className="block text-gray-700 mb-2">Production Rate (KG/Day)</label>
          <input
            type="number"
            value={productionPerDay}
            onChange={(e) => setProductionPerDay(e.target.value)}
            className="border border-gray-300 rounded-md w-full p-2"
            required
          />
        </div>

        <div className="mb-4">
          <label className="block text-gray-700 mb-2">Production Day</label>
          <input
            type="date"
            value={productionDay}
            onChange={(e) => setProductionDay(e.target.value)}
            className="border border-gray-300 rounded-md w-full p-2"
            required
          />
        </div>

        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-500">
          Add Order
        </button>
      </form>
    </div>
  );
};

export default AddOrder;
