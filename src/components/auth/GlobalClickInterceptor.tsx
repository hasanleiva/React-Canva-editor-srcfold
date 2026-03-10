import React, { useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import AuthModal from './AuthModal';

export const GlobalClickInterceptor = () => {
  const { user, loading, showAuthModal, setShowAuthModal } = useAuth();

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (loading || user) return;

      const target = e.target as HTMLElement;
      
      // Check if the click is inside the auth modal
      if (target.closest('#auth-modal')) return;

      // Check if it's a button or interactive element
      const isInteractive = target.closest('button') || target.closest('[role="button"]') || target.closest('a') || target.closest('input');

      if (isInteractive) {
        e.stopPropagation();
        e.preventDefault();
        setShowAuthModal(true);
      }
    };

    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, [user, loading, setShowAuthModal]);

  if (showAuthModal) {
    return <AuthModal onClose={() => setShowAuthModal(false)} />;
  }

  return null;
};
