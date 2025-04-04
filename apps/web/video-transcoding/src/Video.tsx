import { useEffect, useRef, useState } from 'react'
import videojs from 'video.js'
import 'video.js/dist/video-js.css'

const VideoPlayer = ({ videoId }: { videoId: string | null }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const playerRef = useRef<videojs.Player | null>(null)
  const [quality, setQuality] = useState('720p')
  const [isPlaying, setIsPlaying] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    if (!videoId || !videoRef.current || isInitialized) return

    console.log('Initializing Video.js...')

    setTimeout(() => {
      if (!videoRef.current) return // Double check it's in the DOM
      const player = videojs(videoRef.current, {
        controls: true,
        autoplay: false,
        preload: 'auto',
        fluid: false, // Disable fluid to test
        responsive: true
      })

      playerRef.current = player
      setIsInitialized(true)
    }, 100) // Small delay to ensure it's in the DOM

    return () => {
      if (playerRef.current && !playerRef.current.isDisposed()) {
        playerRef.current.dispose()
        playerRef.current = null
        setIsInitialized(false)
      }
    }
  }, [videoId]) // Only run when `videoId` changes

  // Update source when quality or videoId changes
  useEffect(() => {
    if (!videoId || !playerRef.current || !isInitialized) return

    const newSource = {
      src: `http://localhost:4000/videos/hls/${videoId}/${quality}/index.m3u8`,
      type: 'application/x-mpegURL'
    }

    const wasPlaying = !playerRef.current.paused()

    playerRef.current.src(newSource)
    playerRef.current.load()
    playerRef.current.tech().trigger('resize')
    // Restore playing state if it was playing
    if (wasPlaying) {
      playerRef.current
        .play()
        .catch(err => console.error('Error resuming playback:', err))
    }
  }, [videoId, quality, isInitialized])

  const togglePlayPause = () => {
    if (!playerRef.current) return

    if (playerRef.current.paused()) {
      playerRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch(err => console.error('Play error:', err))
    } else {
      playerRef.current.pause()
      setIsPlaying(false)
    }
  }

  return (
    <div className='min-h-screen bg-gray-900 flex items-center justify-center p-4'>
      {videoId ? (
        <div className='w-full max-w-4xl bg-gray-800 rounded-xl shadow-2xl overflow-hidden'>
          <div className='relative aspect-video'>
            <video
              ref={videoRef}
              className='video-js relative  w-full h-full object-contain'
              playsInline
            />
          </div>

          <div className='p-4 bg-gray-800'>
            <div className='flex flex-col sm:flex-row items-center justify-between gap-4'>
              <button
                onClick={togglePlayPause}
                className='w-full sm:w-auto px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 font-medium'
                disabled={!isInitialized}
              >
                {isPlaying ? 'Pause' : 'Play'}
              </button>

              <div className='flex items-center gap-2'>
                <span className='text-gray-300 text-sm font-medium'>
                  Quality:
                </span>
                <div className='flex gap-2'>
                  {['360p', '480p', '720p'].map(q => (
                    <button
                      key={q}
                      onClick={() => setQuality(q)}
                      className={`px-3 py-1 text-sm rounded-md transition-colors duration-200 ${
                        quality === q
                          ? 'bg-red-600 text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                      disabled={!isInitialized}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className='text-gray-400 text-lg font-medium bg-gray-800 px-6 py-4 rounded-lg'>
          Waiting for video...
        </div>
      )}
    </div>
  )
}

export default VideoPlayer
