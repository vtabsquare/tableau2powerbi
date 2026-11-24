import { useState } from 'react';
import { Download, Lock, ShieldAlert } from 'lucide-react';
import { Card, Badge } from '../components/Cards';
import { MigrationProject } from '../types/project';
import { downloadExportPackage, exportProject } from '../services/api';

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

  return <div className="page">
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

    <Card title="PBIP Export Package" right={<Badge tone={isDemoMode ? 'warn' : (project.health_status === 'Blocked' ? 'bad' : 'good')}>{isDemoMode ? 'Demo Locked' : project.health_status}</Badge>}>
      <p>The export includes a Power BI PBIP safe-mode skeleton, semantic model JSON, Power Query review files, DAX review files, validation report, source mapping file, lineage JSON, TDE extract strategy, reconciliation plan and visual build plan.</p>
      <div className="actions">
        {isDemoMode ? (
          <button 
            type="button"
            className="primary lockedDemoBtn" 
            onClick={onContactDemo}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
          >
            <Lock size={16}/> Export Locked (Contact Demo)
          </button>
        ) : (
          <button className="primary" onClick={runExport} disabled={busy}>
            <Download size={16}/>{busy ? 'Generating and downloading...' : 'Generate Export Package'}
          </button>
        )}
        {downloadUrl && !isDemoMode && <a className="download" href={downloadUrl} download>Download Package Again</a>}
      </div>
      {error && <div className="error">{error}</div>}
      <div className="note">Safe Openable Mode is default. Unsupported Tableau logic stays in the migration report instead of being written as invalid Power BI artifacts. Legacy .tde files are exported as strategy/validation artifacts, not as refreshable Power BI sources.</div>
    </Card>
  </div>;
}
