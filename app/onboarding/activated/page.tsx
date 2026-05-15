import { redirect } from "next/navigation";

// Previously used as a LemonSqueezy post-checkout redirect page.
// Razorpay uses client-side callbacks so this route is no longer needed.
// Keep the route alive to avoid 404s from any old bookmarked/cached links.
export default function ActivatedPage() {
  redirect("/dashboard");
}
