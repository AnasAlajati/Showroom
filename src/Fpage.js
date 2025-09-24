// src/FPage.js
import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { db, storage } from "./Firebase";
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";
import { motion } from "framer-motion";

const FPage = () => {
  const { fabricId } = useParams();
  const [fabric, setFabric] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deletingUrl, setDeletingUrl] = useState(null);

  useEffect(() => {
    const fetchFabricData = async () => {
      try {
        if (!fabricId) {
          setError("No fabric ID provided");
          setLoading(false);
          return;
        }

        const docRef = doc(db, "Fabrics", fabricId);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
          setError("No such fabric!");
          setLoading(false);
          return;
        }

        setFabric(docSnap.data());
      } catch (err) {
        console.error("Error fetching fabric data:", err);
        setError("Failed to fetch fabric data.");
      } finally {
        setLoading(false);
      }
    };

    fetchFabricData();
  }, [fabricId]);

  // Upload files to storage and append their URLs to the given collection field in Firestore
  const handleUpload = async (fileList, collectionKey) => {
    if (!fileList || fileList.length === 0) return;
    setUploading(true);
    try {
      const files = Array.from(fileList);
      const urls = [];

      for (const file of files) {
        // use fabricId in path so we don't rely on fabric.name being available
        const safeName = `${Date.now()}_${file.name}`;
        const storageRef = ref(storage, `fabrics/${fabricId}/${collectionKey}/${safeName}`);
        const uploadTask = uploadBytesResumable(storageRef, file);

        await new Promise((resolve, reject) => {
          uploadTask.on(
            "state_changed",
            () => {
              /* could implement progress updates here */
            },
            (err) => reject(err),
            async () => {
              const url = await getDownloadURL(uploadTask.snapshot.ref);
              urls.push(url);
              resolve();
            }
          );
        });
      }

      // Update Firestore (append urls)
      const docRef = doc(db, "Fabrics", fabricId);
      await updateDoc(docRef, {
        [collectionKey]: arrayUnion(...urls),
      });

      // Update local state instantly
      setFabric((prev) => ({
        ...prev,
        [collectionKey]: [...(prev?.[collectionKey] || []), ...urls],
      }));
    } catch (err) {
      console.error("Upload error:", err);
      setError("Upload failed: " + (err.message || "unknown error"));
    } finally {
      setUploading(false);
    }
  };

  // New: delete an image (storage best-effort + remove from Firestore array)
  const handleDeleteImage = async (imageUrl, collectionKey) => {
    const confirmed = window.confirm("Delete this image from the collection? This action cannot be undone.");
    if (!confirmed) return;

    setDeletingUrl(imageUrl);
    try {
      // 1) Try deleting the actual storage object using the download URL (best-effort)
      try {
        const storageRef = ref(storage, imageUrl);
        await deleteObject(storageRef);
      } catch (err) {
        // fallback: attempt to parse the path from the gs/https download URL and delete by path
        console.warn("Direct delete by URL failed, trying fallback parse:", err);
        try {
          // sample download url format:
          // https://firebasestorage.googleapis.com/v0/b/<bucket>/o/fabrics%2F<fabricId>%2FmenCollection%2Ffile.jpg?alt=media&token=...
          const matches = imageUrl.match(/\/o\/([^?]+)/);
          if (matches && matches[1]) {
            const decodedPath = decodeURIComponent(matches[1]); // e.g. fabrics/<fabricId>/menCollection/file.jpg
            const fallbackRef = ref(storage, decodedPath);
            await deleteObject(fallbackRef);
          } else {
            console.warn("Could not extract path from URL; storage delete skipped.");
          }
        } catch (err2) {
          console.warn("Fallback delete also failed (continuing to remove URL from Firestore):", err2);
        }
      }

      // 2) Remove the URL from Firestore array (arrayRemove)
      const docRef = doc(db, "Fabrics", fabricId);
      await updateDoc(docRef, {
        [collectionKey]: arrayRemove(imageUrl),
      });

      // 3) Update local UI state immediately
      setFabric((prev) => ({
        ...prev,
        [collectionKey]: (prev?.[collectionKey] || []).filter((u) => u !== imageUrl),
      }));
    } catch (err) {
      console.error("Delete failed:", err);
      setError("Delete failed: " + (err.message || "unknown error"));
    } finally {
      setDeletingUrl(null);
    }
  };

  // Renders collection; hides entire section if collection empty and not in editMode
  const renderImageCollection = (title, images, collectionKey) => {
    const hasImages = images && images.length > 0;
    if (!hasImages && !editMode) return null;

    return (
      <section className="my-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800 uppercase tracking-wide">{title}</h2>
          {editMode && (
            <label
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border shadow-sm text-sm cursor-pointer hover:bg-gray-50"
              title={`Add images to ${title}`}
            >
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => handleUpload(e.target.files, collectionKey)}
              />
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              <span className="text-gray-700">Add</span>
            </label>
          )}
        </div>

        {hasImages ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {images.map((imgUrl, idx) => (
              <motion.div
                key={idx}
                className="relative overflow-hidden rounded-2xl shadow-lg bg-gray-50"
                whileHover={{ scale: 1.03 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.06, duration: 0.45 }}
              >
                <div className="w-full h-[420px]">
                  <img
                    src={imgUrl}
                    alt={`${title} ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Delete overlay (editMode only) */}
                {editMode && (
                  <div className="absolute top-3 right-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!deletingUrl) handleDeleteImage(imgUrl, collectionKey);
                      }}
                      disabled={!!deletingUrl}
                      className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-white/90 hover:bg-white text-red-600 shadow"
                      title="Delete image"
                    >
                      {deletingUrl === imgUrl ? (
                        // spinner
                        <svg className="h-5 w-5 animate-spin text-red-600" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                        </svg>
                      ) : (
                        // trash icon
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22" />
                        </svg>
                      )}
                    </button>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        ) : (
          // when empty but editMode true, show a clean placeholder + upload hint
          <div className="rounded-2xl border border-dashed border-gray-200 p-12 text-center bg-white">
            <p className="text-gray-500 mb-4">No images yet for {title.toLowerCase()}.</p>
            <div className="flex items-center justify-center">
              <label className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-600 text-white text-sm cursor-pointer hover:bg-blue-700">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => handleUpload(e.target.files, collectionKey)}
                />
                Upload images
              </label>
            </div>
          </div>
        )}
      </section>
    );
  };

  if (loading) return <div className="text-center mt-20 text-lg">Loading...</div>;
  if (error) return <div className="text-center mt-20 text-red-600">{error}</div>;
  if (!fabric) return null;

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      {/* Top bar: title + subtle Edit toggle */}
      <div className="flex items-start justify-between mb-10">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight mb-3">
            {fabric.name}
          </h1>
          <p className="text-sm text-gray-500">Showroom — collections preview</p>
        </div>

        {/* Edit toggle: subtle, small */}
        <div>
          <button
            onClick={() => setEditMode((s) => !s)}
            className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg text-sm font-medium border shadow-sm transition ${
              editMode ? "bg-red-50 border-red-200 text-red-700" : "bg-white border-gray-200 text-gray-700"
            }`}
            title={editMode ? "Exit edit mode" : "Enter edit mode"}
          >
            {editMode ? (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
                Close
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                </svg>
                Edit
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main image, compact and centered */}
      <div className="text-center mb-12">
        {fabric.mainImage ? (
          <motion.img
            src={fabric.mainImage}
            alt={fabric.name}
            className="mx-auto max-h-48 w-auto object-contain rounded-xl shadow-md border border-gray-100"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          />
        ) : (
          <div className="mx-auto w-full max-w-md h-40 bg-gray-100 flex items-center justify-center rounded-xl text-gray-500">
            No Main Image
          </div>
        )}
      </div>

      {/* Collections */}
      {renderImageCollection("Men's Collection", fabric.menCollection, "menCollection")}
      {renderImageCollection("Women's Collection", fabric.womenCollection, "womenCollection")}
      {renderImageCollection("Kids' Collection", fabric.kidsCollection, "kidsCollection")}

      {uploading && (
        <div className="fixed bottom-6 right-6 bg-white border rounded-full px-4 py-2 shadow-lg text-sm">
          Uploading...
        </div>
      )}
    </div>
  );
};

export default FPage;
