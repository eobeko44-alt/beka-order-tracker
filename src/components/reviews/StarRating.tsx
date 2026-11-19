import { Star } from 'lucide-react';

interface StarRatingProps {
  value: number;
  size?: 'sm' | 'md' | 'lg';
  onChange?: (value: number) => void;
}

const SIZES = { sm: 'h-3.5 w-3.5', md: 'h-4 w-4', lg: 'h-7 w-7' };

export default function StarRating({ value, size = 'md', onChange }: StarRatingProps) {
  const iconClass = SIZES[size];

  if (!onChange) {
    return (
      <span className="flex items-center gap-0.5" role="img" aria-label={`${value} من 5 نجوم`}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Star
            key={n}
            className={`${iconClass} ${n <= Math.round(value) ? 'fill-star text-star' : 'text-zinc-600'}`}
            strokeWidth={1.8}
          />
        ))}
      </span>
    );
  }

  return (
    <div className="flex items-center gap-1" role="radiogroup" aria-label="التقييم">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} من 5`}
          onClick={() => onChange(n)}
          className="rounded-lg p-1 transition-transform duration-150 hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-star/60"
        >
          <Star
            className={`${iconClass} ${n <= value ? 'fill-star text-star' : 'text-zinc-600'}`}
            strokeWidth={1.8}
          />
        </button>
      ))}
    </div>
  );
}
