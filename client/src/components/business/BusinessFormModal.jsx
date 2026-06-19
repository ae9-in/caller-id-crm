import { useState, useEffect } from 'react'
import { businessService } from '../../services/businessService'
import { userService } from '../../services/index'
import { useAuth } from '../../context/AuthContext'
import { Modal, Button, Input, Select, Spinner } from '../ui/index'
import toast from 'react-hot-toast'

const BusinessFormModal = ({ open, onClose, business, onSaved }) => {
  const isEdit = !!business
  const { user: currentUser } = useAuth()
  const [form, setForm] = useState({
    name: '',
    assigned_user_id: '',
  })
  const [loading, setLoading] = useState(false)
  const [tags, setTags] = useState([])
  const [allTags, setAllTags] = useState([])
  const [users, setUsers] = useState([])
  const [pitchFile, setPitchFile] = useState(null)

  useEffect(() => {
    if (business) {
      setForm({
        name: business.name || '',
        assigned_user_id: business.assigned_user_id || '',
      })
      setTags((business.tags || []).map((t) => t.id))
      setPitchFile(null)
    } else {
      setForm({
        name: '',
        assigned_user_id: currentUser?.id || '',
      })
      setTags([])
      setPitchFile(null)
    }
  }, [business, open, currentUser])

  useEffect(() => {
    businessService.getTags().then((r) => setAllTags(r.data.data || [])).catch(() => {})
    userService.getAll({ limit: 100 }).then((r) => {
      setUsers(r.data.data || [])
    }).catch(() => {})
  }, [])

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) return
    setLoading(true)
    try {
      if (isEdit) {
        await businessService.update(business.id, { ...form, tags })
        toast.success('Business updated')
      } else {
        const res = await businessService.create({ ...form, tags })
        const newBiz = res.data.data
        if (pitchFile && newBiz && newBiz.id) {
          const formData = new FormData()
          formData.append('file', pitchFile)
          try {
            await businessService.uploadBusinessPitchPdf(newBiz.id, formData)
          } catch (uploadErr) {
            console.error(uploadErr)
            toast.error('Business created, but pitch script PDF upload/analysis failed')
          }
        }
        toast.success('Business created')
      }
      onSaved()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save business')
    } finally {
      setLoading(false)
    }
  }

  const toggleTag = (tagId) => {
    setTags((prev) => prev.includes(tagId) ? prev.filter((t) => t !== tagId) : [...prev, tagId])
  }

  const userOptions = users.map((u) => ({
    value: u.id,
    label: `${u.first_name} ${u.last_name || ''} (${u.role})`.trim(),
  }))

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit Business' : 'Add New Business'}
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading || !form.name.trim()}>
            {loading ? <Spinner size="sm" /> : isEdit ? 'Save Changes' : 'Create Business'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Business Name *"
          value={form.name}
          onChange={set('name')}
          placeholder="Company name"
          required
        />
        
        <Select
          label="Assigned User *"
          options={userOptions}
          value={form.assigned_user_id}
          onChange={set('assigned_user_id')}
          required
        />

        {!isEdit && (
          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700">
              Pitch script PDF (Optional)
            </label>
            <input
              type="file"
              accept="application/pdf"
              onChange={(e) => setPitchFile(e.target.files?.[0] || null)}
              className="block w-full text-xs text-slate-500 border border-slate-200 rounded p-2
                file:mr-2 file:py-1 file:px-2
                file:rounded-full file:border-0
                file:text-xs file:font-semibold
                file:bg-brand-50 file:text-brand-700
                hover:file:bg-brand-100 cursor-pointer"
            />
          </div>
        )}

        {allTags.length > 0 && (
          <div>
            <label className="form-label">Tags</label>
            <div className="flex flex-wrap gap-2">
              {allTags.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => toggleTag(tag.id)}
                  className="px-2.5 py-1 rounded-full text-xs font-medium border transition-all"
                  style={{
                    borderColor: tag.color,
                    backgroundColor: tags.includes(tag.id) ? tag.color : 'transparent',
                    color: tags.includes(tag.id) ? '#fff' : tag.color,
                  }}
                >
                  {tag.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </form>
    </Modal>
  )
}

export default BusinessFormModal
