import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { StatusMessage } from '../../components/status-message'
import { uploadStatement, subscribeToUploadProgress } from '../../api/uploads'
import type { UploadProgressEvent } from '../../api/types'
import type { ApiRequestError } from '../../api/client'
import { messageForApiError } from '../../lib/errors'

export function UploadPage() {
  const navigate = useNavigate()
  const [file, setFile] = useState<File | null>(null)
  const setJobId = useState<string | null>(null)[1]
  const [progress, setProgress] = useState<UploadProgressEvent | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit() {
    if (!file) return
    setError(null)
    setLoading(true)

    try {
      const result = await uploadStatement(file)
      setJobId(result.jobId)
      subscribeToUploadProgress(result.jobId, {
        onProgress: setProgress,
        onComplete: (event) => {
          if ((event as { status?: string }).status === 'preview_ready') {
            navigate(`/uploads/${result.jobId}/preview`)
          }
        },
        onError: () => setError('Upload progress connection failed. Refresh to check the job.'),
      })
    } catch (err) {
      setError(messageForApiError((err as ApiRequestError)))
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="page-stack">
      <div className="page-heading">
        <p className="eyebrow">Import</p>
        <h1>Import statement</h1>
      </div>

      {error ? <StatusMessage tone="error">{error}</StatusMessage> : null}

      <div className="upload-zone">
        <input
          type="file"
          accept=".csv,.xlsx,.xls,.ofx,.qfx"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          disabled={loading}
        />
        <p className="hint">Supported: CSV, Excel, OFX, QFX</p>
        <button className="button" disabled={!file || loading} type="button" onClick={handleSubmit}>
          {loading ? 'Uploading...' : 'Upload'}
        </button>
      </div>

      {progress ? (
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress.percent}%` }} />
          <span>{progress.message}</span>
        </div>
      ) : null}
    </section>
  )
}
