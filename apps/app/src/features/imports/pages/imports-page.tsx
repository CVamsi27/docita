import { PageMeta } from "@/components/layout/page-meta";
import { ImportPageContent } from "../index";

/* ── ImportsPage (real import hub) ───────────────────── */
// Ported from Next apps/app: features/import/components/ImportPageContent.
// Renders the Excel/OCR method cards (with tier badges + FeatureGate) and the
// Bulk Import wizard dialog. The dedicated /import/excel and /import/ocr
// placeholder routes were removed in the Phase 6 port-or-drop review (no
// confirmed live business for the excel/ocr features); the method cards now
// route into the unified bulk-import wizard (see PORTING_PLAN §Phase 6).

export function ImportsPage() {
  return (
    <>
      <PageMeta title="Import data" description="Import patient and clinical data" />
      <ImportPageContent />
    </>
  );
}
