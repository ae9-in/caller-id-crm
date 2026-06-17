import { Outlet, useLocation } from 'react-router-dom'

const AuthLayout = () => {
  const location = useLocation()

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy-950 via-navy-900 to-navy-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-brand-600 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            </div>
            <span className="text-white text-xl font-bold">CallerID</span>
          </div>
          <p className="text-navy-300 text-sm">CRM for high-volume outreach teams</p>
        </div>

        <div key={location.pathname} className="bg-white rounded-2xl shadow-dialog p-8 fade-in">
          <Outlet />
        </div>

        <p className="text-center text-navy-400 text-xs mt-6">
          © 2026 Call Intelligence CRM. All rights reserved.
        </p>
      </div>
    </div>
  )
}

export default AuthLayout
