import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ChefHat, Lock, Mail, Loader2, Eye, EyeOff } from 'lucide-react';

export default function AdminLogin({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) { setError('Please enter your email and password.'); return; }
    setLoading(true); setError('');
    try {
      const response = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Invalid credentials');
      onLogin(data.token, data.admin);
    } catch (err) { setError(err.message || 'Login failed. Please try again.'); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-dark-950 bg-pattern flex items-center justify-center px-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-amber-500/20">
            <ChefHat size={32} className="text-black" />
          </div>
          <h1 className="font-display text-3xl font-bold text-neutral-900 dark:text-white">Admin Portal</h1>
          <p className="text-neutral-500 text-sm mt-2">RangDe Indian Cuisine</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-8 shadow-sm dark:shadow-none">
          {error && <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 dark:text-red-400 text-sm text-center">{error}</div>}
          <div className="space-y-5">
            <div>
              <label className="block text-neutral-500 dark:text-neutral-400 text-sm mb-2">Email Address</label>
              <div className="relative">
                <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 dark:text-neutral-500" />
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@rangdeottawa.ca" className="input-dark !pl-10" autoComplete="email" />
              </div>
            </div>
            <div>
              <label className="block text-neutral-500 dark:text-neutral-400 text-sm mb-2">Password</label>
              <div className="relative">
                <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 dark:text-neutral-500" />
                <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" className="input-dark !pl-10 !pr-10" autoComplete="current-password" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 dark:text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
          </div>
          <button type="submit" disabled={loading} className="btn-gold w-full mt-8 disabled:opacity-50">
            {loading ? <><Loader2 size={18} className="mr-2 animate-spin" /> Signing in...</> : 'Sign In'}
          </button>
          <div className="mt-6 p-4 bg-amber-500/5 border border-amber-500/10 rounded-lg">
            <p className="text-amber-600 dark:text-amber-400 text-xs font-semibold mb-1">MySQL Authentication Enabled</p>
            <p className="text-neutral-500 text-xs">Use an admin email and password stored in the MySQL admins table.</p>
          </div>
        </form>
        <p className="text-neutral-500 dark:text-neutral-600 text-xs text-center mt-6">
          <a href="/" className="hover:text-amber-500 dark:hover:text-amber-400 transition-colors">← Back to website</a>
        </p>
      </motion.div>
    </div>
  );
}
