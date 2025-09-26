// src/FPage.js
import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import {
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";
import { db, storage } from "./Firebase";
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";

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

  // simple image modal
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

  // ---------- Upload helper ----------
  const handleUpload = async (fileList, collectionKey) => {
    if (!fileList || fileList.length === 0) return;
    setUploading(true);
    try {
      const files = Array.from(fileList);
      const urls = [];

      for (const file of files) {
        const safeName = `${Date.now()}_${file.name}`;
        const storageRef = ref(
          storage,
          `fabrics/${fabricId}/${collectionKey}/${safeName}`
        );
        const uploadTask = uploadBytesResumable(storageRef, file);

        await new Promise((resolve, reject) => {
          uploadTask.on(
            "state_changed",
            () => {},
            (err) => reject(err),
            async () => {
              const url = await getDownloadURL(uploadTask.snapshot.ref);
              urls.push(url);
              resolve();
            }
          );
        });
      }

      const docRef = doc(db, "Fabrics", fabricId);
      await updateDoc(docRef, { [collectionKey]: arrayUnion(...urls) });

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

  // ---------- Delete logic ----------
  const handleDeleteImage = async (imageUrl, collectionKey) => {
    const confirmed = window.confirm("Delete this image?");
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
        console.warn("Storage deletion attempt failed (continuing):", err);
      }

      const docRef = doc(db, "Fabrics", fabricId);
      await updateDoc(docRef, { [collectionKey]: arrayRemove(imageUrl) });

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

  // ---------- Edit name + main image ----------
  const handleMainImagePick = (file) => setNewMainImage(file);

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

  // ---------- Image modal ----------
  const openImageModal = (url) => {
    setImageModalUrl(url);
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

  // ---------- Render collection ----------
  const renderImageCollection = (title, images, collectionKey) => {
    const hasImages = images && images.length > 0;
    if (!hasImages && !editMode) return null;

    return (
      <section className="my-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800 uppercase">{title}</h2>
          {editMode && (
            <label className="px-3 py-1 rounded-full bg-white border text-sm cursor-pointer">
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => handleUpload(e.target.files, collectionKey)}
              />
              Add
            </label>
          )}
        </div>

        {hasImages ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 justify-items-center items-center">
            {images.map((imgUrl, idx) => (
              <div
                key={idx}
                className="relative flex items-center justify-center rounded-xl overflow-hidden bg-transparent"
              >
                <button
                  onClick={() => openImageModal(imgUrl)}
                  className="block p-0 border-0 bg-transparent"
                  aria-label="Open image"
                >
                  <img
                    src={imgUrl}
                    alt={`${title} ${idx + 1}`}
                    className="max-w-full max-h-[70vh] object-contain mx-auto"
                  />
                </button>

                {editMode && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!deletingUrl) handleDeleteImage(imgUrl, collectionKey);
                    }}
                    disabled={!!deletingUrl}
                    className="absolute top-3 right-3 bg-white/90 p-2 rounded-full text-red-600"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="border border-dashed border-gray-200 p-12 text-center bg-white">
            <p className="text-gray-500">No images yet for {title.toLowerCase()}.</p>
          </div>
        )}
      </section>
    );
  };

  if (loading) return <div className="text-center mt-20">Loading...</div>;
  if (error) return <div className="text-center mt-20 text-red-600">{error}</div>;
  if (!fabric) return null;

  return (
    <div className="px-6 py-10">
      {/* Header */}
      <div className="flex items-start justify-between mb-10">
        <h1 className="text-4xl font-extrabold text-gray-900">{fabric.name}</h1>
        <button
          onClick={() => {
            setEditMode((s) => {
              const next = !s;
              if (next) setEditName(fabric?.name || "");
              return next;
            });
          }}
          className={`px-3 py-1 rounded-lg text-sm font-medium border ${
            editMode ? "bg-red-50 text-red-700" : "bg-white text-gray-700"
          }`}
        >
          {editMode ? "Close" : "Edit"}
        </button>
      </div>

      {/* Main image */}
      <div className="flex justify-center mb-12">
        {fabric.mainImage ? (
          <button
            onClick={() => openImageModal(fabric.mainImage)}
            className="rounded-xl overflow-hidden flex items-center justify-center"
            aria-label="Open main image"
          >
            <img
              src={fabric.mainImage}
              alt={fabric.name}
              className="max-w-full max-h-[60vh] object-contain mx-auto"
            />
          </button>
        ) : (
          <div className="mx-auto w-full max-w-md h-40 bg-gray-100 flex items-center justify-center rounded-xl text-gray-500">
            No Main Image
          </div>
        )}

        {editMode && (
          <div className="mt-4 flex flex-col sm:flex-row items-center gap-3 justify-center">
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="px-3 py-2 border rounded-md w-64"
              placeholder="Fabric name"
            />

            <label className="px-3 py-2 rounded-md bg-white border cursor-pointer text-sm">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files && e.target.files[0];
                  if (f) handleMainImagePick(f);
                }}
              />
              {newMainImage ? newMainImage.name : "Change main image"}
            </label>

            <div className="flex gap-2">
              <button
                onClick={handleSaveEdits}
                className="px-4 py-2 bg-blue-600 text-white rounded-md"
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

      {/* Uploading indicator */}
      {uploading && (
        <div className="fixed bottom-6 right-6 bg-white border rounded-full px-4 py-2 text-sm">
          Uploading...
        </div>
      )}

      {/* Modal */}
      {imageModalOpen && imageModalUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/70" onClick={closeImageModal} />
          <div className="relative max-w-[90vw] max-h-[90vh] mx-4 flex items-center justify-center">
            <button
              onClick={closeImageModal}
              className="absolute right-3 top-3 bg-white/90 p-2 rounded-md"
              aria-label="Close preview"
            >
              ✕
            </button>
            <div className="bg-black rounded-lg overflow-hidden flex items-center justify-center p-4">
              <img
                src={imageModalUrl}
                alt="preview"
                className="max-w-full max-h-[80vh] object-contain mx-auto"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FPage;
