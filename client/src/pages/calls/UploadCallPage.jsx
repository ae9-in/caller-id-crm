import { useState, useEffect } from 'react'
import { useLocation, Link } from 'react-router-dom'
import { useDropzone } from 'react-dropzone'
import { Upload, Phone, Building2, Check, AlertCircle } from 'lucide-react'
import { callService } from '../../services/callService'
import { businessService } from '../../services/businessService'
import { Button, Select, Input, Spinner, Card, PageHeader, Badge } from '../../components/ui/index'
import toast from 'react-hot-toast'
import clsx from 'clsx'

const UploadCallPage = () => {
  const location = useLocation()
  const prefill = location.state || {}

  const [file, setFile] = useState(null)
  const [form, setForm] = useState({
    title: '',
    business_id: prefill.business_id || '',
    call_date: new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16),
    audio_language: 'auto',
    transcription_lang: 'en',
  })
  const [businesses, setBusinesses] = useState([])
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState(null)

  useEffect(() => {
    businessService.getAll({ limit: 100 }).then((r) => setBusinesses(r.data.data || [])).catch(() => {})
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'audio/*': ['.mp3', '.wav', '.m4a', '.ogg'],
      'application/zip': ['.zip', '.ZIP'],
      'application/x-zip-compressed': ['.zip', '.ZIP'],
      'application/octet-stream': ['.zip', '.ZIP'],
      'application/x-zip': ['.zip', '.ZIP'],
      'application/compressed': ['.zip', '.ZIP']
    },
    maxFiles: 1,
    onDrop: ([f]) => {
      if (f) {
        setFile(f)
        const isZip = f.name.toLowerCase().endsWith('.zip') || f.type === 'application/zip' || f.type === 'application/x-zip-compressed';
        if (!isZip && !form.title) {
          setForm((p) => ({ ...p, title: f.name.replace(/\.[^.]+$/, '') }))
        }
      }
    },
  })

  const handleUpload = async () => {
    if (!file) return toast.error('Please select a file')
    setUploading(true)
    setProgress(0)
    try {
      const isZip = file.name.toLowerCase().endsWith('.zip') || file.type === 'application/zip' || file.type === 'application/x-zip-compressed';
      const fd = new FormData()
      
      fd.append('audio_language', form.audio_language)
      fd.append('transcription_lang', form.transcription_lang)
      if (form.business_id) fd.append('business_id', form.business_id)
      
      if (isZip) {
        fd.append('zip', file)
      } else {
        fd.append('audio', file)
        fd.append('title', form.title || file.name)
        if (form.call_date) {
          try {
            fd.append('call_date', new Date(form.call_date).toISOString())
          } catch {
            fd.append('call_date', new Date().toISOString())
          }
        }
      }

      const uploadFn = isZip ? callService.uploadZip : callService.upload;
      const res = await uploadFn(fd, (e) => {
        setProgress(Math.round((e.loaded * 100) / e.total))
      })
      setResult(res.data.data)
      toast.success(isZip ? `${res.data.data.count} calls successfully queued for transcription!` : 'Recording uploaded and queued for AI transcription!')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  if (result) {
    const isBatch = result.count !== undefined;

    return (
      <div className="max-w-lg mx-auto text-center py-12 fade-in">
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Check size={28} className="text-emerald-600" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">
          {isBatch ? 'Batch Upload Successful!' : 'Upload Successful!'}
        </h2>
        <p className="text-slate-500 mb-1">
          {isBatch ? `${result.count} recordings have been successfully extracted.` : 'Your recording has been uploaded.'}
        </p>
        <p className="text-slate-400 text-sm mb-6">
          AI transcription & analysis is running in the background.
        </p>

        {isBatch && result.calls && (
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 mb-6 text-left max-h-48 overflow-y-auto scrollbar-thin">
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Extracted Calls ({result.count})</h4>
            <ul className="space-y-1.5 text-sm text-slate-700">
              {result.calls.map((c, i) => (
                <li key={i} className="flex justify-between items-center py-1 border-b border-slate-100 last:border-b-0">
                  <span className="truncate max-w-[280px]" title={c.title}>{c.title}</span>
                  <span className="flex gap-2 items-center shrink-0">
                    {c.is_duplicate && <Badge variant="warning">Duplicate</Badge>}
                    <Link to={`/calls/${c.id}`} className="text-brand-600 hover:underline font-medium text-xs">View →</Link>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {!isBatch && result.is_duplicate && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2 text-left">
            <AlertCircle size={16} className="text-amber-600 shrink-0" />
            <div>
              <p className="text-amber-700 text-sm font-medium">Possible Duplicate Detected</p>
              <p className="text-amber-600 text-xs">This file appears to have been uploaded before.</p>
              {result.duplicate_of && (
                <Link to={`/calls/${result.duplicate_of}`} className="text-xs text-brand-600 underline">
                  View original recording
                </Link>
              )}
            </div>
          </div>
        )}

        <div className="flex gap-3 justify-center">
          {isBatch ? (
            <Link to="/calls">
              <Button>Go to Calls List</Button>
            </Link>
          ) : (
            <Link to={`/calls/${result.id}`}>
              <Button>View Call Details</Button>
            </Link>
          )}
          <Button variant="secondary" onClick={() => { setResult(null); setFile(null); setProgress(0) }}>
            Upload Another
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto fade-in">
      <PageHeader title="Upload Recording" description="Upload an audio recording or a ZIP archive containing multiple recordings to transcribe and analyze with AI" />

      <Card className="p-6 space-y-5">
        {/* Drop zone */}
        <div
          {...getRootProps()}
          className={clsx(
            'border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors',
            isDragActive
              ? 'border-brand-400 bg-brand-50'
              : file
              ? 'border-emerald-400 bg-emerald-50'
              : 'border-slate-300 hover:border-brand-400 hover:bg-slate-50'
          )}
        >
          <input {...getInputProps()} />
          {file ? (
            <div>
              <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Check size={22} className="text-emerald-600" />
              </div>
              <p className="font-medium text-slate-800">{file.name}</p>
              <p className="text-sm text-slate-500 mt-1">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
              <p className="text-xs text-brand-600 mt-2">Click or drag to replace</p>
            </div>
          ) : (
            <div>
              <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Upload size={22} className="text-slate-500" />
              </div>
              <p className="font-medium text-slate-700">
                {isDragActive ? 'Drop your file here' : 'Drag & drop or click to upload'}
              </p>
              <p className="text-sm text-slate-400 mt-1">Supports MP3, WAV, M4A, OGG, or ZIP (batch) · Max 100MB</p>
            </div>
          )}
        </div>

        {/* Form fields */}
        {file && (file.name.toLowerCase().endsWith('.zip') || file.type === 'application/zip' || file.type === 'application/x-zip-compressed') ? (
          <div className="p-4 bg-brand-50 border border-brand-100 rounded-xl flex items-start gap-2.5 text-left">
            <AlertCircle size={18} className="text-brand-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-brand-800 text-sm font-medium">Batch ZIP Archive Detected</p>
              <p className="text-brand-600 text-xs mt-0.5">
                The recording titles will be automatically generated from the names of the audio files contained inside the ZIP archive.
              </p>
            </div>
          </div>
        ) : (
          <>
            <Input
              label="Recording Title"
              placeholder="e.g. Initial outreach - IIT Delhi"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />

            <Input
              label="Call Date & Time"
              type="datetime-local"
              value={form.call_date}
              onChange={(e) => setForm({ ...form, call_date: e.target.value })}
            />
          </>
        )}

        <Select
          label="Attach to Business (optional)"
          placeholder="— Select business —"
          options={businesses.map((b) => ({ value: b.id, label: b.name }))}
          value={form.business_id}
          onChange={(e) => setForm({ ...form, business_id: e.target.value })}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label="Audio Language"
            options={[
              { value: 'en', label: 'English' },
              { value: 'hi', label: 'Hindi (हिंदी)' },
              { value: 'ta', label: 'Tamil (தமிழ்)' },
              { value: 'te', label: 'Telugu (తెలుగు)' },
              { value: 'kn', label: 'Kannada (ಕನ್ನಡ)' },
              { value: 'auto', label: 'Auto-detect' },
            ]}
            value={form.audio_language}
            onChange={(e) => setForm({ ...form, audio_language: e.target.value })}
          />

          <Select
            label="Transcription Language"
            options={[
              { value: 'en', label: 'English' },
              { value: 'hi', label: 'Hindi (हिंदी)' },
              { value: 'ta', label: 'Tamil (தமிழ்)' },
              { value: 'te', label: 'Telugu (తెలుగు)' },
              { value: 'kn', label: 'Kannada (ಕನ್ನಡ)' },
            ]}
            value={form.transcription_lang}
            onChange={(e) => setForm({ ...form, transcription_lang: e.target.value })}
          />
        </div>

        {/* Upload progress */}
        {uploading && (
          <div>
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span>Uploading...</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2">
              <div
                className="bg-brand-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <Button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="flex-1"
          >
            {uploading ? (
              <><Spinner size="sm" /> Uploading ({progress}%)...</>
            ) : (
              <><Upload size={15} /> Upload & Transcribe</>
            )}
          </Button>
          <Link to="/calls">
            <Button variant="secondary">Cancel</Button>
          </Link>
        </div>
      </Card>
    </div>
  )
}

export default UploadCallPage
