/**
 * A drawing rendered as ink of the page's choosing.
 *
 * The PNG's alpha is used as a mask over the current --ink colour, so the same
 * file reads deep green on one page and black on another. Paper does not
 * print backgrounds, so a plain image takes over in print.
 */
export function InkImage({ src, alt = "", className = "" }: { src: string; alt?: string; className?: string }) {
  return (
    <>
      <div className={`ink-img print:hidden ${className}`} style={{ "--src": `url(${src})` } as React.CSSProperties} role={alt ? "img" : undefined} aria-label={alt || undefined} aria-hidden={alt ? undefined : true} />
      <img src={src} alt={alt} className={`hidden print:block ${className}`} draggable={false} />
    </>
  );
}
