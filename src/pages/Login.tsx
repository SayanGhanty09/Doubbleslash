import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, LogIn, UserPlus, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const Login: React.FC = () => {
  const { login, signup, loading: authLoading } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      if (mode === 'login') {
        if (!email.trim() || !password.trim()) {
          setError('Please fill in all fields');
          setIsSubmitting(false);
          return;
        }
        const err = await login(email.trim(), password);
        if (err) setError(err);
      } else {
        if (!name.trim() || !email.trim() || !password.trim()) {
          setError('Please fill in all required fields');
          setIsSubmitting(false);
          return;
        }
        if (password.length < 6) {
          setError('Password must be at least 6 characters');
          setIsSubmitting(false);
          return;
        }
        const err = await signup(name.trim(), email.trim(), specialty.trim() || 'General', password);
        if (err) setError(err);
        else {
          setName('');
          setEmail('');
          setPassword('');
          setSpecialty('');
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLoading = isSubmitting || authLoading;

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #0a0c12 0%, #0d1117 50%, #0a0c12 100%)',
      fontFamily: 'inherit',
      padding: 20,
    }}>
      {/* Ambient glow */}
      <div style={{
        position: 'fixed', top: '30%', left: '50%', transform: 'translate(-50%, -50%)',
        width: 600, height: 600, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(0,210,255,0.08) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        style={{
          width: 420, maxWidth: '100%',
          borderRadius: 24,
          border: '1px solid rgba(255,255,255,0.06)',
          background: 'rgba(15, 17, 25, 0.85)',
          backdropFilter: 'blur(20px)',
          padding: '48px 36px 36px',
          boxShadow: '0 25px 60px rgba(0,0,0,0.5), 0 0 80px rgba(0,210,255,0.05)',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 8 }}>
          <div style={{
            width: 44, height: 44, background: 'var(--primary-color, #00d2ff)', borderRadius: 12,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 0 rgba(0,150,200,1), 0 8px 20px rgba(0,210,255,0.3)',
          }}>
            <Activity size={24} color="black" />
          </div>
          <span style={{ fontSize: '1.8rem', fontWeight: 800, letterSpacing: '-1px', color: '#fff' }}>
            Anebilin<span style={{ color: 'var(--primary-color, #00d2ff)' }}>.</span>
          </span>
        </div>
        <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', marginBottom: 36 }}>
          Non-invasive biomarker screening
        </p>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 28, background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 4 }}>
          {(['login', 'signup'] as const).map(m => (
            <button
              key={m}
              onClick={() => {
                setMode(m);
                setError('');
              }}
              disabled={isLoading}
              style={{
                flex: 1, padding: '10px 0', borderRadius: 10, border: 'none',
                background: mode === m ? 'rgba(0,210,255,0.12)' : 'transparent',
                color: mode === m ? '#00d2ff' : 'rgba(255,255,255,0.4)',
                fontWeight: 600, fontSize: '0.9rem', cursor: isLoading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s', fontFamily: 'inherit',
                opacity: isLoading ? 0.6 : 1,
              }}
            >
              {m === 'login' ? 'Sign In' : 'Sign Up'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {mode === 'signup' && (
            <>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginBottom: 6, fontWeight: 500 }}>
                  Full Name *
                </label>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Dr. Jane Smith"
                  disabled={isLoading}
                  style={{
                    width: '100%', padding: '12px 16px', borderRadius: 10,
                    border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(0,0,0,0.3)',
                    color: '#fff', outline: 'none', fontSize: '0.95rem', fontFamily: 'inherit',
                    boxSizing: 'border-box',
                    opacity: isLoading ? 0.6 : 1,
                    cursor: isLoading ? 'not-allowed' : 'text',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginBottom: 6, fontWeight: 500 }}>
                  Specialty
                </label>
                <input
                  value={specialty}
                  onChange={e => setSpecialty(e.target.value)}
                  placeholder="Cardiologist, General Physician..."
                  disabled={isLoading}
                  style={{
                    width: '100%', padding: '12px 16px', borderRadius: 10,
                    border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(0,0,0,0.3)',
                    color: '#fff', outline: 'none', fontSize: '0.95rem', fontFamily: 'inherit',
                    boxSizing: 'border-box',
                    opacity: isLoading ? 0.6 : 1,
                    cursor: isLoading ? 'not-allowed' : 'text',
                  }}
                />
              </div>
            </>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginBottom: 6, fontWeight: 500 }}>
              Email *
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="doctor@clinic.com"
              disabled={isLoading}
              style={{
                width: '100%', padding: '12px 16px', borderRadius: 10,
                border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(0,0,0,0.3)',
                color: '#fff', outline: 'none', fontSize: '0.95rem', fontFamily: 'inherit',
                boxSizing: 'border-box',
                opacity: isLoading ? 0.6 : 1,
                cursor: isLoading ? 'not-allowed' : 'text',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginBottom: 6, fontWeight: 500 }}>
              Password *
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={isLoading}
                style={{
                  width: '100%', padding: '12px 44px 12px 16px', borderRadius: 10,
                  border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(0,0,0,0.3)',
                  color: '#fff', outline: 'none', fontSize: '0.95rem', fontFamily: 'inherit',
                  boxSizing: 'border-box',
                  opacity: isLoading ? 0.6 : 1,
                  cursor: isLoading ? 'not-allowed' : 'text',
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading}
                style={{
                  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: isLoading ? 'not-allowed' : 'pointer',
                  color: 'rgba(255,255,255,0.3)', padding: 0, display: 'flex',
                  opacity: isLoading ? 0.6 : 1,
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {error && (
            <div style={{
              padding: '10px 14px', borderRadius: 10,
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
              color: '#ef4444', fontSize: '0.85rem',
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            style={{
              padding: '14px', borderRadius: 12, border: 'none',
              background: isLoading ? 'rgba(0,210,255,0.3)' : 'linear-gradient(135deg, #00d2ff, #0096c8)',
              color: '#000', fontWeight: 700, fontSize: '1rem',
              cursor: isLoading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: 10, marginTop: 8,
              boxShadow: '0 4px 0 rgba(0,100,150,1), 0 8px 20px rgba(0,210,255,0.25)',
              fontFamily: 'inherit',
              transition: 'transform 0.1s, box-shadow 0.1s',
              opacity: isLoading ? 0.7 : 1,
            }}
            onMouseDown={e => {
              if (!isLoading) {
                e.currentTarget.style.transform = 'translateY(2px)';
                e.currentTarget.style.boxShadow = '0 2px 0 rgba(0,100,150,1), 0 4px 10px rgba(0,210,255,0.25)';
              }
            }}
            onMouseUp={e => {
              e.currentTarget.style.transform = '';
              e.currentTarget.style.boxShadow = '';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = '';
              e.currentTarget.style.boxShadow = '';
            }}
          >
            {isLoading ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                {mode === 'login' ? 'Signing In...' : 'Creating Account...'}
              </>
            ) : (
              <>
                {mode === 'login' ? <LogIn size={20} /> : <UserPlus size={20} />}
                {mode === 'login' ? 'Sign In' : 'Create Account'}
              </>
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
};

export default Login;
