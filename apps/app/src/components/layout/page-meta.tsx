import { Helmet } from "react-helmet-async";

interface PageMetaProps {
  title: string;
  description?: string;
  noSuffix?: boolean;
}

const APP_NAME = "Docita";
const DEFAULT_DESCRIPTION = "The operating system for modern healthcare facilities";

export function PageMeta({ title, description, noSuffix }: PageMetaProps) {
  const fullTitle = noSuffix ? title : `${title} – ${APP_NAME}`;
  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description ?? DEFAULT_DESCRIPTION} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description ?? DEFAULT_DESCRIPTION} />
    </Helmet>
  );
}
