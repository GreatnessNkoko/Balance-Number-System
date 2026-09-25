import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  ArrowRight,
  ChevronRight,
  CircleAlert,
  CircleCheck,
  LockKeyhole,
  LogOut,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  UserRound,
} from 'lucide-react';
import {
  getGetAdminDashboardQueryKey,
  getGetMeQueryKey,
  getGetNumbersQueryKey,
  useAdminLogin,
  useAdminLogout,
  useGetAdminDashboard,
  useGetMe,
  useGetNumbers,
  useRegisterUser,
  useSelectNumber,
} from '@workspace/api-client-react';
import type { AdminAssignment, AdminDashboard, MeResponse } from '@workspace/api-client-react';
import { Route, Switch, Link, useLocation, Router as WouterRouter } from 'wouter';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';

import './index.css';

const queryClient = new QueryClient();
const sessionRequest = { credentials: 'include' as const };

function apiMessage(error: unknown, fallback: string): string {
  if (!error || typeof error !== 'object' || !('data' in error)) return fallback;
  const data = (error as { data?: unknown }).data;
  if (data && typeof data === 'object' && 'message' in data && typeof data.message === 'string') {
    return data.message;
  }
  return fallback;
}

function BrandMark({ inverse = false }: { inverse?: boolean }) {
  return (
    <Link href="/" className="inline-flex items-center gap-3" data-testid="link-brand-home">
      <span className={`grid h-10 w-10 place-items-center rounded-2xl ${inverse ? 'bg-accent text-foreground' : 'bg-primary text-primary-foreground'}`}>
        <span className="font-mono text-sm font-bold tracking-[-0.16em]">1·4</span>
      </span>
      <span className={`text-[15px] font-bold tracking-[-0.02em] ${inverse ? 'text-sidebar-foreground' : 'text-foreground'}`}>
        balance<span className={inverse ? 'text-accent' : 'text-primary'}>.</span>
      </span>
    </Link>
  );
}

function PublicHeader() {
  return (
    <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-6 sm:px-8 lg:px-10">
      <BrandMark />
      <Link
        href="/admin"
        className="group inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        data-testid="link-admin-login"
      >
        <LockKeyhole className="h-3.5 w-3.5 transition-transform group-hover:-rotate-6" />
        Admin access
      </Link>
    </header>
  );
}

function PageFrame({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`app-noise min-h-[100dvh] overflow-hidden ${className}`}>
      <PublicHeader />
      {children}
    </div>
  );
}

function ErrorPanel({
  title,
  message,
  onRetry,
}: {
  title: string;
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center rounded-[1.75rem] border border-destructive/20 bg-card/85 px-6 py-10 text-center shadow-sm backdrop-blur">
      <span className="mb-5 grid h-12 w-12 place-items-center rounded-2xl bg-destructive/10 text-destructive">
        <CircleAlert className="h-5 w-5" />
      </span>
      <h2 className="text-lg font-bold tracking-[-0.02em]">{title}</h2>
      <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">{message}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:translate-y-0"
          data-testid="button-retry"
        >
          <RefreshCw className="h-4 w-4" />
          Try again
        </button>
      ) : null}
    </div>
  );
}

