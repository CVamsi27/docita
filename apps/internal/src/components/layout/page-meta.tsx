interface PageMetaProps {
  title: string;
  description?: string;
}

export function PageMeta({ title, description }: PageMetaProps) {
  return (
    <>
      <title>{`${title} – Docita Internal`}</title>
      <meta
        name="description"
        content={description ?? "Docita Internal Admin Dashboard"}
      />
    </>
  );
}
