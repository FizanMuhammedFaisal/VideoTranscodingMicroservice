import { useState, useRef } from 'react'
import axios from 'axios'
import VideoPlayer from './Video'

const VideoUpload = () => {
  const [file, setFile] = useState<File | null>(null)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [videoData, setVideoData] = useState<string | null>(null)
  const [loading, setLoading] = useState(false) // Show loader before video plays

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
      setError(null)
    }
  }

  // SSE: Listen for video to be ready
  const listenForVideoReady = (videoId: string) => {
    console.log('Listening for video ready:', videoId)
    setLoading(true) // Show loading spinner

    const eventSource = new EventSource(
      `http://localhost:4000/events/${videoId}`
    )

    eventSource.onmessage = () => {
      console.log('Video Ready received')

      setVideoData(videoId) // Set videoId as videoData immediately
      setLoading(false) // Hide loading spinner

      eventSource.close() // Stop listening since we got the event
    }

    eventSource.onerror = () => {
      console.error('Error with SSE connection')
      eventSource.close()
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) {
      setError('Please select a file')
      return
    }

    const formData = new FormData()
    formData.append('video', file)

    try {
      const response = await axios.post(
        'http://localhost:4000/upload',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          },
          onUploadProgress: progressEvent => {
            if (progressEvent.total) {
              const percentCompleted = Math.round(
                (progressEvent.loaded * 100) / progressEvent.total
              )
              setProgress(percentCompleted)
            }
          }
        }
      )

      console.log('Upload success:', response.data)
      resetForm()
      listenForVideoReady(response.data.videoId)
    } catch (err) {
      console.error('Upload error:', err)
      setError('Upload failed. Please try again.')
      setProgress(0)
    }
  }

  const resetForm = () => {
    setFile(null)
    setProgress(0)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className=' min-h-screen w-full bg-gray-900 text-white p-4'>
      <h1 className='text-2xl font-bold mb-4'>Upload & Play Video</h1>

      <form
        onSubmit={handleSubmit}
        className='bg-gray-800 p-6 rounded-lg shadow-md w-full max-w-md'
      >
        <input
          type='file'
          ref={fileInputRef}
          accept='video/mp4,video/webm,video/quicktime'
          onChange={handleFileChange}
          className='w-full p-2 mb-4 border border-gray-700 bg-gray-700 rounded text-white'
        />

        <button
          type='submit'
          disabled={!file || progress > 0}
          className='w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded disabled:bg-gray-600'
        >
          {progress > 0 ? `Uploading... ${progress}%` : 'Upload'}
        </button>

        {progress > 0 && progress < 100 && (
          <div className='w-full bg-gray-700 rounded h-2 mt-3'>
            <div
              className='bg-green-500 h-full rounded'
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        {error && <div className='text-red-400 mt-3'>{error}</div>}
      </form>

      {loading && (
        <div className='mt-6 flex flex-col items-center'>
          <div className='loader border-t-4 border-blue-500 border-solid rounded-full w-10 h-10 animate-spin'></div>
          <p className='mt-2 text-gray-400'>Processing video...</p>
        </div>
      )}

      {videoData && (
        <div className='mt-6 w-full max-w-3xl'>
          <VideoPlayer videoId={videoData} />
        </div>
      )}
    </div>
  )
}

export default VideoUpload
