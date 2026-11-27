import { FormEvent, useState } from 'react';
import { DatabaseZap, LockKeyhole, ShieldCheck, Mail, KeyRound, UserPlus, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { login, registerRequest, verifyOtp, createPassword } from '../services/api';

type AuthMode = 'SIGN_IN' | 'REGISTER_EMAIL' | 'VERIFY_OTP' | 'CREATE_PASSWORD';

export default function Login({ onAuthenticated }: { onAuthenticated: () => void }) {
  const [mode, setMode] = useState<AuthMode>('SIGN_IN');
  const [otpPurpose, setOtpPurpose] = useState<'register' | 'reset'>('register');
  const [username, setUsername] = useState('vtabpublicuser@gmail.com');
  const [password, setPassword] = useState('Demo@12345');
  const [regEmail, setRegEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [resetPopupOpen, setResetPopupOpen] = useState(false);

  // 1. Submit existing user login
  async function submitLogin(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setSuccessMsg('');
    try {
      const res = await login(username, password);
      sessionStorage.setItem('t2pbi_authenticated', 'true');
      sessionStorage.setItem('t2pbi_user_email', username.trim().toLowerCase());
      if (res.token) {
        sessionStorage.setItem('t2pbi_token', res.token);
      }
      sessionStorage.setItem('t2pbi_can_demo', res.can_use_demo_flow ? 'true' : 'false');
      onAuthenticated();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  // 2. Request 6-digit OTP via Brevo
  async function submitRegisterRequest(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setSuccessMsg('');
    try {
      const res = await registerRequest(regEmail);
      setSuccessMsg(res.message || '6-digit OTP sent to your email.');
      setMode('VERIFY_OTP');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  // 3. Verify OTP
  async function submitVerifyOtp(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setSuccessMsg('');
    try {
      const res = await verifyOtp(regEmail, otp);
      setSuccessMsg(res.message || 'OTP verified! Now create your password.');
      setMode('CREATE_PASSWORD');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  // 4. Create Password and automatically login
  async function submitCreatePassword(e: FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }
    if (newPassword.length < 4) {
      setError('Password must be at least 4 characters long.');
      return;
    }

    setBusy(true);
    setError('');
    setSuccessMsg('');
    try {
      const res = (await createPassword(regEmail, otp, newPassword)) as {
        authenticated: boolean;
        display_name: string;
        role: string;
        message: string;
        token?: string;
        can_use_demo_flow?: boolean;
      };
      sessionStorage.setItem('t2pbi_authenticated', 'true');
      sessionStorage.setItem('t2pbi_user_email', regEmail.trim().toLowerCase());
      if (res.token) {
        sessionStorage.setItem('t2pbi_token', res.token);
      }
      sessionStorage.setItem('t2pbi_can_demo', res.can_use_demo_flow ? 'true' : 'false');
      setResetPopupOpen(true);
      setTimeout(() => {
        onAuthenticated();
      }, 1800);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="loginShell">
      <div className="loginBrandPanel">
        <div className="loginBrand">
          <DatabaseZap size={38} />
          <div>
            <b>TABLEAU2PBI</b>
            <span>Enterprise Migration Workbench</span>
          </div>
        </div>
        <h1>Convert Tableau logic into a governed Power BI solution.</h1>
        <p>
          Inventory files, recover source lineage, validate joins and datatypes, generate M and DAX, review the semantic
          model, and export safely.
        </p>
        <div className="loginFeature">
          <ShieldCheck /> Safe Openable Mode is enabled by default.
        </div>
      </div>

      {/* --- 1. SIGN IN FORM --- */}
      {mode === 'SIGN_IN' && (
        <form className="loginCard" onSubmit={submitLogin}>
          <div className="loginIcon">
            <LockKeyhole />
          </div>
          <h2>Secure workspace login</h2>
          <p className="muted" style={{ margin: '4px 0 16px' }}>
            Sign in with your registered account credentials.
          </p>

          {error && <div className="error" style={{ marginBottom: 12 }}>{error}</div>}
          {successMsg && <div className="success" style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6, color: '#0f8f55', background: '#e6f7ef', padding: '8px 12px', borderRadius: 8 }}><CheckCircle2 size={16}/> {successMsg}</div>}

          <label>
            Email / Username
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              required
            />
          </label>
          <label style={{ marginTop: 12 }}>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </label>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 6 }}>
            <button
              type="button"
              onClick={() => {
                setOtpPurpose('reset');
                setRegEmail(username && username !== 'vtabpublicuser@gmail.com' ? username : '');
                setOtp('');
                setNewPassword('');
                setConfirmPassword('');
                setMode('REGISTER_EMAIL');
                setError('');
                setSuccessMsg('');
              }}
              style={{
                background: 'transparent',
                border: 'none',
                boxShadow: 'none',
                color: '#1952a1',
                fontWeight: 600,
                fontSize: 12,
                cursor: 'pointer',
                padding: '2px 0',
                width: 'auto'
              }}
            >
              Forgot password?
            </button>
          </div>

          <button className="primary loginButton" disabled={busy} type="submit">
            {busy ? 'Signing in...' : 'Sign in to Workbench'}
          </button>

          <div style={{ marginTop: 18, textAlign: 'center' }}>
            <button
              type="button"
              onClick={() => {
                setOtpPurpose('register');
                setRegEmail('');
                setOtp('');
                setNewPassword('');
                setConfirmPassword('');
                setMode('REGISTER_EMAIL');
                setError('');
                setSuccessMsg('');
              }}
              style={{
                background: 'transparent',
                border: 'none',
                boxShadow: 'none',
                color: '#1952a1',
                fontWeight: 600,
                fontSize: 13,
                cursor: 'pointer',
                padding: '6px 12px'
              }}
            >
              <UserPlus size={15} style={{ verticalAlign: 'middle', marginRight: 6 }} />
              Register new user with Email OTP
            </button>
          </div>

          <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid #e2e8f0', textAlign: 'center' }}>
            <a 
              href="/demo" 
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 16px',
                background: '#fef3c7',
                border: '1px solid #fde68a',
                borderRadius: 8,
                color: '#92400e',
                fontWeight: 600,
                fontSize: 12.5,
                textDecoration: 'none'
              }}
            >
              <span>Looking for Demo Version? Direct Access Without Login →</span>
            </a>
          </div>

          <div className="demoWarning" style={{ textAlign: 'center', marginTop: 12 }}>
            Production Version requires registered account credentials or authorized access.
          </div>
        </form>
      )}

      {/* --- 2. REGISTER NEW USER (EMAIL INPUT) --- */}
      {mode === 'REGISTER_EMAIL' && (
        <form className="loginCard" onSubmit={submitRegisterRequest}>
          <div className="loginIcon" style={{ background: '#e0f2fe', color: '#0284c7' }}>
            <Mail />
          </div>
          <h2>{otpPurpose === 'reset' ? 'Reset your password' : 'Register new user'}</h2>
          <p className="muted" style={{ margin: '4px 0 16px' }}>
            {otpPurpose === 'reset'
              ? 'Enter your registered email to receive a 6-digit verification OTP to change your password.'
              : 'Enter your email to receive a 6-digit verification OTP via Brevo.'}
          </p>

          {error && <div className="error" style={{ marginBottom: 14, fontSize: 13, lineHeight: 1.45, padding: '10px 12px', borderRadius: 8 }}>{error}</div>}

          <label>
            Work or Personal Email
            <input
              type="email"
              placeholder="e.g. yourname@company.com"
              value={regEmail}
              onChange={(e) => setRegEmail(e.target.value)}
              required
              autoFocus
            />
          </label>

          <button className="primary loginButton" disabled={busy} type="submit">
            {busy ? 'Sending OTP via Brevo...' : 'Send 6-Digit OTP'}
          </button>

          <div style={{ marginTop: 16, textAlign: 'center' }}>
            <button
              type="button"
              onClick={() => { setMode('SIGN_IN'); setError(''); }}
              style={{
                background: 'transparent',
                border: 'none',
                boxShadow: 'none',
                color: '#64748b',
                fontSize: 13,
                cursor: 'pointer'
              }}
            >
              <ArrowLeft size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
              Back to Sign in
            </button>
          </div>
        </form>
      )}

      {/* --- 3. VERIFY 6-DIGIT OTP --- */}
      {mode === 'VERIFY_OTP' && (
        <form className="loginCard" onSubmit={submitVerifyOtp}>
          <div className="loginIcon" style={{ background: '#fef3c7', color: '#d97706' }}>
            <KeyRound />
          </div>
          <h2>Enter 6-Digit OTP</h2>
          <p className="muted" style={{ margin: '4px 0 16px' }}>
            We sent a verification code to <b>{regEmail}</b>.
          </p>

          {error && <div className="error" style={{ marginBottom: 12 }}>{error}</div>}
          {successMsg && (
            <div style={{ marginBottom: 12, color: '#0f8f55', background: '#e6f7ef', padding: '8px 12px', borderRadius: 8, fontSize: 13 }}>
              {successMsg}
            </div>
          )}

          <label>
            6-Digit OTP Code
            <input
              type="text"
              maxLength={6}
              placeholder="123456"
              style={{ fontSize: 24, letterSpacing: '0.25em', textAlign: 'center', fontWeight: 700 }}
              value={otp}
              onChange={(e) => setOtp(e.target.value.trim())}
              required
              autoFocus
            />
          </label>

          <button className="primary loginButton" disabled={busy || otp.length < 6} type="submit">
            {busy ? 'Verifying OTP...' : 'Verify OTP & Continue'}
          </button>

          <div style={{ marginTop: 14, display: 'flex', justifyContent: 'space-between' }}>
            <button
              type="button"
              disabled={busy}
              onClick={submitRegisterRequest}
              style={{ background: 'transparent', border: 'none', boxShadow: 'none', color: '#1952a1', fontSize: 12, cursor: 'pointer', width: 'auto' }}
            >
              Resend OTP
            </button>
            <button
              type="button"
              onClick={() => { setMode('SIGN_IN'); setError(''); }}
              style={{ background: 'transparent', border: 'none', boxShadow: 'none', color: '#64748b', fontSize: 12, cursor: 'pointer', width: 'auto' }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* --- 4. CREATE PASSWORD --- */}
      {mode === 'CREATE_PASSWORD' && (
        <form className="loginCard" onSubmit={submitCreatePassword}>
          <div className="loginIcon" style={{ background: '#ecfdf5', color: '#059669' }}>
            <LockKeyhole />
          </div>
          <h2>{otpPurpose === 'reset' ? 'Set new password' : 'Create password'}</h2>
          <p className="muted" style={{ margin: '4px 0 16px' }}>
            {otpPurpose === 'reset'
              ? <>OTP verified! Enter a new password for <b>{regEmail}</b>.</>
              : <>OTP verified! Set a password for future logins with <b>{regEmail}</b>.</>}
          </p>

          {error && <div className="error" style={{ marginBottom: 14, fontSize: 13, lineHeight: 1.45, padding: '10px 12px', borderRadius: 8 }}>{error}</div>}

          <label>
            New Password
            <input
              type="password"
              placeholder="Minimum 4 characters"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              autoFocus
            />
          </label>

          <label style={{ marginTop: 12 }}>
            Confirm Password
            <input
              type="password"
              placeholder="Re-enter password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </label>

          <button className="primary loginButton" disabled={busy} type="submit">
            {busy ? 'Saving & Signing in...' : (otpPurpose === 'reset' ? 'Update Password & Enter Workbench' : 'Set Password & Enter Workbench')}
          </button>
        </form>
      )}

      {resetPopupOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            background: 'rgba(15, 23, 42, 0.55)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: 16,
              padding: '28px 26px',
              maxWidth: 380,
              width: '100%',
              textAlign: 'center',
              boxShadow: '0 24px 48px rgba(15, 23, 42, 0.25)',
              border: '1px solid #e2e8f0',
            }}
          >
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: '999px',
                background: '#dcfce7',
                color: '#16a34a',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 14,
              }}
            >
              <CheckCircle2 size={28} />
            </div>
            <h3 style={{ margin: '0 0 8px', fontSize: 19, fontWeight: 800, color: '#0f172a' }}>
              {otpPurpose === 'reset' ? 'Password Reset Successfully!' : 'Account Created Successfully!'}
            </h3>
            <p style={{ margin: '0 0 18px', fontSize: 13.5, color: '#475569', lineHeight: 1.5 }}>
              Your password for <b>{regEmail}</b> has been updated. Entering the workbench...
            </p>
            <button
              type="button"
              className="primary"
              style={{ width: '100%', padding: '10px 16px' }}
              onClick={onAuthenticated}
            >
              Enter Workbench →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
