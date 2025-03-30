import { useState, useRef } from 'react'
import axios from 'axios'

const VideoUpload = () => {
  const [file, setFile] = useState<File | null>(null)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
      setError(null)
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
    <div className='upload-container'>
      <h1>Upload Video</h1>
      <form onSubmit={handleSubmit}>
        <input
          type='file'
          ref={fileInputRef}
          accept='video/mp4,video/webm,video/quicktime'
          onChange={handleFileChange}
          className='file-input'
        />
        <button
          type='submit'
          disabled={!file || progress > 0}
          className='upload-button'
        >
          {progress > 0 ? `Uploading... ${progress}%` : 'Upload'}
        </button>

        {progress > 0 && progress < 100 && (
          <div className='progress-bar'>
            <div style={{ width: `${progress}%` }} />
          </div>
        )}

        {error && <div className='error-message'>{error}</div>}
      </form>
    </div>
  )
}

export default VideoUpload
