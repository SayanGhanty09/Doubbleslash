import React, { createContext, useContext, useState } from 'react';
import {
  Activity,
  Users,
  LayoutDashboard,
  History,
  Cpu,
  Settings as SettingsIcon,
  LogOut,
  Bluetooth,
  BluetoothOff,
  User
} from 'lucide-react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import StarBackground from '../visuals/StarBackground';
import SplineBackground from '../visuals/SplineBackground';

import { BLEProvider, useBLE, BLEStatus } from '../../contexts/BLEContext';

// Mock Patient Context
const PatientContext = createContext<{
  activePatient: string | null;
  setActivePatient: (name: string | null) => void;
}>({
  activePatient: null,
  setActivePatient: () => { },
});

export const usePatient = () => useContext(PatientContext);

const SidebarItem: React.FC<{ item: any, index: number }> = ({ item, index }) => {
  const location = useLocation();
  const isActive = location.pathname === item.path;

  return (
    <NavLink
      to={item.path}
      style={{ textDecoration: 'none' }}
    >
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.1, duration: 0.4 }}
        whileHover={{ y: isActive ? 2 : -2, scale: 1.02 }}
        whileTap={{ y: 2, scale: 0.98 }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '14px 20px',
          borderRadius: '16px',
          margin: '8px 0',
          position: 'relative',
          background: isActive ? 'var(--primary-color)' : 'rgba(255,255,255,0.02)',
          color: isActive ? '#000' : 'var(--text-secondary)',
          fontWeight: isActive ? 700 : 500,
          transition: 'background 0.3s cubic-bezier(0.4, 0, 0.2, 1), color 0.3s ease',
          boxShadow: isActive
            ? 'inset 0 2px 4px rgba(255,255,255,0.3), 0 2px 0px rgba(0, 150, 200, 1), 0 4px 10px rgba(0, 210, 255, 0.3)'
            : '0 4px 0px rgba(0,0,0,0.3), 0 8px 15px rgba(0,0,0,0.2)',
          border: isActive ? 'none' : '1px solid rgba(255,255,255,0.05)',
          transform: isActive ? 'translateY(2px)' : 'translateY(0)',
          cursor: 'pointer'
        }}
      >
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: '12px' }}>
          <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} />
          <span>{item.label}</span>
        </div>
      </motion.div>
    </NavLink>
  );
};

const ShellContent: React.FC = () => {
  const [activePatient, setActivePatient] = useState<string | null>("John Doe");
  const { status } = useBLE();

  const isConnected = status === BLEStatus.CONNECTED ||
    status === BLEStatus.SCANNING_40HZ ||
    status === BLEStatus.SCANNING_200HZ ||
    status === BLEStatus.FINISHED;

  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
    { icon: Activity, label: 'Live Recording', path: '/live' },
    { icon: Users, label: 'Patient Management', path: '/patients' },
    { icon: History, label: 'Statistics & History', path: '/stats' },
    { icon: Cpu, label: 'Device Console', path: '/console' },
    { icon: SettingsIcon, label: 'Settings', path: '/settings' },
  ];

  return (
    <PatientContext.Provider value={{ activePatient, setActivePatient }}>
      <StarBackground />
      <SplineBackground />
      <div style={{ display: 'flex', minHeight: '100vh', width: '100vw', background: 'transparent', position: 'relative', zIndex: 1 }}>
        {/* Sidebar */}
        <nav className="glass" style={{
          width: 'var(--sidebar-width)',
          height: '100vh',
          position: 'fixed',
          padding: '24px 16px',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 100,
          background: 'rgba(10, 12, 18, 0.8)',
          borderRight: '1px solid var(--border-color)'
        }}>
          <div style={{ padding: '0 12px 32px 12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <motion.div
              whileHover={{ rotate: 180 }}
              style={{
                width: 36,
                height: 36,
                background: 'var(--primary-color)',
                borderRadius: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 0 #0096c8, 0 8px 15px var(--primary-glow)'
              }}>
              <Activity size={20} color="black" />
            </motion.div>
            <span style={{ fontSize: '1.4rem', fontWeight: 800, letterSpacing: '-1px' }}>
              Anebilin<span style={{ color: 'var(--primary-color)' }}>.</span>
            </span>
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {menuItems.map((item, index) => (
              <SidebarItem key={item.path} item={item} index={index} />
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.5 }}
            style={{ marginTop: 'auto', padding: '16px', borderRadius: '24px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '12px' }}
          >
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--surface-lighter)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 5px rgba(0,0,0,0.2)' }}>
              <User size={20} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>Dr. Harrison</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '1px' }}>Cardiologist</div>
            </div>
            <LogOut size={18} style={{ color: 'var(--text-tertiary)', cursor: 'pointer' }} />
          </motion.div>
        </nav>

        {/* Content Area */}
        <main style={{
          marginLeft: 'var(--sidebar-width)',
          flex: 1,
          display: 'flex',
          flexDirection: 'column'
        }}>
          {/* Top Bar */}
          <header className="glass" style={{
            height: 'var(--topbar-height)',
            padding: '0 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'sticky',
            top: 0,
            zIndex: 90,
            background: 'rgba(5, 6, 10, 0.7)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '1px' }}>Active Patient</span>
                <span style={{ fontWeight: 600, color: activePatient ? 'var(--text-primary)' : 'var(--error-color)' }}>
                  {activePatient || "None Selected"}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                borderRadius: '20px',
                background: 'rgba(255,255,255,0.03)',
                fontSize: '0.875rem',
                border: '1px solid var(--border-color)',
                boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
              }}>
                {isConnected ? <Bluetooth size={16} color="var(--success-color)" /> : <BluetoothOff size={16} color="var(--error-color)" />}
                <span style={{ textTransform: 'capitalize', color: isConnected ? 'var(--success-color)' : 'var(--error-color)', fontWeight: 600 }}>
                  {isConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
              <div style={{ width: 1, height: 24, background: 'var(--border-color)' }}></div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </header>

          {/* Page Content */}
          <section style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
            <AnimatePresence mode="wait">
              <Outlet />
            </AnimatePresence>
          </section>
        </main>
      </div>
    </PatientContext.Provider>
  );
};

const Shell: React.FC = () => {
  return (
    <BLEProvider>
      <ShellContent />
    </BLEProvider>
  );
};

export default Shell;
