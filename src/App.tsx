import Editor from './Editor';
import React from 'react';
import { AuthProvider } from './contexts/AuthContext';
import { GlobalClickInterceptor } from './components/auth/GlobalClickInterceptor';

function App() {
  return (
    <AuthProvider>
      <GlobalClickInterceptor />
      <Editor />
    </AuthProvider>
  );
}

export default App;
