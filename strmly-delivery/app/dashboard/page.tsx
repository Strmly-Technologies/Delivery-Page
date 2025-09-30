'use client';

import { useState, useEffect } from 'react';
import { Menu, ShoppingBag, Search, Heart, Home, User } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { getCurrentUser } from '@/lib/auth';

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
  const router = useRouter();

  useEffect(() => {
    // Get user info from localStorage (populated during login)
    const currentUser = getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
    }
    // Fetch products (middleware will handle auth)
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
      const response = await fetch(url, {
        // Include credentials to send cookies with the request
        credentials: 'include'
      });
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

  const addToCart = async (productId: string) => {
    setCartLoading(productId);
    try {
      const response = await fetch('/api/cart', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ productId })
      });
      const data = await response.json();
      if (data.success) {
        alert('Product added to cart!');
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
    const colors: Record<'juices' | 'shakes' | 'discount', string> = {
      juices: 'from-orange-400 to-orange-500',
      shakes: 'from-red-400 to-red-500',
      discount: 'from-yellow-400 to-yellow-500'
    };
    return colors[category] || 'from-orange-400 to-orange-500';
  };

  // Show loading while checking authentication
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
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      {isSearchOpen ? (
        <header className="bg-white px-4 py-3 flex items-center sticky top-0 z-50 shadow-sm">
          <div className="flex-1 flex items-center space-x-2">
            <button
              onClick={() => {
                setIsSearchOpen(false);
                setSearchQuery('');
              }}
              className="p-2 text-gray-500"
            >
              <Menu size={20} className="rotate-45" />
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
        <header className="bg-white px-5 py-4 flex items-center justify-between sticky top-0 z-50 shadow-sm">
          <div className="flex items-center">
            <button className="text-gray-700 mr-4">
              <Menu size={22} />
            </button>
            <h1 className="text-xl font-bold text-gray-800">
              Besom {user && `(Hi, ${user.username})`}
            </h1>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setIsSearchOpen(true)}
              className="text-gray-700"
            >
              <Search size={22} />
            </button>
            <Link href={'/cart'}>
              <button className="text-gray-700 ">
                <ShoppingBag size={22} className='mt-2'/>
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
            <div className="absolute right-4 top-1/2 -translate-y-1/2 w-32 h-40 rounded-2xl backdrop-blur-sm flex items-center justify-center">
              <Image
                src="/images/juice.png"
                alt="Discount offer"
                width={120}
                height={120}
                className="object-contain"
              />
            </div>
          </div>
        )}

        {/* Filter Buttons */}
        {!isSearchOpen && (
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            <button
              onClick={() => setFilter('all')}
              className={`px-5 py-2 rounded-full text-sm font-medium whitespace-nowrap transition ${
                filter === 'all'
                  ? 'bg-orange-500 text-white shadow-md'
                  : 'bg-white text-gray-700 border border-gray-200'
              }`}
            >
              All Products
            </button>
            <button
              onClick={() => setFilter('juices')}
              className={`px-5 py-2 rounded-full text-sm font-medium whitespace-nowrap transition ${
                filter === 'juices'
                  ? 'bg-orange-500 text-white shadow-md'
                  : 'bg-white text-gray-700 border border-gray-200'
              }`}
            >
              Juices 🍊
            </button>
            <button
              onClick={() => setFilter('shakes')}
              className={`px-5 py-2 rounded-full text-sm font-medium whitespace-nowrap transition ${
                filter === 'shakes'
                  ? 'bg-orange-500 text-white shadow-md'
                  : 'bg-white text-gray-700 border border-gray-200'
              }`}
            >
              Shakes 🥤
            </button>
          </div>
        )}

        {/* Search Results Info */}
        {isSearchOpen && searchQuery && (
          <div className="mb-3">
            <h3 className="text-sm font-medium text-gray-500">
              {filteredProducts.length === 0
                ? 'No results found'
                : `Found ${filteredProducts.length} result${filteredProducts.length === 1 ? '' : 's'}`}
            </h3>
          </div>
        )}

        {/* Products Grid */}
        <div className="space-y-5">
          {filteredProducts.map((product) => (
            <div
              key={product._id}
              className={`bg-gradient-to-br ${getCategoryColor(product.category)} rounded-3xl p-6 relative overflow-hidden shadow-lg`}
            >
              <div className="relative z-10">
                <h3 className="text-white text-xl font-bold mb-1 w-56">
                  {product.name}
                </h3>
                <p className="text-white text-2xl font-bold mb-4">
                  ₹{product.price}
                </p>
                <button
                  onClick={() => addToCart(product._id)}
                  disabled={product.stock === 0 || cartLoading === product._id}
                  className={`px-6 py-2 rounded-full text-sm font-semibold transition ${
                    product.stock === 0
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : cartLoading === product._id
                      ? 'bg-white/80 text-gray-700 cursor-wait'
                      : 'bg-white text-gray-800 hover:bg-gray-100'
                  }`}
                >
                  {cartLoading === product._id
                    ? 'Adding...'
                    : product.stock === 0
                    ? 'Out of Stock'
                    : 'Buy Now'
                  }
                </button>
              </div>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 w-32 h-40 rounded-2xl backdrop-blur-sm flex items-center justify-center">
                <Image
                  src="/images/juice.png"
                  alt={product.name}
                  width={120}
                  height={120}
                  className="object-contain"
                />
              </div>
            </div>
          ))}
        </div>

        {filteredProducts.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🤷‍♂️</div>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">
              No products found
            </h3>
            <p className="text-gray-500 text-sm">
              {isSearchOpen
                ? 'Try different search terms'
                : 'Try changing the filter or check back later'}
            </p>
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-8 py-4 flex items-center justify-between shadow-lg">
        <button className="flex flex-col items-center text-orange-500">
          <Home size={22} />
          <span className="text-xs mt-1">Home</span>
        </button>
        <button
          onClick={() => setIsSearchOpen(true)}
          className="flex flex-col items-center text-gray-400"
        >
          <Search size={22} />
          <span className="text-xs mt-1">Search</span>
        </button>
        <button className="flex flex-col items-center text-gray-400">
          <Heart size={22} />
          <span className="text-xs mt-1">Favorites</span>
        </button>
        <button className="flex flex-col items-center text-gray-400">
          <User size={22} />
          <span className="text-xs mt-1">Profile</span>
        </button>
      </nav>
    </div>
  );
}