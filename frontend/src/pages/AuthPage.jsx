import { useMemo } from 'react';
import { Link, useLocation, Navigate } from 'react-router-dom';
import { SignIn, SignUp, useUser } from '@clerk/react';

function AuthPage() {
  const location = useLocation();
  const { isLoaded, isSignedIn } = useUser();
  const mode = useMemo(() => (location.pathname.endsWith('/sign-up') ? 'sign-up' : 'sign-in'), [location.pathname]);

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 grid place-items-center p-6">
        <div className="rounded-3xl border border-slate-700 bg-slate-900/80 px-8 py-12 text-center shadow-xl shadow-slate-950/20">
          <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Loading authentication</p>
        </div>
      </div>
    );
  }

  if (isSignedIn) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-5xl overflow-hidden rounded-[2rem] border border-slate-700 bg-slate-900/95 shadow-2xl shadow-slate-950/30 backdrop-blur-xl sm:grid sm:grid-cols-[1.2fr_1fr]">
        <div className="px-8 py-10 sm:px-10 sm:py-12">
          <div className="space-y-5">
            <p className="text-xs uppercase tracking-[0.3em] text-sky-400">Conversa</p>
            <h1 className="text-4xl font-semibold tracking-tight text-slate-100">Secure team chat with Clerk</h1>
            <p className="max-w-xl text-slate-400">Sign in or create an account to start messaging your contacts instantly. Text, media, and realtime updates are powered by the backend API.</p>
          </div>

          <div className="mt-10 flex flex-wrap gap-3">
            <Link
              to="/auth"
              className={`rounded-full border px-4 py-2 text-sm font-medium transition ${mode === 'sign-in' ? 'border-sky-400 bg-sky-500/10 text-sky-200' : 'border-slate-700 text-slate-300 hover:border-slate-200 hover:text-slate-100'}`}
            >
              Sign in
            </Link>
            <Link
              to="/auth/sign-up"
              className={`rounded-full border px-4 py-2 text-sm font-medium transition ${mode === 'sign-up' ? 'border-sky-400 bg-sky-500/10 text-sky-200' : 'border-slate-700 text-slate-300 hover:border-slate-200 hover:text-slate-100'}`}
            >
              Sign up
            </Link>
          </div>
        </div>

        <div className="border-t border-slate-700 bg-slate-950/80 px-6 py-8 sm:border-t-0 sm:border-l sm:px-8 sm:py-10">
          {mode === 'sign-up' ? (
            <SignUp path="/auth/sign-up" routing="path" signInUrl="/auth" afterSignUpUrl="/" />
          ) : (
            <SignIn path="/auth" routing="path" signUpUrl="/auth/sign-up" afterSignInUrl="/" />
          )}
        </div>
      </div>
    </div>
  );
}

export default AuthPage;
