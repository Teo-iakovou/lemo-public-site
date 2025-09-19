export async function GET() {
  // Minimal service list for public site
  const services = [
    { id: "haircut", name: "Haircut", price: 15, duration: 40 },
  ];
  return Response.json(services, { status: 200 });
}

