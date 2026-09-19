import { Figure } from "@/components/BodyLocator";
import { APP_NAME } from "@/lib/brand";
import { asset } from "@/lib/staticMode";

/** The spot searches the whole body and finds nothing. */
export default function NotFound() {
  return (
    <main className="flex-1 flex flex-col items-center justify-center text-center px-6 py-16">
      <div className="h-72" aria-hidden>
        <Figure region="body" body="female" spot={false} searching />
      </div>
      <h1 className="display mt-10" style={{ fontSize: "clamp(2rem, 4vw, 3rem)" }}>We looked everywhere.</h1>
      <p className="mt-3 text-[color:var(--muted)]">
        There is no page here. <a href={asset("/")} className="link-action">Back to {APP_NAME}</a>.
      </p>
    </main>
  );
}
