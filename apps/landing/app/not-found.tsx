import Link from "next/link";
import { FileQuestion, Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="mx-auto max-w-md text-center">
        <div className="badge-muted mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full">
          <FileQuestion className="h-10 w-10" />
        </div>
        <h1 className="mb-2 text-4xl font-bold tracking-tight">404</h1>
        <h2 className="mb-2 text-xl font-semibold">Page not found</h2>
        <p className="mb-6 text-muted-foreground">
          Sorry, we couldn&apos;t find the page you&apos;re looking for.
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
        >
          <Home className="mr-2 h-4 w-4" />
          Go to home
        </Link>
      </div>
    </div>
  );
}
