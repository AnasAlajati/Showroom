import React from "react";
import { useNavigate } from "react-router-dom";

const FabricCard = ({ fabric }) => {
  const navigate = useNavigate();

  const handleCardClick = () => {
  //  alert(`The fabric ID is: ${fabric.id}`);  // <-- show alert
    //console.log("Navigating to fabric with ID:", fabric.id); // optional console log
    navigate(`/fabric/${fabric.id}`);          // navigate to detail page
  };

  return (
    <div
      onClick={handleCardClick}  // <-- use the new handler
      className="cursor-pointer w-64 rounded-lg shadow-md overflow-hidden transform hover:scale-105 transition-transform"
    >
      <div className="w-full h-40 bg-white flex items-center justify-center">
        <img
          src={fabric.mainImage}
          alt={fabric.name}
          className="max-h-full max-w-full object-contain"
        />
      </div>
      <div className="p-2 text-center bg-gray-100">
        <h2 className="text-lg font-semibold">{fabric.name}</h2>
      </div>
    </div>
  );
};

export default FabricCard;
