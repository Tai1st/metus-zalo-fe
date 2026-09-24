/**
 * The "M" mark, loaded from the single source of truth at public/logo.svg —
 * used in the sidebar header, /login and the landing page. The favicon files
 * (src/app/icon.svg, apple-icon.png) are generated from that same file by
 * `npm run sync:logo`, so editing public/logo.svg and re-running that script
 * is the only place a logo change is needed.
 */
export function BrandMark({
  size = 36,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- local SVG, no optimization needed
    <img
      src="/logo.svg"
      alt="Metus Zalo"
      width={size}
      height={size}
      className={`shrink-0 rounded-full ${className}`}
    />
  );
}
