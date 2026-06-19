import { useState, useEffect } from 'react'
import { Cpu, Save } from 'lucide-react'
import { adminService } from '../../services/index'
import { PageHeader, Card, Button, Input, LoadingState } from '../../components/ui/index'
import toast from 'react-hot-toast'

const SETTING_DESCRIPTIONS = {
  pitch_threshold_seconds: 'Minimum call duration (seconds) to qualify as a pitched call',
  whisper_model: 'OpenAI Whisper model for transcription (e.g. whisper-1)',
  gpt_model: 'OpenAI GPT model for summarization (e.g. gpt-4o)',
  auto_transcribe: 'Automatically transcribe recordings on upload (true/false)',
  duplicate_detection: 'Enable MD5 hash duplicate detection (true/false)',
  sentiment_analysis: 'Enable sentiment analysis on transcripts (true/false)',
}

const AISettingsPage = () => {
  const [settings, setSettings] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  const [pitchDetails, setPitchDetails] = useState({ filename: '', keywords: [], text: '' })
  const [uploadingPdf, setUploadingPdf] = useState(false)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      adminService.getAISettings(),
      adminService.getPitchDetails()
    ])
      .then(([settingsRes, pitchRes]) => {
        setSettings(settingsRes.data.data || [])
        setPitchDetails(pitchRes.data.data || { filename: '', keywords: [], text: '' })
      })
      .catch(() => toast.error('Failed to load settings'))
      .finally(() => setLoading(false))
  }, [])

  const handlePdfUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) {
      toast.error('Please upload a valid PDF file.')
      return
    }

    const formData = new FormData()
    formData.append('file', file)

    setUploadingPdf(true)
    const toastId = toast.loading('Uploading and extracting keywords...')
    try {
      const res = await adminService.uploadPitchPdf(formData)
      setPitchDetails(res.data.data || { filename: '', keywords: [], text: '' })
      toast.success('Pitch script PDF processed successfully!', { id: toastId })
    } catch (err) {
      console.error(err)
      toast.error(err.response?.data?.message || 'Failed to process Pitch script PDF', { id: toastId })
    } finally {
      setUploadingPdf(false)
    }
  }

  const updateValue = (key, value) => {
    setSettings((prev) => prev.map((s) => s.key === key ? { ...s, value } : s))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await adminService.updateAISettings(settings.map(({ key, value }) => ({ key, value })))
      toast.success('AI settings saved')
    } catch { toast.error('Failed to save') } finally { setSaving(false) }
  }

  if (loading) return <LoadingState />

  return (
    <div className="max-w-2xl space-y-5 fade-in">
      <PageHeader
        title="AI Settings"
        description="Configure AI transcription and analysis parameters"
        actions={<Button onClick={handleSave} disabled={saving}><Save size={15} /> {saving ? 'Saving...' : 'Save Changes'}</Button>}
      />

      <Card className="p-6 space-y-5">
        {settings.map((setting) => (
          <div key={setting.key} className="border-b border-slate-100 last:border-0 pb-4 last:pb-0">
            <label className="form-label font-mono text-xs text-brand-700">{setting.key}</label>
            <p className="text-xs text-slate-400 mb-2">{SETTING_DESCRIPTIONS[setting.key] || setting.description}</p>
            <Input
              value={setting.value}
              onChange={(e) => updateValue(setting.key, e.target.value)}
              className="max-w-xs"
            />
          </div>
        ))}
      </Card>

      {/* Pitch script PDF upload card */}
      <Card className="p-6 space-y-4">
        <div>
          <h3 className="font-semibold text-slate-800 dark:text-zinc-200">Official Pitch Reference (PDF)</h3>
          <p className="text-xs text-slate-400 dark:text-zinc-500 mt-0.5">
            Upload the official sales pitch script PDF. The AI will automatically extract keywords and compare agent transcripts for pitch compliance.
          </p>
        </div>

        {pitchDetails.filename ? (
          <div className="bg-slate-50 dark:bg-zinc-950/20 border border-slate-100 dark:border-zinc-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-450 dark:text-zinc-500">Active Pitch Script File</p>
                <p className="text-sm font-semibold text-slate-800 dark:text-zinc-200 mt-0.5">{pitchDetails.filename}</p>
              </div>
              <Badge variant="blue">Active Checker</Badge>
            </div>

            {pitchDetails.keywords && pitchDetails.keywords.length > 0 && (
              <div>
                <p className="text-xs text-slate-450 dark:text-zinc-500 font-medium mb-1.5">Extracted Pitch Keywords ({pitchDetails.keywords.length})</p>
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto scrollbar-thin pr-1">
                  {pitchDetails.keywords.map((kw, index) => (
                    <Badge key={index} variant="gray" className="text-[10px] lowercase py-0.5 px-2 bg-slate-100 dark:bg-zinc-800 text-slate-650 dark:text-zinc-350">
                      {kw}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="border-2 border-dashed border-slate-200 dark:border-zinc-800 rounded-xl p-6 text-center">
            <p className="text-sm text-slate-500 dark:text-zinc-400 mb-2">No pitch script PDF uploaded yet</p>
            <p className="text-xs text-slate-400 dark:text-zinc-500">The system is currently using simple call duration to verify if a call is pitched.</p>
          </div>
        )}

        <div className="flex items-center justify-between pt-2">
          <label className="btn btn-secondary cursor-pointer inline-flex items-center justify-center gap-2 py-2 px-4 text-xs font-medium border border-slate-200 rounded-lg hover:bg-slate-50 dark:hover:bg-zinc-800">
            <span>{pitchDetails.filename ? 'Replace PDF Pitch' : 'Upload PDF Pitch'}</span>
            <input 
              type="file" 
              accept=".pdf,application/pdf" 
              onChange={handlePdfUpload} 
              className="hidden" 
              disabled={uploadingPdf}
            />
          </label>
          {uploadingPdf && (
            <span className="text-xs text-slate-400 dark:text-zinc-550 flex items-center gap-2">
              <span className="w-3 h-3 border-2 border-brand-500 border-t-transparent rounded-full animate-spin inline-block" />
              Processing script...
            </span>
          )}
        </div>
      </Card>

      {/* Placeholder AI features */}
      <div>
        <h2 className="text-base font-semibold text-slate-700 mb-3">Future AI Features</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { title: 'Sentiment Analysis', desc: 'Real-time positive/negative/neutral detection', icon: '😊' },
            { title: 'Objection Detection', desc: 'Identify budget, vendor, timing objections', icon: '🚧' },
            { title: 'AI Coaching', desc: 'Personalized improvement suggestions per agent', icon: '🎯' },
          ].map((f) => (
            <div key={f.title} className="card p-4 opacity-60">
              <div className="flex items-center gap-2 mb-1">
                <span>{f.icon}</span>
                <h4 className="font-medium text-slate-700 text-sm">{f.title}</h4>
                <span className="ml-auto text-[10px] bg-slate-200 text-slate-500 px-1.5 py-0.5 rounded font-medium">COMING SOON</span>
              </div>
              <p className="text-xs text-slate-400">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default AISettingsPage
