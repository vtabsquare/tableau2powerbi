import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { Lock } from 'lucide-react';
import Layout from './components/Layout';
import NewMigrationModal from './components/NewMigrationModal';
import ContactDemoModal from './components/ContactDemoModal';
import Login from './pages/Login';
import FileProcessingTree from './pages/FileProcessingTree';
import Landing from './pages/Landing';
import Upload from './pages/Upload';
import UploadModels from './pages/UploadModels';
import Summary from './pages/Summary';
import SourceOverview from './pages/SourceOverview';
import SourceMapping from './pages/SourceMapping';
import PreviewTypes from './pages/PreviewTypes';
import Relationships from './pages/Relationships';
import Calculations from './pages/Calculations';
import MQuery from './pages/MQuery';
import FinalTables from './pages/FinalTables';
import VisualPlan from './pages/VisualPlan';
import Validation from './pages/Validation';
import TDEStrategy from './pages/TDEStrategy';
import ExportPage from './pages/Export';
import { MigrationProject } from './types/project';
import { checkSession, isDemoRoute, getDemoSession } from './services/api';
import './styles.css';

function isAuthorizedDemoUser(): boolean {
  if (typeof window === 'undefined') return false;
  if (isDemoRoute()) return true;
  const canDemo = sessionStorage.getItem('t2pbi_can_demo');
  if (canDemo === 'true') return true;
  if (canDemo === 'false') return false;
  const email = (sessionStorage.getItem('t2pbi_user_email') || '').trim().toLowerCase();
  return email === 'vtabpublicuser@gmail.com' || email === 'vtabpubicuser@gmail.com';
}

