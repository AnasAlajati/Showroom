import React, { useState } from "react";
import { db, storage } from "./Firebase";
import { collection, addDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

const AddFabric = () => {
  const [fabricName, setFabricName] = useState("");
  const [mainImage, setMainImage] = useState(null);
  const [menCollection, setMenCollection] = useState([]);
  const [womenCollection, setWomenCollection] = useState([]);
  const [kidsCollection, setKidsCollection] = useState([]);
  const [status, setStatus] = useState("");
  const [uploadedCount, setUploadedCount] = useState(0);
  const [totalFiles, setTotalFiles] = useState(0);

  // small helper to sanitize folder name
  const makeFolderBase = (name) =>
    `${name.trim().replace(/\s+/g, "_").replace(/[^\w-]/g, "")}_${Date.now()}`;

  // Upload single file and return download URL
  const uploadFile = async (file, path) => {
    const storageRef = ref(storage, path);
    const snapshot = await uploadBytes(storageRef, file); // returns a promise
    const url = await getDownloadURL(snapshot.ref);
    // update progress
    setUploadedCount((c) => c + 1);
    return url;
  };

  // Upload an array of files to `basePath/folder/` and return array of urls
  const uploadFilesParallel = async (files, basePath, folderName) => {
    if (!files || files.length === 0) return [];
    const uploads = files.map((file) => {
      const safeName = `${Date.now()}_${file.name}`;
      const path = `${basePath}/${folderName}/${safeName}`;
      return uploadFile(file, path);
    });
    return await Promise.all(uploads);
  };

  const handleAddFabric = async () => {
    if (!fabricName || !mainImage) {
      alert("Please enter a fabric name and select a main image.");
      return;
    }

    try {
      setStatus("Preparing uploads...");
      setUploadedCount(0);

      // Build a base folder using fabric name + timestamp to avoid collisions
      const baseFolder = makeFolderBase(fabricName);

      // count total files for progress
      const count = 1 + menCollection.length + womenCollection.length + kidsCollection.length; // main + all collections
      setTotalFiles(count);

      setStatus("Uploading images...");

      // Start all uploads in parallel:
      // - main image should also upload as a Promise
      const mainPath = `fabrics/${baseFolder}/main/${Date.now()}_${mainImage.name}`;
      const mainPromise = uploadFile(mainImage, mainPath);

      // collections (each may be empty)
      const menPromise = uploadFilesParallel(menCollection, `fabrics/${baseFolder}`, "men");
      const womenPromise = uploadFilesParallel(womenCollection, `fabrics/${baseFolder}`, "women");
      const kidsPromise = uploadFilesParallel(kidsCollection, `fabrics/${baseFolder}`, "kids");

      // Wait for all to finish
      const [mainImageUrl, menUrls, womenUrls, kidsUrls] = await Promise.all([
        mainPromise,
        menPromise,
        womenPromise,
        kidsPromise,
      ]);

      setStatus("Saving fabric metadata...");

      // Save document in Firestore (same schema as before)
      const docRef = await addDoc(collection(db, "Fabrics"), {
        name: fabricName,
        mainImage: mainImageUrl,
        menCollection: menUrls,
        womenCollection: womenUrls,
        kidsCollection: kidsUrls,
      });

      setStatus(`✅ Fabric added successfully! ID: ${docRef.id}`);

      // Reset form and progress
      setFabricName("");
      setMainImage(null);
      setMenCollection([]);
      setWomenCollection([]);
      setKidsCollection([]);
      setUploadedCount(0);
      setTotalFiles(0);
    } catch (error) {
      console.error(error);
      setStatus("❌ Error adding fabric: " + (error?.message || error));
    }
  };

  // File input appends new files instead of replacing
  const handleFileChange = (event, setter, currentFiles) => {
    const newFiles = Array.from(event.target.files);
    setter([...currentFiles, ...newFiles]);
  };

  const percent = totalFiles > 0 ? Math.round((uploadedCount / totalFiles) * 100) : 0;

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
        <p className="text-sm text-gray-500 mb-4">Selected: {menCollection.length} files</p>
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
        <p className="text-sm text-gray-500 mb-4">Selected: {womenCollection.length} files</p>
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
        <p className="text-sm text-gray-500 mb-4">Selected: {kidsCollection.length} files</p>
      )}

      <button
        onClick={handleAddFabric}
        className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-500 transition"
      >
        Add Fabric
      </button>

      {/* status + progress */}
      {status && <p className="mt-4 text-center">{status}</p>}

      {totalFiles > 0 && (
        <div className="mt-3">
          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <div
              className="h-2 bg-blue-600"
              style={{ width: `${percent}%`, transition: "width 300ms ease" }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-2 text-center">
            Uploading: {uploadedCount}/{totalFiles} ({percent}%)
          </p>
        </div>
      )}
    </div>
  );
};

export default AddFabric;
