import { useState, useRef, useCallback } from 'react'
import Webcam from 'react-webcam'
import imageCompression from 'browser-image-compression'

export default function CameraCapture({ onCapture, onCancel }) {
  const webcamRef = useRef(null)
  const [photo, setPhoto] = useState(null)
  const [isCompressing, setIsCompressing] = useState(false)
  const [error, setError] = useState(null)
  const [facingMode, setFacingMode] = useState('environment')

  const videoConstraints = {
    facingMode,
    aspectRatio: 4 / 3,
    width: { ideal: 1200 },
    height: { ideal: 1600 }
  }

  const capture = useCallback(async () => {
    const imageSrc = webcamRef.current?.getScreenshot()
    if (!imageSrc) return

    setIsCompressing(true)
    try {
      // Convert base64 to file for compression
      const response = await fetch(imageSrc)
      const blob = await response.blob()
      const file = new File([blob], 'photo.jpg', { type: 'image/jpeg' })

      // Compress image
      const compressedFile = await imageCompression(file, {
        maxSizeMB: 0.5, // 500KB
        maxWidthOrHeight: 1200,
        useWebWorker: true
      })

      // Convert back to base64
      const reader = new FileReader()
      reader.onloadend = () => {
        setPhoto(reader.result)
        setIsCompressing(false)
      }
      reader.readAsDataURL(compressedFile)
    } catch (e) {
      console.error('Compression error:', e)
      // Use original if compression fails
      setPhoto(imageSrc)
      setIsCompressing(false)
    }
  }, [])

  const handleConfirm = () => {
    if (photo) {
      onCapture(photo)
    }
  }

  const handleRetake = () => {
    setPhoto(null)
    setError(null)
  }

  const toggleCamera = () => {
    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment')
  }

  const handleCameraError = (err) => {
    console.error('Camera error:', err)
    setError('Impossible d\'accéder à la caméra. Veuillez vérifier les permissions.')
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black z-50 flex items-center justify-center p-4">
        <div className="text-center text-white">
          <div className="text-5xl mb-4">📷</div>
          <p className="mb-4">{error}</p>
          <div className="flex gap-3 justify-center">
            <button onClick={onCancel} className="btn-secondary">
              Annuler
            </button>
            <button onClick={() => setError(null)} className="btn-primary">
              Réessayer
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Camera view or preview */}
      <div className="flex-1 relative">
        {photo ? (
          <img
            src={photo}
            alt="Captured"
            className="w-full h-full object-contain"
          />
        ) : (
          <Webcam
            ref={webcamRef}
            audio={false}
            screenshotFormat="image/jpeg"
            videoConstraints={videoConstraints}
            onUserMediaError={handleCameraError}
            className="w-full h-full object-cover"
          />
        )}

        {isCompressing && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <div className="text-white text-center">
              <div className="animate-spin w-8 h-8 border-2 border-white border-t-transparent rounded-full mx-auto mb-2"></div>
              <p>Compression...</p>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="bg-black p-4 safe-area-pb">
        {photo ? (
          <div className="flex gap-3">
            <button
              onClick={handleRetake}
              className="flex-1 py-4 bg-gray-700 text-white rounded-xl font-semibold"
            >
              Reprendre
            </button>
            <button
              onClick={handleConfirm}
              className="flex-1 py-4 bg-smart-red text-white rounded-xl font-semibold"
            >
              Valider
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={onCancel}
              className="w-12 h-12 rounded-full bg-gray-700 text-white flex items-center justify-center"
            >
              ✕
            </button>

            <button
              onClick={capture}
              disabled={isCompressing}
              className="w-20 h-20 rounded-full bg-white flex items-center justify-center"
            >
              <div className="w-16 h-16 rounded-full bg-smart-red"></div>
            </button>

            <button
              onClick={toggleCamera}
              className="w-12 h-12 rounded-full bg-gray-700 text-white flex items-center justify-center text-xl"
            >
              🔄
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
