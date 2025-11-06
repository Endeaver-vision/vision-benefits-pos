'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SelectionCard } from '@/components/ui/selection-card';
import { 
  Search,
  Filter,
  Glasses,
  ShoppingCart
} from 'lucide-react';
import { useQuoteStore } from '@/store/quote-store';

interface Frame {
  id: string;
  brand: string;
  model: string;
  category: 'value' | 'designer' | 'premium';
  style: 'full-rim' | 'semi-rimless' | 'rimless';
  material: 'plastic' | 'metal' | 'titanium' | 'memory-metal';
  price: number;
  colors: string[];
  sizes: string[];
  image: string;
  description: string;
  features: string[];
  inStock: boolean;
  rating: number;
  reviews: number;
}

// Mock frame data - would come from inventory API
const mockFrames: Frame[] = [
  {
    id: 'ray-ban-rb5154',
    brand: 'Ray-Ban',
    model: 'RB5154 Clubmaster',
    category: 'designer',
    style: 'full-rim',
    material: 'plastic',
    price: 180.00,
    colors: ['Black', 'Tortoise', 'Clear'],
    sizes: ['51-21-145', '49-21-145'],
    image: '/frames/rayban-clubmaster.jpg',
    description: 'Classic clubmaster style with timeless appeal',
    features: ['Iconic design', 'Adjustable nose pads', 'Spring hinges'],
    inStock: true,
    rating: 4.8,
    reviews: 156
  },
  {
    id: 'oakley-ox8156',
    brand: 'Oakley',
    model: 'OX8156 Holbrook RX',
    category: 'designer',
    style: 'full-rim',
    material: 'plastic',
    price: 165.00,
    colors: ['Matte Black', 'Polished Black', 'Brown Tortoise'],
    sizes: ['54-18-137', '56-18-137'],
    image: '/frames/oakley-holbrook.jpg',
    description: 'Modern square frame with athletic inspiration',
    features: ['Impact resistant', 'Lightweight O Matter', 'Three-Point Fit'],
    inStock: true,
    rating: 4.6,
    reviews: 89
  },
  {
    id: 'warby-parker-winston',
    brand: 'Warby Parker',
    model: 'Winston',
    category: 'value',
    style: 'full-rim',
    material: 'plastic',
    price: 95.00,
    colors: ['Whiskey Tortoise', 'Crystal', 'Jet Black'],
    sizes: ['50-20-145', '48-20-145'],
    image: '/frames/warby-winston.jpg',
    description: 'Vintage-inspired round frame with modern comfort',
    features: ['Hand-finished acetate', 'Custom barrel hinges', 'Anti-reflective lenses included'],
    inStock: true,
    rating: 4.4,
    reviews: 234
  },
  {
    id: 'silhouette-5515',
    brand: 'Silhouette',
    model: 'TMA Icon 5515',
    category: 'premium',
    style: 'rimless',
    material: 'titanium',
    price: 320.00,
    colors: ['Gold', 'Silver', 'Gunmetal'],
    sizes: ['52-19-140', '54-19-140', '56-19-140'],
    image: '/frames/silhouette-icon.jpg',
    description: 'Ultra-lightweight rimless titanium frame',
    features: ['Screwless hinges', 'Hypoallergenic', 'Incredibly lightweight'],
    inStock: true,
    rating: 4.9,
    reviews: 67
  },
  {
    id: 'coach-hc6152',
    brand: 'Coach',
    model: 'HC6152',
    category: 'designer',
    style: 'full-rim',
    material: 'plastic',
    price: 195.00,
    colors: ['Dark Tortoise', 'Black', 'Burgundy'],
    sizes: ['52-16-140', '54-16-140'],
    image: '/frames/coach-hc6152.jpg',
    description: 'Elegant cat-eye frame with signature Coach details',
    features: ['Signature hardware', 'Premium acetate', 'Comfortable fit'],
    inStock: false,
    rating: 4.7,
    reviews: 45
  },
  {
    id: 'flexon-autoflex',
    brand: 'Flexon',
    model: 'AutoFlex 108',
    category: 'value',
    style: 'semi-rimless',
    material: 'memory-metal',
    price: 125.00,
    colors: ['Gunmetal', 'Brown', 'Black'],
    sizes: ['54-18-135', '56-18-135'],
    image: '/frames/flexon-autoflex.jpg',
    description: 'Flexible memory metal frame that returns to shape',
    features: ['Memory metal technology', 'Bendable temples', 'Durable construction'],
    inStock: true,
    rating: 4.3,
    reviews: 78
  }
];

