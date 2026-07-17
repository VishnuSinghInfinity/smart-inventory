import { useState } from 'react'
import { Search, MapPin, Layers, Star, Plus } from 'lucide-react'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui'

interface Product {
  name: string
  category: 'Food' | 'Beverages' | 'Personal Care' | 'Household'
  subCategory: string
  brand: string
  shelfLocation: string
  availability: 'In Stock' | 'Low Stock' | 'Out of Stock'
  stockCount: number
  price: number
  rating: number
  reviewsCount: number
  lastUpdated: string
  image: string
}

const PRODUCTS: Product[] = [
  {
    name: 'Corn Flakes',
    category: 'Food',
    subCategory: 'Breakfast Cereal',
    brand: "Kellogg's",
    shelfLocation: 'Aisle 3, Shelf B',
    availability: 'In Stock',
    stockCount: 84,
    price: 4.29,
    rating: 4.6,
    reviewsCount: 112,
    lastUpdated: '10 mins ago',
    image: '/corn_flakes.jpg'
  },
  {
    name: 'Dettol',
    category: 'Personal Care',
    subCategory: 'Antiseptic Liquid',
    brand: 'Reckitt',
    shelfLocation: 'Aisle 5, Shelf D',
    availability: 'In Stock',
    stockCount: 120,
    price: 3.89,
    rating: 4.8,
    reviewsCount: 245,
    lastUpdated: '1 hr ago',
    image: '/dettol.jpg'
  },
  {
    name: 'Dove',
    category: 'Personal Care',
    subCategory: 'Beauty Soap Bar',
    brand: 'Unilever',
    shelfLocation: 'Aisle 5, Shelf A',
    availability: 'In Stock',
    stockCount: 95,
    price: 2.49,
    rating: 4.7,
    reviewsCount: 189,
    lastUpdated: '45 mins ago',
    image: '/dove.jpg'
  },
  {
    name: 'Lays',
    category: 'Food',
    subCategory: 'Potato Chips',
    brand: 'Frito-Lay',
    shelfLocation: 'Aisle 2, Shelf C',
    availability: 'In Stock',
    stockCount: 62,
    price: 1.99,
    rating: 4.5,
    reviewsCount: 312,
    lastUpdated: '15 mins ago',
    image: '/lays.jpg'
  },
  {
    name: 'Maggi',
    category: 'Food',
    subCategory: 'Instant Noodles',
    brand: 'Nestlé',
    shelfLocation: 'Aisle 2, Shelf A',
    availability: 'In Stock',
    stockCount: 142,
    price: 0.99,
    rating: 4.9,
    reviewsCount: 520,
    lastUpdated: '5 mins ago',
    image: '/maggi.jpg'
  },
  {
    name: 'Mountain Dew',
    category: 'Beverages',
    subCategory: 'Citrus Soda',
    brand: 'PepsiCo',
    shelfLocation: 'Aisle 1, Cold Case 2',
    availability: 'In Stock',
    stockCount: 78,
    price: 1.79,
    rating: 4.4,
    reviewsCount: 88,
    lastUpdated: '30 mins ago',
    image: '/mountain_dew.jpg'
  },
  {
    name: 'Nescafe',
    category: 'Beverages',
    subCategory: 'Instant Coffee',
    brand: 'Nestlé',
    shelfLocation: 'Aisle 4, Shelf C',
    availability: 'In Stock',
    stockCount: 45,
    price: 5.99,
    rating: 4.7,
    reviewsCount: 143,
    lastUpdated: '2 hrs ago',
    image: '/nescafe.jpg'
  },
  {
    name: 'Colgate',
    category: 'Personal Care',
    subCategory: 'Fluoride Toothpaste',
    brand: 'Colgate-Palmolive',
    shelfLocation: 'Aisle 5, Shelf B',
    availability: 'In Stock',
    stockCount: 110,
    price: 2.99,
    rating: 4.6,
    reviewsCount: 205,
    lastUpdated: '10 mins ago',
    image: '/colgate.jpg'
  }
]

const CATEGORIES = ['All', 'Food', 'Beverages', 'Personal Care', 'Household'] as const

