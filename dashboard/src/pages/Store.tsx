import { useState } from 'react'
import { Search, Layers, Star, X, Shield, Truck, Sparkles, AlertCircle } from 'lucide-react'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui'

interface Nutrition {
  calories: number
  protein: string
  fat: string
  carbs: string
  sugar: string
  sodium: string
}

interface Product {
  name: string
  category: 'Food' | 'Beverages' | 'Personal Care' | 'Household'
  subCategory: string
  brand: string
  availability: 'In Stock' | 'Low Stock' | 'Out of Stock'
  stockCount: number
  price: number // average retail price in INR
  mrp: number // MRP in INR
  suggestedSellingPrice: number // suggested selling price in INR
  rating: number
  reviewsCount: number
  lastUpdated: string
  image: string
  manufacturer: string
  parentCompany: string
  countryOfOrigin: string
  description: string
  specifications: {
    netWeight: string
    quantity: string
    packageType: string
    variant: string
    productType: string
  }
  businessInfo: {
    distributor: string
    shelfLife: string
    storageInstructions: string
    gstCategory: string
    hsnCode: string
  }
  insights: {
    fmcgClassification: string
    demandLevel: string
    popularity: string
    retailCategory: string
  }
  nutrition?: Nutrition
  competitors?: {
    name: string
    prices: {
      blinkit: number
      bigbasket: number
    }
  }[]
  aiRestockRecommendation?: string
}

