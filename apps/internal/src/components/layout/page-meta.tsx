import { Helmet } from "react-helmet-async";

interface PageMetaProps {
  title: string;
  description?: string;
}

export function PageMeta({ title, description }: PageMetaProps) {
  return (
    <Helmet>
      <title>{title} – Docita Internal</title>
      <meta name="description" content={description ?? "Docita Internal Admin Dashboard"} />
    </Helmet>
  );
}
