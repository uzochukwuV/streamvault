import { useMutation } from "@tanstack/react-query";
import { useCallback } from "react";
import { Synapse } from "@filoz/synapse-sdk";
import { useEthersSigner } from "@/hooks/useEthers";
import { useAccount } from "wagmi";
import { config } from "@/config";
import { downloadFile, downloadToDevice, cleanupFileUrls } from "@/utils/fileDowload";

interface ExtractedFileData {
  metadata: any;
  audioFile: File | null;
  coverImage: File | null;
  audioUrl: string | null;
  imageUrl: string | null;
}

/**
 * Hook to download a piece from the Filecoin network using Synapse.
 */
export const useDownloadPiece = (commp: string, filename: string) => {
  const signer = useEthersSigner();
  const { address, chainId } = useAccount();
  const mutation = useMutation({
    mutationKey: ["download-piece", address, commp, filename],
    mutationFn: async () => {
      if (!signer) throw new Error("Signer not found");
      if (!address) throw new Error("Address not found");
      if (!chainId) throw new Error("Chain ID not found");

      // 1) Create Synapse instance
      const synapse = await Synapse.create({
        provider: signer.provider,
        withCDN: config.withCDN,
      });

      // 2) Download file
      const uint8ArrayBytes = await synapse.storage.download(commp);

      const file = new File([uint8ArrayBytes as BlobPart], filename);

      // Download file to browser
      const url = URL.createObjectURL(file);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      return file;
    },
    onSuccess: () => {
      console.log("File downloaded", filename);
    },
    onError: (error) => {
      console.error("Error downloading piece", error);
    },
  });

  return {
    downloadMutation: mutation,
  };
};

/**
 * Hook to download and extract ZIP files from Filecoin network
 */
export const useDownloadAndExtract = () => {
  const signer = useEthersSigner();
  const { address, chainId } = useAccount();

  const mutation = useMutation({
    mutationKey: ["download-extract", address],
    mutationFn: async ({ commp, filename = "file.zip" }: { commp: string; filename?: string }): Promise<ExtractedFileData> => {
      if (!signer) throw new Error("Signer not found");
      if (!address) throw new Error("Address not found");
      if (!chainId) throw new Error("Chain ID not found");

      // Create Synapse instance
      const synapse = await Synapse.create({
        provider: signer.provider,
        withCDN: config.withCDN,
      });

      // Download and extract using the utility function
      return await downloadFile(synapse, commp, filename);
    },
    onSuccess: (data) => {
      console.log("File downloaded and extracted successfully", data);
    },
    onError: (error) => {
      console.error("Error downloading and extracting file", error);
    },
  });

  return {
    downloadAndExtractMutation: mutation,
  };
};

/**
 * Hook for file management utilities
 */
export const useFileManager = () => {
  // Helper function to get MIME type from file extension
  const getMimeTypeFromExtension = useCallback((filename: string): string => {
    const extension = filename.split('.').pop()?.toLowerCase();

    const mimeTypes: { [key: string]: string } = {
      // Audio types
      mp3: 'audio/mpeg',
      wav: 'audio/wav',
      flac: 'audio/flac',
      m4a: 'audio/mp4',
      aac: 'audio/aac',
      ogg: 'audio/ogg',
      wma: 'audio/x-ms-wma',

      // Video types
      mp4: 'video/mp4',
      webm: 'video/webm',
      avi: 'video/x-msvideo',
      mov: 'video/quicktime',

      // Image types
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
      svg: 'image/svg+xml',
      bmp: 'image/bmp',

      // Document types
      pdf: 'application/pdf',
      txt: 'text/plain',
      json: 'application/json',
      zip: 'application/zip',
    };

    return mimeTypes[extension || ''] || 'application/octet-stream';
  }, []);

  // Function to download file to user's device
  const downloadToUserDevice = useCallback((file: File, customFilename?: string) => {
    const url = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = url;
    link.download = customFilename || file.name;
    link.style.display = 'none';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up the URL after download
    setTimeout(() => URL.revokeObjectURL(url), 100);
  }, []);

  // Function to download from blob URL
  const downloadFromUrl = useCallback((url: string, filename: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);

  // Function to clean up created URLs to prevent memory leaks
  const cleanupUrls = useCallback((...urls: (string | null | undefined)[]) => {
    urls.forEach(url => {
      if (url && url.startsWith('blob:')) {
        URL.revokeObjectURL(url);
      }
    });
  }, []);

  // Function to create blob URL from file
  const createBlobUrl = useCallback((file: File): string => {
    return URL.createObjectURL(file);
  }, []);

  // Function to create blob URL from array buffer
  const createBlobUrlFromBuffer = useCallback((buffer: ArrayBuffer, mimeType: string): string => {
    const blob = new Blob([buffer], { type: mimeType });
    return URL.createObjectURL(blob);
  }, []);

  // Function to validate file type
  const validateFileType = useCallback((file: File, allowedTypes: string[]): boolean => {
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    return allowedTypes.includes(fileExtension || '');
  }, []);

  // Function to format file size
  const formatFileSize = useCallback((bytes: number): string => {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }, []);

  // Function to read file as text
  const readFileAsText = useCallback((file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    });
  }, []);

  // Function to read file as array buffer
  const readFileAsArrayBuffer = useCallback((file: File): Promise<ArrayBuffer> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = () => reject(reader.error);
      reader.readAsArrayBuffer(file);
    });
  }, []);

  return {
    // Core utilities
    getMimeTypeFromExtension,
    downloadToUserDevice,
    downloadFromUrl,
    cleanupUrls,
    createBlobUrl,
    createBlobUrlFromBuffer,

    // File validation and formatting
    validateFileType,
    formatFileSize,

    // File reading utilities
    readFileAsText,
    readFileAsArrayBuffer,

    // Legacy compatibility
    downloadToDevice: downloadToUserDevice,
    cleanupFileUrls: cleanupUrls,
  };
};

/**
 * Hook for audio file management specifically
 */
export const useAudioFileManager = () => {
  const fileManager = useFileManager();

  const createAudioElement = useCallback((audioUrl: string): HTMLAudioElement => {
    const audio = new Audio(audioUrl);
    audio.preload = 'metadata';
    return audio;
  }, []);

  const getAudioDuration = useCallback((file: File): Promise<number> => {
    return new Promise((resolve, reject) => {
      const audio = new Audio();
      const url = URL.createObjectURL(file);

      audio.addEventListener('loadedmetadata', () => {
        URL.revokeObjectURL(url);
        resolve(audio.duration);
      });

      audio.addEventListener('error', () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load audio metadata'));
      });

      audio.src = url;
    });
  }, []);

  const validateAudioFile = useCallback((file: File): boolean => {
    const audioTypes = ['mp3', 'wav', 'flac', 'm4a', 'aac', 'ogg'];
    return fileManager.validateFileType(file, audioTypes);
  }, [fileManager]);

  return {
    ...fileManager,
    createAudioElement,
    getAudioDuration,
    validateAudioFile,
  };
};
