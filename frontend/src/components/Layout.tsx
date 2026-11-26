import { ReactNode, useState, useEffect, useRef } from 'react';
import { 
  DatabaseZap, ShieldCheck, ArrowUp, ArrowRight, ArrowLeft, LogOut, User,
  Menu, Lock, CheckCircle2
} from 'lucide-react';
import TourGuide, { TourTriggerButton } from './TourGuide';

type Props = { 
  children: ReactNode; 
  active: string; 
  onNav: (tab: string) => void; 
  hasProject: boolean; 
  onLogout: () => void;
  onNewMigration?: () => void;
  isDemoMode?: boolean;
  onContactDemo?: () => void;
  nextDisabled?: boolean;
  nextDisabledHint?: string;
};

const phases = [
  {
    id: 1,
    label: 'Phase 1',
    title: 'Discover',
    stages: ['Upload Models', '360 Summary', 'File Processing Tree', 'TDE Source Recovery', 'Source Overview'],
  },
  {
    id: 2,
    label: 'Phase 2',
    title: 'Prepare',
    stages: ['Source Mapping', 'Preview & Types', 'Relationships'],
  },
  {
    id: 3,
    label: 'Phase 3',
    title: 'Convert',
    stages: ['Calculations', 'M Query', 'Final Tables', 'Visual Plan', 'Validation', 'Export'],
  },
];

const orderedStages = [
  'Landing',
  'Upload',
  'Upload Models',
  '360 Summary',
  'File Processing Tree',
  'TDE Source Recovery',
  'Source Overview',
  'Source Mapping',
  'Preview & Types',
  'Relationships',
  'Calculations',
  'M Query',
  'Final Tables',
  'Visual Plan',
  'Validation',
  'Export'
];

