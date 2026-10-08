import { createContext, useContext } from 'react';

export const DRAWER_WIDTH = 260;

interface AppChromeValue {
  sidebarOpen: boolean;
}

const AppChromeContext = createContext<AppChromeValue>({ sidebarOpen: false });

export function useAppChrome(): AppChromeValue {
  return useContext(AppChromeContext);
}

export const AppChromeProvider = AppChromeContext.Provider;
