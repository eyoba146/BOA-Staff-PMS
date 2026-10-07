import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, Image as ImageIcon, RefreshCw, Trash2, Upload, AlertCircle, Check, ArrowLeft } from 'lucide-react';
import { Button, Dialog, Avatar } from '@/components/ui';

interface ProfilePhotoDialogProps {
  open: boolean;
  onClose: () => void;
  currentAvatarUrl?: string | null;
  userName: string;
  onSave: (avatarUrl: string | null) => Promise<void>;
}

type DialogMode = 'menu' | 'camera' | 'preview';

/** Crops and scales an image or video frame to a high-quality 400x400 square JPEG. */
function cropToSquareDataUrl(source: HTMLImageElement | HTMLVideoElement): string {
  const canvas = document.createElement('canvas');
  canvas.width = 400;
  canvas.height = 400;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not access canvas 2d context');

  const sourceWidth = 'videoWidth' in source ? source.videoWidth : source.naturalWidth || source.width;
  const sourceHeight = 'videoHeight' in source ? source.videoHeight : source.naturalHeight || source.height;

  const minDim = Math.min(sourceWidth, sourceHeight);
  const sx = (sourceWidth - minDim) / 2;
  const sy = (sourceHeight - minDim) / 2;

  // Draw center square crop
  ctx.drawImage(source, sx, sy, minDim, minDim, 0, 0, 400, 400);
  return canvas.toDataURL('image/jpeg', 0.88);
}