export default function Store() {
  const [searchTerm, setSearchTerm] = useState('')
  const [activeCategory, setActiveCategory] = useState<typeof CATEGORIES[number]>('All')

  const filteredProducts = PRODUCTS.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          product.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          product.subCategory.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = activeCategory === 'All' || product.category === activeCategory
    return matchesSearch && matchesCategory
  })

  return (
    <div className="space-y-6 page-enter">
      {/* Header */}
      <div>
        <h1 className="font-heading font-extrabold text-[24px] tracking-tight shine-text">
          🛍️ Store
        </h1>
        <p className="text-[13px] mt-1" style={{ color: '#475569' }}>
          Browse all products currently available inside the retail inventory.
        </p>
      </div>

      {/* Top Filter & Search Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-2xl"
           style={{
             background: 'rgba(255,255,255,0.02)',
             border: '1px solid rgba(255,255,255,0.06)'
           }}>
        
        {/* Filter Chips */}
        <div className="flex flex-wrap gap-2 order-2 md:order-1">
          {CATEGORIES.map(category => {
            const isActive = activeCategory === category
            return (
              <button
                key={category}
                onClick={() => setActiveCategory(category)}
                className="px-3.5 py-1.5 rounded-xl text-[12px] font-semibold transition-all duration-200 cursor-pointer select-none"
                style={{
                  background: isActive ? 'rgba(16,185,129,0.12)' : 'rgba(255,255,255,0.04)',
                  color: isActive ? '#10B981' : '#94A3B8',
                  border: isActive ? '1px solid rgba(16,185,129,0.25)' : '1px solid rgba(255,255,255,0.07)'
                }}
              >
                {category}
              </button>
            )
          })}
        </div>

        {/* Search Bar */}
        <div className="relative w-full md:w-80 order-1 md:order-2">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search products..."
            className="w-full rounded-xl pl-10 pr-4 py-2 text-[13px] outline-none transition-all duration-200"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.09)',
              color: '#E2E8F0',
            }}
            onFocus={e => (e.currentTarget.style.borderColor = 'rgba(16,185,129,0.4)')}
            onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.09)')}
          />
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: '#475569' }} />
        </div>
      </div>

      {/* Product Grid */}
      {filteredProducts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {filteredProducts.map((product) => (
            <Card key={product.name} hover noPad className="overflow-hidden group flex flex-col h-full relative">
              
              {/* Image Container with Scanline / Hover effect */}
              <div className="relative w-full aspect-square overflow-hidden bg-black/20 flex items-center justify-center border-b border-white/[0.05]">
                {/* Product Image */}
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                
                {/* Status Badges Overlay */}
                <div className="absolute top-3 left-3 flex flex-col gap-1.5">
                  <Badge variant="green" className="text-[8px] font-bold tracking-widest">
                    {product.availability}
                  </Badge>
                </div>

                {/* Rating Overlay */}
                <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold"
                     style={{
                       background: 'rgba(10,13,20,0.85)',
                       border: '1px solid rgba(255,255,255,0.1)',
                       color: '#FCD34D'
                     }}>
                  <Star size={10} className="fill-[#F59E0B] text-[#F59E0B]" />
                  <span>{product.rating}</span>
                </div>
                
                {/* Shelf Location Tag */}
                <div className="absolute bottom-3 left-3 flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-semibold"
                     style={{
                       background: 'rgba(10,13,20,0.85)',
                       border: '1px solid rgba(255,255,255,0.1)',
                       color: '#94A3B8'
                     }}>
                  <MapPin size={10} style={{ color: '#10B981' }} />
                  {product.shelfLocation}
                </div>
              </div>

              {/* Product Content Details */}
              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#64748B' }}>
                      {product.brand}
                    </span>
                    <span className="text-[10px] font-medium" style={{ color: '#475569' }}>
                      {product.reviewsCount} reviews
                    </span>
                  </div>
                  
                  <h3 className="font-heading font-bold text-[16px]" style={{ color: '#F1F5F9' }}>
                    {product.name}
                  </h3>
                  
                  <p className="text-[11px]" style={{ color: '#475569' }}>
                    {product.subCategory}
                  </p>
                </div>

                {/* Price and Stock Status */}
                <div className="flex items-end justify-between pt-2">
                  <div className="flex flex-col">
                    <span className="text-[9px] uppercase font-bold tracking-wider" style={{ color: '#475569' }}>Retail price</span>
                    <span className="font-mono-custom text-[18px] font-bold" style={{ color: '#10B981' }}>
                      ${product.price.toFixed(2)}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Layers size={11} style={{ color: '#8B5CF6' }} />
                    <span className="font-mono-custom text-[12px] font-semibold" style={{ color: '#E2E8F0' }}>
                      {product.stockCount}
                    </span>
                    <span className="text-[10px]" style={{ color: '#475569' }}>units</span>
                  </div>
                </div>

                {/* Card CTA Buttons - matching the style of image 4 buttons */}
                <div className="grid grid-cols-2 gap-2 pt-3 border-t border-white/[0.05]">
                  <Button variant="secondary" size="sm" className="justify-center text-[11px] font-bold">
                    Details
                  </Button>
                  <Button variant="primary" size="sm" className="justify-center text-[11px] font-bold" icon={<Plus size={11} />}>
                    Add
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 rounded-2xl"
             style={{
               border: '2px dashed rgba(255,255,255,0.08)',
               background: 'rgba(255,255,255,0.02)'
             }}>
          <div className="text-4xl mb-2">🔍</div>
          <h3 className="font-heading font-bold text-[15px] mb-1" style={{ color: '#E2E8F0' }}>No products found</h3>
          <p className="text-[13px]" style={{ color: '#475569' }}>Try adjusting your search terms or filters.</p>
        </div>
      )}
    </div>
  )
}
