import { useState } from 'react';
import {
  Download,
  Lock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Layers,
  Folder,
  Braces,
  Database,
  FileCode2,
  ShieldCheck,
  Link2,
  GitBranch,
  FileText,
  ClipboardCheck,
  BarChart3,
  ArrowRight,
  Info,
} from 'lucide-react';
import { MigrationProject } from '../types/project';
import { downloadExportPackage, exportProject } from '../services/api';

const EXPORT_ARTIFACTS = [
  { label: 'PBIP Safe-Mode Skeleton', icon: <Folder size={19} /> },
  { label: 'Semantic Model JSON', icon: <Braces size={19} /> },
  { label: 'Power Query Review Files', icon: <Database size={19} /> },
  { label: 'DAX Review Files', icon: <FileCode2 size={19} /> },
  { label: 'Validation Report', icon: <ShieldCheck size={19} /> },
  { label: 'Source Mapping File', icon: <Link2 size={19} /> },
  { label: 'Lineage JSON', icon: <GitBranch size={19} /> },
  { label: 'TDE Extract Strategy', icon: <FileText size={19} /> },
  { label: 'Reconciliation Plan', icon: <ClipboardCheck size={19} /> },
  { label: 'Visual Build Plan', icon: <BarChart3 size={19} /> },
];

