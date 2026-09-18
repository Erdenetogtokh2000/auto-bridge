export function BrandLogo({ className = "" }: { className?: string }) {
  return <span className="brand-logo-frame"><img className={`brand-logo-image ${className}`.trim()} src="/auto-bridge-logo.png" alt="AUTO BRIDGE — Connect Export Drive" /></span>;
}
