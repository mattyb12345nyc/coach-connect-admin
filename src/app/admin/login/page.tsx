'use client';

import { useState } from 'react';
import { getSupabase } from '@/lib/supabase';
import { clearAdminAuthTokenCookie, setAdminAuthTokenCookie } from '@/lib/admin-auth-client';
import { Loader2, Lock, Mail, Eye, EyeOff, AlertCircle } from 'lucide-react';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const supabase = getSupabase();
    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(
        authError.message === 'Invalid login credentials'
          ? 'Incorrect email or password.'
          : authError.message
      );
      setLoading(false);
      return;
    }

    const accessToken = data.session?.access_token;
    if (!accessToken) {
      clearAdminAuthTokenCookie();
      setError('Sign-in succeeded, but no session token was returned.');
      setLoading(false);
      return;
    }

    const adminSessionRes = await fetch('/api/admin/session', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!adminSessionRes.ok) {
      clearAdminAuthTokenCookie();
      await supabase.auth.signOut();
      setError('You do not have admin access.');
      setLoading(false);
      return;
    }

    setAdminAuthTokenCookie(accessToken);
    window.location.href = '/admin/today';
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-coach-gold/10 mb-4">
            <Lock className="w-7 h-7 text-coach-gold" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Admin Sign In</h1>
          <p className="text-sm text-gray-500 mt-1">Coach Pulse Administration</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="admin@coach.com"
                  required
                  className="w-full h-10 pl-10 pr-4 rounded-lg border border-gray-200 bg-white text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-coach-gold/30 focus:border-coach-gold transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className="w-full h-10 pl-10 pr-10 rounded-lg border border-gray-200 bg-white text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-coach-gold/30 focus:border-coach-gold transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-10 bg-coach-gold hover:bg-coach-gold/90 disabled:opacity-50 text-white font-medium rounded-lg flex items-center justify-center gap-2 transition-colors"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Sign In'
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Only authorized administrators can access this panel.
        </p>
      </div>
    </div>
  );
}
