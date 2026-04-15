import React from 'react';
import '../styles/MainContent.css';

export interface ContentItem {
  id: string;
  label: string;
  description: string;
  icon?: string;
}

interface MainContentProps {
  selectedItem: ContentItem | null;
  isLoading?: boolean;
}

export const MainContent: React.FC<MainContentProps> = ({
  selectedItem,
  isLoading = false,
}) => {
  // Content configuration for each menu item
  const contentConfig: Record<string, ContentItem> = {
    'vs-computer': {
      id: 'vs-computer',
      label: 'VS Computer',
      description: 'Challenge the computer in a chess match',
      icon: '🤖',
    },
    'next-best-move': {
      id: 'next-best-move',
      label: 'Next Best Move',
      description: 'Get suggestions for your next move',
      icon: '💡',
    },
    'practice': {
      id: 'practice',
      label: 'Practice',
      description: 'Practice your chess skills with puzzles and scenarios',
      icon: '📚',
    },
    'settings': {
      id: 'settings',
      label: 'Settings',
      description: 'Configure your preferences and game settings',
      icon: '⚙️',
    },
  };

  const content = selectedItem || Object.values(contentConfig)[0];

  const renderContent = () => {
    switch (content.id) {
      case 'vs-computer':
        return (
          <div className="content-section">
            <h2>🤖 VS Computer</h2>
            <p>Play a chess game against the AI opponent.</p>
            <div className="board-placeholder">
              <p>Chess Board Here</p>
            </div>
            <div className="game-controls">
              <button className="btn-primary">Start New Game</button>
              <button className="btn-secondary">Load Game</button>
            </div>
          </div>
        );

      case 'next-best-move':
        return (
          <div className="content-section">
            <h2>💡 Next Best Move</h2>
            <p>Get AI recommendations for your next move.</p>
            <div className="suggestion-box">
              <p>Recommended Move: Nf3</p>
              <p>Analysis: Strong development move</p>
            </div>
            <div className="game-controls">
              <button className="btn-primary">Analyze Position</button>
              <button className="btn-secondary">Show Variations</button>
            </div>
          </div>
        );

      case 'practice':
        return (
          <div className="content-section">
            <h2>📚 Practice</h2>
            <p>Improve your skills with targeted puzzles.</p>
            <div className="practice-options">
              <div className="option-card">
                <h3>Tactics Puzzles</h3>
                <p>5 puzzles available</p>
              </div>
              <div className="option-card">
                <h3>Openings</h3>
                <p>10 openings available</p>
              </div>
              <div className="option-card">
                <h3>Endgames</h3>
                <p>7 endgames available</p>
              </div>
            </div>
          </div>
        );

      case 'settings':
        return (
          <div className="content-section">
            <h2>⚙️ Settings</h2>
            <div className="settings-group">
              <label>
                <input type="checkbox" defaultChecked /> Enable Sound
              </label>
              <label>
                <input type="checkbox" defaultChecked /> Show Hints
              </label>
              <label>
                <input type="checkbox" /> Dark Mode
              </label>
            </div>
            <div className="settings-group">
              <label>
                Difficulty Level:
                <select>
                  <option>Easy</option>
                  <option selected>Medium</option>
                  <option>Hard</option>
                </select>
              </label>
            </div>
            <button className="btn-primary">Save Settings</button>
          </div>
        );

      default:
        return (
          <div className="content-section">
            <h2>Welcome to Chess V2.0</h2>
            <p>Select an item from the menu to get started.</p>
          </div>
        );
    }
  };

  return (
    <main className="main-content">
      {isLoading ? (
        <div className="loading">
          <p>Loading...</p>
        </div>
      ) : (
        renderContent()
      )}
    </main>
  );
};