const PRODUCTS: Product[] = [
  {
    name: 'Corn Flakes',
    category: 'Food',
    subCategory: 'Breakfast Cereal',
    brand: "Kellogg's",
    availability: 'In Stock',
    stockCount: 84,
    price: 99,
    mrp: 105,
    suggestedSellingPrice: 99,
    rating: 4.6,
    reviewsCount: 112,
    lastUpdated: '10 mins ago',
    image: '/corn_flakes.jpg',
    manufacturer: 'Kellogg India Private Limited',
    parentCompany: 'Kellanova',
    countryOfOrigin: 'India',
    description: "Kellogg's Corn Flakes is a nourishing, crispy, and tasty breakfast cereal made from sun-ripened corn. It is naturally low in fat, cholesterol-free, and high in iron and essential B-group vitamins.",
    specifications: {
      netWeight: '250g',
      quantity: 'Pack of 1',
      packageType: 'Box Pack',
      variant: 'Original',
      productType: 'Ready-to-Eat Cereal'
    },
    businessInfo: {
      distributor: 'Reliance Retail & Local FMCG Distributors',
      shelfLife: '9 Months',
      storageInstructions: 'Store in a cool, dry, and hygienic place. Once opened, transfer to an airtight container.',
      gstCategory: '18%',
      hsnCode: '19041010'
    },
    insights: {
      fmcgClassification: 'Fast Moving Consumer Goods (FMCG)',
      demandLevel: 'High',
      popularity: 'Market Leader',
      retailCategory: 'Breakfast Foods'
    },
    nutrition: {
      calories: 378,
      protein: '7.0g',
      fat: '0.8g',
      carbs: '84.0g',
      sugar: '8.5g',
      sodium: '729mg'
    },
    competitors: [
      { name: 'Bagrry’s Corn Flakes', prices: { blinkit: 95, bigbasket: 92 } },
      { name: 'Pat细jali Corn Flakes', prices: { blinkit: 85, bigbasket: 80 } }
    ],
    aiRestockRecommendation: 'Stable consumption trend. Restock cycle recommended every 14 days to maintain baseline inventory.'
  },
  {
    name: 'Dettol',
    category: 'Personal Care',
    subCategory: 'Antiseptic Liquid',
    brand: 'Dettol',
    availability: 'In Stock',
    stockCount: 120,
    price: 118,
    mrp: 124,
    suggestedSellingPrice: 118,
    rating: 4.8,
    reviewsCount: 245,
    lastUpdated: '1 hr ago',
    image: '/dettol.jpg',
    manufacturer: 'Reckitt Benckiser (India) Private Limited',
    parentCompany: 'Reckitt Benckiser Group plc',
    countryOfOrigin: 'India',
    description: 'Dettol Antiseptic Liquid is a highly effective concentrated antiseptic disinfectant that kills 99.9% of germs. Trusted by millions for first aid wound cleaning, personal hygiene, skin disinfection, and household sanitization.',
    specifications: {
      netWeight: '250ml',
      quantity: 'Pack of 1',
      packageType: 'Plastic Bottle',
      variant: 'Antiseptic Liquid',
      productType: 'Antiseptic Disinfectant'
    },
    businessInfo: {
      distributor: 'RB Health India Distribution Partners',
      shelfLife: '36 Months',
      storageInstructions: 'Store below 30°C. Protect from direct heat. Keep out of reach of children.',
      gstCategory: '12%',
      hsnCode: '30049089'
    },
    insights: {
      fmcgClassification: 'Consumer Health / OTC (FMCG)',
      demandLevel: 'Stable / High',
      popularity: 'Market Leader',
      retailCategory: 'OTC & First Aid'
    },
    competitors: [
      { name: 'Savlon Antiseptic Liquid', prices: { blinkit: 105, bigbasket: 100 } },
      { name: 'Lifebuoy Hygiene Liquid', prices: { blinkit: 95, bigbasket: 90 } }
    ],
    aiRestockRecommendation: 'High baseline demand. Maintain at least 30 units safety stock due to persistent sanitizer sales.'
  },
  {
    name: 'Dove',
    category: 'Personal Care',
    subCategory: 'Beauty Soap Bar',
    brand: 'Dove',
    availability: 'In Stock',
    stockCount: 95,
    price: 62,
    mrp: 68,
    suggestedSellingPrice: 62,
    rating: 4.7,
    reviewsCount: 189,
    lastUpdated: '45 mins ago',
    image: '/dove.jpg',
    manufacturer: 'Hindustan Unilever Limited (HUL)',
    parentCompany: 'Unilever plc',
    countryOfOrigin: 'India',
    description: 'Dove Cream Beauty Bathing Bar features a gentle cleansing formula enriched with Dove’s signature 1/4 moisturizing cream. Unlike ordinary soaps, it preserves skin moisture, leaving it soft, smooth, and glowing.',
    specifications: {
      netWeight: '75g',
      quantity: 'Pack of 1',
      packageType: 'Carton Box',
      variant: 'Cream Beauty (Original)',
      productType: 'Bathing Bar'
    },
    businessInfo: {
      distributor: 'Hindustan Unilever Distribution Network',
      shelfLife: '30 Months',
      storageInstructions: 'Keep in a cool, dry place. Avoid keeping in stagnant water to prevent melting.',
      gstCategory: '18%',
      hsnCode: '34011110'
    },
    insights: {
      fmcgClassification: 'Personal Care FMCG',
      demandLevel: 'High',
      popularity: 'Premium Segment Leader',
      retailCategory: 'Soaps & Hygiene'
    },
    competitors: [
      { name: 'Nivea Creme Soap Bar', prices: { blinkit: 58, bigbasket: 55 } },
      { name: 'Fiama Gel Soap Bar', prices: { blinkit: 60, bigbasket: 58 } }
    ],
    aiRestockRecommendation: 'Optimal stock levels. Place order automatically once current count drops below 25 units.'
  },
  {
    name: 'Lays',
    category: 'Food',
    subCategory: 'Potato Chips',
    brand: 'Lay\'s',
    availability: 'In Stock',
    stockCount: 62,
    price: 20,
    mrp: 20,
    suggestedSellingPrice: 20,
    rating: 4.5,
    reviewsCount: 312,
    lastUpdated: '15 mins ago',
    image: '/lays.jpg',
    manufacturer: 'PepsiCo India Holdings Private Limited',
    parentCompany: 'PepsiCo Inc.',
    countryOfOrigin: 'India',
    description: 'Lay\'s Classic Salted Potato Chips are sliced wafer-thin from farm-grown fresh potatoes, cooked to crispy gold perfection, and seasoned simply with salt. A timeless, light snack loved by people of all ages.',
    specifications: {
      netWeight: '50g',
      quantity: 'Pack of 1',
      packageType: 'Foil Pouch',
      variant: 'Classic Salted',
      productType: 'Potato Chips'
    },
    businessInfo: {
      distributor: 'PepsiCo Foods Regional Distributors',
      shelfLife: '6 Months',
      storageInstructions: 'Store in a cool, dry place. Keep away from direct sunlight. Seal after opening.',
      gstCategory: '12%',
      hsnCode: '20052000'
    },
    insights: {
      fmcgClassification: 'Impulsive / Snack FMCG',
      demandLevel: 'Critical',
      popularity: 'Massive Market Penetration',
      retailCategory: 'Packaged Snacks'
    },
    nutrition: {
      calories: 543,
      protein: '7.1g',
      fat: '33.5g',
      carbs: '53.4g',
      sugar: '0.5g',
      sodium: '535mg'
    },
    competitors: [
      { name: 'Bingo Potato Chips', prices: { blinkit: 20, bigbasket: 19 } },
      { name: 'Balaji Wafers Classic', prices: { blinkit: 20, bigbasket: 18 } }
    ],
    aiRestockRecommendation: 'Fastest moving SKU. Restock trigger points should remain active due to short impulse buy cycles.'
  },
  {
    name: 'Maggi',
    category: 'Food',
    subCategory: 'Instant Noodles',
    brand: 'Maggi',
    availability: 'In Stock',
    stockCount: 142,
    price: 14,
    mrp: 14,
    suggestedSellingPrice: 14,
    rating: 4.9,
    reviewsCount: 520,
    lastUpdated: '5 mins ago',
    image: '/maggi.jpg',
    manufacturer: 'Nestlé India Limited',
    parentCompany: 'Nestlé S.A.',
    countryOfOrigin: 'India',
    description: 'Maggi 2-Minute Masala Noodles are a cultural icon in India. Made with a unique blend of 10 carefully roasted spices and herbs, these noodles cook in just two minutes, offering a comfort meal anytime.',
    specifications: {
      netWeight: '70g',
      quantity: 'Pack of 1',
      packageType: 'Plastic Pouch',
      variant: 'Masala Noodles',
      productType: 'Instant Noodles'
    },
    businessInfo: {
      distributor: 'Nestlé India Distribution & Warehousing Network',
      shelfLife: '9 Months',
      storageInstructions: 'Store in a dry, cool and hygienic place. Protect from insects, moisture, and strong aromas.',
      gstCategory: '18%',
      hsnCode: '19023010'
    },
    insights: {
      fmcgClassification: 'High Turnover Staple (FMCG)',
      demandLevel: 'Critical',
      popularity: 'Household Essential',
      retailCategory: 'Instant Foods'
    },
    nutrition: {
      calories: 427,
      protein: '8.0g',
      fat: '15.7g',
      carbs: '63.5g',
      sugar: '1.2g',
      sodium: '1180mg'
    },
    competitors: [
      { name: 'Yippee Noodles Masala', prices: { blinkit: 14, bigbasket: 13 } },
      { name: 'Patanjali Atta Noodles', prices: { blinkit: 15, bigbasket: 14 } }
    ],
    aiRestockRecommendation: 'Stock velocity is extremely high. Keep double safety limits on shelves.'
  },
  {
    name: 'Mountain Dew',
    category: 'Beverages',
    subCategory: 'Citrus Soda',
    brand: 'Mountain Dew',
    availability: 'In Stock',
    stockCount: 78,
    price: 38,
    mrp: 40,
    suggestedSellingPrice: 38,
    rating: 4.4,
    reviewsCount: 88,
    lastUpdated: '30 mins ago',
    image: '/mountain_dew.jpg',
    manufacturer: 'Varun Beverages Limited',
    parentCompany: 'PepsiCo Inc.',
    countryOfOrigin: 'India',
    description: 'Mountain Dew is a carbonated citrus-flavored soft drink that stimulates, refreshes, and fuels an active lifestyle. Its sweet, tangy lemon-lime taste provides an intense beverage experience.',
    specifications: {
      netWeight: '250ml',
      quantity: 'Pack of 1',
      packageType: 'Aluminum Can',
      variant: 'Citrus',
      productType: 'Carbonated Beverage'
    },
    businessInfo: {
      distributor: 'Varun Beverages India Regional Outlets',
      shelfLife: '6 Months',
      storageInstructions: 'Store in a clean, dry place away from direct sunlight. Serves best when chilled.',
      gstCategory: '28%',
      hsnCode: '22021010'
    },
    insights: {
      fmcgClassification: 'Beverages FMCG',
      demandLevel: 'High',
      popularity: 'Popular Youth Drink',
      retailCategory: 'Cold Drinks'
    },
    nutrition: {
      calories: 48,
      protein: '0g',
      fat: '0g',
      carbs: '12.1g',
      sugar: '12.0g',
      sodium: '15mg'
    },
    competitors: [
      { name: 'Sprite Can 250ml', prices: { blinkit: 40, bigbasket: 38 } },
      { name: '7Up Can 250ml', prices: { blinkit: 40, bigbasket: 37 } }
    ],
    aiRestockRecommendation: 'Seasonal demand surges. Increase replenishment volume during summer and holiday peak periods.'
  },
  {
    name: 'Nescafe',
    category: 'Beverages',
    subCategory: 'Instant Coffee',
    brand: 'Nescafé',
    availability: 'In Stock',
    stockCount: 45,
    price: 175,
    mrp: 185,
    suggestedSellingPrice: 175,
    rating: 4.7,
    reviewsCount: 143,
    lastUpdated: '2 hrs ago',
    image: '/nescafe.jpg',
    manufacturer: 'Nestlé India Limited',
    parentCompany: 'Nestlé S.A.',
    countryOfOrigin: 'India',
    description: 'Nescafé Classic Instant Coffee is made from handpicked Robusta and Arabica beans, roasted medium-dark to preserve coffee aroma and signature rich, aromatic taste.',
    specifications: {
      netWeight: '50g',
      quantity: 'Pack of 1',
      packageType: 'Glass Jar',
      variant: 'Classic Instant',
      productType: 'Coffee Powder'
    },
    businessInfo: {
      distributor: 'Nestlé Logistics & Wholesalers',
      shelfLife: '18 Months',
      storageInstructions: 'Store in a cool, dry, and hygienic place. Close the glass jar lid tightly after use.',
      gstCategory: '18%',
      hsnCode: '21011110'
    },
    insights: {
      fmcgClassification: 'Premium Packaged Beverage',
      demandLevel: 'Stable',
      popularity: 'Highest Market Share',
      retailCategory: 'Coffee & Tea'
    },
    competitors: [
      { name: 'Bru Gold Instant Coffee 50g', prices: { blinkit: 170, bigbasket: 165 } },
      { name: 'Tata Coffee Grand 50g', prices: { blinkit: 150, bigbasket: 145 } }
    ],
    aiRestockRecommendation: 'Stable turnover rate. Place replenishment orders monthly to maintain optimum inventory.'
  },
  {
    name: 'Colgate',
    category: 'Personal Care',
    subCategory: 'Fluoride Toothpaste',
    brand: 'Colgate',
    availability: 'In Stock',
    stockCount: 110,
    price: 70,
    mrp: 75,
    suggestedSellingPrice: 70,
    rating: 4.6,
    reviewsCount: 205,
    lastUpdated: '10 mins ago',
    image: '/colgate.jpg',
    manufacturer: 'Colgate-Palmolive (India) Limited',
    parentCompany: 'Colgate-Palmolive Company',
    countryOfOrigin: 'India',
    description: 'Colgate Strong Teeth is anticavity family toothpaste with a unique Amino Shakti formula that adds natural calcium to strengthen teeth from within to defend against cavities.',
    specifications: {
      netWeight: '100g',
      quantity: 'Pack of 1',
      packageType: 'Laminated Tube in Carton Box',
      variant: 'Strong Teeth Anticavity',
      productType: 'Toothpaste'
    },
    businessInfo: {
      distributor: 'Colgate-Palmolive India Distributors Network',
      shelfLife: '24 Months',
      storageInstructions: 'Store in a cool place, away from direct heat. Do not swallow.',
      gstCategory: '18%',
      hsnCode: '33061020'
    },
    insights: {
      fmcgClassification: 'Oral Care Staple FMCG',
      demandLevel: 'High',
      popularity: 'Most Trusted Brand',
      retailCategory: 'Oral Care'
    },
    competitors: [
      { name: 'Pepsodent Germi Check 100g', prices: { blinkit: 65, bigbasket: 62 } },
      { name: 'Dant Kanti Toothpaste 100g', prices: { blinkit: 60, bigbasket: 58 } }
    ],
    aiRestockRecommendation: 'Consistent sales cycles. Automatically re-order when stock count decreases below 20.'
  }
]

