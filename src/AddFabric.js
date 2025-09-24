import React, { useState } from "react";
import { db, storage } from "./Firebase";
import { collection, addDoc } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";

const AddFabric = () => {
  const [fabricName, setFabricName] = useState("");
  const [mainImage, setMainImage] = useState(null);
  const [menCollection, setMenCollection] = useState([]);
  const [womenCollection, setWomenCollection] = useState([]);
  const [kidsCollection, setKidsCollection] = useState([]);
  const [status, setStatus] = useState("");

  // Upload multiple files and return their URLs
  const uploadFiles = async (files, folder) => {
    const urls = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const storageRef = ref(storage, `fabrics/${fabricName}/${folder}/${file.name}`);
      const uploadTask = uploadBytesResumable(storageRef, file);

      await new Promise((resolve, reject) => {
        uploadTask.on(
          "state_changed",
          null,
          (error) => reject(error),
          async () => {
            const url = await getDownloadURL(uploadTask.snapshot.ref);
            urls.push(url);
            resolve();
          }
        );
      });
    }
    return urls;
  };

  const handleAddFabric = async () => {
    if (!fabricName || !mainImage) {
      alert("Please enter a fabric name and select a main image.");
      return;
    }

    setStatus("Uploading images...");

    try {
      // Upload main image
      const mainRef = ref(storage, `fabrics/${fabricName}/main/${mainImage.name}`);
      const mainTask = uploadBytesResumable(mainRef, mainImage);
      await new Promise((resolve, reject) => {
        mainTask.on(
          "state_changed",
          null,
          (error) => reject(error),
          () => resolve()
        );
      });
      const mainImageUrl = await getDownloadURL(mainRef);

      // Upload collections
      const menUrls = await uploadFiles(menCollection, "men");
      const womenUrls = await uploadFiles(womenCollection, "women");
      const kidsUrls = await uploadFiles(kidsCollection, "kids");

      // Save to Firestore
      const docRef = await addDoc(collection(db, "Fabrics"), {
        name: fabricName,
        mainImage: mainImageUrl,
        menCollection: menUrls,
        womenCollection: womenUrls,
        kidsCollection: kidsUrls,
      });

      setStatus(`✅ Fabric added successfully! ID: ${docRef.id}`);

      // Reset form
      setFabricName("");
      setMainImage(null);
      setMenCollection([]);
      setWomenCollection([]);
      setKidsCollection([]);
    } catch (error) {
      console.error(error);
      setStatus("❌ Error adding fabric: " + error.message);
    }
  };

  // File input appends new files instead of replacing
  const handleFileChange = (event, setter, currentFiles) => {
    const newFiles = Array.from(event.target.files);
    setter([...currentFiles, ...newFiles]);
  };

  return (
    <div className="max-w-md mx-auto p-4 bg-white rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4">Add New Fabric</h2>

      <input
        type="text"
        placeholder="Fabric Name"
        value={fabricName}
        onChange={(e) => setFabricName(e.target.value)}
        className="w-full mb-4 p-2 border rounded"
      />

      <label className="block font-medium">Main Image</label>
      <input
        type="file"
        accept="image/*"
        onChange={(e) => setMainImage(e.target.files[0])}
        className="w-full mb-4"
      />

      <label className="block font-medium">Men Collection</label>
      <input
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => handleFileChange(e, setMenCollection, menCollection)}
        className="w-full mb-2"
      />
      {menCollection.length > 0 && (
        <p className="text-sm text-gray-500 mb-4">
          Selected: {menCollection.length} files
        </p>
      )}

      <label className="block font-medium">Women Collection</label>
      <input
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => handleFileChange(e, setWomenCollection, womenCollection)}
        className="w-full mb-2"
      />
      {womenCollection.length > 0 && (
        <p className="text-sm text-gray-500 mb-4">
          Selected: {womenCollection.length} files
        </p>
      )}

      <label className="block font-medium">Kids Collection</label>
      <input
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => handleFileChange(e, setKidsCollection, kidsCollection)}
        className="w-full mb-2"
      />
      {kidsCollection.length > 0 && (
        <p className="text-sm text-gray-500 mb-4">
          Selected: {kidsCollection.length} files
        </p>
      )}

      <button
        onClick={handleAddFabric}
        className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-500 transition"
      >
        Add Fabric
      </button>

      {status && <p className="mt-4 text-center">{status}</p>}
    </div>
  );
};

export default AddFabric;
