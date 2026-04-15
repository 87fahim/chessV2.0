import React, { useState } from 'react';
import '../styles/LeftNavBar.css';

export interface NavItem {
  id: string;
  label: string;
}

interface LeftNavBarProps {
  items: NavItem[];
  selectedItemId: string | null;
  onSelectItem: (itemId: string) => void;
}

export const LeftNavBar: React.FC<LeftNavBarProps> = ({
  items,
  selectedItemId,
  onSelectItem,
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleSelectItem = (itemId: string) => {
    onSelectItem(itemId);
    // Close mobile menu after selecting an item
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      {/* Mobile hamburger button - only visible on small screens */}
      <button 
        className="mobile-menu-toggle" 
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        title="Toggle menu"
      >
        <span></span>
        <span></span>
        <span></span>
      </button>

      {/* Overlay for mobile menu */}
      {isMobileMenuOpen && (
        <div 
          className="mobile-menu-overlay" 
          onClick={() => setIsMobileMenuOpen(false)}
        ></div>
      )}

      {/* Navigation Bar */}
      <nav className={`left-nav-bar ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
        <ul className="nav-items">
          {items.map((item) => (
            <li key={item.id}>
              <button
                className={`nav-item ${selectedItemId === item.id ? 'active' : ''}`}
                onClick={() => handleSelectItem(item.id)}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
};
