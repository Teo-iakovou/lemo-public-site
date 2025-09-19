"use client";

import { useSearchParams } from "next/navigation";

export default function ErrorPage() {
  const search = useSearchParams();
  const message = search.get("message") || "Something went wrong.";
  return (
    <main className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-semibold">Error</h1>
      <p className="text-red-600">{message}</p>
    </main>
  );
}
