import { redirect } from "next/navigation";

// CV is managed inside Settings — redirect there directly
export default function CvPage() {
  redirect("/dashboard/settings#cv");
}
