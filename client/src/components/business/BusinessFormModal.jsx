import { useState, useEffect } from 'react'
import { businessService } from '../../services/businessService'
import { Modal, Button, Input, Select, Textarea, Spinner } from '../ui/index'
import { BUSINESS_STATUSES, PRIORITIES, INDUSTRIES, CATEGORIES } from '../../utils/constants'
import toast from 'react-hot-toast'

const BusinessFormModal = ({ open, onClose, business, onSaved }) => {
  const isEdit = !!business
  const [form, setForm] = useState({
    name: '', category: '', industry: '', contact_person: '',
    phone: '', email: '', website: '', address: '', city: '', state: '',
    status: 'new_lead', priority: 'medium', notes: '',
  })
  const [loading, setLoading] = useState(false)
  const [tags, setTags] = useState([])
  const [allTags, setAllTags] = useState([])

  useEffect(() => {
    if (business) {
      setForm({
        name: business.name || '',
        category: business.category || '',
        industry: business.industry || '',
        contact_person: business.contact_person || '',
        phone: business.phone || '',
        email: business.email || '',
        website: business.website || '',
        address: business.address || '',
        city: business.city || '',
        state: business.state || '',
        status: business.status || 'new_lead',
        priority: business.priority || 'medium',
        notes: business.notes || '',
      })
      setTags((business.tags || []).map((t) => t.id))
    } else {
      setForm({ name: '', category: '', industry: '', contact_person: '', phone: '', email: '', website: '', address: '', city: '', state: '', status: 'new_lead', priority: 'medium', notes: '' })
      setTags([])
    }
  }, [business, open])

  useEffect(() => {
    businessService.getTags().then((r) => setAllTags(r.data.data || [])).catch(() => {})
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
        await businessService.create({ ...form, tags })
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

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit Business' : 'Add New Business'}
      size="lg"
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="Business Name *" value={form.name} onChange={set('name')} placeholder="Company name" className="col-span-2" required />
          <Select label="Category" options={CATEGORIES.map((c) => ({ value: c, label: c }))} placeholder="Select category" value={form.category} onChange={set('category')} />
          <Select label="Industry" options={INDUSTRIES.map((i) => ({ value: i, label: i }))} placeholder="Select industry" value={form.industry} onChange={set('industry')} />
          <Input label="Contact Person" value={form.contact_person} onChange={set('contact_person')} placeholder="Full name" />
          <Input label="Phone" value={form.phone} onChange={set('phone')} type="tel" placeholder="+91-9876543210" />
          <Input label="Email" value={form.email} onChange={set('email')} type="email" placeholder="contact@company.com" />
          <Input label="Website" value={form.website} onChange={set('website')} placeholder="https://company.com" />
          <Input label="City" value={form.city} onChange={set('city')} placeholder="Mumbai" />
          <Input label="State" value={form.state} onChange={set('state')} placeholder="Maharashtra" />
          <Select label="Status" options={BUSINESS_STATUSES} value={form.status} onChange={set('status')} />
          <Select label="Priority" options={PRIORITIES} value={form.priority} onChange={set('priority')} />
        </div>

        <Textarea label="Address" value={form.address} onChange={set('address')} placeholder="Street address" className="min-h-[60px]" />
        <Textarea label="Notes" value={form.notes} onChange={set('notes')} placeholder="Internal notes about this business..." />

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