export default function Layout({ children, active, onNav, hasProject, onLogout, onNewMigration, isDemoMode, onContactDemo, nextDisabled, nextDisabledHint }: Props) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [isScrollingTop, setIsScrollingTop] = useState(false);
  const [maxReachedIdx, setMaxReachedIdx] = useState<number>(2);
  const [tourOpen, setTourOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const mainPanelRef = useRef<HTMLElement>(null);

  const currentIdx = orderedStages.indexOf(active);

  useEffect(() => {
    if (!hasProject || active === 'Landing' || active === 'Upload') {
      setMaxReachedIdx(2);
      return;
    }
    if (currentIdx > maxReachedIdx) {
      setMaxReachedIdx(currentIdx);
    }
  }, [hasProject, active, currentIdx, maxReachedIdx]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const storedEmail = typeof window !== 'undefined' ? sessionStorage.getItem('t2pbi_user_email') : null;
  const userEmail = isDemoMode
    ? 'vtabpublicuser@gmail.com'
    : (storedEmail || 'vtabpublicuser@gmail.com');
  const userName = isDemoMode
    ? 'Demo User'
    : (userEmail.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Workbench User');

  // Demo Version Only: Dynamic visibility based on 300px scroll threshold
  useEffect(() => {
    if (!isDemoMode) {
      setShowScrollTop(true);
      return;
    }

    const checkScroll = () => {
      const scrollY = window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || mainPanelRef.current?.scrollTop || 0;
      setShowScrollTop(scrollY > 300);
      if (scrollY <= 50) {
        setIsScrollingTop(false);
      }
    };

    checkScroll();

    window.addEventListener('scroll', checkScroll, { passive: true, capture: true });

    return () => {
      window.removeEventListener('scroll', checkScroll, { capture: true });
    };
  }, [isDemoMode, active]);

  const handleScrollToTop = () => {
    if (isScrollingTop) return;
    setIsScrollingTop(true);

    window.scrollTo({ top: 0, behavior: 'smooth' });
    document.getElementById('pageTop')?.scrollIntoView({ behavior: 'smooth' });
    if (mainPanelRef.current) {
      mainPanelRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }

    if (isDemoMode) {
      const timer = setTimeout(() => {
        const scrollY = window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || mainPanelRef.current?.scrollTop || 0;
        if (scrollY <= 300) {
          setShowScrollTop(false);
          setIsScrollingTop(false);
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  };

  const handleNav = (tab: string) => {
    onNav(tab);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const prevStage = currentIdx > 0 ? orderedStages[currentIdx - 1] : null;
  const canGoPrev = prevStage && (hasProject || ['Landing', 'Upload', 'Upload Models'].includes(prevStage));
  const nextStage = currentIdx >= 0 && currentIdx < orderedStages.length - 1 ? orderedStages[currentIdx + 1] : null;
  const canGoNext = nextStage && (hasProject || ['Upload', 'Upload Models'].includes(nextStage));

  const activePhase = phases.find((p) => p.stages.includes(active)) || null;

  const TopNavLinks = () => null;

  return (
    <div className="appShell topNavShell">
      <header className="globalHeader">
        <div className="headerBrand" style={{ display: 'flex', alignItems: 'center' }}>
          <DatabaseZap size={24}/>
          <div>
            <b>TABLEAU2PBI</b>
            <span>Migration Workbench</span>
          </div>
          {isDemoMode ? (
            <div 
              className="demoVersionPillBadge" 
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '3px 10px',
                background: 'rgba(245, 158, 11, 0.15)',
                border: '1px solid rgba(245, 158, 11, 0.35)',
                borderRadius: '999px',
                fontSize: '11px',
                fontWeight: 700,
                color: '#f59e0b',
                letterSpacing: '0.03em',
                marginLeft: '12px'
              }}
            >
              <Lock size={11} />
              <span>DEMO VERSION</span>
            </div>
          ) : (
            <div 
              className="prodVersionPillBadge" 
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '3px 10px',
                background: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid rgba(16, 185, 129, 0.35)',
                borderRadius: '999px',
                fontSize: '11px',
                fontWeight: 700,
                color: '#10b981',
                letterSpacing: '0.03em',
                marginLeft: '12px'
              }}
            >
              <span>PRODUCTION</span>
            </div>
          )}
        </div>

        <div className="desktopNavSpacer" />

        <div className="headerActions">
          <div className="safeModePill"><ShieldCheck size={14}/> Safe Mode</div>
          <TourTriggerButton
            active={tourOpen}
            onClick={() => {
              if (active !== 'Landing') {
                handleNav('Landing');
                setTimeout(() => setTourOpen(true), 80);
              } else {
                setTourOpen((o) => !o);
              }
            }}
          />
          {!isDemoMode && (
            <a 
              href="/demo" 
              className="modeSwitchLink" 
              title="Open Tableau Demo Version (Direct Access without Login)"
            >
              <span>Explore Demo</span>
              <ArrowRight size={13} />
            </a>
          )}
          <div className="profileDropdownContainer" ref={profileRef}>
            <button 
              className={`iconBtn userProfileBtn ${profileOpen ? 'active' : ''}`} 
              onClick={() => setProfileOpen(!profileOpen)}
              title="User Profile & Settings"
              aria-expanded={profileOpen}
            >
              <User size={18}/>
            </button>

            {profileOpen && (
              <div className="profileDropdownMenu">
                <div className="profileDropdownHeader">
                  <div className="profileAvatarLarge">
                    {(userEmail[0] || 'A').toUpperCase()}
                  </div>
                  <div className="profileInfo">
                    <div className="profileNameRow">
                      <b>{userName}</b>
                      <span className="profileRoleBadge">{isDemoMode ? 'Demo' : 'Enterprise'}</span>
                    </div>
                    <span className="profileEmail">{userEmail}</span>
                  </div>
                </div>

                <div className="profileDivider" />

                <div className="profileDetailsGrid">
                  <div className="profileDetailItem">
                    <span className="detailLabel">Workspace</span>
                    <b className="detailValue">{isDemoMode ? 'Interactive Demo' : 'Enterprise Prod'}</b>
                  </div>
                  <div className="profileDetailItem">
                    <span className="detailLabel">Pipeline Engine</span>
                    <b className="detailValue">15-Stage Automated</b>
                  </div>
                  <div className="profileDetailItem">
                    <span className="detailLabel">Workbench Version</span>
                    <b className="detailValue">v11.6.2 Enterprise</b>
                  </div>
                  <div className="profileDetailItem">
                    <span className="detailLabel">Safe Openable Mode</span>
                    <b className="detailValue greenText">Active (Default)</b>
                  </div>
                </div>

                <div className="profileDivider" />

                <div className="profileActions">
                  <button 
                    type="button" 
                    className="profileLogoutBtn" 
                    onClick={() => { setProfileOpen(false); onLogout(); }}
                  >
                    <LogOut size={15} />
                    <span>{isDemoMode ? 'Reset Demo Session' : 'Sign Out of Workbench'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
          <button 
            className="iconBtn signoutBtn" 
            onClick={onLogout} 
            title={isDemoMode ? "Reset Demo Session" : "Sign Out"}
          >
            <LogOut size={18}/>
          </button>
          <button className="mobileMenuToggle" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            <Menu size={20}/>
          </button>
        </div>
      </header>

      {mobileMenuOpen && (
        <div className="mobileNavOverlay">
          <TopNavLinks />
        </div>
      )}

      <main className="mainPanel" ref={mainPanelRef}>
        <div id="pageTop"/>
        {hasProject && activePhase && (
          <div className="phaseCenterBar">
            <div className="phaseCenterHeader">
              <div className="phaseTitleBadge">
                <span className="phaseNumPill">{activePhase.label} of 3</span>
                <strong>{activePhase.title}</strong>
              </div>
            </div>

            <div className="phaseSubstagesRow">
              {activePhase.stages.map((stageName, idx) => {
                const stageIdx = orderedStages.indexOf(stageName);
                const isActive = active === stageName;
                const isUnlocked = stageIdx >= 0 && stageIdx <= maxReachedIdx;
                const isDone = stageIdx >= 0 && stageIdx < maxReachedIdx && !isActive;
                const isLockedExport = stageName === 'Export' && isDemoMode;
                const isLocked = !isUnlocked || isLockedExport;
                return (
                  <button
                    key={stageName}
                    type="button"
                    disabled={!isUnlocked}
                    title={!isUnlocked ? 'Complete previous stages using Proceed to unlock' : undefined}
                    className={`phaseSubstagePill ${isActive ? 'active' : ''} ${isDone ? 'done' : ''} ${!isUnlocked ? 'locked' : ''}`}
                    onClick={() => {
                      if (!isUnlocked) return;
                      if (isLockedExport && onContactDemo) {
                        onContactDemo();
                      } else {
                        handleNav(stageName);
                      }
                    }}
                  >
                    <span className="phaseSubStepIcon">
                      {isLocked ? <Lock size={12} /> : isDone ? <CheckCircle2 size={13} /> : idx + 1}
                    </span>
                    <span>{stageName}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
        <div className="pageContentWrapper">
          {children}
          
          {active !== 'Landing' && (prevStage || nextStage) && (
            <div className="stageFooterNav">
              <div className="stageFooterInner">
                {prevStage ? (
                  <button
                    type="button"
                    className="stageBackBtn"
                    disabled={!canGoPrev}
                    onClick={() => handleNav(prevStage)}
                  >
                    <ArrowLeft size={18} /> Back to {prevStage}
                  </button>
                ) : (
                  <div />
                )}

                {nextStage && (
                  nextStage === 'Export' && isDemoMode ? (
                    <button 
                      type="button"
                      className="primary lockedDemoBtn" 
                      onClick={() => { if (onContactDemo) onContactDemo(); }}
                      style={{ padding: '12px 24px', fontSize: '15px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                    >
                      <Lock size={16} /> Proceed to Export <span className="lockedPill">Locked in Demo</span>
                    </button>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                      <button 
                        className={`primary ${nextDisabled ? 'stageNextLocked' : ''}`} 
                        disabled={!canGoNext || Boolean(nextDisabled)} 
                        onClick={() => handleNav(nextStage)}
                        title={nextDisabled ? nextDisabledHint : undefined}
                        style={{ padding: '12px 24px', fontSize: '15px' }}
                      >
                        {nextDisabled && <Lock size={16} />}
                        Proceed to {nextStage} <ArrowRight size={18}/>
                      </button>
                      {nextDisabled && nextDisabledHint && (
                        <span className="stageLockHint">{nextDisabledHint}</span>
                      )}
                    </div>
                  )
                )}
              </div>
            </div>
          )}
        </div>
        <button 
          className={`goTop ${isDemoMode ? `demoGoTop ${showScrollTop ? 'visible' : 'hidden'}` : ''}`} 
          onClick={handleScrollToTop}
          disabled={isDemoMode && isScrollingTop}
          aria-label="Scroll to top of page"
        >
          <ArrowUp size={18}/> Top
        </button>
      </main>
      <TourGuide open={tourOpen} onClose={() => setTourOpen(false)} />
    </div>
  );
}
