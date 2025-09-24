import { Synapse } from "@filoz/synapse-sdk";
import JSZip from "jszip";

interface ExtractedFileData {
  metadata: any;
  audioFile: File | null;
  coverImage: File | null;
  audioUrl: string | null;
  imageUrl: string | null;
}

export const downloadFile = async (
  synapse: Synapse,
  pieceId: string,
  filename = "file.zip"
): Promise<ExtractedFileData> => {
  try {
    // Download the ZIP file from Filecoin
    const uint8ArrayBytes = await synapse.storage.download(pieceId);

    // Create File object from downloaded bytes
    const zipFile = new File([uint8ArrayBytes as BlobPart], filename);

    // Unzip the file using JSZip
    const zip = new JSZip();
    const zipContent = await zip.loadAsync(zipFile);

    let metadata: any = null;
    let audioFile: File | null = null;
    let coverImage: File | null = null;
    let audioUrl: string | null = null;
    let imageUrl: string | null = null;

    // Extract each file from the ZIP
    for (const [fileName, fileObj] of Object.entries(zipContent.files)) {
      if (fileObj.dir) continue; // Skip directories

      const fileContent = await fileObj.async("uint8array");

      // Extract JSON metadata
      if (fileName.endsWith('.json')) {
        const textContent = new TextDecoder().decode(fileContent);
        metadata = JSON.parse(textContent);
      }

      // Extract audio files (MP3, WAV, FLAC, etc.)
      else if (fileName.match(/\.(mp3|wav|flac|m4a|aac|ogg)$/i)) {
        const mimeType = getMimeTypeFromExtension(fileName);
        audioFile = new File([new Uint8Array(fileContent)], fileName, { type: mimeType });
        audioUrl = URL.createObjectURL(audioFile);
      }

      // Extract image files (cover art)
      else if (fileName.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
        const mimeType = getMimeTypeFromExtension(fileName);
        coverImage = new File([new Uint8Array(fileContent)], fileName, { type: mimeType });
        imageUrl = URL.createObjectURL(coverImage);
      }
    }

    return {
      metadata,
      audioFile,
      coverImage,
      audioUrl,
      imageUrl,
    };

  } catch (error) {
    console.error('Error downloading and extracting file:', error);
    throw new Error(`Failed to download and extract file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// Helper function to get MIME type from file extension
function getMimeTypeFromExtension(filename: string): string {
  const extension = filename.split('.').pop()?.toLowerCase();

  const mimeTypes: { [key: string]: string } = {
    // Audio types
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    flac: 'audio/flac',
    m4a: 'audio/mp4',
    aac: 'audio/aac',
    ogg: 'audio/ogg',

    // Image types
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
  };

  return mimeTypes[extension || ''] || 'application/octet-stream';
}

// Utility function to download file to user's device
export const downloadToDevice = (file: File, customFilename?: string) => {
  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = customFilename || file.name;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// Utility function to clean up created URLs to prevent memory leaks
export const cleanupFileUrls = (...urls: (string | null)[]) => {
  urls.forEach(url => {
    if (url) {
      URL.revokeObjectURL(url);
    }
  });
};