function Home() {
  const [, setLocation] = useLocation();
  const [name, setName] = useState('');
  const registerUser = useRegisterUser({ request: sessionRequest });
  const trimmedName = name.trim();

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!trimmedName || registerUser.isPending) return;
    registerUser.mutate(
      { data: { name: trimmedName } },
      {
        onSuccess: (result) => {
          setLocation(result.hasSelection ? '/result' : '/select');
        },
      },
    );
  };

  return (
    <PageFrame>
      <main className="mx-auto grid w-full max-w-6xl gap-12 px-5 pb-16 pt-10 sm:px-8 sm:pt-16 lg:grid-cols-[1.05fr_.95fr] lg:items-center lg:gap-20 lg:px-10 lg:pb-24 lg:pt-20">
        <section className="balance-enter">
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            One shared pool · 14 places
          </div>
          <h1 className="max-w-xl text-[clamp(3.25rem,8vw,6.8rem)] font-bold leading-[0.92] tracking-[-0.075em] text-foreground">
            Your number<br />
            <span className="text-primary">is waiting.</span>
          </h1>
          <p className="mt-8 max-w-md text-base leading-7 text-muted-foreground sm:text-lg">
            Choose exactly one number from a finite shared pool. No duplicates, no second guesses — just a clear place for you.
          </p>
          <div className="mt-10 flex items-center gap-4 text-xs font-semibold text-muted-foreground">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-accent/35 font-mono text-foreground">01</span>
            <span className="h-px w-10 bg-border" />
            <span>Say hello</span>
            <ChevronRight className="h-3.5 w-3.5 text-primary" />
            <span>Pick once</span>
          </div>
        </section>

        <section className="balance-enter-delay relative">
          <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full border border-accent/25" />
          <div className="absolute -bottom-10 -left-10 h-24 w-24 rounded-full bg-primary/5" />
          <div className="relative rounded-[2rem] border border-card-border bg-card/85 p-6 shadow-[0_24px_70px_-32px_hsl(181_75%_28%_/_0.35)] backdrop-blur sm:p-8">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Start here</p>
                <h2 className="mt-3 text-2xl font-bold tracking-[-0.04em]">What should we call you?</h2>
              </div>
              <span className="rounded-xl bg-secondary px-2.5 py-1.5 font-mono text-[10px] font-bold text-muted-foreground">01 / 02</span>
            </div>
            <form className="mt-8" onSubmit={submit}>
              <label htmlFor="participant-name" className="text-sm font-semibold text-foreground">Your name</label>
              <div className="mt-2 flex items-center rounded-2xl border border-input bg-background px-4 transition-colors focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10">
                <UserRound className="h-4 w-4 shrink-0 text-muted-foreground" />
                <input
                  id="participant-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="e.g. Maya Chen"
                  maxLength={100}
                  autoComplete="name"
                  className="min-w-0 flex-1 bg-transparent px-3 py-4 text-sm font-medium outline-none placeholder:text-muted-foreground/65"
                  data-testid="input-participant-name"
                />
              </div>
              {registerUser.isError ? (
                <p className="mt-3 flex items-center gap-2 text-xs font-semibold text-destructive" data-testid="status-registration-error">
                  <CircleAlert className="h-3.5 w-3.5" />
                  {apiMessage(registerUser.error, 'Something went wrong. Please try again.')}
                </p>
              ) : (
                <p className="mt-3 text-xs leading-5 text-muted-foreground">Use the name your group will recognize.</p>
              )}
              <button
                type="submit"
                disabled={!trimmedName || registerUser.isPending}
                className="mt-7 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-4 text-sm font-bold text-primary-foreground transition-all hover:-translate-y-0.5 hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0"
                data-testid="button-continue-to-selection"
              >
                {registerUser.isPending ? 'Saving your place…' : 'Continue to the pool'}
                {!registerUser.isPending ? <ArrowRight className="h-4 w-4" /> : null}
              </button>
            </form>
            <div className="mt-7 flex items-center justify-between border-t border-border pt-5 text-[11px] font-semibold text-muted-foreground">
              <span>One selection per person</span>
              <span className="font-mono text-primary">BAL / 14</span>
            </div>
          </div>
        </section>
      </main>
    </PageFrame>
  );
}

function NumberSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {Array.from({ length: 14 }, (_, index) => (
        <div key={index} className="balance-shimmer h-28 rounded-2xl border border-border/50" />
      ))}
    </div>
  );
}

function ParticipantLoading() {
  return (
    <PageFrame>
      <main className="mx-auto w-full max-w-5xl px-5 pb-16 pt-8 sm:px-8 sm:pt-14 lg:px-10">
        <div className="h-3 w-28 rounded-full balance-shimmer" />
        <div className="mt-5 h-12 max-w-md rounded-xl balance-shimmer" />
        <div className="mt-3 h-5 max-w-lg rounded-lg balance-shimmer" />
        <div className="mt-10"><NumberSkeleton /></div>
      </main>
    </PageFrame>
  );
}

