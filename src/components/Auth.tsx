import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Auth() {
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccessMsg(null)

    try {
      if (isSignUp) {
        if (password.length < 6) {
          throw new Error('Password must be at least 6 characters')
        }
        const { error } = await supabase.auth.signUp({
          email,
          password,
        })
        if (error) throw error
        setSuccessMsg('Account created successfully! You can now sign in.')
        setIsSignUp(false)
        setPassword('')
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        setError(error.message)
      } else {
        setError('An unexpected error occurred')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col justify-center py-12 sm:px-6 lg:px-8 h-screen w-full">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex flex-col items-center">
          <div className="w-14 h-14 bg-[#1E293B] rounded-2xl flex items-center justify-center shadow-lg border border-[#334155] mb-6">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="#60A5FA" strokeWidth="2" strokeLinejoin="round"/>
              <path d="M2 17L12 22L22 17" stroke="#60A5FA" strokeWidth="2" strokeLinejoin="round"/>
              <path d="M2 12V17" stroke="#60A5FA" strokeWidth="2" strokeLinejoin="round"/>
              <path d="M22 12V17" stroke="#60A5FA" strokeWidth="2" strokeLinejoin="round"/>
              <path d="M12 12V22" stroke="#60A5FA" strokeWidth="2" strokeLinejoin="round"/>
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Bridgebox Voice</h1>
          <p className="text-slate-400 mt-2 text-sm">Enterprise Voice AI Platform</p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-[#131B2B] py-8 px-4 shadow-[0_0_40px_-10px_rgba(0,0,0,0.5)] sm:rounded-2xl sm:px-10 border border-[#1E293B]">
            <h2 className="mb-6 text-xl font-semibold text-white">
              {isSignUp ? 'Create your account' : 'Welcome back'}
            </h2>

            {error && (
              <div className="mb-4 bg-red-900/30 border border-red-900/50 text-red-400 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                {error}
              </div>
            )}

            {successMsg && (
              <div className="mb-4 bg-emerald-900/30 border border-emerald-900/50 text-emerald-400 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                {successMsg}
              </div>
            )}

            <form className="space-y-5" onSubmit={handleAuth}>
              <div>
                <label className="block text-sm font-medium text-slate-300">
                  Email address
                </label>
                <div className="mt-1.5">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full appearance-none rounded-xl border border-[#334155] px-4 py-3 placeholder-slate-500 shadow-sm focus:border-[#60A5FA] focus:outline-none focus:ring-1 focus:ring-[#60A5FA] sm:text-sm bg-[#0B0F19] text-white transition-colors"
                    placeholder="you@company.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300">
                  Password
                </label>
                <div className="mt-1.5">
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full appearance-none rounded-xl border border-[#334155] px-4 py-3 placeholder-slate-500 shadow-sm focus:border-[#60A5FA] focus:outline-none focus:ring-1 focus:ring-[#60A5FA] sm:text-sm bg-[#0B0F19] text-white transition-colors"
                    placeholder={isSignUp ? "Min. 6 characters" : "••••••••"}
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full justify-center rounded-xl border border-transparent bg-blue-600 px-4 py-3 text-sm font-bold text-white shadow-sm hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-[#131B2B] disabled:opacity-50 transition-colors"
                >
                  {loading ? (
                    <div className="spinner" />
                  ) : isSignUp ? (
                    'Create Account'
                  ) : (
                    'Sign In'
                  )}
                </button>
              </div>
            </form>

            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp)
                  setError(null)
                  setSuccessMsg(null)
                }}
                className="text-sm text-slate-400 hover:text-slate-200 transition-colors"
              >
                {isSignUp
                  ? 'Already have an account? SignIn'
                  : "Don't have an account? SignUp"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
