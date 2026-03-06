import Dashboard from './pages/Dashboard';
import PatientManagement from './pages/PatientManagement';
import LiveRecording from './pages/LiveRecording';
import Statistics from './pages/Statistics';
import DeviceConsole from './pages/DeviceConsole';
import Settings from './pages/Settings';
import { Routes, Route } from 'react-router-dom';
import Shell from './components/layout/Shell';

function App() {
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

export default App;
