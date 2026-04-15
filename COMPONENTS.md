# Chess V2.0 - Reusable React Components

## Overview
This project contains reusable React components for a Chess application with a left navigation bar and dynamic main content area.

## Components

### 1. LeftNavBar Component
**File:** `src/components/LeftNavBar.tsx`

A fully functional navigation sidebar that allows users to view menu items and add new items.

#### Props:
```typescript
interface LeftNavBarProps {
  items: NavItem[];                    // Array of navigation items
  selectedItemId: string | null;      // ID of the currently selected item
  onSelectItem: (itemId: string) => void;  // Callback when item is selected
  onAddItem?: (label: string) => void;     // Callback when new item is added
}

interface NavItem {
  id: string;      // Unique identifier
  label: string;   // Display label
}
```

#### Features:
- Display list of navigation items
- Highlight active/selected item
- Add new items through an inline input form
- Press Enter to confirm, Escape to cancel
- Smooth animations and hover effects
- Fixed sidebar design with scrollable content
- Responsive design for mobile devices

#### Styling:
- File: `src/styles/LeftNavBar.css`
- Dark gradient background (#2c3e50 to #34495e)
- Active item highlight with blue accent (#3498db)
- Smooth transitions and hover effects

---

### 2. MainContent Component
**File:** `src/components/MainContent.tsx`

Displays the main content area based on the selected navigation item.

#### Props:
```typescript
interface MainContentProps {
  selectedItem: ContentItem | null;  // Current selected content
  isLoading?: boolean;               // Loading state
}

interface ContentItem {
  id: string;
  label: string;
  description: string;
  icon?: string;
}
```

#### Features:
- Dynamic content rendering based on selected item
- Built-in content for 4 main sections:
  - **VS Computer**: Play chess against AI
  - **Next Best Move**: Get move suggestions
  - **Practice**: Tackle puzzles and scenarios
  - **Settings**: Configure preferences
- Loading state with spinner
- Responsive card layouts
- Interactive buttons and controls
- Practice options displayed in responsive grid

#### Styling:
- File: `src/styles/MainContent.css`
- Light background with card-based layout
- Blue accent colors for buttons
- Responsive design with grid layout
- Mobile-friendly adjustments

---

### 3. App Component
**File:** `src/App.tsx`

Main application component that orchestrates the navigation and content components.

#### Features:
- State management for navigation items and selected item
- Default navigation items initialization
- Content mapping for dynamic content
- Item selection with loading effect (300ms delay)
- Add new items with automatic ID generation
- Duplicate item prevention
- Automatic selection of newly added items

#### Usage:
```typescript
import App from './App';

// App manages all state and passes it to child components
// Simply render <App /> and it handles everything
```

---

## File Structure
```
src/
├── components/
│   ├── LeftNavBar.tsx       # Navigation component
│   └── MainContent.tsx      # Content display component
├── styles/
│   ├── LeftNavBar.css       # Navigation styling
│   └── MainContent.css      # Content styling
├── App.tsx                  # Main app component
├── App.css                  # App layout styles
├── main.tsx                 # Entry point
└── index.css                # Global styles
```

---

## How to Use

### Basic Usage
```typescript
import React from 'react';
import App from './App';

// Simply render the App component
function Root() {
  return <App />;
}

export default Root;
```

### Customizing Navigation Items
Edit the `defaultNavItems` in `App.tsx`:
```typescript
const defaultNavItems: NavItem[] = [
  { id: 'item-1', label: 'Item 1' },
  { id: 'item-2', label: 'Item 2' },
  { id: 'item-3', label: 'Item 3' },
];
```

### Adding Custom Content
Extend the `contentMapping` in `App.tsx`:
```typescript
const contentMapping: Record<string, ContentItem> = {
  'custom-item': {
    id: 'custom-item',
    label: 'Custom Item',
    description: 'Description here',
  },
  // Add your custom content here
};
```

### Styling Customization
- Modify `src/styles/LeftNavBar.css` for navigation styling
- Modify `src/styles/MainContent.css` for content styling
- Update color variables in `src/index.css` for global theme changes

---

## Features

### ✅ Implemented
- Reusable component architecture
- Navigation with item selection
- Add new items dynamically
- Content synchronization
- Loading state handling
- Responsive design
- TypeScript support
- CSS animations and transitions
- Default chess app sections
- Interactive buttons and forms

### 🎨 Styling Highlights
- Modern gradient backgrounds
- Smooth hover effects
- Active state indicators
- Mobile-responsive layouts
- Consistent color scheme
- Professional UI/UX

---

## Running the Project

### Development
```bash
npm run dev
```
App will be available at http://localhost:5173

### Build for Production
```bash
npm run build
```

### Preview Production Build
```bash
npm run preview
```

---

## Component Communication

The App component manages all state and acts as a parent to both LeftNavBar and MainContent:

```
App Component (State Manager)
├── LeftNavBar (Receives: items, selectedItemId, callbacks)
│   └── Emits: onSelectItem(), onAddItem()
│
├── MainContent (Receives: selectedItem, isLoading)
│   └── Displays content based on props
```

### Data Flow:
1. User clicks item in LeftNavBar
2. `onSelectItem()` callback fired
3. App updates `selectedItemId` state
4. MainContent receives updated `selectedItem` prop
5. Content re-renders with new data

---

## Extensibility

This component structure is highly extensible:

- **Add new content sections**: Add items to `contentMapping`
- **Custom styling**: Extend CSS files or create new ones
- **Additional callbacks**: Add more event handlers to components
- **Custom content components**: Create component-specific renders in MainContent
- **State persistence**: Add localStorage integration to persist navigation items
- **API integration**: Replace hardcoded content with API calls

---

## Browser Support
- Modern browsers (Chrome, Firefox, Safari, Edge)
- React 18+
- TypeScript 5+
- Vite 8+

---

## License
MIT
