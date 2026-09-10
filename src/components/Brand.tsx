export default function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="brand">
      <div className="brand-mark">K</div>
      {!compact && <div><strong>Web Kivora</strong><span>Finance</span></div>}
    </div>
  )
}