function SelectPage() {
  const [, setLocation] = useLocation();
  const numbersQuery = useGetNumbers({ query: { queryKey: getGetNumbersQueryKey() }, request: sessionRequest });
  const meQuery = useGetMe({ query: { queryKey: getGetMeQueryKey() }, request: sessionRequest });
  const selectNumber = useSelectNumber({ request: sessionRequest });
  const [pendingNumber, setPendingNumber] = useState<number | null>(null);
  const me = meQuery.data;

  useEffect(() => {
    if (!meQuery.isLoading && (!me?.authenticated)) setLocation('/');
    if (me?.selectedNumber) setLocation('/result');
  }, [me, meQuery.isLoading, setLocation]);

  if (meQuery.isLoading || numbersQuery.isLoading) return <ParticipantLoading />;
  if (meQuery.isError || numbersQuery.isError) {
    return (
      <PageFrame>
        <main className="mx-auto max-w-5xl px-5 pb-16 pt-16 sm:px-8 lg:px-10">
          <ErrorPanel title="The pool is taking a breath" message="We couldn't load the available numbers. Your place is safe — try once more." onRetry={() => { void meQuery.refetch(); void numbersQuery.refetch(); }} />
        </main>
      </PageFrame>
    );
  }
  if (!me?.authenticated || !numbersQuery.data) return null;

  const numbers = numbersQuery.data.numbers;
  const choose = (number: number) => {
    if (selectNumber.isPending || pendingNumber !== null) return;
    setPendingNumber(number);
    selectNumber.mutate(
      { data: { number } },
      {
        onSuccess: (result) => {
          queryClient.setQueryData<MeResponse>(getGetMeQueryKey(), (old) => old ? { ...old, selectedNumber: result.selectedNumber } : old);
          setLocation('/result');
        },
        onError: () => setPendingNumber(null),
      },
    );
  };

  return (
    <PageFrame>
      <main className="mx-auto w-full max-w-5xl px-5 pb-16 pt-8 sm:px-8 sm:pt-12 lg:px-10 lg:pb-24">
        <div className="balance-enter flex flex-col justify-between gap-5 border-b border-border pb-7 sm:flex-row sm:items-end">
          <div>
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-primary">02 / 02 · The shared pool</p>
            <h1 className="mt-4 text-4xl font-bold tracking-[-0.065em] sm:text-6xl">Pick your number.</h1>
            <p className="mt-3 max-w-lg text-sm leading-6 text-muted-foreground sm:text-base">Available numbers are quiet. Selected numbers are settled. Choose the one that feels like yours.</p>
          </div>
          <div className="flex shrink-0 items-center gap-3 rounded-2xl border border-border bg-card/70 px-4 py-3">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-accent/30 text-accent-foreground"><UserRound className="h-4 w-4" /></span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Choosing for</p>
              <p className="mt-0.5 max-w-[150px] truncate text-sm font-bold" data-testid="text-current-participant">{me.name}</p>
            </div>
          </div>
        </div>

        <div className="balance-enter-delay mt-8 flex items-center justify-between gap-4">
          <p className="text-sm font-semibold text-foreground">
            <span className="font-mono text-primary" data-testid="text-available-count">{numbersQuery.data.availableCount}</span>
            <span className="ml-1 text-muted-foreground">of 14 still available</span>
          </p>
          <p className="hidden text-xs font-semibold text-muted-foreground sm:block">Select once · selection is final</p>
        </div>

        <div className="balance-enter-delay-2 mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {numbers.map((item) => {
            const isPending = pendingNumber === item.number;
            return (
              <button
                key={item.number}
                type="button"
                disabled={!item.available || selectNumber.isPending}
                onClick={() => choose(item.number)}
                className={`group relative flex h-28 flex-col justify-between overflow-hidden rounded-2xl border p-4 text-left transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20 ${
                  item.available
                    ? 'border-border bg-card hover:-translate-y-1 hover:border-primary/55 hover:shadow-[0_15px_30px_-20px_hsl(181_75%_28%_/_0.8)]'
                    : 'cursor-not-allowed border-border/60 bg-muted/45 text-muted-foreground/60'
                } ${isPending ? 'border-accent bg-accent/15' : ''}`}
                data-testid={`button-number-${item.number}`}
                aria-label={`Number ${item.number}${item.available ? ', available' : ', already selected'}`}
              >
                <span className={`font-mono text-3xl font-bold tracking-[-0.09em] ${item.available ? 'text-foreground group-hover:text-primary' : ''}`}>{String(item.number).padStart(2, '0')}</span>
                <span className="flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.14em]">
                  {isPending ? 'Saving…' : item.available ? 'Available' : 'Taken'}
                  {item.available && !isPending ? <ArrowRight className="h-3.5 w-3.5 opacity-50 transition-transform group-hover:translate-x-1" /> : null}
                  {isPending ? <RefreshCw className="h-3.5 w-3.5 animate-spin text-accent-foreground" /> : null}
                </span>
              </button>
            );
          })}
        </div>
        {selectNumber.isError ? (
          <div className="mt-5 flex items-center gap-2 rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-xs font-semibold text-destructive" data-testid="status-selection-error">
            <CircleAlert className="h-4 w-4 shrink-0" />
            {apiMessage(selectNumber.error, 'Something went wrong. Please try again.')}
          </div>
        ) : null}
        <div className="mt-10 flex items-start gap-3 rounded-2xl bg-primary/5 px-4 py-4 text-xs leading-5 text-muted-foreground">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <p><span className="font-bold text-foreground">A considered choice.</span> Each number can belong to one person only. Once you choose, we record it immediately and keep it yours.</p>
        </div>
      </main>
    </PageFrame>
  );
}

