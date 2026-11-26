import { useMemo, useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  CircleHelp,
  FileArchive,
  Info,
  Route,
  AlertTriangle,
  Layers,
  Search,
  LayoutGrid,
  List,
  Folder,
  BookOpen,
  Link2,
  Database,
  FileCode2,
  Workflow,
  ClipboardList,
  FileText,
  Calculator,
  BarChart3,
  ShieldCheck,
  GitBranch,
  HardDrive,
  Target,
} from 'lucide-react';
import { MigrationProject, UploadModelDefinition } from '../types/project';

function getModelIcon(modelId: string) {
  switch (modelId) {
    case 'complete_project':
      return <Folder size={20} />;
    case 'twbx_only':
    case 'twb_only':
      return <BookOpen size={20} />;
    case 'twbx_sources':
    case 'twb_sources':
      return <Link2 size={20} />;
    case 'twbx_database':
    case 'twb_database':
      return <Database size={20} />;
    case 'prep_project':
      return <Workflow size={20} />;
    case 'extract_metadata':
    case 'extract_only':
      return <HardDrive size={20} />;
    default:
      return <FileCode2 size={20} />;
  }
}

function getStepIcon(step: string) {
  const s = step.toLowerCase();
  if (s.includes('inventory') || s.includes('extract') || s.includes('associate')) return <Folder size={15} />;
  if (s.includes('parse') || s.includes('xml') || s.includes('metadata')) return <FileText size={15} />;
  if (s.includes('map') || s.includes('source') || s.includes('connector')) return <Database size={15} />;
  if (s.includes('validate') || s.includes('profile') || s.includes('check')) return <ShieldCheck size={15} />;
  if (s.includes('join') || s.includes('union') || s.includes('relationship') || s.includes('model')) return <GitBranch size={15} />;
  if (s.includes('calc') || s.includes('dax') || s.includes('m/')) return <Calculator size={15} />;
  if (s.includes('visual') || s.includes('pbip') || s.includes('export') || s.includes('report')) return <BarChart3 size={15} />;
  return <Layers size={15} />;
}

