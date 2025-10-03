'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import { Suspense } from 'react';
import { toast } from 'react-hot-toast';
import ProductCustomization, { ProductCustomization as CustomizationType } from '@/app/components/product/ProductCustomization';

interface Product {
  _id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image: string;
  stock: number;
}

function ProductDetailContent() {
  const { id } = useParams() as { id: string };
  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [customization, setCustomization] = useState<CustomizationType | null>(null);
  const [finalPrice, setFinalPrice] = useState(0);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const response = await fetch(`/api/products/${id}`);
        const data = await response.json();
        
        if (response.ok) {
          setProduct(data.product);
          setFinalPrice(data.product.price);
        } else {
          toast.error(data.error || 'Failed to load product');
        }
      } catch (error) {
        console.error('Error fetching product:', error);
        toast.error('Failed to load product details');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProduct();
  }, [id]);

  const handleCustomizationChange = (newCustomization: CustomizationType, newPrice: number) => {
    setCustomization(newCustomization);
    setFinalPrice(newPrice);
  };

  const handleAddToCart = () => {
    if (!product || !customization) return;
    
    const cartItem = {
      productId: product._id,
      name: product.name,
      price: finalPrice,
      quantity,
      customization,
      image: product.image
    };
    
    // Add to cart logic here (could dispatch to a store or use context)
    toast.success(`Added ${quantity} ${product.name} to cart`);
    console.log('Added to cart:', cartItem);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="text-center py-16">
        <h2 className="text-2xl font-bold text-gray-800">Product not found</h2>
        <p className="text-gray-600 mt-2">The product you're looking for doesn't exist.</p>
      </div>
    );
  }

  const isJuiceOrShake = 
    product.category.toLowerCase() === 'juices' || 
    product.category.toLowerCase() === 'shakes';

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="md:flex">
          {/* Product Image */}
          <div className="md:w-1/2 relative">
            <div className="h-72 md:h-full relative">
              {product.image ? (
                <Image
                  src={product.image}
                  alt={product.name}
                  fill
                  style={{ objectFit: 'cover' }}
                  className="w-full h-full"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-200">
                  <span className="text-gray-500">No image available</span>
                </div>
              )}
            </div>
            <div className="absolute top-4 right-4 bg-orange-500 text-white px-2 py-1 rounded-full text-xs font-medium">
              {product.category}
            </div>
          </div>
          
          {/* Product Details */}
          <div className="md:w-1/2 p-6 md:p-8">
            <h1 className="text-2xl font-bold text-gray-900">{product.name}</h1>
            <p className="text-gray-600 mt-2">{product.description}</p>
            
            <div className="mt-4 flex items-baseline">
              <span className="text-xl font-bold text-orange-600">₹{product.price}</span>
              <span className="text-sm text-gray-500 ml-2">/base price</span>
            </div>
            
            <div className="mt-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">
                {isJuiceOrShake ? 'Customize Your Order' : 'Select Quantity'}
              </h2>
              
              {isJuiceOrShake ? (
                <ProductCustomization 
                  category={product.category} 
                  basePrice={product.price} 
                  onCustomizationChange={handleCustomizationChange}
                />
              ) : (
                <div className="py-4">
                  <p className="text-gray-600 mb-4">This product doesn't have customization options.</p>
                </div>
              )}
              
              {/* Quantity Selector */}
              <div className="flex items-center mt-6">
                <span className="text-sm font-medium text-gray-900 mr-3">Quantity:</span>
                <div className="flex items-center border border-gray-300 rounded-lg">
                  <button
                    type="button"
                    className="px-3 py-1 text-gray-600 hover:bg-gray-100"
                    onClick={() => quantity > 1 && setQuantity(quantity - 1)}
                  >
                    -
                  </button>
                  <span className="px-3 py-1 text-gray-800">{quantity}</span>
                  <button
                    type="button"
                    className="px-3 py-1 text-gray-600 hover:bg-gray-100"
                    onClick={() => quantity < 10 && setQuantity(quantity + 1)}
                  >
                    +
                  </button>
                </div>
              </div>
              
              {/* Total Price */}
              <div className="mt-6 py-4 border-t border-gray-200">
                <div className="flex justify-between">
                  <span className="text-base font-medium text-gray-900">Total:</span>
                  <span className="text-xl font-bold text-orange-600">₹{(finalPrice * quantity).toFixed(2)}</span>
                </div>
              </div>
              
              {/* Add to Cart Button */}
              <div className="mt-6">
                <button
                  type="button"
                  onClick={handleAddToCart}
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 px-6 rounded-xl font-semibold flex items-center justify-center transition-colors"
                >
                  <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  Add to Cart
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProductDetailPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
    </div>}>
      <ProductDetailContent />
    </Suspense>
  );
}