function ResultPage() {
  const [, setLocation] = useLocation();
  const meQuery = useGetMe({ query: { queryKey: getGetMeQueryKey() }, request: sessionRequest });
  const me = meQuery.data;

  useEffect(() => {
    if (!meQuery.isLoading && !me?.authenticated) setLocation('/');
    if (me?.authenticated && !me.selectedNumber) setLocation('/select');
  }, [me, meQuery.isLoading, setLocation]);

  if (meQuery.isLoading) return <ParticipantLoading />;
  if (meQuery.isError) {
    return <PageFrame><main className="mx-auto max-w-5xl px-5 pb-16 pt-16 sm:px-8 lg:px-10"><ErrorPanel title="Your result is out of reach" message="We couldn't confirm your participant session. Try again to see your recorded number." onRetry={() => { void meQuery.refetch(); }} /></main></PageFrame>;
  }
  if (!me?.authenticated || !me.selectedNumber) return null;

  return (
    <PageFrame>
      <main className="mx-auto flex w-full max-w-5xl flex-col items-center px-5 pb-20 pt-12 text-center sm:px-8 sm:pt-20 lg:px-10">
        <div className="balance-enter inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
          <CircleCheck className="h-3.5 w-3.5" />
          Recorded and reserved
        </div>
        <p className="balance-enter-delay mt-10 text-sm font-semibold text-muted-foreground">A place for {me.name}</p>
        <div className="balance-enter-delay relative mt-4">
          <div className="absolute inset-[-1.5rem] rounded-full border border-accent/30 sm:inset-[-2.5rem]" />
          <div className="absolute inset-[-3rem] rounded-full border border-primary/10 sm:inset-[-5rem]" />
          <div className="relative grid h-48 w-48 place-items-center rounded-[3rem] border border-primary/20 bg-card shadow-[0_25px_70px_-25px_hsl(181_75%_28%_/_0.5)] sm:h-64 sm:w-64 sm:rounded-[4rem]">
            <span className="font-mono text-[7rem] font-bold leading-none tracking-[-0.16em] text-primary sm:text-[10rem]" data-testid="text-selected-number">{String(me.selectedNumber).padStart(2, '0')}</span>
          </div>
        </div>
        <h1 className="balance-enter-delay-2 mt-16 text-4xl font-bold tracking-[-0.065em] sm:text-6xl">That one is yours.</h1>
        <p className="mt-4 max-w-md text-sm leading-6 text-muted-foreground sm:text-base">Your number is safely recorded in the shared pool. There is nothing else you need to do.</p>
        <Link href="/" className="mt-9 inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-bold text-foreground transition-all hover:-translate-y-0.5 hover:border-primary/40 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15" data-testid="link-return-home">
          <ArrowLeft className="h-4 w-4" />
          Return home
        </Link>
      </main>
    </PageFrame>
  );
}

