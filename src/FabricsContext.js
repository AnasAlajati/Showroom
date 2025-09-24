import React, { createContext, useState, useEffect } from 'react';
import { db } from './Firebase';
import { collection, getDocs } from 'firebase/firestore';

export const FabricsContext = createContext();

export const FabricsProvider = ({ children }) => {
  const [fabricsList, setFabricsList] = useState([]);

  const fetchFabrics = async () => {
    try {
      const fabricsSnapshot = await getDocs(collection(db, 'Fabrics'));
      const fabricsData = fabricsSnapshot.docs.map(doc => doc.data().name);
      setFabricsList(fabricsData);
    } catch (error) {
      console.error("Error fetching fabrics: ", error);
    }
  };

  useEffect(() => {
    fetchFabrics();
  }, []);

  return (
    <FabricsContext.Provider value={fabricsList}>
      {children}
    </FabricsContext.Provider>
  );
};
