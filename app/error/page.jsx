export default function ErrorPage({ searchParams }) {
  const message = (searchParams && searchParams.message) || "Something went wrong.";
  return (
    <main className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-semibold">Error</h1>
      <p className="text-red-600">{message}</p>
    </main>
  );
}
