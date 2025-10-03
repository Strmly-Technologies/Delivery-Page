'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ShoppingBag, Search, X } from 'lucide-react';
import ProductCustomization, { ProductCustomization as CustomizationType } from '../components/product/ProductCustomization';
import Image from 'next/image';
interface Product {
  _id: string;
  name: string;
  description: string;
  price: number;
  category: 'juices' | 'shakes';
  image: string;
  stock: number;
}

export default function BesomMobileUI() {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'juices' | 'shakes'>('all');
  const [cartLoading, setCartLoading] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [customization, setCustomization] = useState<CustomizationType | null>(null);
  const [finalPrice, setFinalPrice] = useState(0);

  useEffect(() => {
    const currentUser = localStorage.getItem('user');
    if (currentUser) {
      setUser(JSON.parse(currentUser));
    }
    fetchProducts();
  }, [filter]);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredProducts(products);
    } else {
      const lowercaseQuery = searchQuery.toLowerCase();
      const filtered = products.filter(product =>
        product.name.toLowerCase().includes(lowercaseQuery) ||
        product.description.toLowerCase().includes(lowercaseQuery)
      );
      setFilteredProducts(filtered);
    }
  }, [searchQuery, products]);

  const fetchProducts = async () => {
    try {
      const url = filter === 'all' ? '/api/products' : `/api/products?category=${filter}`;
      const response = await fetch(url, { credentials: 'include' });
      const data = await response.json();
      if (data.success) {
        setProducts(data.products);
        setFilteredProducts(data.products);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const openCustomizationModal = (product: Product) => {
    setSelectedProduct(product);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setTimeout(() => {
      setSelectedProduct(null);
      setCustomization(null);
    }, 300);
  };

  const handleCustomizationChange = (custom: CustomizationType, price: number) => {
    setCustomization(custom);
    setFinalPrice(price);
  };

  const addToCart = async () => {
    if (!selectedProduct || !customization) return;

    setCartLoading(selectedProduct._id);
    try {
      const response = await fetch('/api/cart', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: selectedProduct._id,
          customization: customization,
          finalPrice: finalPrice
        })
      });
      const data = await response.json();
      if (data.success) {
        alert('Product added to cart!');
        closeModal();
      } else {
        alert(data.error || 'Failed to add to cart');
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
      alert('Failed to add to cart');
    } finally {
      setCartLoading(null);
    }
  };

  const getCategoryColor = (category: 'juices' | 'shakes' | 'discount') => {
    const colors = {
      juices: 'from-orange-400 to-orange-500',
      shakes: 'from-red-400 to-red-500',
      discount: 'from-yellow-400 to-yellow-500'
    };
    return colors[category] || 'from-orange-400 to-orange-500';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🥤</div>
          <h2 className="text-xl font-semibold text-gray-700">Loading...</h2>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gray-50 pb-20">
        {/* Header */}
        {isSearchOpen ? (
          <header className="bg-white px-4 py-3 flex items-center sticky top-0 z-40 shadow-sm">
            <div className="flex-1 flex items-center space-x-2">
              <button onClick={() => { setIsSearchOpen(false); setSearchQuery(''); }} className="p-2 text-gray-500">
                ←
              </button>
              <input
                type="text"
                placeholder="Search for juices and shakes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-gray-100 rounded-full py-2 px-4 focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                autoFocus
              />
            </div>
          </header>
        ) : (
          <header className="bg-white px-5 py-4 flex items-center justify-between sticky top-0 z-40 shadow-sm">
            <h1 className="text-xl font-bold text-gray-800">
              Besom {user && `(Hi, ${user.username})`}
            </h1>
            <div className="flex items-center space-x-4">
              <button onClick={() => setIsSearchOpen(true)} className="text-gray-700">
                <Search size={22} />
              </button>
             <Link href="/cart" className="relative text-gray-700">
              <button className="text-gray-700">
                <ShoppingBag size={22} />
              </button>
             </Link>
            </div>
          </header>
        )}

        {/* Main Content */}
        <main className="px-5 py-6 space-y-5">
          {/* Discount Card */}
          {!isSearchOpen && searchQuery === '' && (
            <div className={`bg-gradient-to-br ${getCategoryColor('discount')} rounded-3xl p-6 relative overflow-hidden shadow-lg`}>
              <div className="relative z-10">
                <h2 className="text-white text-2xl font-bold mb-2">10% Discount</h2>
                <p className="text-white text-sm opacity-90 mb-4 max-w-[60%]">
                  Buy Besom Product & get 10% discount today!
                </p>
                <button className="bg-white text-gray-800 px-6 py-2 rounded-full text-sm font-semibold hover:bg-gray-100 transition">
                  Explore More
                </button>
              </div>
            </div>
          )}

          {/* Filter Buttons */}
          {!isSearchOpen && (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {['all', 'juices', 'shakes'].map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f as any)}
                  className={`px-5 py-2 rounded-full text-sm font-medium whitespace-nowrap transition ${
                    filter === f ? 'bg-orange-500 text-white shadow-md' : 'bg-white text-gray-700 border border-gray-200'
                  }`}
                >
                  {f === 'all' ? 'All Products' : f === 'juices' ? 'Juices 🍊' : 'Shakes 🥤'}
                </button>
              ))}
            </div>
          )}

          {/* Products Grid */}
          <div className="space-y-5">
  {filteredProducts.map((product) => (
    <div key={product._id} className={`bg-gradient-to-br ${getCategoryColor(product.category)} rounded-3xl p-6 relative overflow-hidden shadow-lg`}>
      <div className="flex justify-between items-center">
        <div className="relative z-10">
          <h3 className="text-white text-xl font-bold mb-1 w-56">{product.name}</h3>
          <p className="text-white text-2xl font-bold mb-4">₹{product.price}</p>
          <button
            onClick={() => openCustomizationModal(product)}
            disabled={product.stock === 0}
            className={`px-6 py-2 rounded-full text-sm font-semibold transition ${
              product.stock === 0 
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                : 'bg-white text-gray-800 hover:bg-gray-100'
            }`}
          >
            {product.stock === 0 ? 'Out of Stock' : 'Buy Now'}
          </button>
        </div>
        <div className="relative">
          <Image 
            src="/images/juice.png" 
            alt={product.name}
            width={100} 
            height={100} 
            className="transform -rotate-12 hover:rotate-0 transition-transform duration-300 drop-shadow-xl"
          />
        </div>
      </div>
    </div>
  ))}
