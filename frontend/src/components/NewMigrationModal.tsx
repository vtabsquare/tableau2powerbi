import React, { useState, useRef } from 'react';
import { 
  X, UploadCloud, Sparkles, FileText, CheckCircle2, 
  AlertCircle, Trash2, ArrowRight, Loader2, RefreshCw 
} from 'lucide-react';
import { uploadProject, loadDemo } from '../services/api';
import { MigrationProject } from '../types/project';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (project: MigrationProject) => void;
}

const SUPPORTED_EXTENSIONS = [
  '.twb', '.twbx', '.tds', '.tdsx', '.tfl', '.tflx', 
  '.hyper', '.tde', '.csv', '.xlsx', '.json', '.xml', 
  '.parquet', '.sql', '.zip'
];

const MAX_FILE_SIZE_MB = 500;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function NewMigrationModal({ isOpen, onClose, onSuccess }: Props) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loadingAction, setLoadingAction] = useState<'upload' | 'demo' | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setFileError(null);
    setGeneralError(null);
    
    if (!file) return;

    const lowerName = file.name.toLowerCase();
    const hasValidExt = SUPPORTED_EXTENSIONS.some(ext => lowerName.endsWith(ext));

    if (!hasValidExt) {
      setFileError(
        `Unsupported file type. Supported formats: ${SUPPORTED_EXTENSIONS.join(', ')}`
      );
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setFileError(`File size (${formatFileSize(file.size)}) exceeds the maximum limit of ${MAX_FILE_SIZE_MB} MB.`);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setSelectedFile(file);
  }

  function handleRemoveFile() {
    setSelectedFile(null);
    setFileError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function handleContinueUpload() {
    if (!selectedFile) return;
    setBusy(true);
    setLoadingAction('upload');
    setGeneralError(null);

    try {
      const project = await uploadProject([selectedFile]);
      onSuccess(project);
    } catch (err) {
      setGeneralError((err as Error).message || 'Failed to upload and process file.');
      setBusy(false);
      setLoadingAction(null);
    }
  }

  async function handleUseDemoFile() {
    setBusy(true);
    setLoadingAction('demo');
    setGeneralError(null);

    try {
      const project = await loadDemo();
      onSuccess(project);
    } catch (err) {
      setGeneralError((err as Error).message || 'Failed to load demo file.');
      setBusy(false);
      setLoadingAction(null);
    }
  }

  function handleBackdropClick(e: React.MouseEvent) {
    if (e.target === e.currentTarget && !busy) {
      onClose();
    }
  }

  return (
    <div className="migrationModalBackdrop" onClick={handleBackdropClick}>
      <div className="migrationModalDialog" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        {/* Header */}
        <div className="migrationModalHeader">
          <div>
            <h2 id="modal-title" className="migrationModalTitle">Start New Migration</h2>
            <p className="migrationModalSubtitle">Choose how you want to proceed with your migration.</p>
          </div>
          <button 
            type="button" 
            className="migrationModalCloseBtn" 
            onClick={onClose} 
            disabled={busy}
            aria-label="Close dialog"
          >
            <X size={20} />
          </button>
        </div>

        {/* General Error Banner */}
        {generalError && (
          <div className="migrationModalAlert errorAlert">
            <AlertCircle size={18} />
            <span>{generalError}</span>
          </div>
        )}

        {/* Options Grid */}
        <div className="migrationModalBody">
          {/* OPTION 1: Upload Your File */}
          <div className={`migrationOptionCard ${selectedFile ? 'hasSelection' : ''}`}>
            <div className="migrationOptionHeader">
              <div className="migrationOptionIcon uploadIconWrap">
                <UploadCloud size={24} />
              </div>
              <div>
                <h3 className="migrationOptionHeading">Upload Your File</h3>
                <p className="migrationOptionDesc">Upload your own file to start the migration process.</p>
              </div>
            </div>

            <div className="migrationOptionContent">
              <input 
                type="file" 
                ref={fileInputRef} 
                style={{ display: 'none' }} 
                accept={SUPPORTED_EXTENSIONS.join(',')}
                onChange={handleFileSelect}
                disabled={busy}
              />

              {!selectedFile ? (
                <div className="migrationDropArea">
                  <button 
                    type="button" 
                    className="migrationBrowseBtn"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={busy}
                  >
                    <UploadCloud size={16} /> Browse File
                  </button>
                  <span className="migrationFormatHint">
                    Supported: .twbx, .twb, .zip, .csv, .xlsx, .tde, .hyper, .json, .xml (up to 500 MB)
                  </span>
                </div>
              ) : (
                <div className="migrationSelectedFileBox">
                  <div className="migrationFileInfo">
                    <FileText size={22} className="migrationFileIcon" />
                    <div className="migrationFileMeta">
                      <b className="migrationFileName" title={selectedFile.name}>{selectedFile.name}</b>
                      <span className="migrationFileSize">{formatFileSize(selectedFile.size)}</span>
                    </div>
                    <span className="migrationValidBadge">
                      <CheckCircle2 size={13} /> Valid
                    </span>
                  </div>

                  <div className="migrationFileActions">
                    <button 
                      type="button" 
                      className="migrationSecondaryBtn"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={busy}
                    >
                      <RefreshCw size={13} /> Replace
                    </button>
                    <button 
                      type="button" 
                      className="migrationRemoveBtn"
                      onClick={handleRemoveFile}
                      disabled={busy}
                    >
                      <Trash2 size={13} /> Remove
                    </button>
                  </div>
                </div>
              )}

              {fileError && (
                <div className="migrationFieldError">
                  <AlertCircle size={14} /> {fileError}
                </div>
              )}
            </div>

            <div className="migrationOptionFooter">
              <button 
                type="button" 
                className="migrationPrimaryBtn" 
                onClick={handleContinueUpload}
                disabled={!selectedFile || busy}
              >
                {busy && loadingAction === 'upload' ? (
                  <>
                    <Loader2 size={16} className="spinAnimation" /> Uploading & Processing...
                  </>
                ) : (
                  <>
                    Continue <ArrowRight size={16} />
                  </>
                )}
              </button>
            </div>
          </div>

          {/* OPTION 2: Use Demo File */}
          <div className="migrationOptionCard demoOptionCard">
            <div className="migrationOptionHeader">
              <div className="migrationOptionIcon demoIconWrap">
                <Sparkles size={24} />
              </div>
              <div>
                <h3 className="migrationOptionHeading">Use Demo File</h3>
                <p className="migrationOptionDesc">Explore the migration workflow using the application's built-in demo data.</p>
              </div>
            </div>

            <div className="migrationOptionContent demoContent">
              <div className="demoPreviewInfo">
                <div className="demoBadge">
                  <CheckCircle2 size={14} /> Critical Enterprise Demo Package
                </div>
                <p className="demoDetailsText">
                  Includes <b>Enterprise Retail Operations</b> package (<code>.zip</code>, <b>56 inventory files</b>, 15 data sources, 8 semantic tables).
                </p>
                <ul className="demoFeatureList">
                  <li><b>56 Inventory Files</b>: .twbx, .tdsx, .tflx Prep flows, Hyper &amp; TDE extracts</li>
                  <li><b>78 Calculations</b>: Complex LODs (<code>{'{FIXED}'}</code>), Table Calcs, Date/String logic</li>
                  <li><b>8 Semantic Tables</b>: Orders 2025/2026, Customers, Products, Returns, Targets</li>
                  <li>Full end-to-end pipeline execution from source recovery to DAX measures</li>
                </ul>
              </div>
            </div>

            <div className="migrationOptionFooter">
              <button 
                type="button" 
                className="migrationDemoBtn" 
                onClick={handleUseDemoFile}
                disabled={busy}
              >
                {busy && loadingAction === 'demo' ? (
                  <>
                    <Loader2 size={16} className="spinAnimation" /> Loading Enterprise Demo Package...
                  </>
                ) : (
                  <>
                    <Sparkles size={16} /> Use Demo File (Critical Enterprise Package)
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="migrationModalFooter">
          <button 
            type="button" 
            className="migrationCancelBtn"
            onClick={onClose}
            disabled={busy}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