function PbipIllustration() {
  return (
    <svg width="210" height="165" viewBox="0 0 210 165" fill="none" xmlns="http://www.w3.org/2000/svg" className="expIllustrationSvg">
      {/* Soft shadow */}
      <ellipse cx="105" cy="146" rx="76" ry="11" fill="#E0E7FF" opacity="0.8" />
      {/* Back documents */}
      <rect x="68" y="16" width="68" height="84" rx="8" fill="#E2E8F0" transform="rotate(-6 68 16)" />
      <rect x="78" y="12" width="72" height="88" rx="8" fill="#F8FAFC" stroke="#CBD5E1" strokeWidth="1.5" />
      <line x1="90" y1="30" x2="136" y2="30" stroke="#CBD5E1" strokeWidth="3" strokeLinecap="round" />
      <line x1="90" y1="42" x2="128" y2="42" stroke="#E2E8F0" strokeWidth="3" strokeLinecap="round" />
      <line x1="90" y1="54" x2="132" y2="54" stroke="#E2E8F0" strokeWidth="3" strokeLinecap="round" />
      {/* Folder back flap */}
      <path d="M36 44C36 37.3726 41.3726 32 48 32H83.5C87.1 32 90.5 33.6 92.8 36.4L99 44H158C164.627 44 170 49.3726 170 56V124C170 130.627 164.627 136 158 136H48C41.3726 136 36 130.627 36 124V44Z" fill="#6366F1" />
      {/* Folder front body */}
      <rect x="34" y="54" width="138" height="84" rx="12" fill="url(#pbipGrad)" />
      {/* Power BI gold bars */}
      <rect x="82" y="88" width="9" height="18" rx="2.5" fill="#F59E0B" />
      <rect x="95" y="79" width="9" height="27" rx="2.5" fill="#FBBF24" />
      <rect x="108" y="70" width="9" height="36" rx="2.5" fill="#FDE047" />
      {/* .PBIP label */}
      <text x="101" y="124" textAnchor="middle" fill="#FFFFFF" fontSize="14" fontWeight="800" fontFamily="Inter, system-ui, sans-serif" letterSpacing="0.06em">
        .PBIP
      </text>
      {/* Floating mini chart card */}
      <rect x="148" y="68" width="46" height="38" rx="8" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="1.5" />
      <rect x="157" y="86" width="6" height="12" rx="1.5" fill="#818CF8" />
      <rect x="166" y="80" width="6" height="18" rx="1.5" fill="#6366F1" />
      <rect x="175" y="75" width="6" height="23" rx="1.5" fill="#4F46E5" />
      <defs>
        <linearGradient id="pbipGrad" x1="34" y1="54" x2="172" y2="138" gradientUnits="userSpaceOnUse">
          <stop stopColor="#6366F1" />
          <stop offset="1" stopColor="#4338CA" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export default function ExportPage({
  project,
  isDemoMode,
  onContactDemo
}: {
  project: MigrationProject;
  isDemoMode?: boolean;
  onContactDemo?: () => void;
}) {
  const [downloadUrl, setDownloadUrl] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const tone = isDemoMode
    ? 'warn'
    : project.health_status === 'Ready'
    ? 'good'
    : project.health_status === 'Blocked'
    ? 'bad'
    : 'warn';

  function renderStatusIcon() {
    if (isDemoMode) return <Lock size={15} />;
    if (tone === 'good') return <CheckCircle2 size={15} />;
    if (tone === 'bad') return <XCircle size={15} />;
    return <AlertTriangle size={15} />;
  }

  async function runExport() {
    if (isDemoMode) {
      if (onContactDemo) onContactDemo();
      return;
    }
    setBusy(true);
    setError(undefined);
    setDownloadUrl(undefined);
    try {
      const result = await exportProject(project.project_id);
      const url = result.absolute_download_url || result.download_url;
      setDownloadUrl(url);
      await downloadExportPackage(url, `${project.project_name || 'tableau2pbi'}_PowerBI_Migration_Package.zip`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page">
      {isDemoMode && (
        <div className="demoLockExportBanner">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="demoLockIconWrap">
              <Lock size={20} color="#DC2626" />
            </div>
            <div>
              <b style={{ color: '#991B1B', fontSize: 15, display: 'block' }}>PBIP Export Package Locked in Demo Version</b>
              <p style={{ margin: '4px 0 0', color: '#7F1D1D', fontSize: 13 }}>
                Generating and downloading complete Power BI (.pbip) packages is an enterprise capability. Please contact our demo team to unlock full export access.
              </p>
            </div>
          </div>
          <button
            type="button"
            className="contactDemoBtnBanner"
            onClick={onContactDemo}
          >
            Contact Demo Support
          </button>
        </div>
      )}

      <div className="expShell">
        {/* Header */}
        <div className="expHeader">
          <div className="expHeaderLeft">
            <div className="expBadgeIcon">
              <Download size={22} />
            </div>
            <div>
              <h2>PBIP Export Package</h2>
              <p>
                The export includes a Power BI PBIP safe-mode skeleton, semantic model JSON, Power Query review files, DAX review files, validation report, source mapping file, lineage JSON, TDE extract strategy, reconciliation plan and visual build plan.
              </p>
            </div>
          </div>

          <span className={`s360HealthPill ${tone}`}>
            {renderStatusIcon()}
            <span>{isDemoMode ? 'Demo Locked' : project.health_status}</span>
          </span>
        </div>

        {/* Main Content + Illustration */}
        <div className="expMainRow">
          <div className="expLeftCol">
            <div className="expIncludesBox">
              <div className="expIncludesHeader">
                <Layers size={16} className="expIncludesIcon" />
                <b>Export Package Includes</b>
              </div>
              <div className="expArtifactsGrid">
                {EXPORT_ARTIFACTS.map((item) => (
                  <div className="expArtifactTile" key={item.label}>
                    <span className="expArtifactIcon">{item.icon}</span>
                    <span className="expArtifactLabel">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="expActionsRow">
              {isDemoMode ? (
                <button
                  type="button"
                  className="primary lockedDemoBtn expGenerateBtn"
                  onClick={onContactDemo}
                >
                  <Lock size={16} />
                  <span>Export Locked (Contact Demo)</span>
                </button>
              ) : (
                <button
                  type="button"
                  className="expGenerateBtn"
                  onClick={runExport}
                  disabled={busy}
                >
                  <Download size={17} />
                  <span>{busy ? 'Generating and downloading...' : 'Generate Export Package'}</span>
                  {!busy && <ArrowRight size={17} />}
                </button>
              )}

              {downloadUrl && !isDemoMode && (
                <a className="expDownloadAgain" href={downloadUrl} download>
                  Download Package Again
                </a>
              )}
            </div>

            {error && <div className="error">{error}</div>}
          </div>

          <div className="expIllustrationCol">
            <PbipIllustration />
          </div>
        </div>

        {/* Bottom Safe Mode Banner */}
        <div className="expInfoBanner">
          <div className="expInfoIconCircle">
            <Info size={15} />
          </div>
          <span>
            <b>Safe Openable Mode is default.</b> Unsupported Tableau logic stays in the migration report instead of being written as invalid Power BI artifacts. Legacy <code>.tde</code> files are exported as strategy/validation artifacts, not as refreshable Power BI sources.
          </span>
        </div>
      </div>
    </div>
  );
}
