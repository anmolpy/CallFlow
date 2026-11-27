import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { ArrowRight, ChevronDown, Phone, Play, SkipForward } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { CallFlowHeroPreview } from '../landing/components/CallFlowHeroPreview';
import { FeatureOverview } from '../landing/components/FeatureOverview';
import { PhoneStageCanvas } from '../landing/components/PhoneStageCanvas';
import {
  ERA_SCROLL_SPAN,
  HERO_TRANSITION_START,
  TELEPHONE_ERAS,
  getTargetEraIndex,
} from '../landing/eras';
import { usePrefersReducedMotion } from '../landing/usePrefersReducedMotion';

export function LandingPage() {
  const { isAuthenticated, enterDemoMode } = useAuth();
  const navigate = useNavigate();
  const reducedMotion = usePrefersReducedMotion();

  const trackRef = useRef<HTMLDivElement>(null);
  const scrollProgressRef = useRef<number>(0);

  const [activeEraIndex, setActiveEraIndex] = useState<number>(0);
  const [inHeroZone, setInHeroZone] = useState<boolean>(false);
  const [heroProgress, setHeroProgress] = useState<number>(0);
  const [jumpVersion, setJumpVersion] = useState<number>(0);
  const [warmupProgress, setWarmupProgress] = useState<{ loaded: number; total: number }>({
    loaded: 0,
    total: TELEPHONE_ERAS.length,
  });
  const [stageReady, setStageReady] = useState<boolean>(false);

  const handleWarmupProgress = useCallback((loaded: number, total: number) => {
    setWarmupProgress((prev) =>
      prev.loaded === loaded && prev.total === total ? prev : { loaded, total },
    );
  }, []);

  const handleStageReady = useCallback(() => {
    setStageReady(true);
  }, []);

  // Safety fallback so a slow/restricted environment never remains trapped behind the preloader
  useEffect(() => {
    if (stageReady) return;
    const timer = window.setTimeout(() => {
      setStageReady(true);
    }, 7000);
    return () => {
      window.clearTimeout(timer);
    };
  }, [stageReady]);

  // Prevent scroll while GPU pre-warming completes so user enters cleanly at Era 1
  useEffect(() => {
    if (stageReady) {
      document.body.style.overflow = '';
      return;
    }
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [stageReady]);

  // Scroll listener drives scrollProgressRef continuously without per-frame React state updates;
  // React state updates only when crossing era/hero thresholds.
  useEffect(() => {
    let rafId = 0;

    const updateFromScroll = () => {
      rafId = 0;
      const track = trackRef.current;
      if (!track) return;

      const rect = track.getBoundingClientRect();
      const maxScroll = Math.max(1, track.offsetHeight - window.innerHeight);
      const raw = Math.min(1, Math.max(0, -rect.top / maxScroll));

      scrollProgressRef.current = raw;

      const nextEra = getTargetEraIndex(raw);
      setActiveEraIndex((prev) => (prev === nextEra ? prev : nextEra));

      const isHero = raw >= HERO_TRANSITION_START;
      setInHeroZone((prev) => (prev === isHero ? prev : isHero));

      if (isHero) {
        const quantizedHero =
          Math.round(Math.min(1, Math.max(0, (raw - HERO_TRANSITION_START) / 0.12)) * 20) / 20;
        setHeroProgress((prev) => (Math.abs(prev - quantizedHero) >= 0.05 ? quantizedHero : prev));
      } else {
        setHeroProgress((prev) => (prev === 0 ? 0 : 0));
      }
    };

    const handleScroll = () => {
      if (!rafId) {
        rafId = window.requestAnimationFrame(updateFromScroll);
      }
    };

    updateFromScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
      if (rafId) {
        window.cancelAnimationFrame(rafId);
      }
    };
  }, []);

  const scrollToProgress = useCallback((targetProgress: number) => {
    const track = trackRef.current;
    if (!track) return;

    const clamped = Math.min(1, Math.max(0, targetProgress));
    const trackTop = track.getBoundingClientRect().top + window.scrollY;
    const maxScroll = Math.max(1, track.offsetHeight - window.innerHeight);
    const targetY = trackTop + clamped * maxScroll;

    scrollProgressRef.current = clamped;
    setActiveEraIndex(getTargetEraIndex(clamped));
    const isHero = clamped >= HERO_TRANSITION_START;
    setInHeroZone(isHero);
    setHeroProgress(isHero ? Math.min(1, Math.max(0, (clamped - HERO_TRANSITION_START) / 0.12)) : 0);
    setJumpVersion((v) => v + 1);

    window.scrollTo({
      top: targetY,
      behavior: 'auto',
    });
  }, []);

  const handleSkipToHero = useCallback(() => {
    scrollToProgress(1);
  }, [scrollToProgress]);

  const handleTryDemo = useCallback(() => {
    enterDemoMode();
    navigate('/dashboard');
  }, [enterDemoMode, navigate]);

  const currentEra = TELEPHONE_ERAS[activeEraIndex];
  const progressPercent = stageReady
    ? 100
    : Math.min(96, Math.round((warmupProgress.loaded / warmupProgress.total) * 85) + 10);

  return (
    <MotionConfig reducedMotion="user">
      <div
        id="evolution-top"
        className="min-h-screen bg-white text-[#161211] [overflow-x:clip]"
      >
        {/* Plain White GPU-Warming Preloader Overlay */}
        <AnimatePresence>
          {!stageReady && (
            <motion.div
              key="callflow-preloader"
              role="status"
              aria-label="Preparing CallFlow 3D experience"
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reducedMotion ? 0.15 : 0.35, ease: 'easeOut' }}
              className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white px-6"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#161211] text-white">
                  <Phone className="h-5 w-5" />
                </div>
                <span className="text-xl font-semibold tracking-[-0.03em] text-[#161211]">
                  CallFlow
                </span>
              </div>

              <div className="mt-7 h-[2px] w-48 overflow-hidden bg-[#161211]/10">
                <div
                  className="h-full bg-[#161211] transition-all duration-200 ease-out"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.2em] text-[#625957]">
                {warmupProgress.loaded < warmupProgress.total
                  ? `Loading models · ${warmupProgress.loaded}/${warmupProgress.total}`
                  : 'Warming 3D stage'}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Minimal Editorial Top Header */}
        <header className="fixed inset-x-0 top-0 z-40 border-b border-[#161211]/10 bg-white/85 backdrop-blur-md">
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-10">
            <a href="#evolution-top" className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#161211] text-white">
                <Phone className="h-4 w-4" />
              </div>
              <span className="text-base font-semibold tracking-[-0.02em] text-[#161211]">
                CallFlow
              </span>
            </a>

            <nav className="hidden items-center gap-8 text-sm font-medium text-[#625957] md:flex">
              <button
                type="button"
                onClick={() => scrollToProgress(0)}
                className="transition hover:text-[#161211]"
              >
                Evolution
              </button>
              <a href="#features" className="transition hover:text-[#161211]">
                Capabilities
              </a>
              <a href="#api-overview" className="transition hover:text-[#161211]">
                API Docs
              </a>
            </nav>

            <div className="flex items-center gap-2">
              {!inHeroZone && (
                <button
                  type="button"
                  onClick={handleSkipToHero}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#161211]/15 bg-white px-3 py-1.5 text-xs font-medium text-[#161211] transition hover:border-[#161211]/40 sm:px-3.5 sm:text-sm"
                >
                  <SkipForward className="h-3.5 w-3.5 text-blue-700" />
                  <span className="hidden sm:inline">Skip to CallFlow</span>
                  <span className="sm:hidden">Skip</span>
                </button>
              )}
              {!isAuthenticated && (
                <button
                  type="button"
                  onClick={handleTryDemo}
                  className="hidden items-center gap-1.5 rounded-full border border-blue-700/25 bg-blue-50/70 px-3.5 py-1.5 text-xs font-semibold text-blue-800 transition hover:bg-blue-100/80 md:inline-flex sm:text-sm"
                >
                  <Play className="h-3 w-3 fill-current" />
                  <span>Try Demo Console</span>
                </button>
              )}
              <Link
                to={isAuthenticated ? '/dashboard' : '/login'}
                className="inline-flex items-center gap-1.5 rounded-full bg-[#161211] px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-[#2c2523] sm:text-sm"
              >
                <span>{isAuthenticated ? 'Dashboard' : 'Sign In'}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </header>

        {/* Scroll-Driven 3D Evolution Track */}
        <div ref={trackRef} data-evolution-track="true" className="relative">
          {/* Full-Bleed Sticky 3D Stage on plain white #ffffff */}
          <div className="sticky top-0 h-[100dvh] w-full overflow-hidden bg-white">
            <div className="relative z-10 h-full w-full">
              <PhoneStageCanvas
                scrollProgressRef={scrollProgressRef}
                targetEraIndex={activeEraIndex}
                jumpVersion={jumpVersion}
                reducedMotion={reducedMotion}
                onWarmupProgress={handleWarmupProgress}
                onStageReady={handleStageReady}
              />
            </div>

            {/* Minimal Single-Line Era Caption */}
            {!inHeroZone && (
              <div className="pointer-events-none absolute inset-x-0 bottom-16 z-20 px-5 sm:bottom-10 sm:px-10">
                <div className="mx-auto flex max-w-7xl items-baseline justify-between gap-4">
                  <motion.p
                    key={currentEra.id}
                    initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
                    animate={reducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
                    transition={{ duration: reducedMotion ? 0.15 : 0.24, ease: 'easeOut' }}
                    className="text-sm tracking-tight text-[#161211] sm:text-base"
                  >
                    <span className="font-mono text-xs font-semibold tracking-wider text-[#625957] sm:text-sm">
                      {currentEra.years}
                    </span>
                    <span className="mx-2.5 text-[#161211]/25">|</span>
                    <span className="font-semibold tracking-[-0.01em] text-[#161211]">
                      {currentEra.hardwareName}
                    </span>
                  </motion.p>

                  {activeEraIndex === 0 && (
                    <span className="hidden items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-[#625957] sm:inline-flex">
                      Scroll
                      <ChevronDown className="h-3.5 w-3.5 animate-bounce" />
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Right-side Era Step Indicator (Desktop/Tablet) */}
            <nav
              aria-label="Evolution eras navigation"
              className="fixed right-3 top-1/2 z-30 hidden -translate-y-1/2 flex-col items-end gap-2 sm:right-8 sm:flex"
            >
              {TELEPHONE_ERAS.map((era, idx) => {
                const isActive = !inHeroZone && activeEraIndex === idx;
                return (
                  <button
                    key={era.id}
                    type="button"
                    aria-label={`Jump to ${era.years} ${era.hardwareName}`}
                    aria-current={isActive ? 'step' : undefined}
                    onClick={() => scrollToProgress(idx * ERA_SCROLL_SPAN + 0.04)}
                    className="group flex items-center gap-2.5 rounded-full px-2 py-1 text-xs transition-colors"
                  >
                    <span
                      className={`hidden font-mono text-[11px] tracking-wide lg:inline ${
                        isActive
                          ? 'font-semibold text-[#161211] opacity-100'
                          : 'text-[#625957] opacity-0 group-hover:opacity-100'
                      }`}
                    >
                      {era.years}
                    </span>
                    <span
                      className={`h-2 w-2 rounded-full transition-transform ${
                        isActive
                          ? 'scale-125 bg-[#161211]'
                          : 'bg-[#161211]/25 group-hover:bg-[#161211]/60'
                      }`}
                    />
                  </button>
                );
              })}

              <button
                type="button"
                aria-label="Jump to CallFlow Hero"
                aria-current={inHeroZone ? 'step' : undefined}
                onClick={handleSkipToHero}
                className="group mt-1 flex items-center gap-2.5 rounded-full px-2 py-1 text-xs"
              >
                <span
                  className={`hidden font-mono text-[11px] lg:inline ${
                    inHeroZone
                      ? 'font-semibold text-blue-700 opacity-100'
                      : 'text-[#625957] opacity-0 group-hover:opacity-100'
                  }`}
                >
                  CallFlow
                </span>
                <span
                  className={`h-2 w-2 rounded-full transition-transform ${
                    inHeroZone ? 'scale-125 bg-blue-700' : 'bg-blue-700/35 group-hover:bg-blue-700'
                  }`}
                />
              </button>
            </nav>

            {/* Mobile compact bottom era stepper */}
            <div className="fixed inset-x-4 bottom-3 z-30 flex items-center justify-between rounded-full border border-[#161211]/12 bg-white/95 px-3.5 py-2 backdrop-blur-md sm:hidden">
              <div className="flex items-center gap-1.5">
                {TELEPHONE_ERAS.map((era, idx) => {
                  const isActive = !inHeroZone && activeEraIndex === idx;
                  return (
                    <button
                      key={era.id}
                      type="button"
                      aria-label={`Era ${era.eraNumber}`}
                      onClick={() => scrollToProgress(idx * ERA_SCROLL_SPAN + 0.04)}
                      className={`h-2 rounded-full transition-all ${
                        isActive ? 'w-6 bg-[#161211]' : 'w-2 bg-[#161211]/25'
                      }`}
                    />
                  );
                })}
                <button
                  type="button"
                  aria-label="Jump to Hero"
                  onClick={handleSkipToHero}
                  className={`h-2 rounded-full transition-all ${
                    inHeroZone ? 'w-6 bg-blue-700' : 'w-2 bg-blue-700/35'
                  }`}
                />
              </div>
              <button
                type="button"
                onClick={handleSkipToHero}
                className="font-mono text-[11px] font-semibold uppercase tracking-wider text-blue-700"
              >
                {inHeroZone ? 'CallFlow' : 'Skip →'}
              </button>
            </div>
          </div>

          {/* Scroll Anchor Track (exact 0..1 progress mapping) */}
          <div className="pointer-events-none relative z-20 -mt-[100dvh]">
            {TELEPHONE_ERAS.map((era) => (
              <section
                key={era.id}
                id={era.id}
                aria-label={`${era.years} — ${era.hardwareName}`}
                className="h-screen w-full"
              />
            ))}

            {/* Final Section (225vh): Orbits iPhone front screen smoothly into CallFlow Hero */}
            <section
              id="callflow-hero"
              aria-label="CallFlow Hero"
              className="relative h-[225vh] w-full"
            >
              <div className="sticky top-0 flex min-h-[100dvh] w-full items-end px-4 pb-16 pt-20 sm:px-10 sm:pb-12 lg:items-center lg:pt-20">
                <div className="mx-auto w-full max-w-7xl">
                  <motion.div
                    initial={false}
                    animate={{
                      opacity: inHeroZone ? Math.max(0.15, heroProgress) : 0,
                      y: inHeroZone ? (1 - heroProgress) * 20 : 20,
                    }}
                    transition={{ duration: reducedMotion ? 0.15 : 0.3, ease: 'easeOut' }}
                    className="pointer-events-auto mx-auto w-full max-w-xl space-y-4 rounded-2xl border border-[#161211]/10 bg-white/95 p-4 backdrop-blur-md sm:p-6 lg:mx-0 lg:max-w-[490px] lg:space-y-5 lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none xl:max-w-[540px]"
                  >
                    <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-[#625957]">
                      Customer Support Call Orchestration
                    </p>

                    <h1 className="text-3xl font-bold tracking-[-0.04em] text-[#161211] sm:text-4xl lg:text-[3.35rem] lg:leading-[1.03] xl:text-[3.65rem]">
                      You do the calls,{' '}
                      <span className="font-serif italic font-normal text-blue-700">
                        we do the flow.
                      </span>
                    </h1>

                    <p className="text-sm leading-relaxed text-[#625957] lg:text-[17px]">
                      Unified queue routing, complete customer call history, timestamped notes, and
                      real-time operational analytics—built for teams that refuse hold-music chaos.
                    </p>

                    <div className="flex flex-wrap items-center gap-3 pt-1">
                      {!isAuthenticated && (
                        <button
                          type="button"
                          onClick={handleTryDemo}
                          className="inline-flex items-center gap-2 rounded-full bg-[#161211] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#2c2523] lg:py-3.5"
                        >
                          <Play className="h-3.5 w-3.5 fill-current" />
                          <span>Try Demo Console</span>
                        </button>
                      )}
                      <Link
                        to={isAuthenticated ? '/dashboard' : '/login'}
                        className={`inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold transition lg:py-3.5 ${
                          isAuthenticated
                            ? 'bg-[#161211] px-6 text-white hover:bg-[#2c2523]'
                            : 'border border-[#161211]/20 bg-white text-[#161211] hover:border-[#161211]/45'
                        }`}
                      >
                        <span>
                          {isAuthenticated ? 'Launch Dashboard' : 'Sign In'}
                        </span>
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                      <a
                        href="#api-overview"
                        className="inline-flex items-center gap-2 rounded-full border border-[#161211]/20 bg-white px-5 py-3 text-sm font-semibold text-[#161211] transition hover:border-[#161211]/45 lg:py-3.5"
                      >
                        <span>Explore API Docs</span>
                      </a>
                    </div>

                    <div className="hidden pt-1 lg:block">
                      <CallFlowHeroPreview />
                    </div>
                  </motion.div>
                </div>
              </div>
            </section>
          </div>
        </div>

        {/* Stacked Hero Preview below the sticky 3D Hero fold on viewports < 1024px */}
        <div className="relative z-20 mx-auto max-w-xl bg-white px-4 pb-8 pt-2 sm:px-6 lg:hidden">
          <CallFlowHeroPreview />
        </div>

        {/* Below-the-fold CallFlow Capabilities & API Overview */}
        <FeatureOverview isAuthenticated={isAuthenticated} onTryDemo={handleTryDemo} />
      </div>
    </MotionConfig>
  );
}
