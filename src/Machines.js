import React, { useState, useEffect } from 'react';
import { db } from './Firebase'; // Ensure this points to your Firebase configuration
import { collection, getDocs, addDoc, updateDoc, doc } from 'firebase/firestore';
import { Link } from 'react-router-dom';

const Machines = () => {
  const [machines, setMachines] = useState([]);
  const [fabrics, setFabrics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newMachine, setNewMachine] = useState({
    Name: '',
    Fabrics: [],
    Dia_Gauge: '',
    Type: '',
  });
  const [selectedFabric, setSelectedFabric] = useState('');
  const [suggestedMachines, setSuggestedMachines] = useState([]);

  // Fetch machines from Firebase
  const fetchMachines = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'Machines'));
      const machinesData = [];
      querySnapshot.forEach((doc) => {
        machinesData.push({ id: doc.id, ...doc.data() });
      });
      setMachines(machinesData);
    } catch (error) {
      console.error("Error fetching machines: ", error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch fabrics from Firebase
  const fetchFabrics = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'Fabrics'));
      const fabricsData = [];
      querySnapshot.forEach((doc) => {
        const fabric = doc.data();
        fabricsData.push({ id: doc.id, name: fabric.Name, code: fabric.code });
      });
      setFabrics(fabricsData);
    } catch (error) {
      console.error("Error fetching fabrics: ", error);
    }
  };

  useEffect(() => {
    fetchMachines();
    fetchFabrics();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewMachine(prev => ({ ...prev, [name]: value }));
  };

  const handleAddMachine = async () => {
    try {
      const machineRef = await addDoc(collection(db, 'Machines'), newMachine);

      for (const fabricID of newMachine.Fabrics) {
        const fabric = fabrics.find(fab => fab.id === fabricID);
        if (fabric) {
          const updatedMachines = [...fabric.Machines, machineRef.id];
          await updateDoc(doc(db, 'Fabrics', fabric.id), { Machines: updatedMachines });
        }
      }

      setNewMachine({ Name: '', Fabrics: [], Dia_Gauge: '', Type: '' });
      fetchMachines();
      setShowForm(false);
    } catch (error) {
      console.error("Error adding machine: ", error);
    }
  };

  const toggleForm = () => {
    setShowForm(!showForm);
  };

  const handleFabricSelect = (e) => {
    const selected = e.target.value;
    setSelectedFabric(selected);
    if (selected) {
      const machinesForFabric = machines.filter(machine => 
        machine.Fabrics.includes(selected)
      );
      setSuggestedMachines(machinesForFabric);
    } else {
      setSuggestedMachines([]);
    }
  };

  if (loading) {
    return <p className="text-gray-700">Loading machines...</p>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-blue-600 shadow-lg mb-4">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-white text-2xl font-semibold">Circular Knitting Scheduling</h1>
            <ul className="flex space-x-8">
              <li><Link to="/" className="text-white hover:text-gray-200">Home</Link></li>
              <li><Link to="/machines" className="text-white hover:text-gray-200">Machines</Link></li>
              <li><Link to="/addorder" className="text-white hover:text-gray-200">Add Orders</Link></li>
            </ul>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-10">
        <h2 className="text-2xl font-semibold mt-6">Machines List</h2>
        <button 
          onClick={toggleForm} 
          className="bg-blue-600 text-white px-4 py-2 rounded-md mb-4 float-right"
        >
          {showForm ? 'Cancel' : 'Add Machine'}
        </button>

        {showForm && (
          <div className="border p-4 mb-6 rounded-md shadow bg-white">
            <h3 className="text-lg font-semibold">Add Machine</h3>
            <div>
              <label>Name:</label>
              <input 
                type="text" 
                name="Name" 
                value={newMachine.Name} 
                onChange={handleInputChange} 
                className="border p-1 w-full" 
              />
            </div>
            <div>
              <label>Fabrics:</label>
              <select 
                name="Fabrics" 
                value={newMachine.Fabrics} 
                onChange={(e) => handleInputChange({ target: { name: 'Fabrics', value: [...e.target.selectedOptions].map(o => o.value) } })} 
                multiple
                className="border p-1 w-full"
              >
                {fabrics.map(fabric => (
                  <option key={fabric.id} value={fabric.id}>
                    {fabric.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label>Dia/Gauge:</label>
              <input 
                type="text" 
                name="Dia_Gauge" 
                value={newMachine.Dia_Gauge} 
                onChange={handleInputChange} 
                className="border p-1 w-full" 
              />
            </div>
            <div>
              <label>Type:</label>
              <select 
                name="Type" 
                value={newMachine.Type} 
                onChange={handleInputChange} 
                className="border p-1 w-full"
              >
                <option value="">Select Type</option>
                <option value="Single">Single</option>
                <option value="Double">Double</option>
                <option value="Interlock">Interlock</option>
                <option value="Fleece">Fleece</option>
              </select>
            </div>
            <button 
              onClick={handleAddMachine} 
              className="bg-green-600 text-white px-4 py-2 rounded-md mt-2"
            >
              Add Machine
            </button>
          </div>
        )}

        <div className="mb-6">
          <h3 className="text-lg font-semibold">Select Fabric to Suggest Machines:</h3>
          <select onChange={handleFabricSelect} className="border p-1 w-full mb-4">
            <option value="">Select Fabric</option>
            {fabrics.map(fabric => (
              <option key={fabric.id} value={fabric.id}>
                {fabric.name}
              </option>
            ))}
          </select>

          {suggestedMachines.length > 0 && (
            <div className="border p-4 rounded-md bg-white">
              <h4 className="font-semibold">Suggested Machines:</h4>
              <ul className="list-disc pl-5">
                {suggestedMachines.map(machine => (
                  <li key={machine.id}>
                    <strong>{machine.Name || 'No Name'}</strong> - Type: {machine.Type || 'N/A'}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {machines.map(machine => (
            <li key={machine.id} className="border p-4 rounded-md shadow bg-white transition transform hover:scale-105">
              <h3 className="text-lg font-bold">{machine.Name || 'No Name'}</h3>
              <p className="text-sm text-gray-600">Type: {machine.Type || 'N/A'}</p>
              <p className="text-sm text-gray-600">Dia/Gauge: {machine.Dia_Gauge || 'N/A'}</p>

              <h4 className="font-semibold mt-2">Fabrics:</h4>
              <ul>
                {machine.Fabrics && machine.Fabrics.length > 0 ? (
                  machine.Fabrics.map((fabricID, index) => {
                    const fabric = fabrics.find(fab => fab.id === fabricID);
                    return (
                      <li key={index} className="text-sm text-gray-600">
                        {fabric ? fabric.name : 'Unknown Fabric'}
                      </li>
                    );
                  })
                ) : (
                  <li className="text-sm text-gray-600">No Fabrics Assigned</li>
                )}
              </ul>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default Machines;
