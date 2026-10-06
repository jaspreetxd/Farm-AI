import { useState } from 'react';
import { LuLeaf, LuMail, LuLock, LuArrowRight, LuSettings2 } from 'react-icons/lu';
import toast from 'react-hot-toast';
import { isSupabaseConfigured } from '../../services/Auth/supabase';
import { signInWithPassword, signUpWithPassword } from '../../services/Auth/authService';
import './AuthPage.css';

export default function AuthPage() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notice, setNotice] = useState('');

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setNotice('');
    setIsSubmitting(true);
    try {
      if (mode === 'signup') {
        const { session } = await signUpWithPassword(email.trim(), password);
        if (!session) {
          setNotice('Check your email for a confirmation link. Once confirmed, come back here to sign in.');
        } else {
          toast.success('Your account is ready.');
        }
      } else {
        await signInWithPassword(email.trim(), password);
        toast.success('Welcome back.');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not complete sign in. Try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-card glass" aria-labelledby="auth-title">
        <div className="auth-brand-mark"><LuLeaf /></div>
        <p className="auth-eyebrow">AGRO RAKSHAK</p>
        <h1 id="auth-title">Your farm, your assistant</h1>
        <p className="auth-subtitle">Sign in to keep your farming questions and diagnoses synced to your account.</p>

        {!isSupabaseConfigured ? (
          <div className="auth-setup-note" role="status">
            <LuSettings2 />
            <div>
              <strong>Account service needs setup</strong>
              <p>Add <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> to <code>.env.local</code>, then restart the app. The database setup is in <code>supabase/schema.sql</code>.</p>
            </div>
          </div>
        ) : (
          <>
            <div className="auth-mode-switch" role="tablist" aria-label="Account action">
              <button type="button" role="tab" aria-selected={mode === 'signin'} className={mode === 'signin' ? 'active' : ''} onClick={() => { setMode('signin'); setNotice(''); }}>Sign in</button>
              <button type="button" role="tab" aria-selected={mode === 'signup'} className={mode === 'signup' ? 'active' : ''} onClick={() => { setMode('signup'); setNotice(''); }}>Create account</button>
            </div>

            <form className="auth-form" onSubmit={handleSubmit}>
              <label htmlFor="auth-email">Email address</label>
              <div className="auth-input-wrap">
                <LuMail aria-hidden="true" />
                <input id="auth-email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required placeholder="you@example.com" />
              </div>

              <label htmlFor="auth-password">Password</label>
              <div className="auth-input-wrap">
                <LuLock aria-hidden="true" />
                <input id="auth-password" type="password" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} value={password} onChange={(event) => setPassword(event.target.value)} required minLength={8} placeholder="At least 8 characters" />
              </div>

              {notice && <p className="auth-notice" role="status">{notice}</p>}

              <button className="auth-submit btn btn-primary" type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}
                {!isSubmitting && <LuArrowRight />}
              </button>
            </form>
            <p className="auth-privacy-note">Your diagnosis history is private to your account.</p>
          </>
        )}
      </section>
    </main>
  );
}
