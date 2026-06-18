import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { Button, Input, Spinner } from '../../components/ui/index'
import toast from 'react-hot-toast'

const LoginPage = () => {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await login(form.email, form.password)
      toast.success('Welcome back!')
      // Delay navigation to ensure auth context updates
      setTimeout(() => navigate('/', { replace: true }), 100)
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Sign in</h1>
        <p className="text-slate-500 text-sm mt-1">Access your Call Intelligence dashboard</p>
      </div>



      <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
        {/* Dummy inputs to prevent browser autofill */}
        <div style={{ position: 'absolute', top: '-9999px', left: '-9999px', width: '1px', height: '1px', overflow: 'hidden' }}>
          <input type="text" name="prevent_autofill_email" tabIndex="-1" autoComplete="new-password" />
          <input type="password" name="prevent_autofill_password" tabIndex="-1" autoComplete="new-password" />
        </div>

        <Input
          label="Email address"
          type="email"
          placeholder="you@company.com"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          required
          autoComplete="new-password"
        />
        <Input
          label="Password"
          type="password"
          placeholder="••••••••"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          required
          autoComplete="new-password"
        />

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <Button type="submit" variant="primary" className="w-full" disabled={loading}>
          {loading ? <><Spinner size="sm" /> Signing in...</> : 'Sign in'}
        </Button>
      </form>

      <div className="mt-4 text-center space-y-3">
        <div>
          <Link to="/forgot-password" className="text-sm text-brand-600 hover:text-brand-700">
            Forgot your password?
          </Link>
        </div>
        <div className="text-sm text-slate-500">
          Don't have an account?{' '}
          <Link to="/register" className="font-semibold text-brand-600 hover:text-brand-700">
            Create account
          </Link>
        </div>
      </div>
    </div>
  )
}

export default LoginPage
