import { useEffect, useState } from 'react';
import { ArrowRight, Compass, X } from 'lucide-react';

export type TourStep = {
  id: string;
  selector: string;
  title: string;
  description: string;
};

const TOUR_STEPS: TourStep[] = [
  {
    id: 'phase-discover',
    selector: '[data-tour="phase-discover"]',
    title: '1. Discover',
    description:
      'Inventory your Tableau package, classify upload models, inspect the file processing tree, and recover upstream sources from any legacy TDE extracts.',
  },
  {
    id: 'phase-prepare',
    selector: '[data-tour="phase-prepare"]',
    title: '2. Prepare',
    description:
      'Configure source mappings and connection paths, preview data with inferred Power BI types, and verify table relationships in the model diagram.',
  },
  {
    id: 'phase-convert',
    selector: '[data-tour="phase-convert"]',
    title: '3. Convert',
    description:
      'Review Tableau-to-DAX calculations, inspect generated Power Query (M) scripts, verify Final Tables, and review the Visual Conversion Plan.',
  },
  {
    id: 'phase-deliver',
    selector: '[data-tour="phase-deliver"]',
    title: '4. Deliver',
    description:
      'Run final validation & reconciliation checks and export your Power BI semantic model package ready for Power BI Desktop.',
  },
  {
    id: 'new-migration',
    selector: '[data-tour="new-migration"]',
    title: '5. New Migration',
    description:
      'Click New Migration to upload your Tableau workbooks, packaged assets, or ZIP archive and begin your migration.',
  },
];

type Props = {
  open: boolean;
  onClose: () => void;
};

type RectBox = {
  top: number;
  left: number;
  width: number;
  height: number;
};

export default function TourGuide({ open, onClose }: Props) {
  const [stepIdx, setStepIdx] = useState(0);
  const [targetRect, setTargetRect] = useState<RectBox | null>(null);

  const step = TOUR_STEPS[stepIdx];

  useEffect(() => {
    if (!open) {
      setStepIdx(0);
      setTargetRect(null);
      return;
    }

    const measure = () => {
      const el = document.querySelector(step.selector) as HTMLElement | null;
      if (!el) {
        setTargetRect(null);
        return;
      }
      const r = el.getBoundingClientRect();
      setTargetRect({
        top: r.top,
        left: r.left,
        width: r.width,
        height: r.height,
      });
    };

    const el = document.querySelector(step.selector) as HTMLElement | null;
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    const t1 = setTimeout(measure, 120);
    const t2 = setTimeout(measure, 420);
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [open, step.selector]);

  if (!open) return null;

  const isLast = stepIdx === TOUR_STEPS.length - 1;

  const viewportW = typeof window !== 'undefined' ? window.innerWidth : 1280;
  const viewportH = typeof window !== 'undefined' ? window.innerHeight : 800;
  const popWidth = 340;

  let popTop = 180;
  let popLeft = Math.max(16, (viewportW - popWidth) / 2);
  let arrowDir: 'up' | 'down' = 'up';

  if (targetRect) {
    const spaceBelow = viewportH - (targetRect.top + targetRect.height);
    if (spaceBelow >= 230) {
      popTop = targetRect.top + targetRect.height + 16;
      arrowDir = 'up';
    } else {
      popTop = Math.max(16, targetRect.top - 220);
      arrowDir = 'down';
    }
    popLeft = Math.min(
      Math.max(16, targetRect.left + targetRect.width / 2 - popWidth / 2),
      Math.max(16, viewportW - popWidth - 16)
    );
  }

  return (
    <div className="tourOverlay" role="dialog" aria-modal="true" aria-label="Application Tour">
      {targetRect && (
        <div
          className="tourSpotlight"
          style={{
            top: targetRect.top - 6,
            left: targetRect.left - 6,
            width: targetRect.width + 12,
            height: targetRect.height + 12,
          }}
        />
      )}

      <div
        className={`tourPopover ${arrowDir === 'down' ? 'arrowDown' : 'arrowUp'}`}
        style={{ top: popTop, left: popLeft, width: popWidth }}
      >
        <div className="tourPopoverTop">
          <span className="tourStepBadge">
            Step {stepIdx + 1} of {TOUR_STEPS.length}
          </span>
          <button type="button" className="tourCloseBtn" onClick={onClose} aria-label="Close tour">
            <X size={15} />
          </button>
        </div>

        <h3>{step.title}</h3>
        <p>{step.description}</p>

        <div className="tourPopoverFooter">
          <div className="tourDots">
            {TOUR_STEPS.map((s, i) => (
              <span key={s.id} className={i === stepIdx ? 'active' : ''} />
            ))}
          </div>
          <div className="tourPopoverBtns">
            <button type="button" className="tourSkipBtn" onClick={onClose}>
              Skip Tour
            </button>
            <button
              type="button"
              className="tourNextBtn"
              onClick={() => {
                if (isLast) onClose();
                else setStepIdx((i) => i + 1);
              }}
            >
              {isLast ? 'Finish' : 'Next'} <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function TourTriggerButton({ active, onClick }: { active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      className={`tourTriggerBtn ${active ? 'active' : ''}`}
      onClick={onClick}
      title="Start Interactive Application Tour"
    >
      <Compass size={15} />
      <span>Tour</span>
    </button>
  );
}
