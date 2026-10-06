import { useState } from 'react';
import { Link } from 'react-router-dom';
import { LuArrowLeft, LuCheck, LuKeyRound, LuMail, LuUserRound } from 'react-icons/lu';
import toast from 'react-hot-toast';
import type { User } from '@supabase/supabase-js';
import { updateDisplayName, updateEmail, updatePassword } from '../../services/Auth/authService';
import './Account.css';

interface AccountProps {
  user: User;
}

export default function Account({ user }: AccountProps) {
  const initialName = String(user.user_metadata?.full_name ?? '');
  const [name, setName] = useState(initialName);
  const email = user.email ?? '';
  const [newEmail, setNewEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const saveProfile = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSavingProfile(true);
    try {
      await updateDisplayName(name);
      toast.success('Your profile name was updated.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not update your profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const saveEmail = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (newEmail.trim().toLowerCase() === email.toLowerCase()) {
      toast.error('Enter a different email address.');
      return;
    }
    setSavingEmail(true);
    try {
      await updateEmail(newEmail);
      setNewEmail('');
      toast.success('Check your inboxes to confirm the email change.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not request the email change.');
    } finally {
      setSavingEmail(false);
    }
  };

  const savePassword = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (password.length < 8) {
      toast.error('Choose a password with at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('The passwords do not match.');
      return;
    }
    setSavingPassword(true);
    try {
      await updatePassword(password);
      setPassword('');
      setConfirmPassword('');
      toast.success('Your password was changed.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not change your password.');
    } finally {
      setSavingPassword(false);
    }
  };

  const initials = (name || email).trim().slice(0, 1).toUpperCase() || 'F';

  return (
    <main className="account-page">
      <div className="account-shell">
        <Link className="account-back-link" to="/"><LuArrowLeft /> Back to farming assistant</Link>

        <header className="account-heading">
          <div className="account-avatar" aria-hidden="true">{initials}</div>
          <div>
            <p className="account-eyebrow">YOUR ACCOUNT</p>
            <h1>Account settings</h1>
            <p>Manage your profile and sign-in details.</p>
          </div>
        </header>

        <section className="account-card glass" aria-labelledby="profile-heading">
          <div className="account-section-icon"><LuUserRound /></div>
          <div className="account-section-content">
            <h2 id="profile-heading">Profile</h2>
            <p className="account-section-hint">Choose how your account is identified in Agro Rakshak.</p>
            <form className="account-form" onSubmit={saveProfile}>
              <label htmlFor="profile-name">Display name</label>
              <input id="profile-name" autoComplete="name" maxLength={80} value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name" required />
              <div className="account-form-actions">
                <span className="account-verified"><LuCheck /> Saved to your private account</span>
                <button className="btn btn-primary" type="submit" disabled={savingProfile || name.trim() === initialName.trim()}>{savingProfile ? 'Saving…' : 'Save name'}</button>
              </div>
            </form>
          </div>
        </section>

        <section className="account-card glass" aria-labelledby="email-heading">
          <div className="account-section-icon"><LuMail /></div>
          <div className="account-section-content">
            <h2 id="email-heading">Email address</h2>
            <p className="account-section-hint">Your email is used to sign in. Supabase may ask you to confirm the change by email.</p>
            <div className="account-current-email"><span>Current email</span><strong>{email}</strong><em className={user.email_confirmed_at ? 'email-status is-confirmed' : 'email-status'}>{user.email_confirmed_at ? 'Verified' : 'Unverified'}</em></div>
            <form className="account-form" onSubmit={saveEmail}>
              <label htmlFor="new-email">New email address</label>
              <input id="new-email" type="email" autoComplete="email" value={newEmail} onChange={(event) => setNewEmail(event.target.value)} placeholder="you@example.com" required />
              <div className="account-form-actions">
                <span className="account-quiet-note">You may need to confirm both addresses.</span>
                <button className="btn btn-primary" type="submit" disabled={savingEmail}>{savingEmail ? 'Sending…' : 'Update email'}</button>
              </div>
            </form>
          </div>
        </section>

        <section className="account-card glass" aria-labelledby="password-heading">
          <div className="account-section-icon"><LuKeyRound /></div>
          <div className="account-section-content">
            <h2 id="password-heading">Password & security</h2>
            <p className="account-section-hint">Use a unique password with at least 8 characters.</p>
            <form className="account-form account-password-form" onSubmit={savePassword}>
              <label htmlFor="new-password">New password</label>
              <input id="new-password" type="password" autoComplete="new-password" minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" required />
              <label htmlFor="confirm-password">Confirm new password</label>
              <input id="confirm-password" type="password" autoComplete="new-password" minLength={8} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Enter it again" required />
              <div className="account-form-actions">
                <span className="account-quiet-note">Your password is managed securely by Supabase.</span>
                <button className="btn btn-primary" type="submit" disabled={savingPassword}>{savingPassword ? 'Updating…' : 'Change password'}</button>
              </div>
            </form>
          </div>
        </section>

        <p className="account-footer-note">Your diagnosis history stays attached to your account when you update these details.</p>
      </div>
    </main>
  );
}
