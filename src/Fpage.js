// src/FPage.js
import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import {
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  arrayRemove
} from "firebase/firestore";
import { db, storage } from "./Firebase";
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject
} from "firebase/storage";
import { motion } from "framer-motion";

/*
  Notes:
  - Zoom/pan removed. Clicking an image now opens a simple modal showing a larger version.
  - All edit/upload/delete functionality preserved exactly as before.
  - No external zoom library required.
*/

const FPage = () => {
  const { fabricId } = useParams();
  const [fabric, setFabric] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [editMode, setEditMode] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deletingUrl, setDeletingUrl] = useState(null);

  // edit fields
  const [editName, setEditName] = useState("");
  const [newMainImage, setNewMainImage] = useState(null);
  const [savingEdits, setSavingEdits] = useState(false);

  // simple image modal state (replaces complex zoom/lightbox)
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [imageModalUrl, setImageModalUrl] = useState(null);

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

        const data = docSnap.data();
        setFabric(data);
        setEditName(data.name || "");
      } catch (err) {
        console.error("Error fetching fabric data:", err);
        setError("Failed to fetch fabric data.");
      } finally {
        setLoading(false);
      }
    };

    fetchFabricData();
  }, [fabricId]);

  // ---------- Upload helper (unchanged behavior) ----------
  const handleUpload = async (fileList, collectionKey) => {
    if (!fileList || fileList.length === 0) return;
    setUploading(true);
    try {
      const files = Array.from(fileList);
      const urls = [];

      for (const file of files) {
        const safeName = `${Date.now()}_${file.name}`;
        const storageRef = ref(storage, `fabrics/${fabricId}/${collectionKey}/${safeName}`);
        const uploadTask = uploadBytesResumable(storageRef, file);

        await new Promise((resolve, reject) => {
          uploadTask.on(
            "state_changed",
            () => {
              /* optional progress hooks */
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

      // append to Firestore array
      const docRef = doc(db, "Fabrics", fabricId);
      await updateDoc(docRef, {
        [collectionKey]: arrayUnion(...urls)
      });

      // update local state immediately
      setFabric((prev) => ({
        ...prev,
        [collectionKey]: [...(prev?.[collectionKey] || []), ...urls]
      }));
    } catch (err) {
      console.error("Upload error:", err);
      setError("Upload failed: " + (err.message || "unknown error"));
    } finally {
      setUploading(false);
    }
  };

  // ---------- Delete logic (unchanged behavior) ----------
  const handleDeleteImage = async (imageUrl, collectionKey) => {
    const confirmed = window.confirm("Delete this image from the collection? This action cannot be undone.");
    if (!confirmed) return;
    setDeletingUrl(imageUrl);
    try {
      try {
        const matches = imageUrl.match(/\/o\/([^?]+)/);
        if (matches && matches[1]) {
          const decodedPath = decodeURIComponent(matches[1]);
          const fallbackRef = ref(storage, decodedPath);
          await deleteObject(fallbackRef).catch(() => {});
        } else {
          const possibleRef = ref(storage, imageUrl);
          await deleteObject(possibleRef).catch(() => {});
        }
      } catch (err) {
        console.warn("Storage deletion attempt failed (continuing to remove URL from Firestore):", err);
      }

      // remove URL from Firestore array
      const docRef = doc(db, "Fabrics", fabricId);
      await updateDoc(docRef, {
        [collectionKey]: arrayRemove(imageUrl)
      });

      // update UI
      setFabric((prev) => ({
        ...prev,
        [collectionKey]: (prev?.[collectionKey] || []).filter((u) => u !== imageUrl)
      }));
    } catch (err) {
      console.error("Delete failed:", err);
      setError("Delete failed: " + (err.message || "unknown error"));
    } finally {
      setDeletingUrl(null);
    }
  };

  // ---------- Edit main name + main image (unchanged behavior) ----------
  const handleMainImagePick = (file) => {
    setNewMainImage(file);
  };

  const handleSaveEdits = async () => {
    if (!fabric) return;
    setSavingEdits(true);
    try {
      const updates = {};
      if ((editName || "").trim() !== (fabric.name || "").trim()) {
        updates.name = editName.trim();
      }

      if (newMainImage) {
        const safeName = `${Date.now()}_${newMainImage.name}`;
        const path = `fabrics/${fabricId}/main/${safeName}`;
        const storageRef = ref(storage, path);
        const snap = await uploadBytesResumable(storageRef, newMainImage);
        const url = await getDownloadURL(snap.ref);
        updates.mainImage = url;
      }

      if (Object.keys(updates).length > 0) {
        const docRef = doc(db, "Fabrics", fabricId);
        await updateDoc(docRef, updates);
        setFabric((prev) => ({ ...prev, ...updates }));
      }

      setNewMainImage(null);
      setEditMode(false);
    } catch (err) {
      console.error("Save edits failed:", err);
      setError("Failed to save edits: " + (err.message || err));
    } finally {
      setSavingEdits(false);
    }
  };

  const handleCancelEdits = () => {
    setNewMainImage(null);
    setEditName(fabric?.name || "");
    setEditMode(false);
  };

  // ---------- Simple image modal helpers (replaces zoom/lightbox) ----------
  const openImageModal = (imageUrl) => {
    setImageModalUrl(imageUrl || null);
    setImageModalOpen(true);
  };

  const closeImageModal = () => {
    setImageModalOpen(false);
    setImageModalUrl(null);
  };

  useEffect(() => {
    if (!imageModalOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") closeImageModal();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [imageModalOpen]);

  // ---------- Render collection (call openImageModal on click) ----------
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
                className="relative overflow-hidden rounded-2xl shadow-lg bg-gray-50 cursor-pointer"
                whileHover={{ scale: 1.02 }}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: idx * 0.04 }}
              >
                <button
                  onClick={() => openImageModal(imgUrl)}
                  className="block w-full p-0 border-0 bg-transparent"
                  aria-label="Open image"
                >
                  <div className="w-full h-[420px] bg-gray-100 flex items-center justify-center">
                    <img
                      src={imgUrl}
                      alt={`${title} ${idx + 1}`}
                      className="w-full h-full object-contain"
                      style={{ maxHeight: "420px" }}
                    />
                  </div>
                </button>

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
                        <svg className="h-5 w-5 animate-spin text-red-600" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                        </svg>
                      ) : (
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

        {/* Edit toggle */}
        <div>
          <button
            onClick={() => {
              setEditMode((s) => {
                const next = !s;
                if (next) setEditName(fabric?.name || "");
                return next;
              });
            }}
            className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg text-sm font-medium border shadow-sm transition ${
              editMode ? "bg-red-50 border-red-200 text-red-700" : "bg-white border-gray-200 text-gray-700"
            }`}
            title={editMode ? "Exit edit mode" : "Edit"}
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

      {/* Main image and edit controls */}
      <div className="text-center mb-12">
        <div className="inline-block">
          {fabric.mainImage ? (
            <motion.button
              onClick={() => openImageModal(fabric.mainImage)}
              className="focus:outline-none rounded-xl overflow-hidden shadow-md"
              whileHover={{ scale: 1.02 }}
            >
              <motion.img
                src={fabric.mainImage}
                alt={fabric.name}
                className="mx-auto max-h-48 w-auto object-contain rounded-xl border border-gray-100"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                style={{ display: "block" }}
              />
            </motion.button>
          ) : (
            <div className="mx-auto w-full max-w-md h-40 bg-gray-100 flex items-center justify-center rounded-xl text-gray-500">
              No Main Image
            </div>
          )}
        </div>

        {/* EDIT PANEL: edit name + change main image */}
        {editMode && (
          <div className="mt-4 flex flex-col sm:flex-row items-center gap-3 justify-center">
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="px-3 py-2 border rounded-md w-64"
              placeholder="Fabric name"
            />

            <label className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-white border cursor-pointer text-sm">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files && e.target.files[0];
                  if (f) handleMainImagePick(f);
                }}
              />
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              <span>{newMainImage ? newMainImage.name : "Change main image"}</span>
            </label>

            <div className="flex gap-2">
              <button
                onClick={handleSaveEdits}
                className="px-4 py-2 bg-blue-600 text-white rounded-md shadow-sm"
                disabled={savingEdits}
              >
                {savingEdits ? "Saving..." : "Save"}
              </button>
              <button
                onClick={handleCancelEdits}
                className="px-4 py-2 bg-white border rounded-md"
                disabled={savingEdits}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Collections */}
      {renderImageCollection("Men's Collection", fabric.menCollection, "menCollection")}
      {renderImageCollection("Women's Collection", fabric.womenCollection, "womenCollection")}
      {renderImageCollection("Kids' Collection", fabric.kidsCollection, "kidsCollection")}

      {/* uploading indicator */}
      {uploading && (
        <div className="fixed bottom-6 right-6 bg-white border rounded-full px-4 py-2 shadow-lg text-sm">
          Uploading...
        </div>
      )}

      {/* ---------- Simple Image Modal (no zoom/pan) ---------- */}
      {imageModalOpen && imageModalUrl && (
        <div className="fixed inset-0 z-60 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/70"
            onClick={closeImageModal}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="relative z-70 max-w-[90vw] max-h-[90vh] mx-4"
          >
            <button
              onClick={closeImageModal}
              className="absolute right-3 top-3 z-50 bg-white/90 p-2 rounded-md shadow"
              title="Close"
            >
              ✕
            </button>
            <div className="bg-black rounded-lg overflow-hidden flex items-center justify-center p-4">
              <img
                src={imageModalUrl}
                alt="preview"
                className="max-w-full max-h-[80vh] object-contain"
              />
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default FPage;
