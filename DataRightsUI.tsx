import React, { useState } from 'react';
import { Shield, Mail, Trash2, Ban, CheckCircle, AlertCircle } from 'lucide-react';

export const DataRightsUI: React.FC<{ userEmail: string }> = ({ userEmail }) => {
  const [requestType, setRequestType] = useState<'access' | 'delete' | 'optout' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSuccess(true);
      
      // Reset success message after 5 seconds
      setTimeout(() => {
        setIsSuccess(false);
        setRequestType(null);
      }, 5000);
    }, 1500);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center gap-4 border-b border-slate-200 pb-6">
        <div className="p-3 bg-blue-100 text-blue-700 rounded-xl">
          <Shield size={32} />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Data Rights & Privacy</h1>
          <p className="text-slate-500 mt-1">Manage your personal data in accordance with CCPA and other privacy regulations.</p>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Access Request */}
        <div 
          className={`bg-white border rounded-2xl p-6 cursor-pointer transition-all ${requestType === 'access' ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-md' : 'border-slate-200 hover:border-blue-300 hover:shadow-sm'}`}
          onClick={() => setRequestType('access')}
        >
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-4">
            <Mail size={24} />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-2">Request Data Access</h3>
          <p className="text-sm text-slate-500">Receive a copy of all personal data we have collected about you over the past 12 months.</p>
        </div>

        {/* Deletion Request */}
        <div 
          className={`bg-white border rounded-2xl p-6 cursor-pointer transition-all ${requestType === 'delete' ? 'border-red-500 ring-2 ring-red-500/20 shadow-md' : 'border-slate-200 hover:border-red-300 hover:shadow-sm'}`}
          onClick={() => setRequestType('delete')}
        >
          <div className="w-12 h-12 bg-red-50 text-red-600 rounded-full flex items-center justify-center mb-4">
            <Trash2 size={24} />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-2">Request Data Deletion</h3>
          <p className="text-sm text-slate-500">Permanently delete your account and all associated personal data from our systems.</p>
        </div>

        {/* Opt-Out Request */}
        <div 
          className={`bg-white border rounded-2xl p-6 cursor-pointer transition-all ${requestType === 'optout' ? 'border-amber-500 ring-2 ring-amber-500/20 shadow-md' : 'border-slate-200 hover:border-amber-300 hover:shadow-sm'}`}
          onClick={() => setRequestType('optout')}
        >
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mb-4">
            <Ban size={24} />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-2">Opt-Out of Sharing</h3>
          <p className="text-sm text-slate-500">Direct us not to sell or share your personal information with third parties.</p>
        </div>
      </div>

      {requestType && (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 animate-in slide-in-from-bottom-4 duration-300">
          <h3 className="text-xl font-bold text-slate-900 mb-4">
            {requestType === 'access' && 'Submit Access Request'}
            {requestType === 'delete' && 'Submit Deletion Request'}
            {requestType === 'optout' && 'Submit Opt-Out Request'}
          </h3>
          
          {isSuccess ? (
            <div className="flex items-center gap-3 p-4 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-200">
              <CheckCircle size={24} className="shrink-0" />
              <div>
                <p className="font-bold">Request Submitted Successfully</p>
                <p className="text-sm mt-1">We have received your request and sent a confirmation email to {userEmail}. We will process your request within 45 days.</p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="p-4 bg-blue-50 text-blue-800 rounded-xl flex items-start gap-3">
                <AlertCircle size={20} className="shrink-0 mt-0.5" />
                <p className="text-sm">
                  This request will be associated with your current account email: <span className="font-bold">{userEmail}</span>. 
                  We may need to verify your identity before processing this request.
                </p>
              </div>
              
              {requestType === 'delete' && (
                <div className="p-4 bg-red-50 text-red-800 rounded-xl border border-red-200 text-sm">
                  <p className="font-bold mb-1">Warning: This action is irreversible.</p>
                  <p>Deleting your data will permanently remove your account, generated campaigns, and all associated records.</p>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setRequestType(null)}
                  className="px-6 py-2.5 text-slate-600 font-medium hover:bg-slate-200 rounded-xl transition-colors"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`px-6 py-2.5 text-white font-bold rounded-xl transition-all flex items-center gap-2 ${
                    requestType === 'delete' ? 'bg-red-600 hover:bg-red-700' : 
                    requestType === 'optout' ? 'bg-amber-600 hover:bg-amber-700' : 
                    'bg-blue-600 hover:bg-blue-700'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {isSubmitting ? 'Submitting...' : 'Confirm Request'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
};
