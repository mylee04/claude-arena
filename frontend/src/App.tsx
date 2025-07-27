import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import Layout from './components/layout/Layout';
import Dashboard from './components/pages/Dashboard';
import Leaderboards from './components/pages/Leaderboards';
import Profile from './components/pages/Profile';
import Teams from './components/pages/Teams';
import About from './components/pages/About';

function App() {
  return (
    <ThemeProvider defaultTheme="dark">
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/leaderboards" element={<Leaderboards />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/teams" element={<Teams />} />
            <Route path="/about" element={<About />} />
          </Routes>
        </Layout>
      </Router>
    </ThemeProvider>
  );
}

export default App
