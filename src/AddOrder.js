
import React, { useState } from 'react';
import { db } from './Firebase';
import { collection, getDocs } from 'firebase/firestore';
import * as XLSX from 'xlsx';
import { Link } from 'react-router-dom';

const AddBulkData = () => {
  const [fileData, setFileData] = useState([]);
  const [showData, setShowData] = useState(false);
  const [loading, setLoading] = useState(false);
  const [orderData, setOrderData] = useState([]); // State for the new file data
  const [showOrderData, setShowOrderData] = useState(false); // For showing the new file data

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();

    reader.onload = (event) => {
      const data = new Uint8Array(event.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

      const consolidatedData = new Map();

      rows.slice(1).forEach((row) => {
        const fabricName = row[0];
        const machines = row[1].split('-');

        machines.forEach((machine) => {
          if (!consolidatedData.has(machine)) {
            consolidatedData.set(machine, { machineName: machine, fabrics: [] });
          }
          consolidatedData.get(machine).fabrics.push(fabricName);
        });
      });

      setFileData(Array.from(consolidatedData.values()));
      setShowData(true);
    };

    reader.readAsArrayBuffer(file);
  };

  const handleOrderFileUpload = (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();

    reader.onload = (event) => {
      const data = new Uint8Array(event.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

      const machineOrders = [];
      let currentMachine = null;

      rows.forEach((row, index) => {
        // Skip the header row
        if (index === 0) return;

        if (row[0] && !row[1]) {
          // New machine row detected (machine name present, but no order info)
          currentMachine = {
            machineName: row[0],
            orders: [],
            exists: false, // Will update this when we check Firestore
          };
          machineOrders.push(currentMachine);
        } else if (currentMachine && row[1]) {
          // Order details for the current machine
          let endDate = row[7]; // Assuming end date is in Column H
          
          // Check if endDate is a number (Excel serial number) and convert it to a readable date string
          if (typeof endDate === 'number') {
            const date = new Date((endDate - 25569) * 86400 * 1000); // Convert Excel date serial number to JavaScript Date
            endDate = date.toLocaleDateString(); // Format as a string (e.g., 'MM/DD/YYYY')
          }

          currentMachine.orders.push({
            fabric: row[1], // الخامة
            productionRate: row[2], // الانتاج كغ/ اليوم
            customer: row[5], // Assuming customer is in Column D
            days: row[4], // Assuming days is in Column E
            endDate: endDate, // Now a string date
            otherDetails: row.slice(5, 7), // Add other relevant columns here if necessary
          });
        }
      });

      setOrderData(machineOrders);
      setShowOrderData(true);
    };

    reader.readAsArrayBuffer(file);
  };

  const normalizeString = (str) => {
    return str.toLowerCase().replace(/\s+/g, '');
  };
  
  const checkMachinesInFirestore = async () => {
    setLoading(true);
    const machinesSnapshot = await getDocs(collection(db, 'Machines'));
  
    const existingMachines = machinesSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  
    const updatedOrderData = orderData.map((machine) => {
      const normalizedMachineName = normalizeString(machine.machineName);
      const machineExists = existingMachines.some(
        (existingMachine) => normalizeString(existingMachine.Name) === normalizedMachineName
      );
      return {
        ...machine,
        exists: machineExists,
      };
    });
  
    setOrderData(updatedOrderData);
    setLoading(false);
  };
  
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-blue-600 shadow-lg mb-4">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-white text-2xl font-semibold">Add Bulk Data</h1>
            <ul className="flex space-x-8">
              <li>
                <Link to="/" className="text-white hover:text-gray-200">
                  Home
                </Link>
              </li>
              <li>
                <Link to="/machines" className="text-white hover:text-gray-200">
                  Machines
                </Link>
              </li>
              <li>
                <Link to="/addorder" className="text-white hover:text-gray-200">
                  Add Orders
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-10">
        <h2 className="text-3xl font-bold mb-6">Upload Excel Files</h2>

        {/* Bulk Fabric Upload */}
        <div className="mb-10">
          <h3 className="text-2xl font-bold mb-4">Upload Fabric and Machine Data</h3>
          <input
            type="file"
            accept=".xlsx, .xls"
            onChange={handleFileUpload}
            className="mb-6"
          />
          {showData && (
            <>
              <h2 className="text-2xl font-bold mb-4">Preview Data</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {fileData.map((machine, index) => (
                  <div
                    key={index}
                    className="border rounded-lg p-4 bg-white shadow-md"
                  >
                    <strong className="text-lg">{machine.machineName}</strong>
                    <ul className="list-disc list-inside mt-2">
                      {machine.fabrics.map((fabric, fabricIndex) => (
                        <li key={fabricIndex} className="text-gray-700">
                          {fabric}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Orders Plan Upload */}
        <div className="mb-10">
          <h3 className="text-2xl font-bold mb-4">Upload Orders Plan</h3>
          <input
            type="file"
            accept=".xlsx, .xls"
            onChange={handleOrderFileUpload}
            className="mb-6"
          />
          <button
            onClick={checkMachinesInFirestore}
            className="bg-blue-600 text-white px-4 py-2 rounded-md mt-4"
            disabled={loading}
          >
            {loading ? 'Checking Machines...' : 'Check Machines'}
          </button>
          {showOrderData && (
            <>
              <h2 className="text-2xl font-bold mb-4">Machine Orders</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {orderData.map((machine, index) => (
                  <div
                    key={index}
                    className="border rounded-lg p-4 bg-white shadow-md"
                  >
                    <strong className="text-lg">
                      {machine.machineName} -{' '}
                      {machine.exists ? 'Exists' : 'Does not exist'}
                    </strong>
                    <ul className="list-disc list-inside mt-2">
                      {machine.orders.map((order, orderIndex) => (
                        <li key={orderIndex} className="text-gray-700">
                          Fabric: {order.fabric}, Production Rate: {order.productionRate} kg/day, Customer: {order.customer}, Days: {order.days}, End Date: {order.endDate}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
export default AddBulkData;






