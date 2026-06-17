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

  useEffect(() => {
    adminService.getAISettings()
      .then((r) => setSettings(r.data.data || []))
      .catch(() => toast.error('Failed to load settings'))
      .finally(() => setLoading(false))
  }, [])

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

      {/* Placeholder AI features */}
      <div>
        <h2 className="text-base font-semibold text-slate-700 mb-3">Future AI Features</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { title: 'Pitch Compliance Checker', desc: 'Compare agent transcript against official pitch script', icon: '📋' },
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
