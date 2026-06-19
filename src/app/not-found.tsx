import Link from "next/link";
import { Logo } from "@/components/Logo";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center grid-bg px-6 text-center">
      <Logo />
      <h1 className="text-5xl font-bold mt-8">404</h1>
      <p className="text-muted mt-2">This page could not be found.</p>
      <Link
        href="/"
        className="mt-6 px-5 py-2.5 rounded-full bg-foreground text-background font-medium hover:opacity-90 transition"
      >
        Go home
      </Link>
    </div>
  );
}
