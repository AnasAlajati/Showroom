// src/Home.js
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import FabricCard from "./FabricCard";
import AddFabric from "./AddFabric";
import { db } from "./Firebase";
import { collection, getDocs } from "firebase/firestore";

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

const Home = () => {
  const [fabrics, setFabrics] = useState([]);
  const [firebaseStatus, setFirebaseStatus] = useState("Connecting...");
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    const fetchFabrics = async () => {
      try {
        const fabricsCol = collection(db, "Fabrics");
        const fabricsSnapshot = await getDocs(fabricsCol);
        const fabricsList = fabricsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setFabrics(fabricsList);
        setFirebaseStatus("Connected to main server");
      } catch (error) {
        console.error("Error fetching fabrics:", error);
        setFirebaseStatus("Failed to connect to main server");
      }
    };

    fetchFabrics();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img
              src="/images/logo1.webp"
              alt="Butterfly Showroom"
              className="h-12 w-12 object-cover rounded-lg shadow-sm"
            />
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold leading-tight">
                Butterfly Showroom
              </h1>
              <p className="text-xs sm:text-sm text-gray-500">Premium textile collections</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Status badge (subtle) */}
            <div
              className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
                firebaseStatus.toLowerCase().includes("connected")
                  ? "bg-green-50 text-green-700 border border-green-100"
                  : "bg-yellow-50 text-yellow-800 border border-yellow-100"
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  firebaseStatus.toLowerCase().includes("connected") ? "bg-green-600" : "bg-yellow-600"
                }`}
              />
              <span>{firebaseStatus}</span>
            </div>

            {/* Add button (header-level) */}
         
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-semibold">Collections</h2>
            <p className="text-sm text-gray-500 mt-1">{fabrics.length} fabrics available</p>
          </div>

          {/* Mobile add button */}
          <div className="sm:hidden">
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center justify-center p-3 rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-500 transition"
              aria-label="Add fabric"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
        </div>

        {/* Gallery */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
        >
          {fabrics.map((fabric) => (
            <motion.div key={fabric.id} variants={itemVariants}>
              <FabricCard fabric={fabric} />
            </motion.div>
          ))}
        </motion.div>

        {/* empty fallback */}
        {fabrics.length === 0 && (
          <div className="mt-12 text-center text-gray-500">
            No fabrics yet — press Add to create your first product.
          </div>
        )}
      </main>

      {/* Floating Add button (desktop corner) */}
      <button
        onClick={() => setShowAddModal(true)}
        className="fixed right-6 bottom-6 z-40 hidden sm:inline-flex items-center gap-3 px-4 py-3 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-2xl hover:scale-105 transform transition"
        aria-label="Open add fabric"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
        </svg>
        <span className="text-sm font-semibold">Add Fabric</span>
      </button>

      {/* AddFabric modal (AnimatePresence for smooth mount/unmount) */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center"
          >
            {/* backdrop */}
            <div
              className="absolute inset-0 bg-black/50"
              onClick={() => setShowAddModal(false)}
              aria-hidden="true"
            />

            {/* modal panel */}
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ duration: 0.28 }}
              className="relative z-50 w-full max-w-3xl mx-4 bg-white rounded-2xl shadow-2xl overflow-auto"
              role="dialog"
              aria-modal="true"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b">
                <h3 className="text-lg font-medium">Add New Fabric</h3>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="p-2 rounded-md hover:bg-gray-100 text-gray-600"
                  aria-label="Close add fabric"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="px-6 py-6">
                {/* AddFabric component kept intact (no logic changed) */}
                <AddFabric />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Home;
