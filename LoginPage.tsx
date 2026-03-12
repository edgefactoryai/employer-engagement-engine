import React, { useState } from 'react';
import { useAuth } from './AuthContext';
import { Mail, Lock, User, ArrowRight, CheckCircle, Eye, EyeOff } from 'lucide-react';

interface LoginPageProps {
  onBack?: () => void;
  onContact?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onBack, onContact }) => {
  const { login, signUp, resetPassword } = useAuth();  // add signUp here
  const [isLogin, setIsLogin] = useState(true);
  const [isResetMode, setIsResetMode] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');  // add this for error messages
  const [successMessage, setSuccessMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      if (isResetMode) {
        await resetPassword(email);
        setSuccessMessage('Password reset email sent! Check your inbox.');
      } else if (isLogin) {
        await login(email, password);
      } else {
        await signUp(email, password);
      }
    } catch (err: any) {
      // Show a friendly error message
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100">
        <div className="bg-blue-600 p-8 text-center">
          <h1 className="text-3xl font-black text-white mb-2 tracking-tight">E^3 ENGINE</h1>
          <p className="text-blue-100 font-medium">Employer Engagement Engine</p>
        </div>
        
        <div className="p-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-6 text-center">
            {isResetMode ? 'Reset Password' : (isLogin ? 'Welcome Back' : 'Create Account')}
          </h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && !isResetMode && (
              <div className="space-y-1">
                <label className="text-sm font-bold text-slate-700 ml-1">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    placeholder="John Doe"
                  />
                </div>
              </div>
            )}
            
            <div className="space-y-1">
              <label className="text-sm font-bold text-slate-700 ml-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  placeholder="name@company.com"
                />
              </div>
            </div>
            
            {!isResetMode && (
              <div className="space-y-1">
                <label className="text-sm font-bold text-slate-700 ml-1">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none p-1"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            )}

            {isLogin && !isResetMode && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setIsResetMode(true);
                    setError('');
                    setSuccessMessage('');
                  }}
                  className="text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors"
                >
                  Forgot Password?
                </button>
              </div>
            )}

            {error && (
              <p className="text-red-500 text-sm mt-2">{error}</p>
            )}
            {successMessage && (
              <div className="bg-green-50 text-green-700 p-3 rounded-xl text-sm font-medium flex items-center gap-2">
                <CheckCircle size={16} />
                {successMessage}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl transition-all transform active:scale-[0.98] flex items-center justify-center gap-2 mt-6 shadow-lg shadow-blue-600/20"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  {isResetMode ? 'Send Reset Link' : (isLogin ? 'Sign In' : 'Create Account')}
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>
          
          <div className="mt-6 text-center">
            {isResetMode ? (
              <button
                onClick={() => {
                  setIsResetMode(false);
                  setError('');
                  setSuccessMessage('');
                }}
                className="text-sm font-medium text-slate-500 hover:text-blue-600 transition-colors"
              >
                Back to Sign In
              </button>
            ) : (
              <div className="text-sm font-medium text-slate-500">
                Don't have an account?{' '}
                <button 
                  onClick={onContact}
                  className="text-blue-600 hover:text-blue-800 transition-colors font-medium"
                >
                  Contact Sales
                </button>
              </div>
            )}
          </div>
          
          {onBack && (
            <div className="mt-4 text-center border-t border-slate-100 pt-4">
              <button 
                onClick={onBack}
                className="text-xs font-bold text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors"
              >
                Back to Overview
              </button>
            </div>
          )}
        </div>
        
        <div className="bg-slate-50 p-4 border-t border-slate-100 text-center text-xs text-slate-400">
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </div>
      </div>
    </div>
  );
};