export function ProfilePhotoDialog({
  open,
  onClose,
  currentAvatarUrl,
  userName,
  onSave,
}: ProfilePhotoDialogProps) {
  const [mode, setMode] = useState<DialogMode>('menu');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mobileCameraInputRef = useRef<HTMLInputElement>(null);

  // Stop any active camera stream
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  // Cleanup stream on close or unmount
  useEffect(() => {
    if (!open) {
      stopCamera();
      setMode('menu');
      setPreviewImage(null);
      setCameraError(null);
      setSaving(false);
    }
  }, [open, stopCamera]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  // Check available cameras
  useEffect(() => {
    if (navigator.mediaDevices?.enumerateDevices) {
      navigator.mediaDevices.enumerateDevices().then((devices) => {
        const videoInputs = devices.filter((d) => d.kind === 'videoinput');
        setHasMultipleCameras(videoInputs.length > 1);
      }).catch(() => {
        setHasMultipleCameras(false);
      });
    }
  }, []);

  // Start WebRTC live camera
  const startCamera = async (facing: 'user' | 'environment' = facingMode) => {
    stopCamera();
    setCameraError(null);
    setCameraLoading(true);
    setMode('camera');

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('Live camera is not supported on this browser or requires a secure HTTPS connection.');
      setCameraLoading(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facing,
          width: { ideal: 640 },
          height: { ideal: 640 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setFacingMode(facing);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.name : 'Unknown';
      if (errorMsg === 'NotAllowedError' || errorMsg === 'PermissionDeniedError') {
        setCameraError('Camera access was denied. Please allow camera permissions in your browser or select an image from your files.');
      } else if (errorMsg === 'NotFoundError' || errorMsg === 'DevicesNotFoundError') {
        setCameraError('No camera device was detected on your system. You can choose a photo from your gallery instead.');
      } else {
        setCameraError('Unable to access camera. Please check your camera settings or upload a photo.');
      }
    } finally {
      setCameraLoading(false);
    }
  };

  // Flip camera between front and back
  const toggleCameraFacing = () => {
    const nextFacing = facingMode === 'user' ? 'environment' : 'user';
    void startCamera(nextFacing);
  };

  // Shutter click: snap photo from video
  const capturePhoto = () => {
    const video = videoRef.current;
    if (!video || !streamRef.current) return;

    try {
      const dataUrl = cropToSquareDataUrl(video);
      stopCamera();
      setPreviewImage(dataUrl);
      setMode('preview');
    } catch {
      setCameraError('Failed to capture frame. Please try again.');
    }
  };

  // Handle file selected from file picker / gallery
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input so user can pick same file again if desired
    e.target.value = '';

    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file (JPEG, PNG, WebP).');
      return;
    }

    // 10MB limit
    if (file.size > 10 * 1024 * 1024) {
      alert('File size exceeds 10MB limit. Please choose a smaller photo.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new window.Image();
      img.onload = () => {
        try {
          const dataUrl = cropToSquareDataUrl(img);
          setPreviewImage(dataUrl);
          setMode('preview');
        } catch {
          alert('Failed to process image file.');
        }
      };
      img.onerror = () => {
        alert('Could not decode the selected image.');
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (avatarUrlToSave: string | null) => {
    setSaving(true);
    try {
      await onSave(avatarUrlToSave);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={() => {
        if (!saving) {
          stopCamera();
          onClose();
        }
      }}
      title="Profile Photo"
      description="Select a portrait photo from your gallery or capture one live using your camera."
      size="md"
      busy={saving}
    >
      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        onChange={handleFileChange}
        className="hidden"
      />
      <input
        ref={mobileCameraInputRef}
        type="file"
        accept="image/*"
        capture="user"
        onChange={handleFileChange}
        className="hidden"
      />

      <div className="space-y-6">
        {/* VIEW 1: Initial Selection Menu */}
        {mode === 'menu' && (
          <div className="flex flex-col items-center space-y-6 py-2">
            {/* Current photo display */}
            <div className="relative">
              <Avatar
                name={userName}
                src={currentAvatarUrl}
                size="xl"
                className="size-28 border-4 border-zinc-100 text-2xl shadow-md"
              />
            </div>

            <div className="w-full max-w-sm space-y-3">
              <Button
                variant="primary"
                className="w-full justify-center py-2.5"
                leftIcon={<ImageIcon className="size-4" />}
                onClick={() => fileInputRef.current?.click()}
              >
                Choose from Gallery or Files
              </Button>

              <Button
                variant="secondary"
                className="w-full justify-center py-2.5"
                leftIcon={<Camera className="size-4" />}
                onClick={() => void startCamera('user')}
              >
                Take Photo with Camera
              </Button>

              {currentAvatarUrl && (
                <Button
                  variant="ghost"
                  className="w-full justify-center text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                  leftIcon={<Trash2 className="size-4" />}
                  loading={saving}
                  onClick={() => void handleSave(null)}
                >
                  Remove Current Photo
                </Button>
              )}
            </div>

            <p className="text-center text-xs text-zinc-500">
              For best branch identification, please use a clear, professional portrait photo.
            </p>
          </div>
        )}

        {/* VIEW 2: Live Camera Viewfinder */}
        {mode === 'camera' && (
          <div className="flex flex-col items-center space-y-4 py-1">
            {cameraError ? (
              <div className="w-full space-y-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-center">
                <AlertCircle className="mx-auto size-8 text-amber-600" />
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-amber-900">Camera Unavailable</p>
                  <p className="text-xs text-amber-700">{cameraError}</p>
                </div>
                <div className="flex flex-col justify-center gap-2 pt-2 sm:flex-row">
                  <Button
                    variant="secondary"
                    size="sm"
                    leftIcon={<Upload className="size-3.5" />}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Select File Instead
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    leftIcon={<Camera className="size-3.5" />}
                    onClick={() => mobileCameraInputRef.current?.click()}
                  >
                    Open Device Camera
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      stopCamera();
                      setMode('menu');
                    }}
                  >
                    Back
                  </Button>
                </div>
              </div>
            ) : (
              <>
                {/* Viewfinder frame */}
                <div className="relative size-64 overflow-hidden rounded-2xl border-2 border-zinc-900 bg-black shadow-inner">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="h-full w-full object-cover"
                  />

                  {/* Circular target guide overlay */}
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <div className="size-48 rounded-full border-2 border-dashed border-white/60 shadow-sm" />
                  </div>

                  {cameraLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-xs font-medium text-white">
                      Starting camera...
                    </div>
                  )}
                </div>

                {/* Camera controls */}
                <div className="flex items-center justify-center gap-4 pt-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    leftIcon={<ArrowLeft className="size-3.5" />}
                    onClick={() => {
                      stopCamera();
                      setMode('menu');
                    }}
                  >
                    Back
                  </Button>

                  <button
                    type="button"
                    onClick={capturePhoto}
                    disabled={cameraLoading}
                    className="flex size-14 items-center justify-center rounded-full bg-gold-500 text-zinc-950 shadow-md transition-all hover:bg-gold-400 hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:ring-offset-2 disabled:opacity-50"
                    title="Capture Photo"
                    aria-label="Capture Photo"
                  >
                    <div className="size-11 rounded-full border-2 border-zinc-950 flex items-center justify-center">
                      <Camera className="size-5" />
                    </div>
                  </button>

                  {hasMultipleCameras && (
                    <Button
                      variant="secondary"
                      size="sm"
                      title="Switch Camera"
                      leftIcon={<RefreshCw className="size-3.5" />}
                      onClick={toggleCameraFacing}
                    >
                      Flip
                    </Button>
                  )}
                </div>

                <p className="text-center text-xs text-zinc-500">
                  Align your face within the circle and click the shutter button.
                </p>
              </>
            )}
          </div>
        )}

        {/* VIEW 3: Preview Cropped Photo */}
        {mode === 'preview' && previewImage && (
          <div className="flex flex-col items-center space-y-6 py-2">
            <div className="relative">
              <div className="size-32 overflow-hidden rounded-full border-4 border-gold-500 shadow-lg">
                <img
                  src={previewImage}
                  alt="New profile preview"
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="absolute right-0 bottom-0 rounded-full bg-emerald-600 p-1.5 text-white shadow">
                <Check className="size-4" />
              </div>
            </div>

            <div className="text-center">
              <h4 className="text-sm font-semibold text-zinc-900">Looking Good!</h4>
              <p className="mt-0.5 text-xs text-zinc-500">
                This photo will be displayed across your branch directory, top bar, and chat.
              </p>
            </div>

            <div className="flex w-full max-w-xs flex-col gap-2.5">
              <Button
                variant="primary"
                className="w-full justify-center py-2.5"
                loading={saving}
                onClick={() => void handleSave(previewImage)}
              >
                Save as Profile Photo
              </Button>

              <Button
                variant="secondary"
                className="w-full justify-center"
                disabled={saving}
                onClick={() => {
                  setPreviewImage(null);
                  setMode('menu');
                }}
              >
                Choose Another / Retake
              </Button>
            </div>
          </div>
        )}
      </div>
    </Dialog>
  );
}
