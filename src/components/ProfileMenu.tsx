import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import styled from '@emotion/styled';
import { SettingsPopup } from './SettingsPopup';

const ProfileContainer = styled.div`
  position: relative;
  display: inline-block;
`;

const ProfileButton = styled.button`
  display: flex;
  align-items: center;
  color: #fff;
  line-height: 1;
  background: rgb(255 255 255 / 7%);
  padding: 8px 16px;
  border-radius: 4px;
  border: 1px solid hsla(0,0%,100%,.4);
  cursor: pointer;
  &:hover {
    background: rgb(255 255 255 / 15%);
  }
`;

const DropdownMenu = styled.div`
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 8px;
  background: white;
  border-radius: 4px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  min-width: 150px;
  z-index: 1000;
  overflow: hidden;
`;

const MenuItem = styled.button`
  display: block;
  width: 100%;
  padding: 12px 16px;
  text-align: left;
  background: none;
  border: none;
  color: #333;
  font-size: 14px;
  cursor: pointer;
  &:hover {
    background: #f5f5f5;
  }
`;

export const ProfileMenu = () => {
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!user) return null;

  return (
    <>
      <ProfileContainer ref={containerRef}>
        <ProfileButton onClick={() => setIsOpen(!isOpen)}>
          <span css={{ marginRight: 4, marginLeft: 4 }}>Profile</span>
        </ProfileButton>
        {isOpen && (
          <DropdownMenu>
            <MenuItem onClick={() => {
              setIsOpen(false);
              setShowSettings(true);
            }}>
              Settings
            </MenuItem>
            <MenuItem onClick={() => {
              setIsOpen(false);
              logout();
            }}>
              Log out
            </MenuItem>
          </DropdownMenu>
        )}
      </ProfileContainer>
      {showSettings && <SettingsPopup onClose={() => setShowSettings(false)} />}
    </>
  );
};
