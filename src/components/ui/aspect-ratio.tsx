// Minimal stubs for less-used components — kept for import compatibility

export const AspectRatio = ({ ratio = 1, className, children, ...props }: React.HTMLAttributes<HTMLDivElement> & { ratio?: number }) => (
  <div className={className} style={{ position: "relative", paddingBottom: `${100 / ratio}%` }} {...props}>
    <div style={{ position: "absolute", inset: 0 }}>{children}</div>
  </div>
)
