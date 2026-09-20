/**
 * A drawing, as a plain image. The files are black ink on transparency; on
 * the dark board a CSS filter turns that ink beige. A plain <img> paints
 * predictably inside sticky columns and prints as-is, where a mask did not.
 */
export function InkImage({ src, alt = "", className = "" }: { src: string; alt?: string; className?: string }) {
  return <img src={src} alt={alt} className={`ink-img ${className}`} draggable={false} aria-hidden={alt ? undefined : true} />;
}