function StatCard({ label, value, detail, accent = false, testId }: { label: string; value: number; detail: string; accent?: boolean; testId: string }) {
  return (
    <div className={`rounded-2xl border p-5 ${accent ? 'border-accent/35 bg-accent/15' : 'border-border bg-card/75'}`}>
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className={`mt-4 font-mono text-4xl font-bold tracking-[-0.1em] ${accent ? 'text-accent-foreground' : 'text-foreground'}`} data-testid={testId}>{value}</p>
      <p className="mt-2 text-xs font-semibold text-muted-foreground">{detail}</p>
    </div>
  );
}

function AdminLogin({
  password,
  setPassword,
  onSubmit,
  isPending,
  errorMessage,
}: {
  password: string;
  setPassword: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  isPending: boolean;
  errorMessage?: string;
}) {
  return (
    <div className="min-h-[100dvh] bg-sidebar text-sidebar-foreground">
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-6xl flex-col px-5 py-7 sm:px-8 lg:px-10">
        <div className="flex items-center justify-between"><BrandMark inverse /><Link href="/" className="text-xs font-semibold text-sidebar-foreground/60 transition-colors hover:text-sidebar-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring" data-testid="link-exit-admin">Exit admin</Link></div>
        <main className="grid flex-1 items-center gap-14 py-14 lg:grid-cols-[1fr_420px] lg:gap-28">
          <section className="balance-enter">
            <div className="mb-7 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-accent"><ShieldCheck className="h-4 w-4" /> Administrator view</div>
            <h1 className="max-w-xl text-5xl font-bold leading-[0.95] tracking-[-0.07em] sm:text-7xl">See the pool<br /><span className="text-accent">at a glance.</span></h1>
            <p className="mt-8 max-w-md text-base leading-7 text-sidebar-foreground/65">A clear operational view of every number, every assignment, and the space that remains.</p>
          </section>
          <section className="balance-enter-delay rounded-[2rem] border border-sidebar-border bg-sidebar-accent/60 p-6 shadow-2xl sm:p-8">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-accent text-accent-foreground"><LockKeyhole className="h-5 w-5" /></div>
            <h2 className="mt-7 text-2xl font-bold tracking-[-0.04em]">Authorized access</h2>
            <p className="mt-2 text-sm leading-6 text-sidebar-foreground/60">Enter the administrator password to continue.</p>
            <form className="mt-8" onSubmit={onSubmit}>
              <label htmlFor="admin-password" className="text-xs font-bold uppercase tracking-[0.14em] text-sidebar-foreground/75">Password</label>
              <input
                id="admin-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                type="password"
                autoComplete="current-password"
                placeholder="Enter password"
                className="mt-2 w-full rounded-2xl border border-sidebar-border bg-sidebar px-4 py-4 text-sm text-sidebar-foreground outline-none transition-colors placeholder:text-sidebar-foreground/35 focus:border-accent focus:ring-4 focus:ring-accent/15"
                data-testid="input-admin-password"
              />
              {errorMessage ? <p className="mt-3 flex items-center gap-2 text-xs font-semibold text-red-300" data-testid="status-admin-login-error"><CircleAlert className="h-3.5 w-3.5" /> {errorMessage}</p> : null}
              <button type="submit" disabled={!password || isPending} className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-accent px-5 py-4 text-sm font-bold text-accent-foreground transition-all hover:-translate-y-0.5 hover:bg-accent/90 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/20 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0" data-testid="button-admin-login">
                {isPending ? 'Checking access…' : 'Open dashboard'}
                {!isPending ? <ArrowRight className="h-4 w-4" /> : null}
              </button>
            </form>
            <div className="mt-7 flex items-center gap-2 border-t border-sidebar-border pt-5 text-[11px] leading-5 text-sidebar-foreground/45"><LockKeyhole className="h-3.5 w-3.5 shrink-0" /> This is a private administrator area.</div>
          </section>
        </main>
      </div>
    </div>
  );
}

