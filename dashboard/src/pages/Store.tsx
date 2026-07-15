import { useState, useMemo } from 'react'
import { Search, ShoppingBag, MapPin, RefreshCw, Star } from 'lucide-react'
import { cn } from '../lib/utils'

// ── Static product catalogue (no backend connection) ─────────────────────────

type Category = 'All' | 'Food' | 'Beverages' | 'Personal Care' | 'Household'

interface Product {
  id: string
  name: string
  brand: string
  category: Exclude<Category, 'All'>
  status: 'In Stock' | 'Low Stock' | 'Out of Stock'
  shelf: string
  price: string
  weight: string
  rating: number
  image: string
  lastUpdated: string
  description: string
}

const PRODUCTS: Product[] = [
  {
    id: 'corn-flakes',
    name: 'Corn Flakes',
    brand: 'Kellogg\'s',
    category: 'Food',
    status: 'In Stock',
    shelf: 'Aisle 3 · Shelf B',
    price: '₹199',
    weight: '500g',
    rating: 4.4,
    image: '/product_corn_flakes.jpg',
    lastUpdated: '2 hours ago',
    description: 'Classic toasted corn flakes, a wholesome breakfast cereal.'
  },
  {
    id: 'dettol',
    name: 'Dettol',
    brand: 'Reckitt',
    category: 'Personal Care',
    status: 'In Stock',
    shelf: 'Aisle 7 · Shelf A',
    price: '₹89',
    weight: '250ml',
    rating: 4.7,
    image: '/product_dettol.png',
    lastUpdated: '5 hours ago',
    description: 'Antiseptic liquid for cuts, wounds and everyday hygiene.'
  },
  {
    id: 'dove',
    name: 'Dove',
    brand: 'Unilever',
    category: 'Personal Care',
    status: 'In Stock',
    shelf: 'Aisle 7 · Shelf C',
    price: '₹129',
    weight: '100g',
    rating: 4.6,
    image: '/product_dove.png',
    lastUpdated: '3 hours ago',
    description: 'Moisturizing beauty bar with ¼ moisturizing cream.'
  },
  {
    id: 'lays',
    name: 'Lay\'s',
    brand: 'PepsiCo',
    category: 'Food',
    status: 'Low Stock',
    shelf: 'Aisle 2 · Shelf D',
    price: '₹20',
    weight: '26g',
    rating: 4.3,
    image: '/product_lays.jpg',
    lastUpdated: '1 hour ago',
    description: 'Crispy potato chips with a classic salted flavour.'
  },
  {
    id: 'maggi',
    name: 'Maggi Noodles',
    brand: 'Nestlé',
    category: 'Food',
    status: 'In Stock',
    shelf: 'Aisle 4 · Shelf A',
    price: '₹14',
    weight: '70g',
    rating: 4.5,
    image: '/product_maggi.png',
    lastUpdated: '4 hours ago',
    description: '2-minute instant noodles, masala flavour — a household staple.'
  },
  {
    id: 'mountain-dew',
    name: 'Mountain Dew',
    brand: 'PepsiCo',
    category: 'Beverages',
    status: 'In Stock',
    shelf: 'Aisle 1 · Shelf B',
    price: '₹40',
    weight: '600ml',
    rating: 4.2,
    image: '/product_mountain_dew.png',
    lastUpdated: '6 hours ago',
    description: 'Citrus-flavoured carbonated soft drink with an electric kick.'
  },
  {
    id: 'nescafe',
    name: 'Nescafé Classic',
    brand: 'Nestlé',
    category: 'Beverages',
    status: 'In Stock',
    shelf: 'Aisle 5 · Shelf A',
    price: '₹239',
    weight: '100g',
    rating: 4.5,
    image: '/product_nescafe.png',
    lastUpdated: '2 hours ago',
    description: 'Rich and aromatic instant coffee, made from roasted coffee beans.'
  },
  {
    id: 'colgate',
    name: 'Colgate Strong Teeth',
    brand: 'Colgate-Palmolive',
    category: 'Household',
    status: 'In Stock',
    shelf: 'Aisle 8 · Shelf B',
    price: '₹99',
    weight: '200g',
    rating: 4.6,
    image: '/product_colgate.png',
    lastUpdated: '3 hours ago',
    description: 'Calcium-enriched toothpaste for strong teeth and healthy gums.'
  },
]

