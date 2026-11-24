import { useState, useRef, DragEvent } from 'react';
import { Upload as UploadIcon, Folder, Info, ShieldAlert, BookOpenCheck, X } from 'lucide-react';
import { Card, Badge } from '../components/Cards';
import DataTable from '../components/DataTable';
import { MigrationProject } from '../types/project';
import { loadDemo, uploadProject } from '../services/api';

function UploadIllustration() {
  return (
    <svg width="90" height="72" viewBox="0 0 90 72" fill="none" xmlns="http://www.w3.org/2000/svg" className="uploadIllustration">
      {/* Background papers */}
      <rect x="28" y="6" width="38" height="46" rx="5" fill="#C7D2FE" opacity="0.6" />
      <rect x="33" y="2" width="38" height="46" rx="5" fill="#E0E7FF" opacity="0.85" />
      {/* Back folder flap */}
      <path d="M16 20C16 16.6863 18.6863 14 22 14H38.5C40.0913 14 41.6174 14.6321 42.7426 15.7574L46.2426 19.2574C47.3679 20.3826 48.8939 21.0147 50.4853 21.0147H68C71.3137 21.0147 74 23.701 74 27.0147V56C74 59.3137 71.3137 62 68 62H22C18.6863 62 16 59.3137 16 56V20Z" fill="#818CF8" />
      {/* Front folder body */}
      <rect x="16" y="24" width="60" height="38" rx="7" fill="#6366F1" />
      {/* Folder subtle inner accent */}
      <path d="M20 24H42L38 29H20V24Z" fill="#4F46E5" opacity="0.35" />
      {/* Upload Badge circle */}
      <circle cx="63" cy="50" r="15" fill="#4338CA" />
      <circle cx="63" cy="50" r="14" stroke="#818CF8" strokeWidth="1.5" />
      {/* Upward arrow */}
      <path d="M63 43L57.5 49H61V56H65V49H68.5L63 43Z" fill="white" />
    </svg>
  );
}

export default function Upload({ project, setProject, onLoaded }: {project?: MigrationProject; setProject: (p: MigrationProject | undefined) => void; onLoaded: () => void}) {
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function submit() {
    if (!files.length) {
      fileInputRef.current?.click();
      return;
    }
    setBusy(true); setError(undefined); setProject(undefined);
    try { const p = await uploadProject(files); setProject(p); onLoaded(); }
    catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }

  async function demo() {
    setBusy(true); setError(undefined); setProject(undefined);
    try { const p = await loadDemo(); setProject(p); onLoaded(); }
    catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }

  function handleFileChange(selected: FileList | null) {
    if (selected && selected.length > 0) {
      setFiles(Array.from(selected));
    }
  }

  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFiles(Array.from(e.dataTransfer.files));
    }
  }

  function removeFile(index: number) {
    setFiles(files.filter((_, i) => i !== index));
  }

  const inventoryRows = project?.inventory.map(i => ({
    folder_path: i.folder_path, file_name: i.file_name, extension: i.extension, role: i.role,
    status: i.parsed_status, size_bytes: i.size_bytes, associated_workbook: i.associated_workbook || '',
    associated_data_source: i.associated_data_source || '', associated_extract_or_source: i.associated_extract_or_source || '',
    warnings: i.warnings.join('; '), errors: i.errors.join('; ')
  })) || [];

  return <div className="page">
    <Card title="Upload Workspace" right={project ? <Badge tone={project.health_status === 'Blocked' ? 'bad' : 'good'}>{project.project_name}</Badge> : undefined}>
      <div className="uploadGuidance">
        <div><BookOpenCheck size={22}/><b>Upload any supported customer scenario</b><span>TWBX alone, workbook with files, extract with metadata, Prep project, partial package or complete Tableau project.</span></div>
        <div><ShieldAlert size={22}/><b>Do not upload secrets</b><span>Passwords, PAT tokens and private keys must be entered through an approved secure mechanism, never stored in a ZIP.</span></div>
      </div>

      {/* Main Dropzone Area */}
      <div 
        className={`uploadDropzone ${isDragging ? 'dragging' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="uploadIllustrationWrapper">
          <UploadIllustration />
        </div>

        <h3 className="uploadTitle">Select one or more files, or a complete ZIP</h3>
        <p className="uploadSubtitle">Supported file types: .twb, .twbx, .tds, .tdsx, .tfl, .tflx, .hyper, .tde, .csv, .xlsx, .json, .xml, .parquet, .sql, .zip</p>

        <input 
          type="file" 
          ref={fileInputRef} 
          multiple 
          style={{ display: 'none' }} 
          onChange={e => handleFileChange(e.target.files)}
        />

        <button 
          type="button" 
          className="btnChooseFiles" 
          onClick={() => fileInputRef.current?.click()}
        >
          <UploadIcon size={17} />
          <span>Choose Files</span>
        </button>

        <span className="dragDropHint">or drag and drop files here</span>

        {/* Selected Files Badge List */}
        {files.length > 0 && (
          <div className="selectedFilesChipList">
            {files.map((f, idx) => (
              <span key={`${f.name}-${idx}`} className="selectedFileChip">
                {f.name}
                <span className="removeChip" onClick={(e) => { e.stopPropagation(); removeFile(idx); }} title="Remove file">
                  <X size={14} />
                </span>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Error alert if any */}
      {error && <div className="error" style={{ marginTop: '14px' }}>{error}</div>}

      {/* Side-by-Side Action Cards */}
      <div className="uploadActionCardsRow">
        <button 
          type="button"
          className={`uploadActionCard primaryCard ${files.length > 0 ? 'hasFiles' : ''}`}
          disabled={busy}
          onClick={submit}
        >
          <div className="actionCardIcon purpleIcon">
            <UploadIcon size={22} />
          </div>
          <div className="actionCardContent">
            <b>{busy ? 'Inventorying and classifying...' : 'Upload, Classify & Parse'}</b>
            <span>Upload files and automatically analyze them</span>
          </div>
        </button>

        <button 
          type="button"
          className="uploadActionCard"
          disabled={busy}
          onClick={demo}
        >
          <div className="actionCardIcon blueIcon">
            <Folder size={22} />
          </div>
          <div className="actionCardContent">
            <b>Load Demo Project</b>
            <span>Use a sample project to explore the workflow</span>
          </div>
        </button>
      </div>

      {/* Bottom Info Banner */}
      <div className="uploadInfoBanner">
        <Info size={19} className="infoBannerIcon" />
        <span>After upload, the application opens the Upload Models page and lists the detected scenario, mandatory items, optional evidence, and any missing information.</span>
      </div>
    </Card>

    {project && <Card title={`File Inventory - ${project.project_name} (${project.inventory.length} files)`}><DataTable rows={inventoryRows}/></Card>}
  </div>;
}
