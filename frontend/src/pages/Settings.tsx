import React, { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2, LockKeyhole, Moon, Palette, Save, Sun, UserRound } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import { ProjectsShell } from '../components/projects/ProjectsShell';
import { useAuth } from '../contexts/AuthContext';

const appearanceSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']),
});
type AppearanceValues = z.infer<typeof appearanceSchema>;
const APPEARANCE_KEY = 'stm_appearance';

export const Settings: React.FC = () => {
  const { user } = useAuth();
  const [saved, setSaved] = useState(false);
  const { register, handleSubmit, reset } = useForm<AppearanceValues>({
    resolver: zodResolver(appearanceSchema),
    defaultValues: { theme: 'light' },
  });

  useEffect(() => {
    const stored = localStorage.getItem(APPEARANCE_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      reset({ theme: stored });
    }
  }, [reset]);

  const saveAppearance = ({ theme }: AppearanceValues) => {
    localStorage.setItem(APPEARANCE_KEY, theme);
    document.documentElement.dataset.theme = theme;
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2500);
  };

  return (
    <ProjectsShell title="Settings" subtitle="Manage your account experience and application preferences.">
      <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
        <nav className="h-fit rounded-2xl bg-white p-2 shadow-sm">
          <Link to="/profile" className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50"><UserRound className="h-4 w-4" />Profile</Link>
          <a href="#appearance" className="flex items-center gap-3 rounded-xl bg-blue-50 px-3 py-3 text-sm font-semibold text-blue-700"><Palette className="h-4 w-4" />Appearance</a>
          <a href="#security" className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50"><LockKeyhole className="h-4 w-4" />Security</a>
        </nav>
        <div className="space-y-6">
          <section id="account" className="rounded-2xl bg-white p-6 shadow-sm sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">Account</p>
            <h2 className="mt-2 text-xl font-bold text-slate-900">Account settings</h2>
            <p className="mt-2 text-sm text-slate-500">Your account identity is managed by the STM backend.</p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2"><div className="rounded-xl border border-slate-100 p-4"><p className="text-xs text-slate-400">Name</p><p className="mt-1 text-sm font-semibold text-slate-800">{user?.name}</p></div><div className="rounded-xl border border-slate-100 p-4"><p className="text-xs text-slate-400">Email</p><p className="mt-1 text-sm font-semibold text-slate-800">{user?.email}</p></div></div>
          </section>
          <section id="appearance" className="rounded-2xl bg-white p-6 shadow-sm sm:p-8">
            <div className="flex items-start gap-3"><div className="rounded-xl bg-blue-50 p-3 text-blue-600"><Palette className="h-5 w-5" /></div><div><h2 className="text-xl font-bold text-slate-900">Appearance</h2><p className="mt-1 text-sm text-slate-500">This preference is saved locally in this browser.</p></div></div>
            <form onSubmit={handleSubmit(saveAppearance)} className="mt-6"><div className="grid gap-3 sm:grid-cols-3">{(['light', 'dark', 'system'] as const).map((theme) => <label key={theme} className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 p-4 has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50"><input type="radio" value={theme} {...register('theme')} className="text-blue-600" />{theme === 'light' ? <Sun className="h-4 w-4 text-amber-500" /> : theme === 'dark' ? <Moon className="h-4 w-4 text-violet-500" /> : <Palette className="h-4 w-4 text-blue-500" />}<span className="text-sm font-semibold capitalize text-slate-700">{theme}</span></label>)}</div><button type="submit" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"><Save className="h-4 w-4" />Save appearance</button>{saved && <span className="ml-3 inline-flex items-center gap-1 text-sm font-semibold text-emerald-600"><CheckCircle2 className="h-4 w-4" />Saved</span>}</form>
          </section>
          <section id="security" className="rounded-2xl border border-amber-100 bg-amber-50 p-6 sm:p-8">
            <div className="flex items-start gap-3"><LockKeyhole className="mt-0.5 h-5 w-5 text-amber-700" /><div><h2 className="font-bold text-amber-900">Security settings unavailable</h2><p className="mt-1 text-sm leading-6 text-amber-800">The current backend supports login and token validation, but does not expose password-change, profile-update, or security-preference endpoints. No unsupported action is presented.</p></div></div>
          </section>
          <section className="rounded-2xl border border-slate-200 bg-slate-50 p-6 sm:p-8"><h2 className="font-bold text-slate-800">Notification preferences</h2><p className="mt-1 text-sm leading-6 text-slate-500">Notification delivery preferences are not exposed by the current backend. You can manage read state from the <Link to="/notifications" className="font-semibold text-blue-600">notification center</Link>.</p></section>
        </div>
      </div>
    </ProjectsShell>
  );
};
