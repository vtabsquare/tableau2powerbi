import { ReactNode, useState, useEffect, useRef } from 'react';
import { 
  DatabaseZap, ShieldCheck, ArrowUp, ArrowRight, LogOut, User,
  ChevronDown, Menu, Lock
} from 'lucide-react';

type Props = { 
  children: ReactNode; 
  active: string; 
  onNav: (tab: string) => void; 
  hasProject: boolean; 
  onLogout: () => void;
  onNewMigration?: () => void;
  isDemoMode?: boolean;
  onContactDemo?: () => void;
};

const navGroups = {
  discover: ['Upload Models', '360 Summary', 'File Processing Tree', 'TDE Source Recovery', 'Source Overview'],
  prepare: ['Source Mapping', 'Preview & Types', 'Relationships'],
  convert: ['Calculations', 'M Query', 'Final Tables', 'Visual Plan']
};

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

export default function Layout({ children, active, onNav, hasProject, onLogout, onNewMigration, isDemoMode, onContactDemo }: Props) {
  const [projectsMenuOpen, setProjectsMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [isScrollingTop, setIsScrollingTop] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const mainPanelRef = useRef<HTMLElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setProjectsMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
    setProjectsMenuOpen(false);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const currentIdx = orderedStages.indexOf(active);
  const nextStage = currentIdx >= 0 && currentIdx < orderedStages.length - 1 ? orderedStages[currentIdx + 1] : null;
  const canGoNext = nextStage && (hasProject || ['Upload', 'Upload Models'].includes(nextStage));

  const TopNavLinks = () => (
    <>
      <button className={active === 'Landing' ? 'active' : ''} onClick={() => handleNav('Landing')}>Dashboard</button>
      <button className={active === 'Upload' ? 'active' : ''} onClick={() => { if (onNewMigration) onNewMigration(); else handleNav('Upload'); }}>New Migration</button>
      
      <div className="dropdownContainer" ref={menuRef} style={{ display: 'flex', alignItems: 'center' }}>
        <button 
          className={['Upload Models', '360 Summary', 'File Processing Tree', 'TDE Source Recovery', 'Source Overview', 'Source Mapping', 'Preview & Types', 'Relationships', 'Calculations', 'M Query', 'Final Tables', 'Visual Plan'].includes(active) ? 'active' : ''}
          onClick={() => setProjectsMenuOpen(!projectsMenuOpen)}
          disabled={!hasProject}
        >
          Projects <ChevronDown size={14}/>
        </button>
        {projectsMenuOpen && hasProject && (
          <div className="megaMenu">
            <div className="megaMenuColumn">
              <h4>DISCOVER</h4>
              {navGroups.discover.map(tab => (
                <a key={tab} onClick={() => handleNav(tab)} className={active === tab ? 'active' : ''}>{tab}</a>
              ))}
            </div>
            <div className="megaMenuColumn">
              <h4>PREPARE</h4>
              {navGroups.prepare.map(tab => (
                <a key={tab} onClick={() => handleNav(tab)} className={active === tab ? 'active' : ''}>{tab}</a>
              ))}
            </div>
            <div className="megaMenuColumn">
              <h4>CONVERT</h4>
              {navGroups.convert.map(tab => (
                <a key={tab} onClick={() => handleNav(tab)} className={active === tab ? 'active' : ''}>{tab}</a>
              ))}
            </div>
          </div>
        )}
      </div>

      <button className={active === 'Validation' ? 'active' : ''} onClick={() => handleNav('Validation')} disabled={!hasProject}>Validation</button>
      <button 
        className={active === 'Export' ? 'active' : ''} 
        onClick={() => { 
          if (isDemoMode && onContactDemo) { 
            onContactDemo(); 
          } else { 
            handleNav('Export'); 
          } 
        }} 
        disabled={!hasProject}
      >
        Exports {isDemoMode && <Lock size={12} style={{ marginLeft: 4, verticalAlign: 'middle', opacity: 0.85 }} />}
      </button>
    </>
  );

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

        <nav className="desktopNav">
          <TopNavLinks />
        </nav>

        <div className="headerActions">
          <div className="safeModePill"><ShieldCheck size={14}/> Safe Mode</div>
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
          <button className="iconBtn userProfileBtn" title="User Profile"><User size={18}/></button>
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
        <div className="pageContentWrapper">
          {children}
          
          {nextStage && (
            <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid #E2E8F0', paddingTop: '24px' }}>
              {nextStage === 'Export' && isDemoMode ? (
                <button 
                  type="button"
                  className="primary lockedDemoBtn" 
                  onClick={() => { if (onContactDemo) onContactDemo(); }}
                  style={{ padding: '12px 24px', fontSize: '15px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                >
                  <Lock size={16} /> Proceed to Export <span className="lockedPill">Locked in Demo</span>
                </button>
              ) : (
                <button 
                  className="primary" 
                  disabled={!canGoNext} 
                  onClick={() => handleNav(nextStage)}
                  style={{ padding: '12px 24px', fontSize: '15px' }}
                >
                  Proceed to {nextStage} <ArrowRight size={18}/>
                </button>
              )}
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
    </div>
  );
}
