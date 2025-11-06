// Frame Brand List - Future inventory integration placeholder
// This will be replaced with dynamic inventory data

export interface FrameBrand {
  id: string;
  name: string;
  category: 'premium' | 'designer' | 'value' | 'specialty';
  isActive: boolean;
}

export const FRAME_BRANDS: FrameBrand[] = [
  // Premium Brands
  { id: 'ray-ban', name: 'Ray-Ban', category: 'premium', isActive: true },
  { id: 'oakley', name: 'Oakley', category: 'premium', isActive: true },
  { id: 'maui-jim', name: 'Maui Jim', category: 'premium', isActive: true },
  { id: 'persol', name: 'Persol', category: 'premium', isActive: true },
  { id: 'costa', name: 'Costa Del Mar', category: 'premium', isActive: true },
  
  // Designer Brands
  { id: 'gucci', name: 'Gucci', category: 'designer', isActive: true },
  { id: 'prada', name: 'Prada', category: 'designer', isActive: true },
  { id: 'versace', name: 'Versace', category: 'designer', isActive: true },
  { id: 'armani', name: 'Giorgio Armani', category: 'designer', isActive: true },
  { id: 'dolce', name: 'Dolce & Gabbana', category: 'designer', isActive: true },
  { id: 'tom-ford', name: 'Tom Ford', category: 'designer', isActive: true },
  { id: 'burberry', name: 'Burberry', category: 'designer', isActive: true },
  { id: 'coach', name: 'Coach', category: 'designer', isActive: true },
  { id: 'kate-spade', name: 'Kate Spade', category: 'designer', isActive: true },
  { id: 'michael-kors', name: 'Michael Kors', category: 'designer', isActive: true },
  
  // Value Brands
  { id: 'warby-parker', name: 'Warby Parker', category: 'value', isActive: true },
  { id: 'zenni', name: 'Zenni Optical', category: 'value', isActive: true },
  { id: 'costco', name: 'Costco Kirkland', category: 'value', isActive: true },
  { id: 'america-best', name: "America's Best", category: 'value', isActive: true },
  { id: 'eyebuydirect', name: 'EyeBuyDirect', category: 'value', isActive: true },
  
  // Specialty/Sport Brands
  { id: 'nike', name: 'Nike', category: 'specialty', isActive: true },
  { id: 'adidas', name: 'Adidas', category: 'specialty', isActive: true },
  { id: 'under-armour', name: 'Under Armour', category: 'specialty', isActive: true },
  { id: 'wiley-x', name: 'Wiley X', category: 'specialty', isActive: true },
  { id: 'safety-optical', name: 'Safety Optical', category: 'specialty', isActive: true },
  
  // Traditional Optical Brands
  { id: 'silhouette', name: 'Silhouette', category: 'premium', isActive: true },
  { id: 'lindberg', name: 'Lindberg', category: 'premium', isActive: true },
  { id: 'ic-berlin', name: 'ic! berlin', category: 'premium', isActive: true },
  { id: 'luxottica', name: 'Luxottica', category: 'premium', isActive: true },
  { id: 'marcolin', name: 'Marcolin', category: 'premium', isActive: true },
  { id: 'safilo', name: 'Safilo', category: 'premium', isActive: true },
  
  // Additional Popular Brands
  { id: 'carrera', name: 'Carrera', category: 'premium', isActive: true },
  { id: 'fossil', name: 'Fossil', category: 'value', isActive: true },
  { id: 'lacoste', name: 'Lacoste', category: 'designer', isActive: true },
  { id: 'polo', name: 'Polo Ralph Lauren', category: 'designer', isActive: true },
  { id: 'timberland', name: 'Timberland', category: 'value', isActive: true },
  { id: 'columbia', name: 'Columbia', category: 'specialty', isActive: true },
  { id: 'smith', name: 'Smith Optics', category: 'specialty', isActive: true },
  { id: 'spy', name: 'Spy Optic', category: 'specialty', isActive: true },
];

export const getActiveBrands = (): FrameBrand[] => {
  return FRAME_BRANDS.filter(brand => brand.isActive);
};

export const getBrandsByCategory = (category: FrameBrand['category']): FrameBrand[] => {
  return FRAME_BRANDS.filter(brand => brand.category === category && brand.isActive);
};

export const getBrandById = (id: string): FrameBrand | undefined => {
  return FRAME_BRANDS.find(brand => brand.id === id);
};