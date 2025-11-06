import React from 'react';
import BurgerMenu from '../UI/BurgerMenu';

const Sidebar = ({ isOpen, onClose, userProfile }) => {
  return (
    <BurgerMenu 
      isOpen={isOpen} 
      onClose={onClose} 
      userProfile={userProfile} 
    />
  );
};

export default Sidebar;