</div>

          {filteredProducts.length === 0 && (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🤷‍♂️</div>
              <h3 className="text-lg font-semibold text-gray-700 mb-2">No products found</h3>
            </div>
          )}
        </main>
      </div>

      {/* Swiggy-style Bottom Sheet Modal */}
      {selectedProduct && (
        <>
          {/* Backdrop */}
          <div
            className={`fixed inset-0 bg-black transition-opacity duration-300 z-50 ${
              isModalOpen ? 'opacity-50' : 'opacity-0 pointer-events-none'
            }`}
            onClick={closeModal}
          />

          {/* Bottom Sheet */}
          <div
            className={`fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-3xl shadow-2xl transition-transform duration-300 ease-out max-h-[90vh] flex flex-col ${
              isModalOpen ? 'translate-y-0' : 'translate-y-full'
            }`}
          >
            {/* Drag Handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 bg-gray-300 rounded-full" />
            </div>

            {/* Header */}
            <div className="flex items-start justify-between px-5 py-3 border-b border-gray-100">
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-900">{selectedProduct.name}</h3>
                <p className="text-sm text-gray-500 mt-1">{selectedProduct.description}</p>
              </div>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 -mt-1">
                <X size={24} />
              </button>
            </div>

            {/* Scrollable Customization Content */}
            <div className="flex-1 overflow-y-auto px-5">
              <ProductCustomization
                category={selectedProduct.category}
                basePrice={selectedProduct.price}
                onCustomizationChange={handleCustomizationChange}
              />
            </div>

            {/* Sticky Footer */}
            <div className="border-t border-gray-100 bg-white px-5 py-4 shadow-lg">
              <button
                onClick={addToCart}
                disabled={cartLoading === selectedProduct._id || !customization}
                className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 disabled:from-gray-300 disabled:to-gray-300 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-xl transition shadow-md hover:shadow-lg flex items-center justify-between"
              >
                <span>Add to Cart</span>
                <span className="text-lg">₹{finalPrice || selectedProduct.price}</span>
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}