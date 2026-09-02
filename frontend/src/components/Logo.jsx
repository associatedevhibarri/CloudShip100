import whiteLogo from '../assets/logo/white_bg_logo.png'
import blueLogo from '../assets/logo/blue_bg_logo.jpeg'

const sizes = {
  sm: 'h-11 max-w-[200px]',
  md: 'h-14 sm:h-16 max-w-[260px]',
  lg: 'h-16 sm:h-[4.5rem] max-w-[300px]',
  xl: 'h-20 sm:h-24 max-w-[340px]',
}

/**
 * Official Cloud Ship marks from brand assets.
 * - light: transparent PNG for light UI
 * - brand: white mark on blue (login / hero panels)
 */
export function Logo({ compact = false, variant = 'light', size, className = '' }) {
  const src = variant === 'brand' ? blueLogo : whiteLogo
  const resolved = size || (compact ? 'sm' : variant === 'brand' ? 'lg' : 'md')

  return (
    <div className={`flex items-center ${className}`}>
      <img
        src={src}
        alt="Cloud Ship"
        className={`${sizes[resolved]} w-auto bg-transparent object-contain object-left ${
          variant === 'brand' ? 'drop-shadow-sm' : ''
        }`}
      />
    </div>
  )
}
