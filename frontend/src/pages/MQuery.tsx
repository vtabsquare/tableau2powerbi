import { Card } from '../components/Cards';
import { MigrationProject } from '../types/project';

type Props = {
  project: MigrationProject;
  isDemoMode?: boolean;
  onContactDemo?: () => void;
};

export default function MQuery({ project, isDemoMode, onContactDemo }: Props) {
  return <div className="page">
    {project.semantic_tables.map(t => <Card key={t.name} title={`M Query Review - ${t.name}`} right={
      <button 
        type="button"
        onClick={() => {
          if (isDemoMode) {
            onContactDemo?.();
          } else {
            navigator.clipboard.writeText(t.m_query || '');
          }
        }}
        title={isDemoMode ? "M Query copying is locked in the demo version" : "Copy M query to clipboard"}
      >
        {isDemoMode ? '🔒 Copy M (Locked)' : 'Copy M'}
      </button>
    }>
      <pre className="codeBlock">{t.m_query}</pre>
    </Card>)}
  </div>;
}
