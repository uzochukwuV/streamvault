"use client";

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useUnpublishedFiles, useUserUploadedFiles } from '@/hooks/useUploadedFiles';
import {
  PlayIcon,
  PauseIcon,
  EyeIcon,
  CloudArrowUpIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  MusicalNoteIcon,
  DocumentIcon,
  TrashIcon,
  PencilIcon,
  CurrencyDollarIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  InformationCircleIcon,
  PhotoIcon,
  SpeakerWaveIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  XMarkIcon,
  AdjustmentsHorizontalIcon,
  Squares2X2Icon,
  Bars3Icon
} from '@heroicons/react/24/outline';

import { useDownloadAndExtract } from '@/hooks/useFileManager';

interface FilterOptions {
  searchQuery: string;
  status: string[];
  fileType: string[];
  genre: string[];
  dateRange: {
    start: string;
    end: string;
  };
  sizeRange: {
    min: number;
    max: number;
  };
  sortBy: 'uploadedAt' | 'fileSize' | 'duration' | 'originalName';
  sortOrder: 'asc' | 'desc';
  isPremium: boolean | null;
  isSponsored: boolean | null;
}

interface SavedFilter {
  id: string;
  name: string;
  filters: FilterOptions;
  isDefault: boolean;
}

// Advanced Search Component
function AdvancedSearch({
  searchQuery,
  onSearchChange,
  placeholder = "Search files by name, genre, or tags..."
}: {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="relative">
      <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-neutral-400" />
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-10 pr-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-400 focus:ring-2 focus:ring-neutral-600 focus:border-transparent"
      />
      {searchQuery && (
        <button
          onClick={() => onSearchChange('')}
          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-neutral-400 hover:text-neutral-300"
        >
          <XMarkIcon className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

// Filter Chips Component
function FilterChips({
  filters,
  onRemoveFilter,
  onClearAll
}: {
  filters: Array<{ key: string; label: string; value: string }>;
  onRemoveFilter: (key: string, value?: string) => void;
  onClearAll: () => void;
}) {
  if (filters.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-neutral-400">Active filters:</span>
      {filters.map((filter, index) => (
        <span
          key={`${filter.key}-${filter.value}-${index}`}
          className="inline-flex items-center gap-1 px-2 py-1 bg-neutral-700 border border-neutral-600 rounded text-xs text-neutral-300"
        >
          {filter.label}
          <button
            onClick={() => onRemoveFilter(filter.key, filter.value)}
            className="text-neutral-400 hover:text-neutral-300"
          >
            <XMarkIcon className="w-3 h-3" />
          </button>
        </span>
      ))}
      <button
        onClick={onClearAll}
        className="text-xs text-neutral-400 hover:text-neutral-300 underline"
      >
        Clear all
      </button>
    </div>
  );
}

// Advanced Filter Panel Component
function AdvancedFilterPanel({
  filters,
  onFiltersChange,
  isOpen,
  onClose
}: {
  filters: FilterOptions;
  onFiltersChange: (filters: FilterOptions) => void;
  isOpen: boolean;
  onClose: () => void;
}) {
  const statusOptions = ['PROCESSING', 'UPLOADED', 'CONFIRMED', 'PUBLISHED', 'FAILED'];
  const fileTypeOptions = ['mp3', 'wav', 'flac', 'm4a', 'aac', 'ogg'];
  const genreOptions = ['Electronic', 'Hip-Hop', 'Pop', 'Rock', 'Jazz', 'Classical', 'R&B', 'Folk', 'Country', 'Alternative'];

  const handleStatusChange = (status: string, checked: boolean) => {
    const newStatuses = checked
      ? [...filters.status, status]
      : filters.status.filter(s => s !== status);
    onFiltersChange({ ...filters, status: newStatuses });
  };

  const handleFileTypeChange = (type: string, checked: boolean) => {
    const newTypes = checked
      ? [...filters.fileType, type]
      : filters.fileType.filter(t => t !== type);
    onFiltersChange({ ...filters, fileType: newTypes });
  };

  const handleGenreChange = (genre: string, checked: boolean) => {
    const newGenres = checked
      ? [...filters.genre, genre]
      : filters.genre.filter(g => g !== genre);
    onFiltersChange({ ...filters, genre: newGenres });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 w-full max-w-4xl max-h-[80vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white">Advanced Filters</h3>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-300"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Status Filter */}
          <div>
            <h4 className="text-sm font-medium text-neutral-300 mb-3">Upload Status</h4>
            <div className="space-y-2">
              {statusOptions.map(status => (
                <label key={status} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={filters.status.includes(status)}
                    onChange={(e) => handleStatusChange(status, e.target.checked)}
                    className="w-4 h-4 text-neutral-600 bg-neutral-800 border-neutral-600 rounded focus:ring-neutral-500"
                  />
                  <span className="text-sm text-neutral-400 capitalize">{status.toLowerCase()}</span>
                </label>
              ))}
            </div>
          </div>

          {/* File Type Filter */}
          <div>
            <h4 className="text-sm font-medium text-neutral-300 mb-3">File Type</h4>
            <div className="space-y-2">
              {fileTypeOptions.map(type => (
                <label key={type} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={filters.fileType.includes(type)}
                    onChange={(e) => handleFileTypeChange(type, e.target.checked)}
                    className="w-4 h-4 text-neutral-600 bg-neutral-800 border-neutral-600 rounded focus:ring-neutral-500"
                  />
                  <span className="text-sm text-neutral-400 uppercase">{type}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Genre Filter */}
          <div>
            <h4 className="text-sm font-medium text-neutral-300 mb-3">Genre</h4>
            <div className="space-y-2">
              {genreOptions.map(genre => (
                <label key={genre} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={filters.genre.includes(genre)}
                    onChange={(e) => handleGenreChange(genre, e.target.checked)}
                    className="w-4 h-4 text-neutral-600 bg-neutral-800 border-neutral-600 rounded focus:ring-neutral-500"
                  />
                  <span className="text-sm text-neutral-400">{genre}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Date Range */}
          <div>
            <h4 className="text-sm font-medium text-neutral-300 mb-3">Upload Date</h4>
            <div className="space-y-2">
              <input
                type="date"
                value={filters.dateRange.start}
                onChange={(e) => onFiltersChange({
                  ...filters,
                  dateRange: { ...filters.dateRange, start: e.target.value }
                })}
                className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white text-sm"
                placeholder="Start date"
              />
              <input
                type="date"
                value={filters.dateRange.end}
                onChange={(e) => onFiltersChange({
                  ...filters,
                  dateRange: { ...filters.dateRange, end: e.target.value }
                })}
                className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white text-sm"
                placeholder="End date"
              />
            </div>
          </div>

          {/* File Size Range */}
          <div>
            <h4 className="text-sm font-medium text-neutral-300 mb-3">File Size (MB)</h4>
            <div className="space-y-2">
              <input
                type="number"
                value={filters.sizeRange.min}
                onChange={(e) => onFiltersChange({
                  ...filters,
                  sizeRange: { ...filters.sizeRange, min: parseInt(e.target.value) || 0 }
                })}
                className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white text-sm"
                placeholder="Min size"
                min="0"
              />
              <input
                type="number"
                value={filters.sizeRange.max}
                onChange={(e) => onFiltersChange({
                  ...filters,
                  sizeRange: { ...filters.sizeRange, max: parseInt(e.target.value) || 0 }
                })}
                className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white text-sm"
                placeholder="Max size"
                min="0"
              />
            </div>
          </div>

          {/* Additional Options */}
          <div>
            <h4 className="text-sm font-medium text-neutral-300 mb-3">Additional Options</h4>
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={filters.isPremium === true}
                  onChange={(e) => onFiltersChange({
                    ...filters,
                    isPremium: e.target.checked ? true : null
                  })}
                  className="w-4 h-4 text-neutral-600 bg-neutral-800 border-neutral-600 rounded focus:ring-neutral-500"
                />
                <span className="text-sm text-neutral-400">Premium files only</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={filters.isSponsored === true}
                  onChange={(e) => onFiltersChange({
                    ...filters,
                    isSponsored: e.target.checked ? true : null
                  })}
                  className="w-4 h-4 text-neutral-600 bg-neutral-800 border-neutral-600 rounded focus:ring-neutral-500"
                />
                <span className="text-sm text-neutral-400">Sponsored uploads only</span>
              </label>
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-6 mt-6 border-t border-neutral-700">
          <button
            onClick={() => {
              onFiltersChange({
                searchQuery: '',
                status: [],
                fileType: [],
                genre: [],
                dateRange: { start: '', end: '' },
                sizeRange: { min: 0, max: 0 },
                sortBy: 'uploadedAt',
                sortOrder: 'desc',
                isPremium: null,
                isSponsored: null,
              });
            }}
            className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg transition-colors"
          >
            Reset All
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-neutral-700 hover:bg-neutral-600 text-white rounded-lg transition-colors"
          >
            Apply Filters
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// Sort Options Component
function SortOptions({
  sortBy,
  sortOrder,
  onSortChange
}: {
  sortBy: FilterOptions['sortBy'];
  sortOrder: FilterOptions['sortOrder'];
  onSortChange: (sortBy: FilterOptions['sortBy'], sortOrder: FilterOptions['sortOrder']) => void;
}) {
  const sortOptions = [
    { value: 'uploadedAt', label: 'Upload Date' },
    { value: 'fileSize', label: 'File Size' },
    { value: 'duration', label: 'Duration' },
    { value: 'originalName', label: 'Name' },
  ];

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-neutral-400">Sort by:</span>
      <select
        value={sortBy}
        onChange={(e) => onSortChange(e.target.value as FilterOptions['sortBy'], sortOrder)}
        className="px-3 py-1 bg-neutral-800 border border-neutral-700 rounded text-white text-sm focus:ring-2 focus:ring-neutral-600 focus:border-transparent"
      >
        {sortOptions.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <button
        onClick={() => onSortChange(sortBy, sortOrder === 'asc' ? 'desc' : 'asc')}
        className="p-1 text-neutral-400 hover:text-neutral-300 transition-colors"
        title={`Sort ${sortOrder === 'asc' ? 'descending' : 'ascending'}`}
      >
        <AdjustmentsHorizontalIcon className={`w-4 h-4 ${sortOrder === 'desc' ? 'rotate-180' : ''} transition-transform`} />
      </button>
    </div>
  );
}

// View Toggle Component
function ViewToggle({
  view,
  onViewChange
}: {
  view: 'grid' | 'list';
  onViewChange: (view: 'grid' | 'list') => void;
}) {
  return (
    <div className="flex items-center bg-neutral-800 border border-neutral-700 rounded-lg p-1">
      <button
        onClick={() => onViewChange('grid')}
        className={`p-1 rounded ${view === 'grid' ? 'bg-neutral-600 text-white' : 'text-neutral-400 hover:text-neutral-300'} transition-colors`}
        title="Grid view"
      >
        <Squares2X2Icon className="w-4 h-4" />
      </button>
      <button
        onClick={() => onViewChange('list')}
        className={`p-1 rounded ${view === 'list' ? 'bg-neutral-600 text-white' : 'text-neutral-400 hover:text-neutral-300'} transition-colors`}
        title="List view"
      >
        <Bars3Icon className="w-4 h-4" />
      </button>
    </div>
  );
}

interface ConvertToTrackModalProps {
  file: any;
  isOpen: boolean;
  onClose: () => void;
  onConvert: (fileId: string, trackData: any) => Promise<boolean>;
}

function ConvertToTrackModal({ file, isOpen, onClose, onConvert }: ConvertToTrackModalProps) {
  const [formData, setFormData] = useState({
    title: file?.originalName?.replace(/\.[^/.]+$/, "") || '',
    description: '',
    genre: file?.genre || '',
    isPremium: false,
    price: 0
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const success = await onConvert(file.id, formData);
    if (success) {
      onClose();
      setFormData({
        title: '',
        description: '',
        genre: '',
        isPremium: false,
        price: 0
      });
    }
    setLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 w-full max-w-md"
      >
        <h3 className="text-xl font-bold text-white mb-4">Convert to Track</h3>

        <div className="mb-4 p-3 bg-neutral-800 rounded-lg">
          <p className="text-sm text-neutral-400">File: {file?.originalName}</p>
          <p className="text-sm text-neutral-400">Duration: {file?.duration ? `${Math.floor(file.duration / 60)}:${(file.duration % 60).toString().padStart(2, '0')}` : 'Unknown'}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Track Title
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Genre
            </label>
            <select
              value={formData.genre}
              onChange={(e) => setFormData(prev => ({ ...prev, genre: e.target.value }))}
              className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              required
            >
              <option value="">Select Genre</option>
              <option value="Electronic">Electronic</option>
              <option value="Hip-Hop">Hip-Hop</option>
              <option value="Pop">Pop</option>
              <option value="Rock">Rock</option>
              <option value="Jazz">Jazz</option>
              <option value="Classical">Classical</option>
              <option value="R&B">R&B</option>
              <option value="Folk">Folk</option>
              <option value="Country">Country</option>
              <option value="Alternative">Alternative</option>
            </select>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="isPremium"
              checked={formData.isPremium}
              onChange={(e) => setFormData(prev => ({ ...prev, isPremium: e.target.checked }))}
              className="w-4 h-4 text-purple-600 bg-neutral-800 border-neutral-600 rounded focus:ring-purple-500"
            />
            <label htmlFor="isPremium" className="text-sm font-medium text-neutral-300">
              Premium Track
            </label>
          </div>

          {formData.isPremium && (
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-2">
                Price (FIL)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.price}
                onChange={(e) => setFormData(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                required={formData.isPremium}
              />
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? 'Converting...' : 'Convert to Track'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

function FileStatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'PROCESSING':
      return <ClockIcon className="w-5 h-5 text-yellow-500" />;
    case 'UPLOADED':
    case 'CONFIRMED':
      return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
    case 'PUBLISHED':
      return <MusicalNoteIcon className="w-5 h-5 text-purple-500" />;
    case 'FAILED':
      return <XCircleIcon className="w-5 h-5 text-red-500" />;
    default:
      return <DocumentIcon className="w-5 h-5 text-neutral-400" />;
  }
}

// Enhanced Audio Waveform Component
function AudioWaveform({ audioUrl, className = "" }: { audioUrl: string; className?: string }) {
  return (
    <div className={`h-12 bg-neutral-900 rounded-md p-1 ${className}`}>
      <div className="h-full flex items-end justify-center gap-0.5">
        {/* Simulated waveform bars - replace with actual audio analysis */}
        {Array.from({ length: 50 }, (_, i) => (
          <div
            key={i}
            className="bg-neutral-600 rounded-sm"
            style={{
              height: `${Math.random() * 80 + 20}%`,
              width: '2px',
            }}
          />
        ))}
      </div>
    </div>
  );
}

// Processing Timeline Component
function ProcessingTimeline({ file }: { file: any }) {
  const steps = [
    { name: 'Uploaded', status: 'completed', timestamp: file.uploadedAt },
    { name: 'Processing', status: file.processedAt ? 'completed' : 'current', timestamp: file.processedAt },
    { name: 'Confirmed', status: file.uploadStatus === 'CONFIRMED' || file.uploadStatus === 'PUBLISHED' ? 'completed' : 'pending', timestamp: null },
    { name: 'Published', status: file.uploadStatus === 'PUBLISHED' ? 'completed' : 'pending', timestamp: file.publishedAt },
  ];

  return (
    <div className="space-y-2">
      {steps.map((step, index) => (
        <div key={step.name} className="flex items-center gap-3">
          <div className={`w-2 h-2 rounded-full ${
            step.status === 'completed' ? 'bg-green-600' :
            step.status === 'current' ? 'bg-yellow-600' :
            'bg-neutral-600'
          }`} />
          <div className="flex-1">
            <div className={`text-xs ${
              step.status === 'completed' ? 'text-neutral-300' :
              step.status === 'current' ? 'text-yellow-400' :
              'text-neutral-500'
            }`}>
              {step.name}
            </div>
            {step.timestamp && (
              <div className="text-xs text-neutral-500">
                {new Date(step.timestamp).toLocaleString()}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// Filecoin Storage Details Component
function FilecoinDetails({ file }: { file: any }) {
  const details = [
    { label: 'Piece CID', value: file.pieceCid, copyable: true },
    { label: 'File Hash', value: file.fileHash, copyable: true },
    { label: 'Storage Provider', value: file.storageProvider || 'Unknown' },
    { label: 'Transaction Hash', value: file.txHash, copyable: true },
    { label: 'Block Number', value: file.blockNumber },
    { label: 'Credits Cost', value: `${file.creditsCost} credits` },
    { label: 'Was Sponsored', value: file.wasSponsored ? 'Yes' : 'No' },
  ];

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="space-y-2">
      {details.map((detail) => (
        detail.value && (
          <div key={detail.label} className="flex justify-between items-center">
            <span className="text-xs text-neutral-500">{detail.label}:</span>
            <div className="flex items-center gap-1">
              <span className="text-xs text-neutral-300 font-mono">
                {detail.copyable && detail.value.length > 20
                  ? `${detail.value.slice(0, 10)}...${detail.value.slice(-6)}`
                  : detail.value
                }
              </span>
              {detail.copyable && detail.value && (
                <button
                  onClick={() => copyToClipboard(detail.value)}
                  className="text-neutral-500 hover:text-neutral-300 transition-colors"
                  title="Copy to clipboard"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        )
      ))}
    </div>
  );
}

// File Metadata Panel Component
function FileMetadataPanel({ file }: { file: any }) {
  const metadata = [
    { label: 'Bitrate', value: file.bitrate },
    { label: 'MIME Type', value: file.mimeType },
    { label: 'File Size', value: `${(file.fileSize / 1024 / 1024).toFixed(2)} MB` },
    { label: 'Duration', value: file.duration ? `${Math.floor(file.duration / 60)}:${(file.duration % 60).toString().padStart(2, '0')}` : null },
    { label: 'Is Public', value: file.isPublic ? 'Yes' : 'No' },
    { label: 'Is Premium', value: file.isPremium ? 'Yes' : 'No' },
    { label: 'Download Count', value: file.downloadCount },
    { label: 'Play Count', value: file.playCount },
  ];

  return (
    <div className="grid grid-cols-2 gap-2">
      {metadata.map((item) => (
        item.value !== null && item.value !== undefined && (
          <div key={item.label} className="text-xs">
            <span className="text-neutral-500">{item.label}:</span>
            <span className="text-neutral-300 ml-1">{item.value}</span>
          </div>
        )
      ))}
    </div>
  );
}

function FileCard({ file, onConvert, onDelete }: { file: any; onConvert: () => void; onDelete: () => void }) {
  const [showActions, setShowActions] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<any>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const { downloadAndExtractMutation } = useDownloadAndExtract();

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return 'Unknown';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const canConvert = file.uploadStatus === 'CONFIRMED' || file.uploadStatus === 'UPLOADED';
  const isPublished = file.uploadStatus === 'PUBLISHED';

  const handleExtractPreview = async () => {
    if (extractedData || isExtracting) return;

    setIsExtracting(true);
    try {
      const result = await downloadAndExtractMutation.mutateAsync({
        commp: file.fileHash,
        filename: file.fileName
      });
      setExtractedData(result);
    } catch (error) {
      console.error('Failed to extract file preview:', error);
    } finally {
      setIsExtracting(false);
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
    if (section === 'preview' && !extractedData && !isExtracting) {
      handleExtractPreview();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-neutral-800/40 border border-neutral-700/50 rounded-xl overflow-hidden hover:bg-neutral-800/60 transition-all duration-200"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Main File Info */}
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <FileStatusIcon status={file.uploadStatus} />
            <div className="min-w-0 flex-1">
              <h3 className="font-medium text-white text-sm truncate">{file.originalName}</h3>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-xs text-neutral-400 capitalize">{file.uploadStatus.toLowerCase()}</p>
                <span className="w-1 h-1 bg-neutral-500 rounded-full"></span>
                <span className="text-xs text-neutral-500">{formatFileSize(file.fileSize)}</span>
                <span className="w-1 h-1 bg-neutral-500 rounded-full"></span>
                <span className="text-xs text-neutral-500">{formatDuration(file.duration)}</span>
              </div>
            </div>
          </div>

          <div className={`flex gap-2 transition-opacity ${showActions ? 'opacity-100' : 'opacity-0'}`}>
            {canConvert && (
              <button
                onClick={onConvert}
                className="p-2 bg-neutral-700 hover:bg-neutral-600 rounded-lg transition-colors"
                title="Convert to Track"
              >
                <MusicalNoteIcon className="w-4 h-4 text-neutral-300" />
              </button>
            )}

            {!isPublished && (
              <button
                onClick={onDelete}
                className="p-2 bg-neutral-700 hover:bg-red-700 rounded-lg transition-colors"
                title="Delete File"
              >
                <TrashIcon className="w-4 h-4 text-neutral-300" />
              </button>
            )}
          </div>
        </div>

        {/* Tags */}
        {file.genre && (
          <div className="mb-3">
            <span className="inline-block px-2 py-1 bg-neutral-700/50 border border-neutral-600 rounded text-xs text-neutral-300">
              {file.genre}
            </span>
          </div>
        )}

        {file.tags && file.tags.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-1">
            {file.tags.map((tag: string, index: number) => (
              <span key={index} className="inline-block px-2 py-1 bg-neutral-700/50 border border-neutral-600 rounded text-xs text-neutral-300">
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Error Display */}
        {file.processingError && (
          <div className="mb-3 p-3 bg-red-950/30 border border-red-800/50 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <XCircleIcon className="w-4 h-4 text-red-400" />
              <span className="text-xs font-medium text-red-400">Processing Error</span>
            </div>
            <p className="text-xs text-red-300">{file.processingError}</p>
          </div>
        )}
      </div>

      {/* Expandable Sections */}
      <div className="border-t border-neutral-700/50">
        {/* Preview Section */}
        <button
          onClick={() => toggleSection('preview')}
          className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-neutral-700/30 transition-colors"
        >
          <div className="flex items-center gap-2">
            <SpeakerWaveIcon className="w-4 h-4 text-neutral-400" />
            <span className="text-sm font-medium text-neutral-300">Audio Preview</span>
          </div>
          {expandedSection === 'preview' ?
            <ChevronUpIcon className="w-4 h-4 text-neutral-400" /> :
            <ChevronDownIcon className="w-4 h-4 text-neutral-400" />
          }
        </button>

        {expandedSection === 'preview' && (
          <div className="px-4 pb-4 border-t border-neutral-700/30">
            {isExtracting ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-neutral-500 border-t-neutral-300 rounded-full animate-spin"></div>
                <span className="ml-2 text-sm text-neutral-400">Extracting audio...</span>
              </div>
            ) : extractedData?.audioUrl ? (
              <div className="space-y-3">
                <AudioWaveform audioUrl={extractedData.audioUrl} />
                <audio
                  controls
                  className="w-full h-8"
                  style={{ filter: 'grayscale(1) contrast(0.8)' }}
                >
                  <source src={extractedData.audioUrl} />
                </audio>
                {extractedData.coverImage && (
                  <div className="flex items-center gap-3">
                    <PhotoIcon className="w-4 h-4 text-neutral-400" />
                    <img
                      src={extractedData.imageUrl}
                      alt="Cover art"
                      className="w-12 h-12 rounded-lg object-cover border border-neutral-600"
                    />
                    <span className="text-xs text-neutral-400">Cover art detected</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-4 text-center text-sm text-neutral-500">
                Click to load audio preview
              </div>
            )}
          </div>
        )}

        {/* Filecoin Details */}
        <button
          onClick={() => toggleSection('filecoin')}
          className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-neutral-700/30 transition-colors border-t border-neutral-700/30"
        >
          <div className="flex items-center gap-2">
            <InformationCircleIcon className="w-4 h-4 text-neutral-400" />
            <span className="text-sm font-medium text-neutral-300">Filecoin Storage</span>
          </div>
          {expandedSection === 'filecoin' ?
            <ChevronUpIcon className="w-4 h-4 text-neutral-400" /> :
            <ChevronDownIcon className="w-4 h-4 text-neutral-400" />
          }
        </button>

        {expandedSection === 'filecoin' && (
          <div className="px-4 pb-4 border-t border-neutral-700/30">
            <FilecoinDetails file={file} />
          </div>
        )}

        {/* Processing Timeline */}
        <button
          onClick={() => toggleSection('timeline')}
          className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-neutral-700/30 transition-colors border-t border-neutral-700/30"
        >
          <div className="flex items-center gap-2">
            <ClockIcon className="w-4 h-4 text-neutral-400" />
            <span className="text-sm font-medium text-neutral-300">Processing Timeline</span>
          </div>
          {expandedSection === 'timeline' ?
            <ChevronUpIcon className="w-4 h-4 text-neutral-400" /> :
            <ChevronDownIcon className="w-4 h-4 text-neutral-400" />
          }
        </button>

        {expandedSection === 'timeline' && (
          <div className="px-4 pb-4 border-t border-neutral-700/30">
            <ProcessingTimeline file={file} />
          </div>
        )}

        {/* File Metadata */}
        <button
          onClick={() => toggleSection('metadata')}
          className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-neutral-700/30 transition-colors border-t border-neutral-700/30"
        >
          <div className="flex items-center gap-2">
            <DocumentIcon className="w-4 h-4 text-neutral-400" />
            <span className="text-sm font-medium text-neutral-300">File Metadata</span>
          </div>
          {expandedSection === 'metadata' ?
            <ChevronUpIcon className="w-4 h-4 text-neutral-400" /> :
            <ChevronDownIcon className="w-4 h-4 text-neutral-400" />
          }
        </button>

        {expandedSection === 'metadata' && (
          <div className="px-4 pb-4 border-t border-neutral-700/30">
            <FileMetadataPanel file={file} />
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default function ManageUploadsPage() {
  const { user } = useAuth();
  const [selectedTab, setSelectedTab] = useState<'ready' | 'all' | 'published' | 'failed'>('ready');
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Advanced filtering state
  const [filters, setFilters] = useState<FilterOptions>({
    searchQuery: '',
    status: [],
    fileType: [],
    genre: [],
    dateRange: { start: '', end: '' },
    sizeRange: { min: 0, max: 0 },
    sortBy: 'uploadedAt',
    sortOrder: 'desc',
    isPremium: null,
    isSponsored: null,
  });

  // Get different sets of files based on tab
  const readyFiles = useUnpublishedFiles(user?.creator?.id || '');
  const allFiles = useUserUploadedFiles(user?.id || '');
  const publishedFiles = useUserUploadedFiles(user?.id || '', 'PUBLISHED');
  const failedFiles = useUserUploadedFiles(user?.id || '', 'FAILED');

  const getCurrentFiles = () => {
    switch (selectedTab) {
      case 'ready': return readyFiles;
      case 'published': return publishedFiles;
      case 'failed': return failedFiles;
      default: return allFiles;
    }
  };

  const currentFiles = getCurrentFiles();

  // Apply filters to current files
  const filteredFiles = currentFiles.files.filter(file => {
    // Search query filter
    if (filters.searchQuery) {
      const searchTerm = filters.searchQuery.toLowerCase();
      const matchesSearch =
        file.originalName.toLowerCase().includes(searchTerm) ||
        file.genre?.toLowerCase().includes(searchTerm) ||
        file.tags?.some((tag: string) => tag.toLowerCase().includes(searchTerm));
      if (!matchesSearch) return false;
    }

    // Status filter
    if (filters.status.length > 0 && !filters.status.includes(file.uploadStatus)) {
      return false;
    }

    // File type filter
    if (filters.fileType.length > 0) {
      const fileExtension = file.originalName.split('.').pop()?.toLowerCase();
      if (!fileExtension || !filters.fileType.includes(fileExtension)) {
        return false;
      }
    }

    // Genre filter
    if (filters.genre.length > 0 && file.genre && !filters.genre.includes(file.genre)) {
      return false;
    }

    // Date range filter
    if (filters.dateRange.start) {
      const uploadDate = new Date(file.uploadedAt);
      const startDate = new Date(filters.dateRange.start);
      if (uploadDate < startDate) return false;
    }
    if (filters.dateRange.end) {
      const uploadDate = new Date(file.uploadedAt);
      const endDate = new Date(filters.dateRange.end);
      if (uploadDate > endDate) return false;
    }

    // File size filter
    const fileSizeMB = file.fileSize / (1024 * 1024);
    if (filters.sizeRange.min > 0 && fileSizeMB < filters.sizeRange.min) {
      return false;
    }
    if (filters.sizeRange.max > 0 && fileSizeMB > filters.sizeRange.max) {
      return false;
    }

    // Premium filter
    if (filters.isPremium !== null && file.isPremium !== filters.isPremium) {
      return false;
    }

    // Sponsored filter
    if (filters.isSponsored !== null && file.wasSponsored !== filters.isSponsored) {
      return false;
    }

    return true;
  });

  // Sort filtered files
  const sortedFiles = [...filteredFiles].sort((a, b) => {
    let comparison = 0;

    switch (filters.sortBy) {
      case 'uploadedAt':
        comparison = new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime();
        break;
      case 'fileSize':
        comparison = a.fileSize - b.fileSize;
        break;
      case 'duration':
        comparison = (a.duration || 0) - (b.duration || 0);
        break;
      case 'originalName':
        comparison = a.originalName.localeCompare(b.originalName);
        break;
    }

    return filters.sortOrder === 'desc' ? -comparison : comparison;
  });

  // Create filter chips for display
  const activeFilterChips = [];
  if (filters.searchQuery) {
    activeFilterChips.push({ key: 'searchQuery', label: `Search: ${filters.searchQuery}`, value: filters.searchQuery });
  }
  filters.status.forEach(status => {
    activeFilterChips.push({ key: 'status', label: `Status: ${status}`, value: status });
  });
  filters.fileType.forEach(type => {
    activeFilterChips.push({ key: 'fileType', label: `Type: ${type.toUpperCase()}`, value: type });
  });
  filters.genre.forEach(genre => {
    activeFilterChips.push({ key: 'genre', label: `Genre: ${genre}`, value: genre });
  });
  if (filters.dateRange.start) {
    activeFilterChips.push({ key: 'dateStart', label: `From: ${filters.dateRange.start}`, value: filters.dateRange.start });
  }
  if (filters.dateRange.end) {
    activeFilterChips.push({ key: 'dateEnd', label: `To: ${filters.dateRange.end}`, value: filters.dateRange.end });
  }
  if (filters.isPremium === true) {
    activeFilterChips.push({ key: 'isPremium', label: 'Premium only', value: 'true' });
  }
  if (filters.isSponsored === true) {
    activeFilterChips.push({ key: 'isSponsored', label: 'Sponsored only', value: 'true' });
  }

  const removeFilter = (key: string, value?: string) => {
    switch (key) {
      case 'searchQuery':
        setFilters(prev => ({ ...prev, searchQuery: '' }));
        break;
      case 'status':
        setFilters(prev => ({ ...prev, status: prev.status.filter(s => s !== value) }));
        break;
      case 'fileType':
        setFilters(prev => ({ ...prev, fileType: prev.fileType.filter(t => t !== value) }));
        break;
      case 'genre':
        setFilters(prev => ({ ...prev, genre: prev.genre.filter(g => g !== value) }));
        break;
      case 'dateStart':
        setFilters(prev => ({ ...prev, dateRange: { ...prev.dateRange, start: '' } }));
        break;
      case 'dateEnd':
        setFilters(prev => ({ ...prev, dateRange: { ...prev.dateRange, end: '' } }));
        break;
      case 'isPremium':
        setFilters(prev => ({ ...prev, isPremium: null }));
        break;
      case 'isSponsored':
        setFilters(prev => ({ ...prev, isSponsored: null }));
        break;
    }
  };

  const clearAllFilters = () => {
    setFilters({
      searchQuery: '',
      status: [],
      fileType: [],
      genre: [],
      dateRange: { start: '', end: '' },
      sizeRange: { min: 0, max: 0 },
      sortBy: 'uploadedAt',
      sortOrder: 'desc',
      isPremium: null,
      isSponsored: null,
    });
  };

  const handleConvertToTrack = async (fileId: string, trackData: any) => {
    return await readyFiles.convertToTrack(fileId, trackData);
  };

  const handleDeleteFile = async (fileId: string) => {
    if (confirm('Are you sure you want to delete this file?')) {
      return await currentFiles.deleteFile(fileId);
    }
    return false;
  };

  const openConvertModal = (file: any) => {
    setSelectedFile(file);
    setShowConvertModal(true);
  };

  const closeConvertModal = () => {
    setSelectedFile(null);
    setShowConvertModal(false);
  };

  const tabs = [
    { key: 'ready', label: 'Ready to Publish', count: readyFiles.files.length },
    { key: 'all', label: 'All Files', count: allFiles.files.length },
    { key: 'published', label: 'Published', count: publishedFiles.files.length },
    { key: 'failed', label: 'Failed', count: failedFiles.files.length },
  ];

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Manage Uploads</h1>
          <p className="text-neutral-400">Convert your uploaded files to published tracks</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {tabs.map((tab) => (
            <div key={tab.key} className="bg-neutral-800/50 border border-neutral-700 rounded-xl p-4">
              <div className="text-2xl font-bold text-white">{tab.count}</div>
              <div className="text-sm text-neutral-400">{tab.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="border-b border-neutral-700 mb-6">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setSelectedTab(tab.key as any)}
                className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  selectedTab === tab.key
                    ? 'border-neutral-500 text-neutral-300'
                    : 'border-transparent text-neutral-400 hover:text-neutral-300 hover:border-neutral-300'
                }`}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </nav>
        </div>

        {/* Search and Filters Bar */}
        <div className="mb-6 space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <AdvancedSearch
                searchQuery={filters.searchQuery}
                onSearchChange={(query) => setFilters(prev => ({ ...prev, searchQuery: query }))}
              />
            </div>

            {/* Filter and View Controls */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowAdvancedFilters(true)}
                className="flex items-center gap-2 px-4 py-2 bg-neutral-800 border border-neutral-700 hover:bg-neutral-700 text-white rounded-lg transition-colors"
              >
                <FunnelIcon className="w-4 h-4" />
                Filters
                {activeFilterChips.length > 0 && (
                  <span className="bg-neutral-600 text-xs px-1.5 py-0.5 rounded-full">
                    {activeFilterChips.length}
                  </span>
                )}
              </button>

              <SortOptions
                sortBy={filters.sortBy}
                sortOrder={filters.sortOrder}
                onSortChange={(sortBy, sortOrder) => setFilters(prev => ({ ...prev, sortBy, sortOrder }))}
              />

              <ViewToggle
                view={view}
                onViewChange={setView}
              />
            </div>
          </div>

          {/* Active Filter Chips */}
          <FilterChips
            filters={activeFilterChips}
            onRemoveFilter={removeFilter}
            onClearAll={clearAllFilters}
          />

          {/* Results Summary */}
          <div className="flex items-center justify-between text-sm text-neutral-400">
            <span>
              Showing {sortedFiles.length} of {currentFiles.files.length} files
              {filters.searchQuery && ` for "${filters.searchQuery}"`}
            </span>
            {sortedFiles.length !== currentFiles.files.length && (
              <button
                onClick={clearAllFilters}
                className="text-neutral-400 hover:text-neutral-300 underline"
              >
                Clear all filters
              </button>
            )}
          </div>
        </div>

        {/* Files Grid */}
        {currentFiles.loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : currentFiles.error ? (
          <div className="text-center py-12">
            <XCircleIcon className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-400">{currentFiles.error}</p>
            <button
              onClick={currentFiles.refetch}
              className="mt-4 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : sortedFiles.length === 0 ? (
          <div className="text-center py-12">
            <CloudArrowUpIcon className="w-12 h-12 text-neutral-500 mx-auto mb-4" />
            <p className="text-neutral-400 mb-4">
              {currentFiles.files.length === 0
                ? (selectedTab === 'ready'
                  ? 'No files ready to publish'
                  : `No ${selectedTab} files found`)
                : 'No files match your current filters'
              }
            </p>
            {currentFiles.files.length === 0 && selectedTab === 'ready' && (
              <p className="text-sm text-neutral-500">
                Upload some audio files to get started
              </p>
            )}
            {currentFiles.files.length > 0 && sortedFiles.length === 0 && (
              <button
                onClick={clearAllFilters}
                className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg transition-colors"
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <div className={`${view === 'grid'
            ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
            : 'space-y-4'
          }`}>
            {sortedFiles.map((file) => (
              <FileCard
                key={file.id}
                file={file}
                onConvert={() => openConvertModal(file)}
                onDelete={() => handleDeleteFile(file.id)}
              />
            ))}
          </div>
        )}

        {/* Load More */}
        {currentFiles.hasMore && (
          <div className="text-center mt-8">
            <button
              onClick={currentFiles.loadMore}
              disabled={currentFiles.loading}
              className="px-6 py-3 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              {currentFiles.loading ? 'Loading...' : 'Load More'}
            </button>
          </div>
        )}

        {/* Convert to Track Modal */}
        <ConvertToTrackModal
          file={selectedFile}
          isOpen={showConvertModal}
          onClose={closeConvertModal}
          onConvert={handleConvertToTrack}
        />

        {/* Advanced Filter Panel */}
        <AdvancedFilterPanel
          filters={filters}
          onFiltersChange={setFilters}
          isOpen={showAdvancedFilters}
          onClose={() => setShowAdvancedFilters(false)}
        />
      </div>
    </div>
  );
}


// Timeline


//   🔄 3. Batch Operations

//   - Multi-select Checkboxes - Select multiple files for batch actions
//   - Bulk Convert to Tracks - Convert multiple files at once
//   - Batch Delete - Remove multiple files
//   - Batch Tag Editor - Add tags to multiple files

//   📝 4. Enhanced Editing Capabilities

//   - Inline Metadata Editing - Edit title, genre, tags without modal
//   - Drag & Drop Tag Management - Visual tag interface
//   - AI-powered Genre Detection - Suggest genres based on audio analysis
//   - Custom Thumbnail Upload - Replace auto-extracted artwork

//   💰 5. Advanced Monetization Features

//   - Pricing Templates - Preset pricing tiers (Single, EP, Album)
//   - Revenue Projections - Estimated earnings based on similar tracks
//   - Premium Content Indicators - Visual badges for paid content
//   - Token-gated Access - Set creator coin requirements

//   📈 6. Analytics & Insights

//   - Upload Analytics - Success rates, processing times
//   - Storage Cost Breakdown - Filecoin fees, gas costs
//   - Performance Predictions - AI predictions based on metadata
//   - Similar Track Suggestions - Show similar successful tracks

//   🔍 7. Advanced Filtering & Search

//   - Smart Filters - Filter by processing status, file type, upload date
//   - Search Functionality - Search by filename, metadata, tags
//   - Sort Options - Multiple sort criteria (size, date, duration)
//   - Saved Filter Presets - Quick access to common filter combinations

//   🔧 8. Interactive Processing Status

//   - Real-time Progress Bars - Live upload/processing progress
//   - Retry Failed Uploads - One-click retry for failed files
//   - Processing Logs - Detailed error messages and logs
//   - Notification System - Toast notifications for status changes

//   🎨 9. Visual Enhancements

//   - Grid/List View Toggle - Switch between card and table views
//   - Drag & Drop Reordering - Organize files by priority
//   - Color-coded Status - Visual status indicators with colors
//   - Animated Transitions - Smooth state changes and loading states

//   🔄 10. Integration Features

//   - Direct Filecoin Download - Preview/download original files
//   - Social Media Sharing - Share tracks directly to platforms
//   - Playlist Creation - Create playlists from uploaded files
//   - Collaboration Tools - Share files with other creators