'use client';
import { ethers } from 'ethers';
import { useState, useCallback } from 'react';
import { useAccount } from 'wagmi';

export function FileUploader() {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const { isConnected } = useAccount();
  const [status, setStatus] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragIn = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragOut = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      setFile(files[0]);
    }
  }, []);

  const handleSubmit = async () => {
    if (!file) return;
    try {
      setIsLoading(true);
      setProgress(0);
      setStatus('Preparing upload...');
      
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      // TODO: upload file to Filecoin using synapse-sdk

      setStatus('✅ File uploaded successfully to Filecoin!');
    } catch (err: any) {
      console.error(err);
      setStatus(`❌ ${err.message || 'Upload failed. Please try again.'}`);
    } finally {
      setIsLoading(false);
      setProgress(0);
    }
  };

  const handleReset = () => {
    setFile(null);
    setStatus('');
    setProgress(0);
  };

  if (!isConnected) {
    return null;
  }

  return (
    <div className="w-full max-w-md">
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          isDragging
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragEnter={handleDragIn}
        onDragLeave={handleDragOut}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => document.getElementById('fileInput')?.click()}
      >
        <input
          id="fileInput"
          type="file"
          onChange={(e) => e.target.files && setFile(e.target.files[0])}
          className="hidden"
        />
        <div className="flex flex-col items-center gap-2">
          <svg
            className={`w-10 h-10 ${isDragging ? 'text-blue-500' : 'text-gray-400'}`}
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
          <p className="text-lg font-medium">
            {file ? file.name : 'Drop your file here, or click to select'}
          </p>
          {!file && (
            <p className="text-sm text-gray-500">
              Drag and drop your file, or click to browse
            </p>
          )}
        </div>
      </div>
      
      <div className="flex justify-center gap-4 mt-4">
        <button
          onClick={handleSubmit}
          disabled={!file || isLoading}
          className={`px-6 py-2 rounded-[20px] text-center border-2 border-black transition-all ${
            !file || isLoading
              ? 'bg-gray-200 border-gray-200 text-gray-400 cursor-not-allowed'
              : 'bg-black text-white hover:bg-white hover:text-black'
          }`}
        >
          {isLoading ? 'Uploading...' : 'Submit'}
        </button>
        <button
          onClick={handleReset}
          disabled={!file || isLoading}
          className={`px-6 py-2 rounded-[20px] text-center border-2 transition-all ${
            !file || isLoading
              ? 'border-gray-200 text-gray-400 cursor-not-allowed'
              : 'border-black text-black hover:bg-black hover:text-white'
          }`}
        >
          Reset
        </button>
      </div>
      {status && (
        <div className="mt-4 text-center">
          <p className={`text-sm ${
            status.includes('❌') ? 'text-red-500' : 
            status.includes('✅') ? 'text-green-500' : 
            'text-gray-500'
          }`}>
            {status}
          </p>
          {isLoading && (
            <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
              <div 
                className="bg-black h-2.5 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}