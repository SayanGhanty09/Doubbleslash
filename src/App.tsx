import Dashboard from './pages/Dashboard';
import PatientManagement from './pages/PatientManagement';
import LiveRecording from './pages/LiveRecording';
import Statistics from './pages/Statistics';
import DeviceConsole from './pages/DeviceConsole';
import Settings from './pages/Settings';
import Login from './pages/Login';
import { Routes, Route } from 'react-router-dom';
import Shell from './components/layout/Shell';
import { AuthProvider, useAuth } from './contexts/AuthContext';

function AppRoutes() {
  const { doctor } = useAuth();

  if (!doctor) {
    return <Login />;
  }

  return (
    <Routes>
      <Route path="/" element={<Shell />}>
        <Route index element={<Dashboard />} />
        <Route path="live" element={<LiveRecording />} />
        <Route path="patients" element={<PatientManagement />} />
        <Route path="stats" element={<Statistics />} />
        <Route path="console" element={<DeviceConsole />} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}

export default App;
