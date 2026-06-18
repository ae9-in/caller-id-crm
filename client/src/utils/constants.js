export const BUSINESS_STATUSES = [
  { value: 'new_lead', label: 'New Lead' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'follow_up_required', label: 'Follow Up Required' },
  { value: 'interested', label: 'Interested' },
  { value: 'meeting_scheduled', label: 'Meeting Scheduled' },
  { value: 'converted', label: 'Converted' },
  { value: 'closed', label: 'Closed' },
]

export const PRIORITIES = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
]

export const CALL_OUTCOMES = [
  { value: 'interested', label: 'Interested' },
  { value: 'not_interested', label: 'Not Interested' },
  { value: 'follow_up_needed', label: 'Follow Up Needed' },
  { value: 'call_back_later', label: 'Call Back Later' },
  { value: 'meeting_scheduled', label: 'Meeting Scheduled' },
  { value: 'wrong_number', label: 'Wrong Number' },
  { value: 'no_answer', label: 'No Answer' },
  { value: 'unknown', label: 'Unknown' },
]

export const ROLES = [
  { value: 'admin', label: 'Admin' },
  { value: 'manager', label: 'Manager' },
  { value: 'agent', label: 'Agent' },
]

export const INDUSTRIES = [
  'Higher Education', 'Technical Education', 'School Education',
  'Information Technology', 'Consulting', 'FinTech', 'Food Tech',
  'Healthcare', 'Manufacturing', 'Retail', 'Finance', 'Other',
]

export const CATEGORIES = [
  'Education', 'Corporate', 'Startup', 'Government', 'Non-Profit', 'Other',
]

export const NAV_ITEMS = [
  { path: '/', label: 'Dashboard', icon: 'LayoutDashboard' },
  { path: '/businesses', label: 'Businesses', icon: 'Building2' },
  { path: '/calls', label: 'Calls', icon: 'Phone' },
  { path: '/calls/folders', label: 'Call Folders', icon: 'Folder' },
  { path: '/followups', label: 'Follow Ups', icon: 'Calendar' },
  { path: '/analytics', label: 'Analytics', icon: 'BarChart3', roles: ['admin', 'manager'] },
  { path: '/leaderboard', label: 'Leaderboard', icon: 'Trophy' },
  { path: '/search', label: 'Search', icon: 'Search' },
]

export const ADMIN_NAV = [
  { path: '/admin/users', label: 'User Management', icon: 'Users' },
  { path: '/admin/ai-settings', label: 'AI Settings', icon: 'Cpu' },
  { path: '/admin/audit-logs', label: 'Audit Logs', icon: 'FileText' },
]
