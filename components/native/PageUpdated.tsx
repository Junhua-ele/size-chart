import { uiStringsFor } from "../../lib/ui-strings";
import { PAGE_UPDATED_ISO, pageUpdatedLabel } from "../../lib/page-dates";

/** The line under an inner page's introduction: when its reference was last read. */
export function PageUpdated({ language }: { language: string }) {
  const t = uiStringsFor(language);
  return (
    <p className="page-updated">
      <time dateTime={PAGE_UPDATED_ISO}>
        {t.pageUpdated} {pageUpdatedLabel(language)}
      </time>
    </p>
  );
}
