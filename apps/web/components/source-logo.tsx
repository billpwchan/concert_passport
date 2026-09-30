export function SourceLogo({ name, size = 36 }: { host: string; name: string; size?: number }) {
  return <span className="source-monogram" style={{ width: size, height: size }} aria-hidden="true">{name.replace(/[^\p{L}\p{N}]+/gu, ' ').split(' ').filter(Boolean).slice(0,2).map(word=>word[0]).join('').toUpperCase()}</span>;
}
