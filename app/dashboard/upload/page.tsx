"use client"
import React, { useState, useRef, ChangeEvent } from "react";
import {
  UploadCloud,
  Image,
  Music,
  Play,
  Wallet,
  CheckCircle,
  AlertTriangle,
  Calendar,
  Tag,
  Users,
  Clock,
  FileAudio,
  FileImage,
  Zap,
  Star,
  Globe,
  Lock,
  DollarSign,
  Info
} from "lucide-react";
import { useAccount } from "wagmi";

interface Alert {
  type: "info" | "error" | "success";
  message: string;
}

interface MusicMetadata {
  title: string;
  artist: string;
  genre: string;
  mood: string;
  description?: string;
  tags: string[];
  lyrics?: string;
  isExplicit: boolean;
  isPremium: boolean;
  releaseDate: string;
  collaborators: string[];
  credits: {
    producer?: string;
    songwriter?: string;
    engineer?: string;
    mixer?: string;
  };
}

export default function CreatorUploadTSX() {
  const {address}  = useAccount()
  // Music metadata state
  const [metadata, setMetadata] = useState<MusicMetadata>({
    title: "",
    artist: "",
    genre: "Electronic",
    mood: "Energetic",
    description: "",
    tags: [],
    lyrics: "",
    isExplicit: false,
    isPremium: false,
    releaseDate: new Date().toISOString().split('T')[0],
    collaborators: [],
    credits: {
      producer: "",
      songwriter: "",
      engineer: "",
      mixer: ""
    }
  });

  // File state
  const [coverPreview, setCoverPreview] = useState<string>("");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const [currentTag, setCurrentTag] = useState<string>("");
  const [currentCollaborator, setCurrentCollaborator] = useState<string>("");

  // Upload state
  const [uploadPriceFIL] = useState<number>(0.05);
  const [uploading, setUploading] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [alert, setAlert] = useState<Alert | null>(null);
  const [activeTab, setActiveTab] = useState<'basic' | 'details' | 'credits'>('basic');

  const audioRef = useRef<HTMLAudioElement | null>(null);

  

  const onDropFile = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;

    if (f.type.startsWith("image/")) {
      const url = URL.createObjectURL(f);
      setCoverPreview(url);
      setCoverFile(f);
      return;
    }

    if (f.type.startsWith("audio/")) {
      setAudioFile(f);
      const url = URL.createObjectURL(f);
      const a = new Audio(url);
      a.addEventListener("loadedmetadata", () => {
        setDuration(Math.round(a.duration));
      });
      audioRef.current = a;
      return;
    }
  };

  const updateMetadata = (field: keyof MusicMetadata, value: any) => {
    setMetadata(prev => ({ ...prev, [field]: value }));
  };

  const addTag = () => {
    if (currentTag.trim() && !metadata.tags.includes(currentTag.trim())) {
      updateMetadata('tags', [...metadata.tags, currentTag.trim()]);
      setCurrentTag("");
    }
  };

  const removeTag = (tag: string) => {
    updateMetadata('tags', metadata.tags.filter(t => t !== tag));
  };

  const addCollaborator = () => {
    if (currentCollaborator.trim() && !metadata.collaborators.includes(currentCollaborator.trim())) {
      updateMetadata('collaborators', [...metadata.collaborators, currentCollaborator.trim()]);
      setCurrentCollaborator("");
    }
  };

  const removeCollaborator = (collaborator: string) => {
    updateMetadata('collaborators', metadata.collaborators.filter(c => c !== collaborator));
  };

  const canPublish = (): boolean => {
    if (!audioFile || !metadata.title.trim() || !metadata.artist.trim()) return false;
    return true;
  };

  const startUpload = async () => {
    
    if (!audioFile) {
      setAlert({ type: "error", message: "No audio file selected." });
      return;
    }

    setUploading(true);
    setProgress(0);
    setAlert({ type: "info", message: "Preparing upload..." });

    try {
      // Create form data for upload with all files and metadata
      const formData = new FormData();
      formData.append('audioFile', audioFile);

      // Add cover image if available
      if (coverFile) {
        formData.append('coverImage', coverFile);
      }

      // Add complete metadata
      const completeMetadata = {
        ...metadata,
        description: metadata.description || `Track by ${metadata.artist}`,
        fileSize: audioFile.size,
        duration: duration || 0,
        uploadedAt: new Date().toISOString(),
        walletAddress: address
      };

      formData.append('metadata', JSON.stringify(completeMetadata));
      formData.append('creatorId', address!.toString()); // This should come from auth
      formData.append("walletAddress", address!.toString() )

      setProgress(10);
      setAlert({ type: "info", message: "Uploading to Filecoin..." });

     

     
      const response = await fetch('/api/upload/single', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const result = await response.json();

      setProgress(100);
      setUploading(false);
      setAlert({
        type: "success",
        message: `Upload successful! Your music bundle is now stored on Filecoin. CID: ${result.upload.pieceCid}`
      });

      console.log('Upload details:', result.upload);

      // Reset form after successful upload
      setTimeout(() => {
        setMetadata({
          title: "",
          artist: "",
          genre: "Electronic",
          mood: "Energetic",
          description: "",
          tags: [],
          lyrics: "",
          isExplicit: false,
          isPremium: false,
          releaseDate: new Date().toISOString().split('T')[0],
          collaborators: [],
          credits: {
            producer: "",
            songwriter: "",
            engineer: "",
            mixer: ""
          }
        });
        setCoverPreview("");
        setCoverFile(null);
        setAudioFile(null);
        setDuration(null);
        setAlert(null);
        setProgress(0);
        setActiveTab('basic');
      }, 3000);

    } catch (error: any) {
      console.error('Upload error:', error);
      setUploading(false);
      setProgress(0);
      setAlert({
        type: "error",
        message: `Upload failed: ${error.message}`
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-900 via-neutral-950 to-black text-white">
      <div className="container mx-auto p-6">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Upload Form */}
          <div className="lg:col-span-2 bg-white/5 backdrop-blur-sm rounded-3xl p-8 space-y-8 border border-white/10">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-6">
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                  Upload Your Music
                </h1>
                <p className="text-gray-300 mt-2">Share your creativity with the world on Filecoin</p>
              </div>

             
            </div>

            {/* Alert */}
            {alert && (
              <div className={`p-4 rounded-xl border ${
                alert.type === "error"
                  ? "bg-red-900/20 border-red-500/30"
                  : alert.type === "success"
                  ? "bg-green-900/20 border-green-500/30"
                  : "bg-blue-900/20 border-blue-500/30"
              }`}>
                <div className="flex items-center gap-3">
                  {alert.type === "error" ? (
                    <AlertTriangle className="w-5 h-5 text-red-400" />
                  ) : alert.type === "success" ? (
                    <CheckCircle className="w-5 h-5 text-green-400" />
                  ) : (
                    <Info className="w-5 h-5 text-blue-400" />
                  )}
                  <div className="text-sm">{alert.message}</div>
                </div>
              </div>
            )}

            {/* Tab Navigation */}
            <div className="flex gap-2 border-b border-white/10 mb-6">
              {[{ key: 'basic', label: 'Basic Info', icon: FileAudio }, { key: 'details', label: 'Details', icon: Tag }, { key: 'credits', label: 'Credits', icon: Users }].map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key as typeof activeTab)}
                  className={`flex items-center gap-2 px-4 py-3 rounded-t-xl transition-colors duration-200 ${
                    activeTab === key
                      ? 'bg-white/10 text-white border-b-2 border-blue-400'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="space-y-6">
              {activeTab === 'basic' && (
                <div className="space-y-6">
                  {/* File Upload Section */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4 text-white">Upload Files</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Audio File Upload */}
                      <div className="border-2 border-dashed border-white/20 rounded-2xl p-6 bg-white/5 hover:bg-white/10 transition-colors duration-200">
                        <div className="flex flex-col items-center gap-4">
                          <div className="p-3 bg-blue-500/20 rounded-full">
                            <FileAudio className="w-8 h-8 text-blue-400" />
                          </div>
                          <div className="text-center">
                            <h4 className="font-medium mb-1">Audio File *</h4>
                            <p className="text-sm text-gray-400">MP3, WAV, FLAC up to 100MB</p>
                          </div>
                          <label className="flex items-center gap-2 bg-blue-500/20 hover:bg-blue-500/30 px-4 py-2 rounded-xl cursor-pointer transition-colors duration-200">
                            <UploadCloud className="w-4 h-4" />
                            <span className="text-sm font-medium">Choose Audio</span>
                            <input onChange={onDropFile} type="file" accept="audio/*" className="hidden" />
                          </label>
                          {audioFile && (
                            <div className="text-center">
                              <div className="text-sm text-green-400 font-medium">{audioFile.name}</div>
                              {duration && (
                                <div className="text-xs text-gray-400 mt-1 flex items-center justify-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {Math.floor(duration / 60)}:{String(duration % 60).padStart(2, "0")}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Cover Art Upload */}
                      <div className="border-2 border-dashed border-white/20 rounded-2xl p-6 bg-white/5 hover:bg-white/10 transition-colors duration-200">
                        <div className="flex flex-col items-center gap-4">
                          <div className="p-3 bg-purple-500/20 rounded-full">
                            <FileImage className="w-8 h-8 text-purple-400" />
                          </div>
                          <div className="text-center">
                            <h4 className="font-medium mb-1">Cover Art</h4>
                            <p className="text-sm text-gray-400">JPG, PNG (Optional)</p>
                          </div>
                          {coverPreview ? (
                            <div className="w-20 h-20 rounded-lg overflow-hidden border border-white/20">
                              <img src={coverPreview} alt="Cover" className="w-full h-full object-cover" />
                            </div>
                          ) : (
                            <label className="flex items-center gap-2 bg-purple-500/20 hover:bg-purple-500/30 px-4 py-2 rounded-xl cursor-pointer transition-colors duration-200">
                              <UploadCloud className="w-4 h-4" />
                              <span className="text-sm font-medium">Choose Image</span>
                              <input onChange={onDropFile} type="file" accept="image/*" className="hidden" />
                            </label>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Basic Information */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4 text-white">Track Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Track Title *</label>
                        <input
                          value={metadata.title}
                          onChange={(e) => updateMetadata('title', e.target.value)}
                          className="w-full bg-white/5 border border-white/10 p-4 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200"
                          placeholder="Enter track title"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Artist Name *</label>
                        <input
                          value={metadata.artist}
                          onChange={(e) => updateMetadata('artist', e.target.value)}
                          className="w-full bg-white/5 border border-white/10 p-4 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200"
                          placeholder="Enter artist name"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Genre</label>
                        <select
                          value={metadata.genre}
                          onChange={(e) => updateMetadata('genre', e.target.value)}
                          className="w-full bg-white/5 border border-white/10 p-4 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200"
                        >
                          <option value="Electronic">Electronic</option>
                          <option value="Hip Hop">Hip Hop</option>
                          <option value="Pop">Pop</option>
                          <option value="Rock">Rock</option>
                          <option value="Jazz">Jazz</option>
                          <option value="Classical">Classical</option>
                          <option value="R&B">R&B</option>
                          <option value="Country">Country</option>
                          <option value="Folk">Folk</option>
                          <option value="Alternative">Alternative</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Mood</label>
                        <select
                          value={metadata.mood}
                          onChange={(e) => updateMetadata('mood', e.target.value)}
                          className="w-full bg-white/5 border border-white/10 p-4 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200"
                        >
                          <option value="Energetic">Energetic</option>
                          <option value="Chill">Chill</option>
                          <option value="Melancholic">Melancholic</option>
                          <option value="Happy">Happy</option>
                          <option value="Dark">Dark</option>
                          <option value="Romantic">Romantic</option>
                          <option value="Aggressive">Aggressive</option>
                          <option value="Peaceful">Peaceful</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'details' && (
                <div className="space-y-6">
                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
                    <textarea
                      value={metadata.description}
                      onChange={(e) => updateMetadata('description', e.target.value)}
                      className="w-full bg-white/5 border border-white/10 p-4 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200 resize-none"
                      rows={4}
                      placeholder="Tell us about your track..."
                    />
                  </div>

                  {/* Tags */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Tags</label>
                    <div className="flex gap-2 mb-3">
                      <input
                        value={currentTag}
                        onChange={(e) => setCurrentTag(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                        className="flex-1 bg-white/5 border border-white/10 p-3 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200"
                        placeholder="Add a tag..."
                      />
                      <button
                        onClick={addTag}
                        className="px-4 py-3 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-xl transition-colors duration-200"
                      >
                        <Tag className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {metadata.tags.map(tag => (
                        <span
                          key={tag}
                          className="bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full text-sm flex items-center gap-2 border border-blue-500/30"
                        >
                          {tag}
                          <button
                            onClick={() => removeTag(tag)}
                            className="hover:text-red-400 transition-colors"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Collaborators */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Collaborators</label>
                    <div className="flex gap-2 mb-3">
                      <input
                        value={currentCollaborator}
                        onChange={(e) => setCurrentCollaborator(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCollaborator())}
                        className="flex-1 bg-white/5 border border-white/10 p-3 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200"
                        placeholder="Add a collaborator..."
                      />
                      <button
                        onClick={addCollaborator}
                        className="px-4 py-3 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-xl transition-colors duration-200"
                      >
                        <Users className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {metadata.collaborators.map(collaborator => (
                        <span
                          key={collaborator}
                          className="bg-purple-500/20 text-purple-400 px-3 py-1 rounded-full text-sm flex items-center gap-2 border border-purple-500/30"
                        >
                          {collaborator}
                          <button
                            onClick={() => removeCollaborator(collaborator)}
                            className="hover:text-red-400 transition-colors"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Settings */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Release Date</label>
                      <input
                        type="date"
                        value={metadata.releaseDate}
                        onChange={(e) => updateMetadata('releaseDate', e.target.value)}
                        className="w-full bg-white/5 border border-white/10 p-4 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200"
                      />
                    </div>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-gray-300">Explicit Content</label>
                        <button
                          onClick={() => updateMetadata('isExplicit', !metadata.isExplicit)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${
                            metadata.isExplicit ? 'bg-red-500' : 'bg-white/20'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                              metadata.isExplicit ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                          <Lock className="w-4 h-4" />
                          Premium Content
                        </label>
                        <button
                          onClick={() => updateMetadata('isPremium', !metadata.isPremium)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${
                            metadata.isPremium ? 'bg-yellow-500' : 'bg-white/20'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                              metadata.isPremium ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Lyrics */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Lyrics (Optional)</label>
                    <textarea
                      value={metadata.lyrics}
                      onChange={(e) => updateMetadata('lyrics', e.target.value)}
                      className="w-full bg-white/5 border border-white/10 p-4 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200 resize-none"
                      rows={8}
                      placeholder="Enter song lyrics here..."
                    />
                  </div>
                </div>
              )}

              {activeTab === 'credits' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-white">Production Credits</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Producer</label>
                      <input
                        value={metadata.credits.producer}
                        onChange={(e) => updateMetadata('credits', { ...metadata.credits, producer: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 p-4 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200"
                        placeholder="Producer name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Songwriter</label>
                      <input
                        value={metadata.credits.songwriter}
                        onChange={(e) => updateMetadata('credits', { ...metadata.credits, songwriter: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 p-4 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200"
                        placeholder="Songwriter name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Sound Engineer</label>
                      <input
                        value={metadata.credits.engineer}
                        onChange={(e) => updateMetadata('credits', { ...metadata.credits, engineer: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 p-4 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200"
                        placeholder="Engineer name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Mix Engineer</label>
                      <input
                        value={metadata.credits.mixer}
                        onChange={(e) => updateMetadata('credits', { ...metadata.credits, mixer: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 p-4 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200"
                        placeholder="Mixer name"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Upload Controls */}
            <div className="border-t border-white/10 pt-6 mt-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <DollarSign className="w-5 h-5 text-yellow-400" />
                  <div>
                    <div className="text-sm font-medium">Upload Fee</div>
                    <div className="text-xs text-gray-400">Filecoin decentralized storage</div>
                  </div>
                </div>
                <div className="text-2xl font-bold text-yellow-400">{uploadPriceFIL} FIL</div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={startUpload}
                  disabled={!canPublish() || uploading}
                  className={`flex-1 px-6 py-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all duration-200 ${
                    canPublish() && !uploading
                      ? 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg'
                      : 'bg-white/5 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {uploading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Uploading to Filecoin...
                    </>
                  ) : (
                    <>
                      <Zap className="w-5 h-5" />
                      Publish to Filecoin
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    setMetadata({
                      title: "",
                      artist: "",
                      genre: "Electronic",
                      mood: "Energetic",
                      description: "",
                      tags: [],
                      lyrics: "",
                      isExplicit: false,
                      isPremium: false,
                      releaseDate: new Date().toISOString().split('T')[0],
                      collaborators: [],
                      credits: { producer: "", songwriter: "", engineer: "", mixer: "" }
                    });
                    setCoverPreview("");
                    setCoverFile(null);
                    setAudioFile(null);
                    setDuration(null);
                    setActiveTab('basic');
                  }}
                  className="px-8 py-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors duration-200 border border-white/10 font-medium"
                >
                  Reset Form
                </button>
              </div>
            </div>

          </div>

          {/* Preview Panel */}
          <div className="space-y-6">
            {/* Track Preview */}
            <div className="bg-gradient-to-br from-purple-600/20 via-pink-600/20 to-orange-500/20 rounded-3xl p-6 border border-white/10 backdrop-blur-sm">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Star className="w-5 h-5 text-yellow-400" />
                Track Preview
              </h3>

              <div className="space-y-4">
                {/* Cover and Basic Info */}
                <div className="flex items-start gap-4">
                  <div className="w-24 h-24 bg-white/10 rounded-xl grid place-items-center overflow-hidden border border-white/20">
                    {coverPreview ? (
                      <img src={coverPreview} alt="cover" className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-center">
                        <FileImage className="w-8 h-8 mx-auto mb-1 text-gray-400" />
                        <div className="text-xs text-gray-400">No Cover</div>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-lg truncate">{metadata.title || "Untitled Track"}</h4>
                    <p className="text-gray-300 truncate">{metadata.artist || "Unknown Artist"}</p>
                    <div className="flex items-center gap-2 mt-2 text-sm text-gray-400">
                      <span className="bg-white/10 px-2 py-1 rounded-full">{metadata.genre}</span>
                      {duration && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {Math.floor(duration / 60)}:{String(duration % 60).padStart(2, "0")}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Preview Button */}
                <button className="w-full bg-gradient-to-r from-blue-500/20 to-purple-500/20 hover:from-blue-500/30 hover:to-purple-500/30 border border-white/20 px-4 py-3 rounded-xl flex items-center justify-center gap-2 transition-all duration-200">
                  <Play className="w-5 h-5" />
                  Preview Track
                </button>

                {/* Metadata Preview */}
                <div className="space-y-3 text-sm">
                  {metadata.description && (
                    <div>
                      <span className="text-gray-400">Description:</span>
                      <p className="text-gray-300 mt-1 line-clamp-3">{metadata.description}</p>
                    </div>
                  )}

                  {metadata.tags.length > 0 && (
                    <div>
                      <span className="text-gray-400">Tags:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {metadata.tags.slice(0, 3).map(tag => (
                          <span key={tag} className="bg-blue-500/20 text-blue-400 px-2 py-1 rounded-full text-xs">
                            {tag}
                          </span>
                        ))}
                        {metadata.tags.length > 3 && (
                          <span className="text-gray-400 text-xs px-2 py-1">+{metadata.tags.length - 3} more</span>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-4 pt-2 border-t border-white/10">
                    {metadata.isExplicit && (
                      <span className="bg-red-500/20 text-red-400 px-2 py-1 rounded-full text-xs flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        Explicit
                      </span>
                    )}
                    {metadata.isPremium && (
                      <span className="bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded-full text-xs flex items-center gap-1">
                        <Star className="w-3 h-3" />
                        Premium
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Upload Info */}
            <div className="bg-white/5 rounded-3xl p-6 border border-white/10">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Info className="w-5 h-5 text-blue-400" />
                Upload Information
              </h3>

              <div className="space-y-4 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Storage</span>
                  <span className="text-blue-400 font-medium">Filecoin Network</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Bundle Format</span>
                  <span className="text-green-400 font-medium">ZIP Archive</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Processing Time</span>
                  <span className="text-yellow-400 font-medium">~2-5 minutes</span>
                </div>

                <div className="border-t border-white/10 pt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Total Cost</span>
                    <span className="text-2xl font-bold text-yellow-400">{uploadPriceFIL} FIL</span>
                  </div>
                </div>
              </div>
            </div>

            {/* File Status */}
            <div className="bg-white/5 rounded-3xl p-6 border border-white/10">
              <h3 className="text-lg font-bold mb-4">File Status</h3>

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${
                    audioFile ? 'bg-green-400' : 'bg-gray-400'
                  }`} />
                  <span className={`text-sm ${
                    audioFile ? 'text-green-400' : 'text-gray-400'
                  }`}>
                    Audio File {audioFile ? '✓' : '(Required)'}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${
                    coverFile ? 'bg-green-400' : 'bg-yellow-400'
                  }`} />
                  <span className={`text-sm ${
                    coverFile ? 'text-green-400' : 'text-yellow-400'
                  }`}>
                    Cover Art {coverFile ? '✓' : '(Optional)'}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${
                    metadata.title && metadata.artist ? 'bg-green-400' : 'bg-gray-400'
                  }`} />
                  <span className={`text-sm ${
                    metadata.title && metadata.artist ? 'text-green-400' : 'text-gray-400'
                  }`}>
                    Basic Info {metadata.title && metadata.artist ? '✓' : '(Required)'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Upload Progress */}
        {uploading && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-8 max-w-md w-full mx-4 border border-white/20">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 mx-auto bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                </div>

                <h3 className="text-xl font-bold">Uploading to Filecoin</h3>
                <p className="text-gray-300">Your music is being bundled and uploaded to decentralized storage...</p>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm text-gray-400">
                    <span>Progress</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="w-full bg-white/20 h-3 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${progress}%` }}
                      className="h-full bg-gradient-to-r from-green-400 to-blue-500 transition-all duration-300"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      </div>
      
  );
}