interface FrameSelectionProps {
  className?: string;
}

export function FrameSelection({ className }: FrameSelectionProps) {
  const { quote, updateEyeglasses } = useQuoteStore();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStyle, setSelectedStyle] = useState<string>('all');
  const [selectedMaterial, setSelectedMaterial] = useState<string>('all');
  const [priceRange, setPriceRange] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('popular');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const selectedFrame = quote.eyeglasses.frame;

  const handleFrameSelect = (frame: Frame) => {
    updateEyeglasses({
      frame: {
        id: frame.id,
        brand: frame.brand,
        model: frame.model,
        price: frame.price,
        category: frame.category,
        style: frame.style,
        material: frame.material,
        selectedColor: frame.colors[0], // Default to first color
        selectedSize: frame.sizes[0] // Default to first size
      }
    });
  };

  const filteredFrames = mockFrames.filter(frame => {
    const matchesSearch = frame.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         frame.model.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || frame.category === selectedCategory;
    const matchesStyle = selectedStyle === 'all' || frame.style === selectedStyle;
    const matchesMaterial = selectedMaterial === 'all' || frame.material === selectedMaterial;
    
    let matchesPrice = true;
    if (priceRange !== 'all') {
      const [min, max] = priceRange.split('-').map(Number);
      matchesPrice = frame.price >= min && (max ? frame.price <= max : true);
    }

    return matchesSearch && matchesCategory && matchesStyle && matchesMaterial && matchesPrice;
  });

  const sortedFrames = [...filteredFrames].sort((a, b) => {
    switch (sortBy) {
      case 'price-low': return a.price - b.price;
      case 'price-high': return b.price - a.price;
      case 'rating': return b.rating - a.rating;
      case 'brand': return a.brand.localeCompare(b.brand);
      default: return b.rating - a.rating; // Popular (by rating)
    }
  });

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  };

  const renderFrameCard = (frame: Frame) => {
    const isSelected = selectedFrame?.id === frame.id;
    
    // Prepare features for display
    const features = [
      `${frame.style.replace('-', ' ')}`,
      `${frame.material.replace('-', ' ')}`,
      ...frame.features
    ];
    
    // Create tags for additional info
    const tags = [
      `${frame.colors.length} colors`,
      `${frame.sizes.length} sizes`,
      `⭐ ${frame.rating} (${frame.reviews} reviews)`
    ];
    
    return (
      <SelectionCard
        key={frame.id}
        title={`${frame.brand} ${frame.model}`}
        description={frame.description}
        price={frame.price}
        priceLabel=""
        icon={Glasses}
        image={frame.image}
        badge={{
          text: frame.category.charAt(0).toUpperCase() + frame.category.slice(1),
          variant: frame.category === 'designer' ? 'default' : 
                   frame.category === 'premium' ? 'destructive' : 'secondary'
        }}
        features={features}
        tags={tags}
        isSelected={isSelected}
        isDisabled={!frame.inStock}
        onSelect={() => frame.inStock && handleFrameSelect(frame)}
        variant="detailed"
        className={!frame.inStock ? 'opacity-60' : ''}
      />
    );
  };

  return (
    <div className={`space-y-6 ${className}`}>
      
      {/* Header */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-brand-purple/10">
          <Glasses className="h-5 w-5 text-brand-purple" />
        </div>
        <div>
          <h2 className="text-xl font-bold">Frame Selection</h2>
          <p className="text-sm text-muted-foreground">
            Choose from our collection of {mockFrames.length} frames
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center space-x-2">
            <Filter className="h-4 w-4" />
            <span>Search & Filter</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search frames by brand or model..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filter Options */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="value">Value</SelectItem>
                <SelectItem value="designer">Designer</SelectItem>
                <SelectItem value="premium">Premium</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedStyle} onValueChange={setSelectedStyle}>
              <SelectTrigger>
                <SelectValue placeholder="Style" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Styles</SelectItem>
                <SelectItem value="full-rim">Full Rim</SelectItem>
                <SelectItem value="semi-rimless">Semi-Rimless</SelectItem>
                <SelectItem value="rimless">Rimless</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedMaterial} onValueChange={setSelectedMaterial}>
              <SelectTrigger>
                <SelectValue placeholder="Material" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Materials</SelectItem>
                <SelectItem value="plastic">Plastic</SelectItem>
                <SelectItem value="metal">Metal</SelectItem>
                <SelectItem value="titanium">Titanium</SelectItem>
                <SelectItem value="memory-metal">Memory Metal</SelectItem>
              </SelectContent>
            </Select>

            <Select value={priceRange} onValueChange={setPriceRange}>
              <SelectTrigger>
                <SelectValue placeholder="Price Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Prices</SelectItem>
                <SelectItem value="0-100">Under $100</SelectItem>
                <SelectItem value="100-200">$100 - $200</SelectItem>
                <SelectItem value="200-300">$200 - $300</SelectItem>
                <SelectItem value="300">$300+</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger>
                <SelectValue placeholder="Sort By" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="popular">Most Popular</SelectItem>
                <SelectItem value="price-low">Price: Low to High</SelectItem>
                <SelectItem value="price-high">Price: High to Low</SelectItem>
                <SelectItem value="rating">Highest Rated</SelectItem>
                <SelectItem value="brand">Brand A-Z</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Results Summary */}
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Showing {sortedFrames.length} of {mockFrames.length} frames</span>
            <div className="flex items-center space-x-2">
              <span>View:</span>
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className="h-8 w-8 p-0"
              >
                <div className="grid grid-cols-2 gap-0.5 w-3 h-3">
                  <div className="bg-current rounded-sm"></div>
                  <div className="bg-current rounded-sm"></div>
                  <div className="bg-current rounded-sm"></div>
                  <div className="bg-current rounded-sm"></div>
                </div>
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="h-8 w-8 p-0"
              >
                <div className="space-y-0.5 w-3 h-3">
                  <div className="bg-current h-0.5 rounded-sm"></div>
                  <div className="bg-current h-0.5 rounded-sm"></div>
                  <div className="bg-current h-0.5 rounded-sm"></div>
                </div>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Selected Frame Summary */}
      {selectedFrame && (
        <Card className="border-brand-teal/30 bg-brand-teal/5">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <ShoppingCart className="h-5 w-5 text-brand-teal" />
              <div>
                <h4 className="font-medium text-brand-teal">
                  Selected: {selectedFrame.brand} {selectedFrame.model}
                </h4>
                <p className="text-sm text-brand-teal/80">
                  {selectedFrame.price ? formatPrice(selectedFrame.price) : 'Price TBD'} • {selectedFrame.category} category • {selectedFrame.style}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Frames Grid */}
      <div className={
        viewMode === 'grid' 
          ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
          : 'space-y-4'
      }>
        {sortedFrames.map(renderFrameCard)}
      </div>

      {/* No Results */}
      {sortedFrames.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <Glasses className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="font-medium text-gray-900 mb-2">No frames found</h3>
            <p className="text-sm text-gray-600">
              Try adjusting your search criteria or filters
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}