import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Images,
  Upload,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Film,
  Sparkles,
} from 'lucide-react';
import { AppUser } from '../types';
import { VLOG_CATEGORIES, VlogCategory, submitVlog, VlogItem } from '../services/vlogService';
import { soundService } from '../services/soundService';

interface GalleryUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: AppUser | null;
  onPublished?: (vlog: VlogItem) => void;
}

const MAX_VIDEO_MB = 50;

export const GalleryUploadModal: React.FC<GalleryUploadModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onPublished,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [videoDuration, setVideoDuration] = useState<string>('');
  const [caption, setCaption] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<VlogCategory>('learning');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const cleanupPreview = () => {
    if (previewUrl) {
      try {
        URL.revokeObjectURL(previewUrl);
      } catch {
        // ignore
      }
    }
  };

  useEffect(() => {
    if (!isOpen) {
      cleanupPreview();
      setSelectedFile(null);
      setPreviewUrl(null);
      setVideoDuration('');
      setCaption('');
      setDescription('');
      setUploadProgress(0);
      setIsUploading(false);
      setErrorMsg(null);
      setSuccessMsg(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen) return null;

  const triggerNativeGalleryPicker = () => {
    soundService.playClick();
    setErrorMsg(null);
    fileInputRef.current?.click();
  };

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      setErrorMsg('Please select a valid video file (MP4, WebM, MOV, or 3GP).');
      return;
    }

    const sizeMb = file.size / (1024 * 1024);
    if (sizeMb > MAX_VIDEO_MB) {
      setErrorMsg(`Video is ${sizeMb.toFixed(1)} MB. Please choose a video under ${MAX_VIDEO_MB} MB.`);
      return;
    }

    cleanupPreview();
    const url = URL.createObjectURL(file);
    setSelectedFile(file);
    setPreviewUrl(url);
    setErrorMsg(null);
    setSuccessMsg(null);
    if (!caption.trim()) {
      const baseName = file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').slice(0, 80);
      if (baseName) setCaption(baseName);
    }
  };

  const handleMetadataLoaded = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const secs = Math.round(e.currentTarget.duration || 0);
    if (secs > 0) {
      const mins = Math.floor(secs / 60);
      const rem = secs % 60;
      setVideoDuration(mins > 0 ? `${mins}:${rem.toString().padStart(2, '0')}` : `${secs}s`);
    }
  };

  const handlePublish = async () => {
    if (!selectedFile || isUploading) return;

    if (!currentUser || !currentUser.uid || currentUser.uid === 'guest') {
      setErrorMsg('Please sign in with Google before publishing a video to the community feed.');
      return;
    }

    const cleanCaption = caption.trim();
    if (!cleanCaption) {
      setErrorMsg('Please add a caption for your video before publishing.');
      return;
    }

    setIsUploading(true);
    setUploadProgress(2);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await submitVlog({
        uid: currentUser.uid,
        creatorName: currentUser.displayName || 'VibeLoom Creator',
        creatorPhotoURL: currentUser.photoURL || '',
        title: cleanCaption,
        description: description.trim() || cleanCaption,
        category,
        videoType: 'upload',
        videoBlob: selectedFile,
        duration: videoDuration || 'Video',
        isShort: true,
        fileSizeMb: Number((selectedFile.size / (1024 * 1024)).toFixed(2)),
        onUploadProgress: (pct) => setUploadProgress(pct),
      });

      if (!res.success || !res.vlog) {
        setErrorMsg(res.error || 'Upload failed. Your video was not published.');
        setIsUploading(false);
        return;
      }

      soundService.playFanfare();
      setUploadProgress(100);
      setSuccessMsg('Video uploaded and published to the public VibeLoom feed!');
      onPublished?.(res.vlog);

      setTimeout(() => {
        setIsUploading(false);
        onClose();
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Upload failed. Please check your connection and try again.');
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/65 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl border border-pink-100 dark:border-slate-800 overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-rose-500 to-pink-500 text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
              <Images className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-black leading-tight">Gallery Video Upload</h2>
              <p className="text-[11px] text-pink-100 font-medium">Select a video from your device</p>
            </div>
          </div>
          <button
            type="button"
            disabled={isUploading}
            onClick={onClose}
            aria-label="Close Gallery Upload"
            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors disabled:opacity-50"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* Hidden Native Device Gallery Picker */}
        <input
          ref={fileInputRef}
          type="file"
          accept="video/mp4,video/webm,video/quicktime,video/3gpp,video/*"
          onChange={handleFileSelected}
          className="hidden"
        />

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {!previewUrl ? (
            <div className="border-2 border-dashed border-pink-200 dark:border-slate-700 rounded-2xl p-6 text-center bg-pink-50/40 dark:bg-slate-800/40 space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
                <Film className="w-7 h-7" />
              </div>
              <div>
                <p className="text-sm font-black text-gray-900 dark:text-white">
                  Choose a Video from Your Phone
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Supports Android MP4, WebM, MOV &amp; 3GP up to {MAX_VIDEO_MB} MB.
                </p>
              </div>
              <button
                type="button"
                onClick={triggerNativeGalleryPicker}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-sm shadow-sm tap-bounce"
              >
                <Images className="w-4 h-4" />
                <span>Open Phone Gallery</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Video Preview */}
              <div className="relative rounded-2xl overflow-hidden bg-black aspect-[9/12] max-h-64 flex items-center justify-center">
                <video
                  src={previewUrl}
                  controls
                  playsInline
                  onLoadedMetadata={handleMetadataLoaded}
                  className="w-full h-full object-contain"
                />
              </div>

              <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-300 bg-pink-50/60 dark:bg-slate-800 px-3 py-2 rounded-xl">
                <span className="truncate font-semibold max-w-[65%]">
                  {selectedFile?.name}
                </span>
                <div className="flex items-center gap-2 shrink-0">
                  {videoDuration && <span className="font-bold text-rose-600">{videoDuration}</span>}
                  <button
                    type="button"
                    disabled={isUploading}
                    onClick={triggerNativeGalleryPicker}
                    className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400 font-bold hover:underline disabled:opacity-50"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Change</span>
                  </button>
                </div>
              </div>

              {/* Caption */}
              <div>
                <label className="block text-xs font-extrabold text-gray-700 dark:text-gray-200 mb-1">
                  Caption *
                </label>
                <input
                  type="text"
                  maxLength={120}
                  disabled={isUploading}
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Write a catchy caption for your video..."
                  className="w-full rounded-xl border border-pink-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-sm text-gray-900 dark:text-white font-medium focus:outline-none focus:border-rose-500"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-extrabold text-gray-700 dark:text-gray-200 mb-1">
                  Category
                </label>
                <select
                  disabled={isUploading}
                  value={category}
                  onChange={(e) => setCategory(e.target.value as VlogCategory)}
                  className="w-full rounded-xl border border-pink-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-sm text-gray-900 dark:text-white font-semibold focus:outline-none focus:border-rose-500"
                >
                  {VLOG_CATEGORIES.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.icon} {cat.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Upload Progress */}
          {isUploading && (
            <div className="bg-pink-50 dark:bg-slate-800 border border-pink-200 dark:border-slate-700 rounded-xl p-3 space-y-1.5">
              <div className="flex items-center justify-between text-xs font-black text-rose-600 dark:text-rose-400">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                  Uploading to VibeLoom Cloud...
                </span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full h-2.5 bg-pink-100 dark:bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-rose-500 to-pink-500 transition-all duration-200"
                  style={{ width: `${Math.max(4, uploadProgress)}%` }}
                />
              </div>
            </div>
          )}

          {/* Error Notice */}
          {errorMsg && (
            <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl p-3 flex items-start gap-2 text-xs text-red-700 dark:text-red-300 font-semibold">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Success Notice (ONLY shown after real upload + Firestore write succeed) */}
          {successMsg && (
            <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl p-3 flex items-start gap-2 text-xs text-emerald-700 dark:text-emerald-300 font-bold">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-500" />
              <span>{successMsg}</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 bg-gray-50 dark:bg-slate-950 border-t border-pink-100 dark:border-slate-800 flex items-center gap-2.5">
          <button
            type="button"
            disabled={isUploading}
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-200 font-bold text-sm hover:bg-gray-100 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!selectedFile || isUploading}
            onClick={handlePublish}
            className="flex-[1.6] py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-pink-500 hover:from-rose-500 hover:to-pink-400 text-white font-black text-sm shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-50 tap-bounce"
          >
            <Upload className="w-4 h-4" />
            <span>{isUploading ? `Uploading ${uploadProgress}%` : 'Publish Video'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