function AssignmentRow({ assignment }: { assignment: AdminAssignment }) {
  const hasName = assignment.status === 'selected' && assignment.name;
  return (
    <div className="grid grid-cols-[68px_1fr_auto] items-center gap-3 border-b border-border/70 px-4 py-4 last:border-0 sm:grid-cols-[84px_1fr_130px_150px] sm:gap-4 sm:px-5" data-testid={`row-assignment-${assignment.number}`}>
      <span className="font-mono text-lg font-bold tracking-[-0.08em] text-primary" data-testid={`text-assignment-number-${assignment.number}`}>{String(assignment.number).padStart(2, '0')}</span>
      <div className="min-w-0">
        <p className={`truncate text-sm font-bold ${hasName ? 'text-foreground' : 'text-muted-foreground'}`} data-testid={`text-assignment-name-${assignment.number}`}>{hasName ? assignment.name : 'Available to choose'}</p>
        <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground sm:hidden">{assignment.status === 'selected' ? 'Selected' : 'Open'}</p>
      </div>
      <span className={`hidden rounded-full px-2.5 py-1 text-center text-[10px] font-bold uppercase tracking-[0.12em] sm:inline-block ${assignment.status === 'selected' ? 'bg-primary/10 text-primary' : 'bg-secondary text-muted-foreground'}`} data-testid={`status-assignment-${assignment.number}`}>{assignment.status === 'selected' ? 'Selected' : 'Available'}</span>
      <span className="text-right text-[11px] font-semibold text-muted-foreground" data-testid={`text-assignment-time-${assignment.number}`}>{assignment.selectedAt ? new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(assignment.selectedAt)) : '—'}</span>
    </div>
  );
}

function AdminDashboardView({ dashboard, onLogout }: { dashboard: AdminDashboard; onLogout: () => void }) {
  const selectedAssignments = useMemo(() => dashboard.assignments.filter((item) => item.status === 'selected'), [dashboard.assignments]);
  return (
    <div className="min-h-[100dvh] bg-background">
      <header className="border-b border-border bg-card/70">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8 lg:px-10">
          <div className="flex items-center gap-4"><BrandMark /><span className="hidden h-5 w-px bg-border sm:block" /><span className="hidden text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground sm:block">Admin dashboard</span></div>
          <button type="button" onClick={onLogout} className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" data-testid="button-admin-logout"><LogOut className="h-3.5 w-3.5" /> Sign out</button>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-5 pb-16 pt-9 sm:px-8 lg:px-10 lg:pb-24 lg:pt-14">
        <div className="balance-enter flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div><p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Live assignment view</p><h1 className="mt-3 text-4xl font-bold tracking-[-0.065em] sm:text-6xl">The whole pool,<br className="sm:hidden" /> in one view.</h1></div>
          <div className="rounded-2xl border border-border bg-card px-4 py-3 text-right"><p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">Last checked</p><p className="mt-1 text-xs font-bold text-foreground">Just now · live session</p></div>
        </div>
        <div className="balance-enter-delay mt-10 grid gap-3 sm:grid-cols-3">
          <StatCard label="Total numbers" value={dashboard.totalNumbers} detail="Finite shared pool" testId="stat-total-numbers" />
          <StatCard label="Assigned" value={dashboard.selected} detail={selectedAssignments.length === 1 ? '1 participant placed' : `${selectedAssignments.length} participants placed`} accent testId="stat-selected-numbers" />
          <StatCard label="Remaining" value={dashboard.remaining} detail={dashboard.remaining === 1 ? 'One place left' : 'Places still open'} testId="stat-remaining-numbers" />
        </div>
        <section className="balance-enter-delay-2 mt-8 overflow-hidden rounded-[1.5rem] border border-border bg-card/70 shadow-sm">
          <div className="flex flex-col justify-between gap-3 border-b border-border px-4 py-5 sm:flex-row sm:items-center sm:px-5">
            <div><h2 className="text-lg font-bold tracking-[-0.03em]">Number assignments</h2><p className="mt-1 text-xs text-muted-foreground">Every number has a clear status.</p></div>
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground"><span className="h-2 w-2 rounded-full bg-primary" /> Assigned <span className="ml-2 h-2 w-2 rounded-full bg-border" /> Available</div>
          </div>
          <div className="grid grid-cols-[68px_1fr_auto] gap-3 bg-secondary/55 px-4 py-3 text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground sm:grid-cols-[84px_1fr_130px_150px] sm:gap-4 sm:px-5"><span>Number</span><span>Participant</span><span className="hidden sm:block">Status</span><span className="text-right">Recorded</span></div>
          {dashboard.assignments.length > 0 ? dashboard.assignments.map((assignment) => <AssignmentRow key={assignment.number} assignment={assignment} />) : <div className="px-6 py-14 text-center text-sm text-muted-foreground" data-testid="empty-assignments">No number assignments yet.</div>}
        </section>
        <div className="mt-6 flex items-start gap-3 rounded-2xl bg-primary/5 px-4 py-4 text-xs leading-5 text-muted-foreground"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><p><span className="font-bold text-foreground">A single source of truth.</span> The grid above represents the current server state. Refresh the page to re-check if a participant is choosing right now.</p></div>
      </main>
    </div>
  );
}

