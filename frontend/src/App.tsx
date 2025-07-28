import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';
import { Toaster } from 'sonner';
import Layout from './components/layout/Layout';
import Dashboard from './components/pages/Dashboard';
import Leaderboards from './components/pages/Leaderboards';
import Profile from './components/pages/Profile';
import Teams from './components/pages/Teams';
import About from './components/pages/About';
import ImportData from './components/pages/ImportData';
import { Login } from './components/auth/Login';
import { ProtectedRoute } from './components/auth/ProtectedRoute';

function App() {
  return (
    <ThemeProvider defaultTheme="dark">
      <Router>
        <AuthProvider>
          <Toaster 
            position="top-right" 
            toastOptions={{
              style: {
                background: 'var(--color-bg)',
                color: 'var(--color-text)',
                border: '1px solid var(--color-border)',
              },
            }}
          />
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            
            {/* Routes with layout */}
            <Route element={<Layout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/leaderboards" element={<Leaderboards />} />
              <Route path="/about" element={<About />} />
              
              {/* Protected routes */}
              <Route
                path="/profile"
                element={
                  <ProtectedRoute requireProfile>
                    <Profile />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/teams"
                element={
                  <ProtectedRoute requireProfile>
                    <Teams />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/import"
                element={
                  <ProtectedRoute requireProfile>
                    <ImportData />
                  </ProtectedRoute>
                }
              />
            </Route>
          </Routes>
        </AuthProvider>
      </Router>
    </ThemeProvider>
  );
}

export default App
