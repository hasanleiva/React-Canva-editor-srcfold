import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import styled from '@emotion/styled';

const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
`;

const Modal = styled.div`
  background: white;
  padding: 32px;
  border-radius: 8px;
  width: 400px;
  max-width: 90%;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  position: relative;
`;

const CloseButton = styled.button`
  position: absolute;
  top: 16px;
  right: 16px;
  background: transparent;
  border: none;
  font-size: 20px;
  cursor: pointer;
  color: #666;
`;

const Title = styled.h2`
  margin-top: 0;
  margin-bottom: 24px;
  color: #333;
`;

const Input = styled.input`
  width: 100%;
  padding: 12px;
  margin-bottom: 16px;
  border: 1px solid #ccc;
  border-radius: 4px;
  box-sizing: border-box;
`;

const Button = styled.button`
  width: 100%;
  padding: 12px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 16px;
  cursor: pointer;
  &:hover {
    background: #0056b3;
  }
`;

const ToggleText = styled.p`
  text-align: center;
  margin-top: 16px;
  color: #666;
  cursor: pointer;
  &:hover {
    text-decoration: underline;
  }
`;

const ErrorText = styled.p`
  color: red;
  margin-bottom: 16px;
  font-size: 14px;
`;

export const AuthPopup = () => {
  const { showAuthPopup, setShowAuthPopup, login, signup } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  if (!showAuthPopup) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await signup(email, password);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <Overlay onClick={() => setShowAuthPopup(false)}>
      <Modal id="auth-popup-modal" onClick={e => e.stopPropagation()}>
        <CloseButton onClick={() => setShowAuthPopup(false)}>&times;</CloseButton>
        <Title>{isLogin ? 'Sign In' : 'Sign Up'}</Title>
        <form onSubmit={handleSubmit}>
          <Input 
            type="email" 
            placeholder="Email" 
            value={email} 
            onChange={e => setEmail(e.target.value)} 
            required 
          />
          <Input 
            type="password" 
            placeholder="Password" 
            value={password} 
            onChange={e => setPassword(e.target.value)} 
            required 
          />
          {error && <ErrorText>{error}</ErrorText>}
          <Button type="submit">{isLogin ? 'Sign In' : 'Sign Up'}</Button>
        </form>
        <ToggleText onClick={() => setIsLogin(!isLogin)}>
          {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
        </ToggleText>
      </Modal>
    </Overlay>
  );
};