const FILTERS: Category[] = ['All', 'Food', 'Beverages', 'Personal Care', 'Household']

const STATUS_STYLES = {
  'In Stock': { badge: 'green' as const, dot: 'bg-emerald-400' },
  'Low Stock': { badge: 'orange' as const, dot: 'bg-amber-400' },
  'Out of Stock': { badge: 'red' as const, dot: 'bg-red-400' },
}

const CATEGORY_COLORS: Record<Exclude<Category, 'All'>, string> = {
  Food: 'bg-amber-50 text-amber-700',
  Beverages: 'bg-sky-50 text-sky-700',
  'Personal Care': 'bg-rose-50 text-rose-700',
  Household: 'bg-violet-50 text-violet-700',
}

// ── Star Rating ───────────────────────────────────────────────────────────────
function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-1">
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map(s => (
          <Star
            key={s}
            size={10}
            className={s <= Math.round(rating) ? 'fill-amber-400 text-amber-400' : 'fill-gray-200 text-gray-200'}
          />
        ))}
      </div>
      <span className="text-[11px] text-gray-400 font-medium">{rating}</span>
    </div>
  )
}

// ── Product Card ──────────────────────────────────────────────────────────────
function ProductCard({ product, index }: { product: Product; index: number }) {
  const [imgError, setImgError] = useState(false)
  const status = STATUS_STYLES[product.status]

  // Emoji fallbacks if the image fails to load
  const EMOJI_FALLBACK: Record<string, string> = {
    'corn-flakes': '🥣',
    'dettol': '🧴',
    'dove': '🧼',
    'lays': '🍟',
    'maggi': '🍜',
    'mountain-dew': '🥤',
    'nescafe': '☕',
    'colgate': '🦷',
  }

  return (
    <div
      className="group bg-white border border-gray-200/80 rounded-2xl overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.06)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.09)] transition-all duration-300 hover:-translate-y-1 fade-in"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      {/* Image area */}
      <div className="relative bg-gray-50 h-48 overflow-hidden flex items-center justify-center">
        {!imgError ? (
          <img
            src={product.image}
            alt={product.name}
            className="h-full w-full object-contain p-6 group-hover:scale-105 transition-transform duration-500"
            onError={() => setImgError(true)}
            loading="lazy"
          />
        ) : (
          <div className="flex flex-col items-center gap-2">
            <span className="text-6xl">{EMOJI_FALLBACK[product.id] ?? '📦'}</span>
            <span className="text-[11px] text-gray-400">{product.name}</span>
          </div>
        )}

        {/* Status dot overlay */}
        <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-white/90 backdrop-blur-sm border border-gray-100 rounded-full px-2.5 py-1 shadow-sm">
          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${status.dot}`} />
          <span className="text-[10px] font-semibold text-gray-600">{product.status}</span>
        </div>
      </div>

      {/* Card body */}
      <div className="p-4">
        {/* Category + brand */}
        <div className="flex items-center justify-between mb-2">
          <span className={cn('text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-md', CATEGORY_COLORS[product.category])}>
            {product.category}
          </span>
          <span className="text-[11px] text-gray-400 font-medium">{product.brand}</span>
        </div>

        {/* Product name */}
        <h3 className="font-semibold text-[15px] text-gray-900 leading-snug mb-1 tracking-tight">
          {product.name}
        </h3>

        {/* Description */}
        <p className="text-[11px] text-gray-400 leading-relaxed mb-3 line-clamp-2">
          {product.description}
        </p>

        {/* Star rating */}
        <div className="mb-3">
          <StarRating rating={product.rating} />
        </div>

        {/* Meta row */}
        <div className="flex items-center gap-2 mb-4 text-[11px] text-gray-400">
          <MapPin size={10} className="flex-shrink-0" />
          <span>{product.shelf}</span>
          <span className="text-gray-200">·</span>
          <span>{product.weight}</span>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <span className="font-bold text-[16px] text-gray-900 tracking-tight">{product.price}</span>
          <div className="flex items-center gap-1 text-[10px] text-gray-400">
            <RefreshCw size={9} />
            <span>{product.lastUpdated}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function Store() {
  const [query, setQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState<Category>('All')

  const filtered = useMemo(() => {
    return PRODUCTS.filter(p => {
      const matchesCategory = activeFilter === 'All' || p.category === activeFilter
      const matchesQuery = query.trim() === '' || (
        p.name.toLowerCase().includes(query.toLowerCase()) ||
        p.brand.toLowerCase().includes(query.toLowerCase()) ||
        p.category.toLowerCase().includes(query.toLowerCase())
      )
      return matchesCategory && matchesQuery
    })
  }, [query, activeFilter])

  const inStockCount = PRODUCTS.filter(p => p.status === 'In Stock').length
  const lowStockCount = PRODUCTS.filter(p => p.status === 'Low Stock').length

  return (
    <div className="space-y-7">

      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-bold text-gray-900 tracking-tight">Store</h1>
          <p className="text-[13px] text-gray-500 mt-1">
            Browse all products currently available inside the retail inventory.
          </p>
        </div>

        {/* Inventory summary chips */}
        <div className="hidden sm:flex items-center gap-2 pt-0.5 flex-shrink-0">
          <div className="flex items-center gap-1.5 text-[11px] bg-white border border-gray-200 rounded-lg px-3 py-1.5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
            <span className="text-gray-600 font-medium">{inStockCount} in stock</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] bg-white border border-gray-200 rounded-lg px-3 py-1.5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
            <span className="text-gray-600 font-medium">{lowStockCount} low</span>
          </div>
        </div>
      </div>

      {/* Search + filters */}
      <div className="flex flex-col sm:flex-row gap-3">

        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
          />
          <input
            type="text"
            placeholder="Search products…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-[13px] bg-white border border-gray-200 rounded-lg outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all placeholder:text-gray-400 shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
          />
        </div>

        {/* Filter chips */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={cn(
                'px-3 py-1.5 text-[12px] font-semibold rounded-lg border transition-all duration-150 cursor-pointer',
                activeFilter === f
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-[0_1px_4px_rgba(99,102,241,0.3)]'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Results count */}
      {(query || activeFilter !== 'All') && (
        <div className="flex items-center gap-2 text-[12px] text-gray-500">
          <ShoppingBag size={13} />
          <span>
            {filtered.length === 0
              ? 'No products found'
              : `${filtered.length} product${filtered.length !== 1 ? 's' : ''} found`}
            {activeFilter !== 'All' && ` in ${activeFilter}`}
          </span>
          {(query || activeFilter !== 'All') && (
            <button
              onClick={() => { setQuery(''); setActiveFilter('All') }}
              className="ml-1 text-indigo-500 hover:text-indigo-600 font-medium underline underline-offset-2 transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      )}

      {/* Product grid */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filtered.map((product, i) => (
            <ProductCard key={product.id} product={product} index={i} />
          ))}
        </div>
      ) : (
        <div className="text-center py-20 border border-dashed border-gray-200 rounded-2xl bg-gray-50/50">
          <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4">
            🔍
          </div>
          <h3 className="font-semibold text-gray-700 text-[14px] mb-1.5">No products found</h3>
          <p className="text-[12px] text-gray-400 max-w-xs mx-auto">
            Try adjusting your search or clearing the filter.
          </p>
        </div>
      )}

      {/* Footer note */}
      <p className="text-center text-[11px] text-gray-400 pb-2">
        {PRODUCTS.length} products in catalogue · Prices and stock status update in real time via YOLO detection
      </p>
    </div>
  )
}