function ModelCard({ model, detected }: { model: UploadModelDefinition; detected: boolean }) {
  return (
    <div
      className={`umCard ${detected ? 'umCardDetected' : ''}`}
      data-tour={detected ? 'detected-upload-model' : undefined}
    >
      <div className="umCardHeader">
        <div className="umCardHeaderLeft">
          <div className={`umModelIcon ${detected ? 'detected' : ''}`}>{getModelIcon(model.id)}</div>
          <div className="umTitleBlock">
            <h3>{model.name}</h3>
            <p>{model.description}</p>
          </div>
        </div>
        {detected && (
          <span className="umDetectedPill">
            Detected <CheckCircle2 size={14} />
          </span>
        )}
      </div>

      <div className="umColumns">
        <section className="umColBox">
          <h4>
            <ClipboardList size={15} /> Mandatory
          </h4>
          <div className="umReqList">
            {model.mandatory_files.map((x, i) => (
              <div className="umReqRow" key={i}>
                <CheckCircle2 size={14} className="umCheckIcon" />
                <span>{x}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="umColBox">
          <h4>
            <Layers size={15} /> Optional / Recommended
          </h4>
          <div className="umOptText">{model.optional_files.join(', ') || 'None'}</div>
        </section>
      </div>

      <div className="umRouteSection">
        <div className="umRouteTitle">
          <Route size={15} />
          <span>Processing Route</span>
          <span className="umNextStageTag">Next: {model.next_stage}</span>
        </div>
        <div className="umStepsFlow">
          {model.processing_route.map((step, i) => (
            <div className="umStepGroup" key={`${step}-${i}`}>
              {i > 0 && <ArrowRight size={14} className="umStepArrow" />}
              <div className="umStepNode">
                <div className="umStepCircle">{getStepIcon(step)}</div>
                <span className="umStepLabel">{step}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <details className="umDetails">
        <summary>
          <FileArchive size={15} /> How to obtain or extract these files
        </summary>
        <ol>
          {model.extraction_notes.map((x, i) => (
            <li key={i}>{x}</li>
          ))}
        </ol>
        {model.readiness_note && (
          <div className="umReadinessSub">
            <b>Readiness note:</b> {model.readiness_note}
          </div>
        )}
      </details>

      <div className={`umRuleBanner ${detected ? 'purple' : 'blue'}`}>
        <Info size={16} className="umRuleIcon" />
        <span>
          <b>Production Rule:</b> {model.production_rule}
        </span>
      </div>
    </div>
  );
}

export default function UploadModels({ project }: { project?: MigrationProject }) {
  const models = project?.upload_model_catalogue || [];
  const detected = project?.upload_model;
  const [query, setQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const filteredModels = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return models;
    return models.filter((m) =>
      `${m.name} ${m.description} ${m.mandatory_files.join(' ')} ${m.optional_files.join(' ')} ${m.processing_route.join(' ')}`
        .toLowerCase()
        .includes(q)
    );
  }, [models, query]);

  const confidencePct = Math.round((detected?.confidence || 0) * 100);
  const hasBlockers = Boolean(detected?.blocking_gaps?.length);

  return (
    <div className="page">
      <div className="umDetectedShell">
        <div className="umDetectedHeader">
          <div className="umCatalogHeaderLeft">
            <div className="umCatalogBadgeIcon">
              <Layers size={22} />
            </div>
            <div>
              <h2>Detected Upload Model & Processing Route</h2>
              <p>
                The application first classifies the uploaded Tableau assets, then routes them through the correct migration path.
              </p>
            </div>
          </div>

          {detected?.model_name && (
            <span className={`umStatusPill ${hasBlockers ? 'warn' : 'ready'}`}>
              {hasBlockers ? <AlertTriangle size={15} /> : <CheckCircle2 size={15} />}
              <span>{detected.stage_gate || 'Ready'}</span>
            </span>
          )}
        </div>

        {detected?.model_name && (
          <>
            <div className="umDetectedGrid">
              <div className="umKpiCard purple">
                <div className="umKpiIcon purple">
                  {getModelIcon(detected.model_id || 'complete_project')}
                </div>
                <div className="umKpiBody">
                  <span className="umKpiLabel">Detected Model</span>
                  <h3 className="umKpiValue">{detected.model_name}</h3>
                  <p className="umKpiDesc">{detected.description}</p>
                </div>
              </div>

              <div className="umKpiCard blue">
                <div className="umKpiIcon cyan">
                  <Target size={22} />
                </div>
                <div className="umKpiBody">
                  <div className="umConfidenceTop">
                    <div>
                      <span className="umKpiLabel">Confidence</span>
                      <h3 className="umKpiValue">{confidencePct}%</h3>
                    </div>
                    <div className="umProgressTrack" aria-label={`Confidence ${confidencePct}%`}>
                      <div className="umProgressFill" style={{ width: `${Math.min(100, Math.max(0, confidencePct))}%` }} />
                    </div>
                  </div>
                  <p className="umKpiDesc">{detected.readiness_note}</p>
                </div>
              </div>

              <div className="umKpiCard slate">
                <div className="umKpiIcon indigo">
                  <FileText size={20} />
                </div>
                <div className="umKpiBody">
                  <span className="umKpiLabel">Detected Extensions</span>
                  <div className="umExtPills">
                    {(detected.detected_extensions || []).length > 0 ? (
                      (detected.detected_extensions || []).map((ext) => (
                        <span key={ext} className="umExtPill">
                          {ext}
                        </span>
                      ))
                    ) : (
                      <span className="umKpiDesc">None</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="umKpiCard blue">
                <div className="umKpiIcon blue">
                  <Layers size={20} />
                </div>
                <div className="umKpiBody">
                  <span className="umKpiLabel">Next Application Stage</span>
                  <h3 className="umKpiValue">{detected.next_stage}</h3>
                  <p className="umKpiDesc">{detected.production_rule}</p>
                </div>
              </div>
            </div>

            <div className="umDetectedRouteBox">
              <div className="umRouteHeader">
                <Route size={17} className="umRouteHeaderIcon" />
                <b>Recommended Processing Route</b>
              </div>
              <div className="umRoutePillFlow">
                {(detected.processing_route || []).map((step, i) => (
                  <div className="umRoutePillGroup" key={`${step}-${i}`}>
                    {i > 0 && <ArrowRight size={14} className="umRoutePillArrow" />}
                    <div className="umRoutePillCard">
                      <span className="umRoutePillIcon">{getStepIcon(step)}</span>
                      <span className="umRoutePillText">{step}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {!!detected.missing_information?.length && (
              <div className="gapPanel">
                <CircleHelp size={18} />
                <div>
                  <b>Recommended supporting information</b>
                  <ul>
                    {detected.missing_information.map((x, i) => (
                      <li key={i}>{x}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
            {!!detected.blocking_gaps?.length && (
              <div className="blockerPanel">
                <AlertTriangle size={18} />
                <div>
                  <b>Production blockers</b>
                  <ul>
                    {detected.blocking_gaps.map((x, i) => (
                      <li key={i}>{x}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <div className="umCatalogShell">
        <div className="umCatalogToolbar">
          <div className="umCatalogHeaderLeft">
            <div className="umCatalogBadgeIcon">
              <Layers size={22} />
            </div>
            <div>
              <h2>{models.length || 14} Supported Upload Models</h2>
              <p>Select a model to view its requirements, processing route, and source guidance.</p>
            </div>
          </div>

          <div className="umCatalogHeaderRight">
            <div className="umSearchBox">
              <Search size={16} className="umSearchIcon" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search upload models..."
              />
            </div>
            <div className="umViewToggle">
              <button
                type="button"
                className={`umToggleBtn ${viewMode === 'grid' ? 'active' : ''}`}
                onClick={() => setViewMode('grid')}
                title="Grid view"
              >
                <LayoutGrid size={17} />
              </button>
              <button
                type="button"
                className={`umToggleBtn ${viewMode === 'list' ? 'active' : ''}`}
                onClick={() => setViewMode('list')}
                title="List view"
              >
                <List size={17} />
              </button>
            </div>
          </div>
        </div>

        <div className={`umModelGrid ${viewMode === 'list' ? 'listView' : ''}`}>
          {filteredModels.map((m) => (
            <ModelCard key={m.id} model={m} detected={m.id === detected?.model_id} />
          ))}
        </div>

        {!models.length && (
          <div className="note">Upload a project to load the model catalogue and automatic classification.</div>
        )}
        {models.length > 0 && !filteredModels.length && (
          <div className="note">No upload models match "{query}".</div>
        )}
      </div>
    </div>
  );
}