const CATEGORIES = ['All', 'Food', 'Beverages', 'Personal Care', 'Household'] as const

export default function Store() {
  const [searchTerm, setSearchTerm] = useState('')
  const [activeCategory, setActiveCategory] = useState<typeof CATEGORIES[number]>('All')
  
  // Modals state
  const [buyProduct, setBuyProduct] = useState<Product | null>(null)
  const [detailProduct, setDetailProduct] = useState<Product | null>(null)

  const filteredProducts = PRODUCTS.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          product.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          product.subCategory.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = activeCategory === 'All' || product.category === activeCategory
    return matchesSearch && matchesCategory
  })

  // Buy redirection handler
  const handleRedirection = (productName: string, platform: 'amazon' | 'flipkart' | 'blinkit') => {
    let url = ''
    const encodedQuery = encodeURIComponent(productName)
    if (platform === 'amazon') {
      url = `https://www.amazon.in/s?k=${encodedQuery}`
    } else if (platform === 'flipkart') {
      url = `https://www.flipkart.com/search?q=${encodedQuery}`
    } else if (platform === 'blinkit') {
      url = `https://blinkit.com/s/?q=${encodedQuery}`
    }
    window.open(url, '_blank', 'noopener,noreferrer')
    setBuyProduct(null)
  }

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
              
              {/* Image Container with Hover zoom effect */}
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
                      ₹{product.price}
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

                {/* Card CTA Buttons */}
                <div className="grid grid-cols-2 gap-2 pt-3 border-t border-white/[0.05]">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="justify-center text-[11px] font-bold"
                    onClick={() => setDetailProduct(product)}
                  >
                    Details
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    className="justify-center text-[11px] font-bold"
                    onClick={() => setBuyProduct(product)}
                  >
                    Buy
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

      {/* ── BUY MODAL ── */}
      {buyProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm transition-all duration-300">
          <div
            className="w-full max-w-md rounded-2xl p-6 relative flex flex-col space-y-5 animate-in fade-in zoom-in-95 duration-200"
            style={{
              background: 'rgba(10,13,20,0.95)',
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
            }}
          >
            {/* Close Button */}
            <button
              onClick={() => setBuyProduct(null)}
              className="absolute top-4 right-4 text-gray-500 hover:text-white p-1 rounded-lg bg-white/5 border border-white/10 transition-colors"
            >
              <X size={16} />
            </button>

            {/* Header */}
            <div className="text-center space-y-1">
              <div className="text-[11px] uppercase tracking-wider font-bold text-emerald-400">Order Redirection</div>
              <h2 className="text-lg font-bold font-heading text-white">Purchase {buyProduct.name}</h2>
              <p className="text-xs text-gray-400">Choose where you want to purchase this product</p>
            </div>

            {/* Platform Options */}
            <div className="flex flex-col gap-3">
              {[
                {
                  id: 'amazon' as const,
                  name: 'Amazon India',
                  color: '#FF9900',
                  bg: 'rgba(255, 153, 0, 0.05)',
                  border: 'rgba(255, 153, 0, 0.2)',
                  badge: 'Direct Search',
                  logo: '🛍️'
                },
                {
                  id: 'flipkart' as const,
                  name: 'Flipkart',
                  color: '#2874F0',
                  bg: 'rgba(40, 116, 240, 0.05)',
                  border: 'rgba(40, 116, 240, 0.2)',
                  badge: 'Search Store',
                  logo: '🛒'
                },
                {
                  id: 'blinkit' as const,
                  name: 'Blinkit',
                  color: '#FCD34D',
                  bg: 'rgba(252, 211, 77, 0.05)',
                  border: 'rgba(252, 211, 77, 0.2)',
                  badge: 'Instant Delivery',
                  logo: '⚡'
                }
              ].map(platform => (
                <button
                  key={platform.id}
                  onClick={() => handleRedirection(buyProduct.name, platform.id)}
                  className="w-full flex items-center justify-between p-4 rounded-xl text-left border transition-all duration-200 hover:scale-[1.02] active:scale-[0.99] cursor-pointer"
                  style={{
                    background: platform.bg,
                    borderColor: platform.border,
                  }}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{platform.logo}</span>
                    <div>
                      <div className="font-bold text-sm text-white">{platform.name}</div>
                      <div className="text-[10px] text-gray-500">Search for "{buyProduct.name}"</div>
                    </div>
                  </div>
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full border"
                        style={{
                          borderColor: platform.border,
                          color: platform.color
                        }}>
                    {platform.badge}
                  </span>
                </button>
              ))}
            </div>

            {/* Footer */}
            <div className="text-center text-[10px] text-gray-600">
              Redirection will open in a new tab. No data is stored locally.
            </div>
          </div>
        </div>
      )}

      {/* ── DETAILS MODAL ── */}
      {detailProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md transition-all duration-300">
          <div
            className="w-full max-w-4xl rounded-2xl relative flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200 overflow-hidden"
            style={{
              background: 'rgba(10,13,20,0.97)',
              border: '1px solid rgba(255,255,255,0.08)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)'
            }}
          >
            {/* Modal Header Bar */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
              <div className="flex items-center gap-2">
                <span className="text-lg">🛍️</span>
                <h2 className="font-heading font-extrabold text-[16px] text-white">Product Intelligence</h2>
                <Badge variant="gray" className="text-[8px] font-mono-custom ml-2">{detailProduct.subCategory}</Badge>
              </div>
              <button
                onClick={() => setDetailProduct(null)}
                className="text-gray-500 hover:text-white p-1 rounded-lg bg-white/5 border border-white/10 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Product Top Brief Grid */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                
                {/* Product Image Panel */}
                <div className="md:col-span-4 flex items-center justify-center bg-black/25 rounded-2xl border border-white/[0.04] p-4 relative overflow-hidden aspect-square">
                  <img
                    src={detailProduct.image}
                    alt={detailProduct.name}
                    className="w-full h-full object-cover rounded-xl"
                  />
                  <div className="absolute top-3 left-3">
                    <Badge variant="green" className="text-[8px] tracking-wider">{detailProduct.availability}</Badge>
                  </div>
                </div>

                {/* Pricing & Brief Panel */}
                <div className="md:col-span-8 flex flex-col justify-between space-y-4">
                  <div className="space-y-1">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">{detailProduct.brand}</div>
                    <h1 className="font-heading font-extrabold text-[24px] text-white leading-tight">{detailProduct.name}</h1>
                    <div className="text-xs text-gray-500 font-medium">
                      Manufactured by <span className="text-gray-300 font-semibold">{detailProduct.manufacturer}</span> · Parent Company: <span className="text-gray-300 font-semibold">{detailProduct.parentCompany}</span>
                    </div>
                  </div>

                  <p className="text-xs text-gray-400 leading-relaxed bg-white/[0.01] p-3 rounded-xl border border-white/[0.03]">
                    {detailProduct.description}
                  </p>

                  {/* Pricing Breakdown */}
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: 'MRP', value: `₹${detailProduct.mrp}`, col: '#EF4444' },
                      { label: 'Avg Retail Price', value: `₹${detailProduct.price}`, col: '#10B981' },
                      { label: 'Suggested Selling', value: `₹${detailProduct.suggestedSellingPrice}`, col: '#8B5CF6' }
                    ].map((priceItem, index) => (
                      <div
                        key={index}
                        className="p-3 rounded-xl flex flex-col justify-center border border-white/[0.04]"
                        style={{ background: 'rgba(255,255,255,0.01)' }}
                      >
                        <span className="text-[9px] uppercase tracking-wider font-bold text-gray-500 mb-1">{priceItem.label}</span>
                        <span className="font-mono-custom text-base font-extrabold" style={{ color: priceItem.col }}>{priceItem.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Grid Specifications and Business Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Specifications Card */}
                <div className="p-5 rounded-2xl border border-white/5 space-y-3" style={{ background: 'rgba(255,255,255,0.02)' }}>
                  <h3 className="font-heading font-bold text-xs text-white uppercase tracking-wider flex items-center gap-2">
                    <Shield size={14} className="text-emerald-400" />
                    Product Specifications
                  </h3>
                  <div className="space-y-2.5 text-xs">
                    {[
                      { label: 'Net Weight', value: detailProduct.specifications.netWeight },
                      { label: 'Quantity', value: detailProduct.specifications.quantity },
                      { label: 'Package Type', value: detailProduct.specifications.packageType },
                      { label: 'Variant/Flavour', value: detailProduct.specifications.variant },
                      { label: 'Product Type', value: detailProduct.specifications.productType },
                      { label: 'Country of Origin', value: detailProduct.countryOfOrigin }
                    ].map(spec => (
                      <div key={spec.label} className="flex justify-between py-1.5 border-b border-white/[0.03]">
                        <span className="text-gray-500">{spec.label}</span>
                        <span className="text-gray-300 font-medium">{spec.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Business Information Card */}
                <div className="p-5 rounded-2xl border border-white/5 space-y-3" style={{ background: 'rgba(255,255,255,0.02)' }}>
                  <h3 className="font-heading font-bold text-xs text-white uppercase tracking-wider flex items-center gap-2">
                    <Truck size={14} className="text-indigo-400" />
                    Business & Compliance
                  </h3>
                  <div className="space-y-2.5 text-xs">
                    {[
                      { label: 'Distributor', value: detailProduct.businessInfo.distributor },
                      { label: 'Shelf Life', value: detailProduct.businessInfo.shelfLife },
                      { label: 'Storage', value: detailProduct.businessInfo.storageInstructions },
                      { label: 'GST Category', value: detailProduct.businessInfo.gstCategory },
                      { label: 'HSN Code', value: detailProduct.businessInfo.hsnCode }
                    ].map(biz => (
                      <div key={biz.label} className="flex flex-col py-1.5 border-b border-white/[0.03] space-y-0.5">
                        <span className="text-gray-500">{biz.label}</span>
                        <span className="text-gray-300 font-medium">{biz.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Insights and Competitor pricing */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Insights Panel */}
                <div className="p-5 rounded-2xl border border-white/5 space-y-3" style={{ background: 'rgba(255,255,255,0.02)' }}>
                  <h3 className="font-heading font-bold text-xs text-white uppercase tracking-wider flex items-center gap-2">
                    <Sparkles size={14} className="text-yellow-400" />
                    Market Intelligence Insights
                  </h3>
                  <div className="space-y-2.5 text-xs">
                    {[
                      { label: 'FMCG Category', value: detailProduct.insights.fmcgClassification },
                      { label: 'Demand Velocity', value: detailProduct.insights.demandLevel },
                      { label: 'Market Standing', value: detailProduct.insights.popularity },
                      { label: 'Estimated Rating', value: `${detailProduct.rating} / 5.0 (${detailProduct.reviewsCount} reviews)` },
                      { label: 'Supermarket Category', value: detailProduct.insights.retailCategory }
                    ].map(ins => (
                      <div key={ins.label} className="flex justify-between py-1.5 border-b border-white/[0.03]">
                        <span className="text-gray-500">{ins.label}</span>
                        <span className="text-gray-300 font-semibold">{ins.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Competitors & AI Recommendations Panel */}
                <div className="p-5 rounded-2xl border border-white/5 space-y-4" style={{ background: 'rgba(255,255,255,0.02)' }}>
                  {/* Competitors List */}
                  {detailProduct.competitors && detailProduct.competitors.length > 0 && (
                    <div className="space-y-2.5">
                      <h4 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Competitor Online Prices</h4>
                      <div className="space-y-2">
                        {detailProduct.competitors.map((comp, index) => (
                          <div key={index} className="flex items-center justify-between bg-white/[0.01] border border-white/[0.03] p-2.5 rounded-xl text-xs">
                            <span className="text-gray-300 font-medium">{comp.name}</span>
                            <div className="flex gap-3 text-[11px]">
                              <span style={{ color: '#FCD34D' }}>Blinkit: <strong className="font-mono-custom">₹{comp.prices.blinkit}</strong></span>
                              <span style={{ color: '#06B6D4' }}>Bigbasket: <strong className="font-mono-custom">₹{comp.prices.bigbasket}</strong></span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* AI Restocking Recommendation */}
                  {detailProduct.aiRestockRecommendation && (
                    <div className="space-y-2">
                      <h4 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                        <AlertCircle size={12} className="text-purple-400" />
                        AI Replenishment Strategy
                      </h4>
                      <p className="text-xs text-purple-200/80 bg-purple-500/5 border border-purple-500/10 p-3 rounded-xl leading-relaxed">
                        {detailProduct.aiRestockRecommendation}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Nutritional Information (Food Category Only) */}
              {detailProduct.category === 'Food' && detailProduct.nutrition && (
                <div className="p-5 rounded-2xl border border-white/5 space-y-3" style={{ background: 'rgba(255,255,255,0.02)' }}>
                  <h3 className="font-heading font-bold text-xs text-white uppercase tracking-wider">
                    Nutritional Values (per 100g)
                  </h3>
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                    {[
                      { name: 'Calories', val: `${detailProduct.nutrition.calories} kcal` },
                      { name: 'Protein', val: detailProduct.nutrition.protein },
                      { name: 'Total Fat', val: detailProduct.nutrition.fat },
                      { name: 'Carbohydrates', val: detailProduct.nutrition.carbs },
                      { name: 'Sugar', val: detailProduct.nutrition.sugar },
                      { name: 'Sodium', val: detailProduct.nutrition.sodium }
                    ].map((nutr, index) => (
                      <div key={index} className="p-2.5 rounded-xl border border-white/[0.04] text-center" style={{ background: 'rgba(255,255,255,0.01)' }}>
                        <div className="text-[10px] text-gray-500 font-bold uppercase mb-1">{nutr.name}</div>
                        <div className="font-mono-custom text-xs font-bold text-white">{nutr.val}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Action Bar */}
            <div className="px-6 py-4 border-t border-white/5 flex justify-end gap-3 bg-black/20">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setDetailProduct(null)}
              >
                Close Details
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setBuyProduct(detailProduct)
                  setDetailProduct(null)
                }}
              >
                Buy Now
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
