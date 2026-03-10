import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import styled from '@emotion/styled';

const Button = styled('button')`
  display: flex;
  align-items: center;
  color: #fff;
  line-height: 1;
  background: rgb(255 255 255 / 7%);
  padding: 8px;
  border-radius: 4px;
  cursor: pointer;
  border: 1px solid hsla(0,0%,100%,.4);
  &:hover {
    background: rgb(255 255 255 / 15%);
  }
`;

export default function ProfileMenu() {
  const { user, signOut, setShowAuthModal } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!user) {
    return (
      <Button onClick={() => setShowAuthModal(true)} css={{ padding: '8px 16px' }}>
        <span css={{ marginRight: 4, marginLeft: 4 }}>Login</span>
      </Button>
    );
  }

  return (
    <div ref={menuRef} className="relative">
      <Button onClick={() => setIsOpen(!isOpen)} css={{ padding: '8px 16px' }}>
        <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-[10px] font-bold mr-2">
          {user.email.charAt(0).toUpperCase()}
        </div>
        <span css={{ marginRight: 4 }}>Profile</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M6 9l6 6 6-6"/>
        </svg>
      </Button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-[320px] bg-white rounded shadow-[0_2px_4px_rgba(0,0,0,0.1)] py-2 z-50 border border-[#e3e6e9]">
          <div className="px-4 pt-4 pb-2 border-b border-[rgba(57,76,96,.15)] mb-2">
            <div className="text-[18px] font-bold text-[#000] truncate">{user.email}</div>
            <div className="text-[13px] text-[#909090] mt-2 font-['Arial']">Account</div>
          </div>
          <button
            onClick={() => {
              setIsOpen(false);
              setShowSettings(true);
            }}
            className="w-full text-left px-4 py-2 text-[14px] leading-[22px] text-gray-800 hover:bg-[rgba(64,87,109,.07)] transition-colors"
          >
            Settings
          </button>
          <button
            onClick={() => {
              setIsOpen(false);
              signOut();
            }}
            className="w-full text-left px-4 py-2 text-[14px] leading-[22px] text-gray-800 hover:bg-[rgba(64,87,109,.07)] transition-colors"
          >
            Log out
          </button>
        </div>
      )}

      {showSettings && (
        <SettingsModal onClose={() => setShowSettings(false)} />
      )}
    </div>
  );
}

function SettingsModal({ onClose }: { onClose: () => void }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState({ text: '', type: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ text: '', type: '' });

    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword })
      });
      
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error);
      
      setMessage({ text: 'Password updated successfully', type: 'success' });
      setCurrentPassword('');
      setNewPassword('');
      setTimeout(onClose, 2000);
    } catch (err: any) {
      setMessage({ text: err.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-[480px] relative border border-gray-200">
        <button 
          onClick={onClose} 
          className="absolute top-6 right-6 text-gray-500 hover:text-gray-700 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
        
        <h2 className="text-3xl font-bold mb-8 text-[#0F172A]">Settings</h2>
        
        {message.text && (
          <div className={`mb-6 p-3 rounded-lg text-sm border ${
            message.type === 'error' ? 'bg-red-50 text-red-700 border-red-100' : 'bg-green-50 text-green-700 border-green-100'
          }`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-[#334155] mb-2">Current Password</label>
            <input 
              type="password" 
              required
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              className="w-full px-4 py-3.5 bg-[#F8FAFC] border-none rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-gray-900"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-[#334155] mb-2">New Password</label>
            <input 
              type="password" 
              required
              minLength={6}
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              className="w-full px-4 py-3.5 bg-[#F8FAFC] border-none rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-gray-900"
            />
          </div>
          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-white border border-gray-200 text-[#334155] py-3.5 rounded-xl hover:bg-gray-50 transition-colors font-bold text-base mt-4 shadow-sm flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Updating...
              </>
            ) : (
              'Update Password'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
