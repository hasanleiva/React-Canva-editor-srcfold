import Editor from './Editor';
import React, { useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AuthPopup } from './components/AuthPopup';

function GlobalAuthHandler({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, setShowAuthPopup } = useAuth();

  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      if (isAuthenticated) return;

      // Check if the clicked element or any of its parents is a button
      let target = e.target as HTMLElement | null;
      let buttonElement: HTMLElement | null = null;
      let isButton = false;
      
      while (target && target !== document.body) {
        // Ignore clicks inside the auth popup
        if (target.id === 'auth-popup-modal') {
          return;
        }
        if (target.tagName.toLowerCase() === 'button' || target.getAttribute('role') === 'button') {
          isButton = true;
          buttonElement = target;
          // Don't break here, we need to check if it's inside the auth popup
        }
        target = target.parentElement;
      }

      if (isButton) {
        // Allow the login button itself to be clicked without double-triggering
        if (buttonElement?.innerText?.toLowerCase().includes('login') || buttonElement?.innerText?.toLowerCase().includes('sign')) {
          return;
        }
        
        // Prevent default action and stop propagation
        e.preventDefault();
        e.stopPropagation();
        
        // Show auth popup
        setShowAuthPopup(true);
      }
    };

    // Use capture phase to intercept clicks before they reach the buttons
    document.addEventListener('click', handleGlobalClick, true);
    
    return () => {
      document.removeEventListener('click', handleGlobalClick, true);
    };
  }, [isAuthenticated, setShowAuthPopup]);

  return (
    <>
      {children}
      <AuthPopup />
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <GlobalAuthHandler>
        <Editor />
      </GlobalAuthHandler>
    </AuthProvider>
  );
}

export default App;
