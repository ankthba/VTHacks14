import { redirect } from "next/navigation";

/** The explain tool moved to the root. Old links keep working. */
export default function ExplainRedirect() {
  redirect("/");
}
