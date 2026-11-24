import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const publicPaths = new Set(["/unlock"]);

function redirectWithRefreshedCookies(
  response: NextResponse,
  destination: URL,
) {
  const redirect = NextResponse.redirect(destination);
  response.cookies.getAll().forEach(({ name, value, ...options }) => {
    redirect.cookies.set(name, value, options);
  });
  return redirect;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const claimsResult = await supabase.auth.getClaims();
  const claims = claimsResult.data?.claims;
  const authenticated = Boolean(claims?.sub) && claims?.is_anonymous !== true;

  if (pathname === "/unlock" && authenticated) {
    return redirectWithRefreshedCookies(response, new URL("/", request.url));
  }

  if (
    !authenticated &&
    !publicPaths.has(pathname) &&
    !pathname.startsWith("/api/")
  ) {
    return redirectWithRefreshedCookies(
      response,
      new URL("/unlock", request.url),
    );
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