function AdminPage() {
  const queryClientForAdmin = useQueryClient();
  const [password, setPassword] = useState('');
  const [view, setView] = useState<'checking' | 'login' | 'dashboard'>('checking');
  const dashboardQuery = useGetAdminDashboard({ query: { queryKey: getGetAdminDashboardQueryKey() }, request: sessionRequest });
  const adminLogin = useAdminLogin({ request: sessionRequest });
  const adminLogout = useAdminLogout({ request: sessionRequest });

  useEffect(() => {
    if (dashboardQuery.isLoading) return;
    if (dashboardQuery.data) setView('dashboard');
    else if (dashboardQuery.isError) setView('login');
  }, [dashboardQuery.data, dashboardQuery.isError, dashboardQuery.isLoading]);

  const submitLogin = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!password || adminLogin.isPending) return;
    adminLogin.mutate({ data: { password } }, {
      onSuccess: () => {
        setPassword('');
        setView('dashboard');
        void dashboardQuery.refetch();
      },
    });
  };

  const logout = () => {
    adminLogout.mutate(undefined, {
      onSuccess: () => {
        setView('login');
        queryClientForAdmin.removeQueries({ queryKey: getGetAdminDashboardQueryKey() });
      },
    });
  };

  if (view === 'checking') {
    return (
      <div className="min-h-[100dvh] bg-sidebar p-5 sm:p-8">
        <div className="mx-auto max-w-6xl"><div className="h-10 w-32 rounded-xl bg-sidebar-accent balance-shimmer" /><div className="mt-20 max-w-md"><div className="h-14 rounded-xl bg-sidebar-accent balance-shimmer" /><div className="mt-3 h-5 rounded-lg bg-sidebar-accent balance-shimmer" /></div></div>
      </div>
    );
  }
  if (view === 'login') return <AdminLogin password={password} setPassword={setPassword} onSubmit={submitLogin} isPending={adminLogin.isPending} errorMessage={adminLogin.isError ? apiMessage(adminLogin.error, 'Incorrect password.') : undefined} />;
  if (!dashboardQuery.data) return <AdminLogin password={password} setPassword={setPassword} onSubmit={submitLogin} isPending={adminLogin.isPending} errorMessage={adminLogin.isError ? apiMessage(adminLogin.error, 'Incorrect password.') : undefined} />;
  return <AdminDashboardView dashboard={dashboardQuery.data} onLogout={logout} />;
}

function NotFound() {
  return (
    <PageFrame>
      <main className="mx-auto flex max-w-5xl flex-col items-center px-5 pb-20 pt-24 text-center sm:px-8">
        <span className="font-mono text-7xl font-bold tracking-[-0.12em] text-primary">404</span>
        <h1 className="mt-7 text-3xl font-bold tracking-[-0.05em]">This place is not in the pool.</h1>
        <p className="mt-3 max-w-sm text-sm leading-6 text-muted-foreground">The page you’re looking for doesn’t exist, but the numbers are still here.</p>
        <Link href="/" className="mt-8 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20" data-testid="link-not-found-home"><ArrowLeft className="h-4 w-4" /> Return home</Link>
      </main>
    </PageFrame>
  );
}

function Router() {
  const [location] = useLocation();
  return (
    <ErrorBoundary resetKey={location}>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/select" component={SelectPage} />
        <Route path="/result" component={ResultPage} />
        <Route path="/admin" component={AdminPage} />
        <Route component={NotFound} />
      </Switch>
    </ErrorBoundary>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;