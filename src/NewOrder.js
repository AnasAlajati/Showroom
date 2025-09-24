import React, { useState, useEffect } from 'react';
import { db } from './Firebase'; // Ensure this points to your Firebase configuration
import { collection, getDocs, addDoc, updateDoc, doc, getDoc } from 'firebase/firestore'; // Import additional Firestore functions

const NewOrder = () => {
  const [machines, setMachines] = useState([]);
  const [fabrics, setFabrics] = useState([]);
  const [selectedFabric, setSelectedFabric] = useState('');
  const [suggestedMachines, setSuggestedMachines] = useState([]);
  const [selectedMachine, setSelectedMachine] = useState(''); // For selected machine
  const [bestMachine, setBestMachine] = useState(null); // For randomly selected best machine
  const [orderDetails, setOrderDetails] = useState({
    customer: '',
    fabric: '',
    amount: 0,
  });

  // Fetch machines and fabrics from Firebase
  const fetchMachines = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'Machines'));
      const machinesData = [];
      querySnapshot.forEach((doc) => {
        machinesData.push({ id: doc.id, ...doc.data() });
      });
      setMachines(machinesData);
    } catch (error) {
      console.error('Error fetching machines:', error);
    }
  };

  const fetchFabrics = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'Fabrics'));
      const fabricsData = [];
      querySnapshot.forEach((doc) => {
        fabricsData.push({ id: doc.id, name: doc.data().Name });
      });
      setFabrics(fabricsData);
    } catch (error) {
      console.error('Error fetching fabrics:', error);
    }
  };

  useEffect(() => {
    fetchMachines();
    fetchFabrics();
  }, []);

  // Handle fabric selection and suggest machines
  const handleFabricSelect = (e) => {
    const selected = e.target.value;
    setSelectedFabric(selected);

    if (selected) {
      const machinesForFabric = machines.filter(machine =>
        machine.Fabrics && machine.Fabrics.includes(selected)
      );
      setSuggestedMachines(machinesForFabric);

      // Randomly pick a best machine from the suggested list
      if (machinesForFabric.length > 0) {
        const randomMachine = machinesForFabric[Math.floor(Math.random() * machinesForFabric.length)];
        setBestMachine(randomMachine);
      } else {
        setBestMachine(null); // No machines available
      }
    } else {
      setSuggestedMachines([]);
      setBestMachine(null);
    }
  };

  // Handle input change for order details
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setOrderDetails(prev => ({ ...prev, [name]: value }));
  };

  // Handle machine selection from the suggested machines
  const handleMachineSelect = (e) => {
    setSelectedMachine(e.target.value);
  };

  // Handle form submission
  const handleSubmitOrder = async (e) => {
    e.preventDefault();

    // Ensure a machine is selected
    if (!selectedMachine) {
      alert('Please select a machine before submitting the order.');
      return;
    }

    // Create new order
    const newOrder = {
      customer: orderDetails.customer,
      fabric: selectedFabric, // Use the selected fabric ID
      amount: parseInt(orderDetails.amount, 10),
    };

    try {
      // Add new order to Firestore
      const orderDocRef = await addDoc(collection(db, 'Orders'), newOrder);
      console.log('New order created with ID:', orderDocRef.id);

      // Update the selected machine's Orders list
      const machineRef = doc(db, 'Machines', selectedMachine);
      const machineSnapshot = await getDoc(machineRef);
      if (machineSnapshot.exists()) {
        const machineData = machineSnapshot.data();
        await updateDoc(machineRef, {
          Orders: [...(machineData.Orders || []), orderDocRef.id], // Add the new order ID to Orders
        });
        console.log('Machine orders updated with new order ID:', orderDocRef.id);
      } else {
        console.error('No such machine found!');
      }

      // Reset form state if needed
      setOrderDetails({ customer: '', fabric: '', amount: 0 });
      setSelectedFabric('');
      setSelectedMachine('');
      setSuggestedMachines([]);
      setBestMachine(null);
    } catch (error) {
      console.error('Error submitting order:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-10">
        <h1 className="text-2xl font-semibold mb-6">Create New Order</h1>

        <form onSubmit={handleSubmitOrder} className="bg-white p-6 rounded-lg shadow-md">
          <div className="mb-4">
            <label className="block text-gray-700 font-semibold mb-2">Customer Name:</label>
            <input
              type="text"
              name="customer"
              value={orderDetails.customer}
              onChange={handleInputChange}
              required
              className="border border-gray-300 p-2 w-full rounded-md"
            />
          </div>

          <div className="mb-4">
            <label className="block text-gray-700 font-semibold mb-2">Fabric:</label>
            <select 
              name="fabric" 
              value={selectedFabric} 
              onChange={handleFabricSelect} 
              required 
              className="border border-gray-300 p-2 w-full rounded-md"
            >
              <option value="">Select Fabric</option>
              {fabrics.map(fabric => (
                <option key={fabric.id} value={fabric.id}>
                  {fabric.name}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-4">
            <label className="block text-gray-700 font-semibold mb-2">Amount:</label>
            <input
              type="number"
              name="amount"
              value={orderDetails.amount}
              onChange={handleInputChange}
              required
              className="border border-gray-300 p-2 w-full rounded-md"
            />
          </div>

          {suggestedMachines.length > 0 && (
            <div className="mb-4">
              <h3 className="text-lg font-semibold">Suggested Machines:</h3>
              <ul className="list-disc pl-5">
                {suggestedMachines.map(machine => (
                  <li key={machine.id} className="text-gray-700">
                    <label className="inline-flex items-center">
                      <input
                        type="radio"
                        name="selectedMachine"
                        value={machine.id}
                        onChange={handleMachineSelect}
                        className="form-radio text-blue-600"
                      />
                      <span className="ml-2">
                        {machine.Name} - Type: {machine.Type || 'N/A'}
                        {bestMachine && bestMachine.id === machine.id && (
                          <span className="text-green-500 ml-2">(Best Choice)</span>
                        )}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <button 
            type="submit" 
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition duration-200"
          >
            Submit Order
          </button>
        </form>
      </div>
    </div>
  );
};

export default NewOrder;
