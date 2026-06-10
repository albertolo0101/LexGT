// Iconos línea fina, derivados del bundle de diseño LexGT.
// Todos usan stroke="currentColor" para heredar el color del contenedor.
import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>

const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

export const Ico = {
  search: (p: IconProps) => (
    <svg {...base} {...p}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
  ),
  scroll: (p: IconProps) => (
    <svg {...base} {...p}><path d="M5 4h11l3 3v11a2 2 0 0 1-2 2H5z" /><path d="M16 4v3h3" /><path d="M8 10h8M8 14h8M8 18h5" /></svg>
  ),
  gavel: (p: IconProps) => (
    <svg {...base} {...p}><path d="m14 4 6 6-3 3-6-6z" /><path d="m9 9-6 6 3 3 6-6" /><path d="M4 20h10" /></svg>
  ),
  folder: (p: IconProps) => (
    <svg {...base} {...p}><path d="M3 6a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></svg>
  ),
  bell: (p: IconProps) => (
    <svg {...base} {...p}><path d="M6 8a6 6 0 1 1 12 0c0 5 2 7 2 7H4s2-2 2-7z" /><path d="M10 19a2 2 0 0 0 4 0" /></svg>
  ),
  highlight: (p: IconProps) => (
    <svg {...base} {...p}><path d="m9 14 6-6 4 4-6 6H9z" /><path d="m4 21 3-3" /><path d="m15 4 4 4" /></svg>
  ),
  note: (p: IconProps) => (
    <svg {...base} {...p}><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" /><path d="M14 3v6h6" /><path d="M8 13h6M8 17h4" /></svg>
  ),
  bookmark: (p: IconProps) => (
    <svg {...base} {...p}><path d="M6 4h12v17l-6-4-6 4z" /></svg>
  ),
  share: (p: IconProps) => (
    <svg {...base} {...p}><circle cx="6" cy="12" r="2" /><circle cx="18" cy="6" r="2" /><circle cx="18" cy="18" r="2" /><path d="m8 11 8-4M8 13l8 4" /></svg>
  ),
  more: (p: IconProps) => (
    <svg {...base} {...p}><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></svg>
  ),
  chev: (p: IconProps) => (
    <svg {...base} {...p}><path d="m9 6 6 6-6 6" /></svg>
  ),
  chevD: (p: IconProps) => (
    <svg {...base} {...p}><path d="m6 9 6 6 6-6" /></svg>
  ),
  plus: (p: IconProps) => (
    <svg {...base} {...p}><path d="M12 5v14M5 12h14" /></svg>
  ),
  check: (p: IconProps) => (
    <svg {...base} strokeWidth={2} {...p}><path d="m5 12 5 5 9-11" /></svg>
  ),
  x: (p: IconProps) => (
    <svg {...base} {...p}><path d="m6 6 12 12M6 18 18 6" /></svg>
  ),
  link: (p: IconProps) => (
    <svg {...base} {...p}><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" /><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" /></svg>
  ),
  print: (p: IconProps) => (
    <svg {...base} {...p}><path d="M7 8V3h10v5" /><rect x="4" y="8" width="16" height="8" rx="1" /><path d="M7 14h10v6H7z" /></svg>
  ),
  layers: (p: IconProps) => (
    <svg {...base} {...p}><path d="m12 3 9 5-9 5-9-5z" /><path d="m3 13 9 5 9-5" /><path d="m3 17 9 5 9-5" /></svg>
  ),
}
