'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { ShoppingBag, Search, X, Zap, Info, Plus, Minus, LogOut, Wallet } from 'lucide-react';
import ProductCustomization, { ProductCustomization as CustomizationType } from '../components/product/ProductCustomization';
import Image from 'next/image';
import { localCart } from '@/lib/cartStorage';
import NutrientsModal from '../components/nutrients/NutrientModal';
import { logout } from '@/lib/auth';
import { useSound } from '@/hooks/useSound';
import ViewCartSlider from '../components/dashboard/ViewCartSlider';

interface Product {
  _id: string;
  name: string;
  description: string;
  price: number;
  category: 'juices' | 'shakes';
  image: string;
  stock: number;
  smallPrice?: number;
  mediumPrice?: number;
  regularNutrients?: Array<{
    name: string;
    amount: string;
    unit: string;
  }>;
  largeNutrients?: Array<{
    name: string;
    amount: string;
    unit: string;
  }>;
}

interface UIHeader {
  text: string;
  image: string;
}

interface LastCustomization {
  size: string;
  quantity: string;
  ice?: string;
  sugar?: string;
  dilution?: string;
  fibre?: boolean;
  finalPrice: number;
  orderQuantity?: number;
}

// Loading Skeleton Component
const ProductSkeleton = () => (
  <div className="bg-gray-200 rounded-3xl p-4 sm:p-6 animate-pulse">
    <div className="flex justify-between items-center gap-3">
      <div className="flex-1">
        <div className="h-6 bg-gray-300 rounded w-3/4 mb-2"></div>
        <div className="h-8 bg-gray-300 rounded w-1/3 mb-4"></div>
        <div className="h-10 bg-gray-300 rounded w-20"></div>
      </div>
      <div className="w-24 h-24 bg-gray-300 rounded-lg"></div>
    </div>
  </div>
);

