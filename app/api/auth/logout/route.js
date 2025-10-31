export async function POST() {
  const response = new Response(null, { status: 204 });
  response.cookies.set({
    name: "lemo_auth",
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return response;
}
