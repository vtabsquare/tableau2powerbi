import { useEffect, useMemo, useState } from 'react';
import { Card } from '../components/Cards';
import { MigrationProject, SourceMapping as SourceMappingType } from '../types/project';
import { saveSourceMappings } from '../services/api';

const connectors = ['CSV','Text','Excel','Folder','JSON','XML','Parquet','SQL Server','Oracle','PostgreSQL','MySQL','Snowflake','Databricks','BigQuery','Azure SQL','OData','Web API','SharePoint Folder','OneLake/Fabric Lakehouse','Manual source placeholder'];

function isExtractLike(m: SourceMappingType) {
  return `${m.original_connection_type} ${m.detected_source_path} ${m.target_file_path} ${m.datasource} ${m.mapping_status}`.toLowerCase().includes('.tde') || `${m.original_connection_type} ${m.detected_source_path} ${m.target_file_path} ${m.datasource} ${m.mapping_status}`.toLowerCase().includes('.hyper') || `${m.mapping_status}`.toLowerCase().includes('extract');
}

export default function SourceMapping({ project, setProject }: {project: MigrationProject; setProject: (p: MigrationProject) => void}) {
  const [mappings, setMappings] = useState<SourceMappingType[]>(project.source_mappings);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => setMappings(project.source_mappings), [project.project_id, project.source_mappings]);

  function update(sourceId: string, key: keyof SourceMappingType, value: string) {
    setMappings(mappings.map(m => m.source_id === sourceId ? { ...m, [key]: value } : m));
  }
  function removeSource(sourceId: string) {
    setMappings(mappings.filter(m => m.source_id !== sourceId));
  }
  async function save() {
    setBusy(true); setError(undefined);
    try { setProject(await saveSourceMappings(project.project_id, mappings)); }
    catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }
  const filtered = useMemo(() => {
    const nonExtracts = mappings.filter(m => !isExtractLike(m));
    return nonExtracts.length > 0 ? nonExtracts : mappings;
  }, [mappings]);

  return <div className="page">
    <Card title={`Source Mapping & Connection Details (${filtered.length} Tables)`} right={<button className="primary" onClick={save} disabled={busy}>{busy ? 'Saving & regenerating...' : 'Apply & Regenerate M'}</button>}>
      {error && <div className="error">{error}</div>}
      <div className="note userFriendlyNote"><strong>Business Sources:</strong> All detected tables from your Tableau model are listed below. Configure file paths, connectors, or remove unnecessary tables before applying.</div>
      {!filtered.length && <div className="empty">No source tables detected in project.</div>}
      <div className="sourceCards twoColCards">{filtered.map((m) => <div className={`sourceCard ${isExtractLike(m) ? 'extractCard' : ''}`} key={m.source_id}>
        <div className="sourceCardHeader">
          <div className="sourceCardTitle">
            <h3>{m.datasource}{m.table_name ? ` - ${m.table_name}` : (m.detected_source_path ? ` - ${m.detected_source_path.split(/[\\/]/).pop()}` : '')}</h3>
            <span className="sourceCardSub">Original: <b>{m.original_connection_type}</b></span>
          </div>
          <div className="sourceCardActions">
            <span className="miniStatus">{m.mapping_status || 'Detected'}</span>
            <button 
              type="button"
              className="removeTableBtn"
              title="Remove this unused or unnecessary table from the migration model"
              onClick={() => removeSource(m.source_id)}
            >
              ✕ Remove Table
            </button>
          </div>
        </div>
        <label>Target connector<select value={m.target_connector} onChange={e => update(m.source_id, 'target_connector', e.target.value)}>{connectors.map(c => <option key={c}>{c}</option>)}</select></label>
        <div className="grid2 tightGrid">
          <label>File path<input value={m.target_file_path || ''} onChange={e => update(m.source_id, 'target_file_path', e.target.value)} placeholder="C:\\Data\\source.csv or data/source.csv"/></label>
          <label>Detected source path<input value={m.detected_source_path || ''} onChange={e => update(m.source_id, 'detected_source_path', e.target.value)} /></label>
        </div>
        <div className="grid2 tightGrid">
          <label>Server<input value={m.server_name || ''} onChange={e => update(m.source_id, 'server_name', e.target.value)}/></label>
          <label>Database<input value={m.database_name || ''} onChange={e => update(m.source_id, 'database_name', e.target.value)}/></label>
          <label>Schema<input value={m.schema_name || ''} onChange={e => update(m.source_id, 'schema_name', e.target.value)}/></label>
          <label>Table<input value={m.table_name || ''} onChange={e => update(m.source_id, 'table_name', e.target.value)}/></label>
        </div>
        <label>SQL query<textarea value={m.sql_query || ''} onChange={e => update(m.source_id, 'sql_query', e.target.value)} /></label>
        {['CSV','Text','Excel','JSON','XML','Parquet'].includes(m.target_connector) && <div className="note">
          <strong>Power Query path parameter:</strong> {m.powerbi_path_parameter || 'Will be generated on Apply'}<br/>
          <strong>Resolved path:</strong> {m.resolved_powerbi_path || 'Not resolved'}<br/>
          <strong>Path mode:</strong> {m.path_mode || 'Unresolved'}
        </div>}
        <p className="hint">{m.credential_notes}</p>
      </div>)}</div>
    </Card>
  </div>;
}
