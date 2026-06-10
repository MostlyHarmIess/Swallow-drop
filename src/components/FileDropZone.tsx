import { useState, useRef } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";

type Identity = {
  name: string;
  color: string;
  sessionId: string;
};

type FileDropZoneProps = {
  identity: Identity;
};

export default function FileDropZone({ identity }: FileDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const createDrop = useMutation(api.drops.create);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    await handleFiles(files);
  };

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files
      ? Array.from(e.currentTarget.files)
      : [];
    handleFiles(files);
  };

  const handleFiles = async (files: File[]) => {
    setUploading(true);

    for (const file of files) {
      try {
        // Register file in the database
        await createDrop({
          fileName: file.name,
          originalName: file.name,
          fileSize: file.size,
          fileType: file.type,
          isFolder: false,
          fileCount: 1,
          senderName: identity.name,
          senderSessionId: identity.sessionId,
          slotId: 0,
        });

        setUploadedFiles((prev) => [...prev, file.name]);
      } catch (error) {
        console.error("Error uploading file:", error);
      }
    }

    setUploading(false);

    // Clear uploaded files after 5 seconds
    setTimeout(() => setUploadedFiles([]), 5000);
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-all ${
        isDragging
          ? "border-blue-500 bg-blue-50"
          : "border-slate-300 hover:border-slate-400 bg-white"
      }`}
    >
      <div className="mb-4">
        <svg
          className="w-12 h-12 mx-auto text-slate-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
          />
        </svg>
      </div>

      <p className="text-slate-600 font-medium mb-2">
        Drag and drop files here
      </p>
      <p className="text-sm text-slate-500 mb-4">
        or click to select from your computer
      </p>

      <input
        ref={fileInputRef}
        type="file"
        id="file-input"
        multiple
        onChange={handleFileInput}
        className="hidden"
        disabled={uploading}
      />
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className="px-6 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition"
      >
        {uploading ? "Uploading..." : "Select Files"}
      </button>

      {uploadedFiles.length > 0 && (
        <div className="mt-6 space-y-2 text-left">
          <p className="text-sm font-semibold text-slate-900">Shared files:</p>
          {uploadedFiles.map((fileName) => (
            <div
              key={fileName}
              className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded-lg"
            >
              <svg
                className="w-4 h-4 text-green-600 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="text-sm text-slate-900">{fileName}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