export default function BesomMobileUI() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'juices' | 'shakes'>('all');
  const [cartLoading, setCartLoading] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [uiHeader, setUIHeader] = useState<UIHeader>({
    text: 'JUICE RANI',
    image: '/images/front.png'
  });
  const [showNutrientsModal, setShowNutrientsModal] = useState(false);
  const [selectedProductForNutrients, setSelectedProductForNutrients] = useState<Product | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [customization, setCustomization] = useState<CustomizationType | null>(null);
  const [finalPrice, setFinalPrice] = useState(0);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [cartItemCount, setCartItemCount] = useState(0);
  const [productQuantities, setProductQuantities] = useState<Record<string, number>>({});
  const [lastCustomizations, setLastCustomizations] = useState<Record<string, LastCustomization>>({});
  const { play: playAddToCartSound } = useSound('/sounds/ding.mp3', 0.6);
  const [showCartSlider, setShowCartSlider] = useState(true);
  const [cartSliderItems, setCartSliderItems] = useState<any[]>([]);
  const [hasShownSlider, setHasShownSlider] = useState(false);
  const oneTimeProductId = process.env.NEXT_PUBLIC_PRODUCT_ID || '';
  const [showOneTimeProductAlert, setShowOneTimeProductAlert] = useState(false);
  const [oneTimeProductAlertMessage, setOneTimeProductAlertMessage] = useState('');
  const [hasPurchasedJuiceX, setHasPurchasedJuiceX] = useState(false);
  const [referralWallet, setReferralWallet] = useState(0);

  // Memoized filtered products with debounced search
  const filteredProducts = useMemo(() => {
    if (searchQuery.trim() === '') {
      return products;
    }
    const lowercaseQuery = searchQuery.toLowerCase();
    return products.filter(product =>
      product.name.toLowerCase().includes(lowercaseQuery) ||
      product.description.toLowerCase().includes(lowercaseQuery)
    );
  }, [searchQuery, products]);

  const logoutUser = () => {
    localStorage.removeItem('latitude');
    localStorage.removeItem('longitude');
    logout();
    setIsAuthenticated(false);
    setUser(null);
  };
  

  const fetchCartItemsForSlider = async () => {
    try {
      if (isAuthenticated) {
        const response = await fetch('/api/cart', {
          credentials: 'include'
        });
        const data = await response.json();
        if (data.success) {
          setCartSliderItems(data.cart);
          return data.cart;
        }
      } else {
        const localItems = localCart.getItems();
        // Fetch product details for local cart items
        const productIds = [...new Set(localItems.map((item:any) => item.productId))];
        const productsData = await Promise.all(
          productIds.map(async (id) => {
            const res = await fetch(`/api/products/${id}`);
            return res.json();
          })
        );
        
        const itemsWithDetails = localItems.map((item:any) => {
          const productData = productsData.find(p => p.product._id === item.productId);
          return {
            product: productData?.product,
            quantity: item.quantity,
            price: item.price,
            customization: item.customization
          };
        });
        
        setCartSliderItems(itemsWithDetails);
        return itemsWithDetails;
      }
    } catch (error) {
      console.error('Error fetching cart items for slider:', error);
      return [];
    }
  };

   const showCartSliderOnce = async () => {
      const items = await fetchCartItemsForSlider();
      if (items && items.length > 0) {
        setShowCartSlider(true);
    }
  };

    const getSliderTotalPrice = () => {
    return cartSliderItems.reduce((total, item) => total + item.price, 0);
  };

  useEffect(() => {
    if (!localStorage.getItem('latitude') && !localStorage.getItem('longitude')) {
      getLocation();
    }
  }, []);

  const openNutrientsModal = (product: Product) => {
    setSelectedProductForNutrients(product);
    setShowNutrientsModal(true);
  };
 
  const closeNutrientsModal = () => {
    setShowNutrientsModal(false);
    setSelectedProductForNutrients(null);
  };

  const getProductQuantityInCart = (productId: string): number => {
    return productQuantities[productId] || 0;
  };

  const getLastCustomizationQuantity = (productId: string): number => {
    const lastCustom = lastCustomizations[productId];
    if (!lastCustom) return 0;
    
    // For authenticated users, get from server cart
    if (isAuthenticated) {
      // This will be set when we fetch cart
      return lastCustom.orderQuantity || 0;
    } else {
      // For guest users, check local cart
      const localCartItems = localCart.getItems();
      const matchingItem = localCartItems.find((item: any) => 
        item.productId === productId &&
        item.customization.size === lastCustom.size &&
        item.customization.quantity === lastCustom.quantity &&
        item.customization.ice === lastCustom.ice &&
        item.customization.sugar === lastCustom.sugar &&
        item.customization.dilution === lastCustom.dilution
      );
      return matchingItem ? matchingItem.quantity : 0;
    }
  };

  const getLocation = async () => {
    const position = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => resolve(position),
        (error: GeolocationPositionError) => {
          switch (error.code) {
            case error.PERMISSION_DENIED:
              reject('Please allow location access to use this feature.');
              break;
            case error.POSITION_UNAVAILABLE:
              reject('Location information is unavailable.');
              break;
            case error.TIMEOUT:
              reject('Location request timed out.');
              break;
            default:
              reject('An unknown error occurred.');
          }
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    });

    const { latitude, longitude } = position.coords;
    localStorage.setItem('latitude', latitude.toString());
    localStorage.setItem('longitude', longitude.toString());
    console.log('Location obtained:', { latitude, longitude });
  };

  // Optimized: Single combined data fetch
  useEffect(() => {
    const initializeDashboard = async () => {
      setLoading(true);
      try {
        const currentUser = localStorage.getItem('user');
        if (currentUser) {
          setUser(JSON.parse(currentUser));
          setIsAuthenticated(true);
        }

        const url = filter === 'all'
          ? '/api/dashboard'
          : `/api/dashboard?category=${filter}`;

        const response = await fetch(url, {
          credentials: 'include',
          headers: {
            'Cache-Control': 'max-age=60', // Cache for 1 minute
          }
        });

        const data = await response.json();

        if (data.success) {
          setProducts(data.products);
          setReferralWallet(data.userReferralWallet || 0);
          setUIHeader({
            text: data.header.text,
            image: data.header.image
          });
          if(data.hasPurchasedJuiceX){
            console.log("User has purchased Juice X before.");
            setHasPurchasedJuiceX(true);
          }

          if (currentUser) {
            setCartItemCount(data.cart.length);
            // Process cart data
            const quantities: Record<string, number> = {};
            const customizations: Record<string, LastCustomization> = {};
            
            const productMap = new Map<string, any[]>();
            
            data.cart.forEach((item: any) => {
              const productId = item.product._id;
              if (!productMap.has(productId)) {
                productMap.set(productId, []);
              }
              productMap.get(productId)?.push(item);
            });
            
            productMap.forEach((items, productId) => {
              quantities[productId] = items.reduce((sum, item) => sum + item.quantity, 0);
              const lastItem = items.reduce((latest, current) => 
                new Date(current.addedAt) > new Date(latest.addedAt) ? current : latest
              );
              customizations[productId] = {
                ...lastItem.customization,
                orderQuantity: lastItem.quantity
              };
            });
            
            setProductQuantities(quantities);
            setLastCustomizations(customizations);
          } else {
            const localCartItems = localCart.getItems();
            setCartItemCount(localCartItems.length);
            
            // Process local cart
            const quantities: Record<string, number> = {};
            const customizations: Record<string, LastCustomization> = {};
            const productMap = new Map<string, any[]>();
            
            localCartItems.forEach((item: any) => {
              if (!productMap.has(item.productId)) {
                productMap.set(item.productId, []);
              }
              productMap.get(item.productId)?.push(item);
            });
            
            productMap.forEach((items, productId) => {
              quantities[productId] = items.reduce((sum, item) => sum + item.quantity, 0);
              const lastItem = items.reduce((latest, current) => 
                new Date(current.addedAt) > new Date(latest.addedAt) ? current : latest
              );
              customizations[productId] = {
                ...lastItem.customization,
                orderQuantity: lastItem.quantity
              };
            });
            
            setProductQuantities(quantities);
            setLastCustomizations(customizations);
          }
        }
        if (data.cart.length > 0) {
              const items = await fetchCartItemsForSlider();
              if (items && items.length > 0) {
                setShowCartSlider(true);
              }
            }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeDashboard();
  }, [filter]);

  const updateProductQuantities = useCallback(async () => {
    try {
      if (isAuthenticated) {
        const response = await fetch('/api/cart', { credentials: 'include' });
        const data = await response.json();
        if (data.success) {
          const quantities: Record<string, number> = {};
          const customizations: Record<string, LastCustomization> = {};
          
          const productMap = new Map<string, any[]>();
          
          data.cart.forEach((item: any) => {
            const productId = item.product._id;
            if (!productMap.has(productId)) {
              productMap.set(productId, []);
            }
            productMap.get(productId)?.push(item);
          });
          
          productMap.forEach((items, productId) => {
            quantities[productId] = items.reduce((sum, item) => sum + item.quantity, 0);
            const lastItem = items.reduce((latest, current) => 
              new Date(current.addedAt) > new Date(latest.addedAt) ? current : latest
            );
            customizations[productId] = {
              ...lastItem.customization,
              orderQuantity: lastItem.quantity
            };
          });
          
          setProductQuantities(quantities);
          setLastCustomizations(customizations);
        }
      } else {
        const localCartItems = localCart.getItems();
        setCartItemCount(localCartItems.length);
        const quantities: Record<string, number> = {};
        const customizations: Record<string, LastCustomization> = {};
        
        const productMap = new Map<string, any[]>();
        
        localCartItems.forEach((item: any) => {
          if (!productMap.has(item.productId)) {
            productMap.set(item.productId, []);
          }
          productMap.get(item.productId)?.push(item);
        });
        
        productMap.forEach((items, productId) => {
          quantities[productId] = items.reduce((sum, item) => sum + item.quantity, 0);
          const lastItem = items.reduce((latest, current) => 
            new Date(current.addedAt) > new Date(latest.addedAt) ? current : latest
          );
          customizations[productId] = {
            ...lastItem.customization,
            orderQuantity: lastItem.quantity
          };
        });
        
        setProductQuantities(quantities);
        setLastCustomizations(customizations);
      }
    } catch (error) {
      console.error('Error updating product quantities:', error);
    }
  }, [isAuthenticated]);

  const fetchCartCount = useCallback(async () => {
    try {
      if (isAuthenticated) {
        const response = await fetch('/api/cart', { credentials: 'include' });
        const data = await response.json();
        if (data.success) {
          setCartItemCount(data.cart.length);
          // Update quantities and customizations
          await updateProductQuantities();
        }
      } else {
        const localCartItems = localCart.getItems();
        setCartItemCount(localCartItems.length);
        await updateProductQuantities();
      }
    } catch (error) {
      console.error('Error fetching cart count:', error);
    }
  }, [isAuthenticated, updateProductQuantities]);

  const incrementLastCustomization = async (productId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const lastCustom = lastCustomizations[productId];
    if (!lastCustom) return;

    setCartLoading(productId);
    try {
      if (isAuthenticated) {
        const response = await fetch('/api/cart/update-quantity', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            productId,
            customization: lastCustom,
            action: 'increment'
          })
        });
        const data = await response.json();
        if (data.success) {
          await fetchCartCount();
          await updateProductQuantities();
        }
      } else {
        // Update local cart
        const localCartItems = localCart.getItems();
        const itemIndex = localCartItems.findIndex((item: any) => 
          item.productId === productId &&
          item.customization.size === lastCustom.size &&
          item.customization.quantity === lastCustom.quantity &&
          item.customization.ice === lastCustom.ice &&
          item.customization.sugar === lastCustom.sugar &&
          item.customization.dilution === lastCustom.dilution
        );

        if (itemIndex !== -1) {
          const unitPrice = localCartItems[itemIndex].customization.finalPrice;
          
          console.log("Before increment:", {
            quantity: localCartItems[itemIndex].quantity,
            unitPrice: unitPrice,
            totalPrice: localCartItems[itemIndex].price
          });
          
          // Increment quantity
          localCartItems[itemIndex].quantity += 1;
          // Recalculate total price
          localCartItems[itemIndex].price = unitPrice * localCartItems[itemIndex].quantity;
          
          console.log("After increment:", {
            quantity: localCartItems[itemIndex].quantity,
            unitPrice: unitPrice,
            totalPrice: localCartItems[itemIndex].price
          });
          
          localStorage.setItem('cart', JSON.stringify(localCartItems));
          await fetchCartCount();
          await updateProductQuantities();
        }
      }
    } catch (error) {
      console.error('Error incrementing quantity:', error);
    } finally {
      setCartLoading(null);
    }
  };

  const decrementLastCustomization = async (productId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const lastCustom = lastCustomizations[productId];
    if (!lastCustom) return;

    setCartLoading(productId);
    try {
      if (isAuthenticated) {
        const response = await fetch('/api/cart/update-quantity', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            productId,
            customization: lastCustom,
            action: 'decrement'
          })
        });
        const data = await response.json();
        if (data.success) {
          await fetchCartCount();
          await updateProductQuantities();
        }
      } else {
        // Update local cart
        const localCartItems = localCart.getItems();
        const itemIndex = localCartItems.findIndex((item: any) => 
          item.productId === productId &&
          item.customization.size === lastCustom.size &&
          item.customization.quantity === lastCustom.quantity &&
          item.customization.ice === lastCustom.ice &&
          item.customization.sugar === lastCustom.sugar &&
          item.customization.dilution === lastCustom.dilution
        );

        if (itemIndex !== -1) {
          const unitPrice = localCartItems[itemIndex].customization.finalPrice;
          
          console.log("Before decrement:", {
            quantity: localCartItems[itemIndex].quantity,
            unitPrice: unitPrice,
            totalPrice: localCartItems[itemIndex].price
          });
          
          if (localCartItems[itemIndex].quantity > 1) {
            // Decrement quantity
            localCartItems[itemIndex].quantity -= 1;
            // Recalculate total price
            localCartItems[itemIndex].price = unitPrice * localCartItems[itemIndex].quantity;
            
            console.log("After decrement:", {
              quantity: localCartItems[itemIndex].quantity,
              unitPrice: unitPrice,
              totalPrice: localCartItems[itemIndex].price
            });
          } else {
            console.log("Removing item from cart (quantity was 1)");
            localCartItems.splice(itemIndex, 1);
          }
          
          localStorage.setItem('cart', JSON.stringify(localCartItems));
          await fetchCartCount();
          await updateProductQuantities();
        }
      }
    } catch (error) {
      console.error('Error decrementing quantity:', error);
    } finally {
      setCartLoading(null);
    }
  };

  const quickAddToCart = async (productId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCartLoading(productId);
    try {
      if (isAuthenticated) {
        const response = await fetch('/api/cart', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            productId: productId,
            quickAdd: true
          })
        });
        const data = await response.json();
        if (data.success) {
          playAddToCartSound();
          fetchCartCount();
        }
      } else {
        const product = products.find(p => p._id === productId);
        const lastCustomization = lastCustomizations[productId];
        
        if (product) {
          localCart.addItem({
            productId: productId,
            customization: lastCustomization || {
              size: 'Large',
              quantity: '500mL',
              finalPrice: product.mediumPrice || product.price,
              orderQuantity: 1
            },
            price: lastCustomization?.finalPrice || product.mediumPrice || product.price,
            quantity: 1,
            addedAt: new Date().toISOString()
          });
          fetchCartCount();
        }
      }
    } catch (error) {
      console.error('Error quick adding to cart:', error);
    } finally {
      setCartLoading(null);
    }
  };

  const removeFromCart = async (productId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCartLoading(productId);
    try {
      if (isAuthenticated) {
        const response = await fetch('/api/cart', {
          method: 'DELETE',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            productId: productId,
            removeOne: true
          })
        });
        const data = await response.json();
        if (data.success) {
          fetchCartCount();
        }
      } else {
        const localCartItems = localCart.getItems();
        const itemIndex = localCartItems.findIndex((item:any) => item.productId === productId);
        
        if (itemIndex !== -1) {
          localCartItems.splice(itemIndex, 1);
          localStorage.setItem('cart', JSON.stringify(localCartItems));
          fetchCartCount();
        }
      }
    } catch (error) {
      console.error('Error removing from cart:', error);
    } finally {
      setCartLoading(null);
    }
  };

  const fetchUIHeader = async () => {
    try {
      const response = await fetch('/api/ui-header', {
        method: 'GET',
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        console.log('UI Header data:', data);
        setUIHeader({
          text: data.header.text,
          image: data.header.image
        });
      }
    } catch (error) {
      console.error('Error fetching UI header:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      const url = filter === 'all' ? '/api/products' : `/api/products?category=${filter}`;
      const response = await fetch(url, { credentials: 'include' });
      const data = await response.json();
      if (data.success) {
        setProducts(data.products);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const openCustomizationModal = (product: Product) => {
    setShowCartSlider(false)
    setSelectedProduct(product);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setTimeout(() => {
      setShowCartSlider(true)
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
    if (isAuthenticated) {
      console.log('Adding to server cart:', {
        productId: selectedProduct._id,
        customization,
        finalPrice
      });
      
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
        playAddToCartSound();
        closeModal();
        fetchCartCount();
        await showCartSliderOnce();
      } else {
        // Show specific error message for one-time purchase
        if (data.isOneTimePurchase) {
          setOneTimeProductAlertMessage(data.error);
          setShowOneTimeProductAlert(true);
          closeModal();
        } else {
          alert(data.error || 'Failed to add to cart');
        }
      }
    } else {
      try {
        const itemQuantity = customization.orderQuantity || 1;
        const unitPrice = customization.finalPrice;
        const totalPrice = unitPrice * itemQuantity;
        
        localCart.addItem({
          productId: selectedProduct._id,
          customization: {
            ...customization,
            finalPrice: unitPrice
          },
          price: totalPrice,
          quantity: itemQuantity,
          addedAt: new Date().toISOString()
        });
        playAddToCartSound();
        closeModal();
        fetchCartCount();
        await showCartSliderOnce();
        console.log('Added to local cart:', {
          unitPrice,
          quantity: itemQuantity,
          totalPrice
        });
      } catch (error: any) {
        console.error('Error adding to local cart:', error);
        // Check if it's a one-time product error
        if (error.message && error.message.includes('special product')) {
          setOneTimeProductAlertMessage(error.message);
          setShowOneTimeProductAlert(true);
          closeModal();
        } else {
          alert(error.message || 'Failed to add to cart');
        }
      }
    }
  } catch (error) {
    console.error('Error adding to cart:', error);
    alert('Failed to add to cart');
  } finally {
    setCartLoading(null);
  }
};

  const getCategoryColor = useCallback((category: 'juices' | 'shakes' | 'discount') => {
    const colors = {
      juices: 'from-orange-400 to-orange-500',
      shakes: 'from-red-400 to-red-500',
      discount: 'from-yellow-400 to-yellow-500'
    };
    return colors[category] || 'from-orange-400 to-orange-500';
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 pb-20">
        {/* Header Skeleton */}
        <header className="bg-white px-5 py-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="h-6 w-32 bg-gray-200 rounded animate-pulse"></div>
            <div className="flex gap-4">
              <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse"></div>
              <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse"></div>
            </div>
          </div>
        </header>

        <main className="px-5 py-6 space-y-5">
          <div className="h-12 bg-gray-200 rounded-xl animate-pulse"></div>
          <div className="h-48 bg-gray-200 rounded-2xl animate-pulse"></div>
          <div className="flex gap-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-10 w-24 bg-gray-200 rounded-full animate-pulse"></div>
            ))}
          </div>
          <div className="space-y-5">
            {[1, 2, 3, 4].map(i => (
              <ProductSkeleton key={i} />
            ))}
          </div>
        </main>
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
            <div className="flex flex-col">
             <Link href='/'>
                <h1 className="text-xl font-bold text-gray-800">JUICE RANI</h1>
             </Link>
              {user && (
                <span className="text-sm text-gray-600 mt-0.5">Hi, {user.username}</span>
              )}
            </div>

            <div className="flex items-center space-x-4">
              <div className="group relative">
                <button
                  onClick={() => setIsSearchOpen(true)}
                  className="text-gray-700 p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <Search size={22} />
                </button>
                <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity">
                  Search
                </span>
              </div>

              <div className="group relative">
                <Link href="/cart" className="relative text-gray-700">
                  <button className="text-gray-700 p-2 hover:bg-gray-100 rounded-full transition-colors">
                    <ShoppingBag size={20} />
                    {cartItemCount > 0 && (
                      <span className="absolute -top-3 -right-1 bg-orange-500 text-white w-5 h-5 rounded-full text-xs flex items-center justify-center font-medium">
                        {cartItemCount}
                      </span>
                    )}
                  </button>
                </Link>
                <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity">
                  My cart
                </span>
              </div>
              {referralWallet > 0 && (
               <div className="group relative">
                <Link href="/wallet" className="relative text-gray-700">
                  <button className="text-gray-700 p-2 hover:bg-gray-100 rounded-full transition-colors">
                    <Wallet size={20} />
                    
                  </button>
                </Link>
                <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity">
                  My Wallet
                </span>
              </div>
              )}

            </div>
          </header>
        )}

        {/* Main Content */}
        <main className="px-5 py-6 space-y-5">
         
          {!isSearchOpen && searchQuery === '' && (
            <div className="relative">
              <Image
                src={uiHeader.image == "" ? "/images/front.png" : uiHeader.image}
                alt="header image"
                width={400}
                height={200}
                className="w-full h-[200px] object-cover rounded-2xl transform hover:scale-105 transition-transform duration-300 drop-shadow-xl"
                priority
              />
            </div>
          )}
          {/* Filter Buttons */}
          {!isSearchOpen && (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {['all', 'juices', 'shakes'].map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f as any)}
                  className={`px-5 py-2 rounded-full text-sm font-medium whitespace-nowrap transition ${filter === f ? 'bg-orange-500 text-white shadow-md' : 'bg-white text-gray-700 border border-gray-200'
                    }`}
                >
                  {f === 'all' ? 'All Products' : f === 'juices' ? 'Juices ' : 'Shakes '}
                </button>
              ))}
            </div>
          )}

          {/* Optimized Products Grid */}
          <div className="space-y-5">
            {filteredProducts.map((product) => {
              const quantityInCart = productQuantities[product._id] || 0;
              const lastCustomization = lastCustomizations[product._id];
              const lastCustomQuantity = lastCustomization?.orderQuantity || 0;
              const isLoading = cartLoading === product._id;

              return (
                <div
                  key={product._id}
                  className={`bg-gradient-to-br ${getCategoryColor(product.category)} rounded-3xl p-4 sm:p-6 relative overflow-hidden shadow-lg cursor-pointer`}
                  onClick={() => openCustomizationModal(product)}
                >
                  <div className="flex justify-between items-center gap-3">
                    <div className="relative z-10 flex-1 min-w-0">
                      <h3 className="text-white text-base sm:text-xl font-bold mb-1 line-clamp-2 pr-2">
                        {product.name}
                      </h3>

                      <p className="text-white text-xl sm:text-2xl font-bold mb-3 sm:mb-4">
                        ₹{product.smallPrice || product.price}
                      </p>

                      {/* Dual Button System */}
                      <div className="flex items-center gap-2">
                        {/* Always show "Add" button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openCustomizationModal(product);
                          }}
                          disabled={isLoading}
                          className="min-w-[70px] px-4 py-2 rounded-full text-sm font-semibold transition bg-white text-gray-800 hover:bg-gray-100 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                        >
                          {isLoading ? '...' : 'Add'}
                        </button>

                        {/* Show quantity controls only if last customization exists in cart */}
                        {/* {lastCustomization && lastCustomQuantity > 0 && (
                          <div className="flex items-center bg-white rounded-full shadow-md">
                            <button
                              onClick={(e) => decrementLastCustomization(product._id, e)}
                              disabled={isLoading}
                              className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-l-full transition disabled:opacity-50 active:scale-95"
                            >
                              <Minus className="w-4 h-4 text-gray-700" />
                            </button>
                            <span className="px-3 text-sm font-bold text-gray-900 min-w-[2rem] text-center">
                              {lastCustomQuantity}
                            </span>
                            <button
                              onClick={(e) => incrementLastCustomization(product._id, e)}
                              disabled={isLoading}
                              className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-r-full transition disabled:opacity-50 active:scale-95"
                            >
                              <Plus className="w-4 h-4 text-gray-700" />
                            </button>
                          </div>
                        )} */}
                      </div>

                      {/* Last Customization Info */}
                      {/* {lastCustomization && lastCustomQuantity > 0 && (
                        <p className="text-white/90 text-xs mt-2 font-medium">
                          {lastCustomization.size} • {lastCustomization.quantity} • ₹{lastCustomization.finalPrice}
                        </p>
                      )} */}

                      {/* Total items in cart badge */}
                      {/* {quantityInCart > lastCustomQuantity && lastCustomQuantity > 0 && (
                        <p className="text-white/80 text-xs mt-1">
                          +{quantityInCart - lastCustomQuantity} other variant(s)
                        </p>
                      )} */}
                    </div>

                    <div className="relative flex-shrink-0">
                      <div className="relative w-20 h-20 xs:w-24 xs:h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 lg:w-36 lg:h-36">
                        <Image
                          src={product.image}
                          alt={product.name}
                          fill
                          className="object-contain rounded-lg hover:scale-105 transition-transform duration-300 drop-shadow-xl"
                          sizes="(max-width: 640px) 80px, (max-width: 768px) 96px, (max-width: 1024px) 112px, 128px"
                          loading="lazy"
                          quality={75}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredProducts.length === 0 && (
            <div className="text-center py-12">
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
            className={`fixed inset-0 bg-black transition-opacity duration-300 z-50 ${isModalOpen ? 'opacity-50' : 'opacity-0 pointer-events-none'}`}
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

            {/* Header - Fixed */}
            <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
              <h3 className="text-lg font-bold text-gray-900 flex-1 pr-4">
                {selectedProduct.name}
              </h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 flex-shrink-0">
                <X size={24} />
              </button>
            </div>

            {/* Single Scrollable Section - Description + Nutrients + Customization */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {/* Description */}
              <div className="mb-4">
                <p className="text-sm text-gray-600 leading-relaxed">
                  {selectedProduct.description}
                </p>
              </div>

              {/* Nutrients Button */}
              {((selectedProduct.regularNutrients && selectedProduct.regularNutrients.length > 0) ||
                (selectedProduct.largeNutrients && selectedProduct.largeNutrients.length > 0)) && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openNutrientsModal(selectedProduct);
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-orange-50 to-orange-100 hover:from-orange-100 hover:to-orange-200 transition-all border border-orange-200 hover:border-orange-300 group shadow-sm mb-4"
                >
                  <div className="w-6 h-6 rounded-full bg-orange-200 group-hover:bg-orange-300 flex items-center justify-center transition-colors">
                    <Info className="w-3.5 h-3.5 text-orange-700" />
                  </div>
                  <span className="text-sm font-semibold text-orange-700 group-hover:text-orange-800 transition-colors">
                    View nutritional information
                  </span>
                </button>
              )}

              {/* Customization Options */}
              <div className="border-t border-gray-100 pt-4 mt-2">
                <ProductCustomization
                  category={selectedProduct.category}
                  smallPrice={selectedProduct.smallPrice ?? 0}
                  mediumPrice={selectedProduct.mediumPrice ?? 0}
                  onCustomizationChange={handleCustomizationChange}
                />
              </div>
            </div>

            {/* Sticky Footer */}
            <div className="border-t border-gray-100 bg-white px-5 py-4 shadow-lg flex-shrink-0">
              <button
                onClick={addToCart}
                disabled={cartLoading === selectedProduct._id || !customization}
                className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 disabled:from-gray-300 disabled:to-gray-300 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-xl transition shadow-md hover:shadow-lg flex items-center justify-between"
              >
                <span>{cartLoading === selectedProduct._id ? 'Adding...' : 'Add to cart'}</span>
                <span className="text-lg">₹{finalPrice || selectedProduct.price}</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* Nutrients Modal */}
      {selectedProductForNutrients && (
        <NutrientsModal
          isOpen={showNutrientsModal}
          onClose={closeNutrientsModal}
          productName={selectedProductForNutrients.name}
          regularNutrients={selectedProductForNutrients.regularNutrients || []}
          largeNutrients={selectedProductForNutrients.largeNutrients || []}
        />
      )}
      {cartSliderItems.length>0 &&
      <ViewCartSlider
        show={showCartSlider}
        onClose={() => setShowCartSlider(false)}
        cartItems={cartSliderItems}
        totalItems={cartSliderItems.length}
      />
}
{showOneTimeProductAlert && (
  <>
    {/* Backdrop */}
    <div
      className="fixed inset-0 bg-black bg-opacity-50 transition-opacity duration-300 z-50"
      onClick={() => setShowOneTimeProductAlert(false)}
    />

    {/* Alert Modal */}
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full transform transition-all duration-300 scale-100 animate-in">
        {/* Icon Header */}
        <div className="bg-gradient-to-br from-red-400 to-red-500 rounded-t-3xl p-6 text-center">
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg">
            <X className="w-8 h-8 text-red-500" />
          </div>
          <h3 className="text-xl font-bold text-white">Cannot Add Product</h3>
        </div>

        {/* Content */}
        <div className="p-6 text-center">
          <p className="text-gray-700 mb-2 font-medium">
            {oneTimeProductAlertMessage}
          </p>
          <p className="text-sm text-gray-500 leading-relaxed">
            {hasPurchasedJuiceX 
              ? "You've already purchased this special product in a previous order."
              : "This item is already in your cart and can only be added once."}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="px-6 pb-6 space-y-3">
          {!hasPurchasedJuiceX && (
            <Link href="/cart">
              <button
                onClick={() => setShowOneTimeProductAlert(false)}
                className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold py-3 px-6 rounded-xl transition shadow-md hover:shadow-lg"
              >
                View Cart
              </button>
            </Link>
          )}
          <button
            onClick={() => setShowOneTimeProductAlert(false)}
            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 px-6 rounded-xl transition"
          >
            {hasPurchasedJuiceX ? 'Close' : 'Continue Shopping'}
          </button>
        </div>
      </div>
    </div>
  </>
)}
    </>
  );
}