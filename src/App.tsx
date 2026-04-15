import { useEffect } from 'react';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './app/store';
import theme from './styles/theme';
import AppRoutes from './routes';
import { fetchMe, enterGuestMode } from './features/auth/authSlice';
import { fetchSettings } from './features/settings/settingsSlice';

function AuthBootstrap() {
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      store.dispatch(fetchMe()).then((action) => {
        if (action.meta.requestStatus === 'fulfilled') {
          store.dispatch(fetchSettings());
        }
      });
    } else {
      store.dispatch(enterGuestMode());
    }
  }, []);
  return null;
}

function App() {
  return (
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <BrowserRouter>
          <AuthBootstrap />
          <AppRoutes />
        </BrowserRouter>
      </ThemeProvider>
    </Provider>
  );
}

export default App;