function App() {
  const [isDemoMode, setIsDemoMode] = useState<boolean>(() => isDemoRoute());
  const [authenticated, setAuthenticated] = useState<boolean>(() => {
    if (isDemoRoute()) return true;
    return sessionStorage.getItem('t2pbi_authenticated') === 'true';
  });
  const [canUseDemoFlow, setCanUseDemoFlow] = useState<boolean>(() => {
    if (isDemoRoute()) return true;
    return isAuthorizedDemoUser();
  });
  const [isNewMigrationModalOpen, setIsNewMigrationModalOpen] = useState(false);
  const [isContactDemoModalOpen, setIsContactDemoModalOpen] = useState(false);
  const [active, setActive] = useState('Landing');
  const [project, setProject] = useState<MigrationProject>();
  const [ssoLoading, setSsoLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const isDemo = isDemoMode || canUseDemoFlow || isAuthorizedDemoUser();

  // Listen for route changes (popstate or hashchange)
  useEffect(() => {
    function handleRouteChange() {
      const demo = isDemoRoute();
      setIsDemoMode(demo);
      if (demo) {
        setAuthenticated(true);
        setCanUseDemoFlow(true);
      } else {
        const isAuth = sessionStorage.getItem('t2pbi_authenticated') === 'true';
        setAuthenticated(isAuth);
        setCanUseDemoFlow(isAuthorizedDemoUser());
      }
    }
    window.addEventListener('popstate', handleRouteChange);
    window.addEventListener('hashchange', handleRouteChange);
    return () => {
      window.removeEventListener('popstate', handleRouteChange);
      window.removeEventListener('hashchange', handleRouteChange);
    };
  }, []);

  // Demo initialization
  useEffect(() => {
    if (isDemoMode) {
      setAuthenticated(true);
      setCanUseDemoFlow(true);
      getDemoSession().catch(() => {});
    }
  }, [isDemoMode]);

  useEffect(() => {
    if (!isDemo) return;

    let timer: any;

    function showToast(msg: string) {
      setToastMessage(msg);
      clearTimeout(timer);
      timer = setTimeout(() => setToastMessage(null), 3500);
    }

    function handleCutCopy(e: ClipboardEvent) {
      const target = e.target as HTMLElement | null;
      // Allow copying inside ContactDemoModal (e.g. for copying sales email address)
      if (target?.closest('.vtabEmailCopyBox') || target?.closest('.vtabModalCard')) {
        return;
      }

      e.preventDefault();
      if (e.clipboardData) {
        e.clipboardData.clearData();
      }
      showToast('Cut & Copy is restricted in the demo version. Contact sales for full enterprise export.');
    }

    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'C' || e.key === 'x' || e.key === 'X')) {
        const target = e.target as HTMLElement | null;
        if (target?.closest('.vtabEmailCopyBox') || target?.closest('.vtabModalCard')) {
          return;
        }
        e.preventDefault();
        showToast('Cut & Copy is restricted in the demo version. Contact sales for full enterprise export.');
      }
    }

    function handleContextMenu(e: MouseEvent) {
      const target = e.target as HTMLElement | null;
      if (target?.closest('.vtabModalCard')) {
        return;
      }
      e.preventDefault();
      showToast('Context menu is restricted in the demo version to protect proprietary model logic.');
    }

    window.addEventListener('copy', handleCutCopy);
    window.addEventListener('cut', handleCutCopy);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('contextmenu', handleContextMenu);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('copy', handleCutCopy);
      window.removeEventListener('cut', handleCutCopy);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [isDemo]);

  useEffect(() => {
    if (authenticated) {
      checkSession()
        .then(sess => {
          if (sess.authenticated) {
            const canDemo = Boolean(sess.can_use_demo_flow);
            setCanUseDemoFlow(canDemo);
            sessionStorage.setItem('t2pbi_can_demo', canDemo ? 'true' : 'false');
          }
        })
        .catch(() => {});
    } else {
      setCanUseDemoFlow(false);
      sessionStorage.removeItem('t2pbi_can_demo');
      sessionStorage.removeItem('t2pbi_token');
    }
  }, [authenticated]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (token) {
      setSsoLoading(true);
      fetch('/api/auth/vtab-sso', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      })
      .then(res => res.json())
      .then(data => {
        if (data.authenticated) {
          sessionStorage.setItem('t2pbi_authenticated', 'true');
          if (data.token) sessionStorage.setItem('t2pbi_token', data.token);
          sessionStorage.setItem('t2pbi_can_demo', data.can_use_demo_flow ? 'true' : 'false');
          setCanUseDemoFlow(Boolean(data.can_use_demo_flow));
          setAuthenticated(true);
          // Remove token from URL
          window.history.replaceState({}, document.title, window.location.pathname);
        } else {
          alert('SSO Failed: ' + data.detail);
        }
      })
      .catch(err => {
        console.error('SSO error:', err);
        alert('SSO Error: ' + err.message);
      })
      .finally(() => setSsoLoading(false));
    }
  }, []);

  const handleNewMigration = () => {
    if (canUseDemoFlow || isAuthorizedDemoUser()) {
      setIsNewMigrationModalOpen(true);
    } else {
      setActive('Upload');
    }
  };

  const handleLogout = () => {
    if (isDemoMode) {
      sessionStorage.removeItem('t2pbi_demo_project_id');
      setProject(undefined);
      setActive('Landing');
      setIsNewMigrationModalOpen(false);
      setToastMessage('Demo session reset. Direct demo access remains active without login.');
      return;
    }

    sessionStorage.removeItem('t2pbi_authenticated');
    sessionStorage.removeItem('t2pbi_token');
    sessionStorage.removeItem('t2pbi_can_demo');
    sessionStorage.removeItem('t2pbi_user_email');
    setAuthenticated(false);
    setCanUseDemoFlow(false);
    setIsNewMigrationModalOpen(false);
    setProject(undefined);
    setActive('Landing');
  };

  const requireProject = (page: React.ReactNode) => project ? page : <Upload project={project} setProject={setProject} onLoaded={() => setActive('360 Summary')}/>;
  const content = (() => {
    switch(active) {
      case 'Landing': return <Landing onStart={handleNewMigration}/>;
      case 'Upload': return <Upload project={project} setProject={setProject} onLoaded={() => setActive('Upload Models')}/>;
      case 'Upload Models': return <UploadModels project={project}/>;
      case '360 Summary': return requireProject(<Summary project={project!} onDeleted={() => { setProject(undefined); setActive('Upload'); }}/>);
      case 'File Processing Tree': return requireProject(<FileProcessingTree project={project!}/>);
      case 'TDE Source Recovery': return requireProject(<TDEStrategy project={project!} setProject={setProject}/>);
      case 'Source Overview': return requireProject(<SourceOverview project={project!}/>);
      case 'Source Mapping': return requireProject(<SourceMapping project={project!} setProject={setProject}/>);
      case 'Preview & Types': return requireProject(<PreviewTypes project={project!}/>);
      case 'Relationships': return requireProject(<Relationships project={project!} setProject={setProject}/>);
      case 'Calculations': return requireProject(<Calculations project={project!}/>);
      case 'M Query': return requireProject(<MQuery project={project!} isDemoMode={isDemo} onContactDemo={() => setIsContactDemoModalOpen(true)}/>);
      case 'Final Tables': return requireProject(<FinalTables project={project!}/>);
      case 'Visual Plan': return requireProject(<VisualPlan project={project!}/>);
      case 'Validation': return requireProject(<Validation project={project!}/>);
      case 'Export': return requireProject(<ExportPage project={project!} isDemoMode={canUseDemoFlow || isAuthorizedDemoUser()} onContactDemo={() => setIsContactDemoModalOpen(true)}/>);
      default: return <Landing onStart={handleNewMigration}/>;
    }
  })();

  if (ssoLoading) return <div style={{display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: '#0f172a', color: 'white', fontFamily: 'system-ui'}}>Logging you in securely...</div>;
  if (!isDemoMode && !authenticated) return <Login onAuthenticated={() => setAuthenticated(true)}/>;

  return (
    <>
      <Layout 
        active={active} 
        onNav={setActive} 
        hasProject={!!project} 
        onLogout={handleLogout}
        onNewMigration={handleNewMigration}
        isDemoMode={isDemo}
        onContactDemo={() => setIsContactDemoModalOpen(true)}
      >
        {content}
      </Layout>

      {isDemo && (
        <NewMigrationModal 
          isOpen={isNewMigrationModalOpen}
          onClose={() => setIsNewMigrationModalOpen(false)}
          onSuccess={(newProject) => {
            setProject(newProject);
            setIsNewMigrationModalOpen(false);
            setActive('Upload Models');
          }}
        />
      )}

      {isDemo && (
        <ContactDemoModal
          isOpen={isContactDemoModalOpen}
          onClose={() => setIsContactDemoModalOpen(false)}
        />
      )}

      {toastMessage && (
        <div className="demoToastOverlay" role="alert">
          <div className="demoToastCard">
            <Lock size={16} className="demoToastIcon" />
            <span>{toastMessage}</span>
            <button 
              type="button" 
              className="demoToastBtn"
              onClick={() => {
                setToastMessage(null);
                setIsContactDemoModalOpen(true);
              }}
            >
              Contact Sales
            </button>
          </div>
        </div>
      )}
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
