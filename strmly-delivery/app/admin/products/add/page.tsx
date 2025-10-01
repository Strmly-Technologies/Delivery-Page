'use client';

import { useRouter } from 'next/navigation';
import React, { useState } from 'react';
import Link from 'next/link';

interface Product {
  name: string;
  description: string;
  price: number;
  category: 'juices' | 'shakes';
  image: string;
  stock: number;
}

// Renamed component to follow React naming convention
const AddProductPage = () => {
    const [formData, setFormData] = useState<Product>({
        name: '',
        description: '',
        price: 0,
        category: 'juices',
        image: '',
        stock: 0
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<{[key: string]: string}>({});
    const router = useRouter();

    const handleSubmit = async(e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        const newErrors: {[key: string]: string} = {};
            
        if (!formData.name.trim()) {
          newErrors.name = 'Name is required';
        }
        if (!formData.description.trim()) {
            newErrors.description = 'Description is required';
        }
        if (formData.price <= 0) {
            newErrors.price = 'Price must be greater than 0';
        }
        if (formData.stock < 0) {
            newErrors.stock = 'Stock cannot be negative';
        }
        if (!formData.image.trim()) {
            newErrors.image = 'Image URL is required';
        }
                
        if (Object.keys(newErrors).length > 0) {
            setError(newErrors);
            setIsLoading(false);
            return;
        }
        try {
            const token = await window.cookieStore.get('authToken').then((cookie) => cookie?.value);
            const response = await fetch('/api/admin/add-product', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });
            if(response.ok) {
                router.push('/admin/products');
            } else {
                const data = await response.json();
                setError({general: data.error || 'Failed to add product'});
            }
        
        } catch (error) {
            console.error('Add product error:', error);
            setError({
                general: error instanceof Error ? error.message : 'Failed to add product'
            });
        }
        finally {
            setIsLoading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const {name, value} = e.target;
        setFormData({
            ...formData,
            [name]: name === 'price' || name === 'stock' ? Number(value) : value
        });
    };

    return (
        <div className="px-4 py-5 w-full max-w-3xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-gray-800">Add New Product</h1>
                <Link 
                    href="/admin/products"
                    className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg transition"
                >
                    Cancel
                </Link>
            </div>
            
            {error.general && (
                <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm rounded">
                    {error.general}
                </div>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-5">
                <div className="bg-white rounded-xl shadow-sm p-5 space-y-5">
                    {/* Product Name */}
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                            Product Name *
                        </label>
                        <input
                            type="text"
                            id="name"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            className={`block w-full px-3 py-3 text-gray-900 bg-gray-50 border rounded-lg text-sm ${
                                error.name ? 'border-red-500' : 'border-gray-300'
                            } focus:ring-2 focus:ring-orange-500 focus:border-orange-500`}
                            placeholder="e.g., Fresh Orange Juice"
                        />
                        {error.name && <p className="mt-1 text-xs text-red-500">{error.name}</p>}
                    </div>
                    
                    {/* Description */}
                    <div>
                        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                            Description *
                        </label>
                        <textarea
                            id="description"
                            name="description"
                            rows={3}
                            value={formData.description}
                            onChange={handleChange}
                            className={`block w-full px-3 py-3 text-gray-900 bg-gray-50 border rounded-lg text-sm ${
                                error.description ? 'border-red-500' : 'border-gray-300'
                            } focus:ring-2 focus:ring-orange-500 focus:border-orange-500`}
                            placeholder="Describe your product..."
                        />
                        {error.description && <p className="mt-1 text-xs text-red-500">{error.description}</p>}
                    </div>
                    
                    {/* Price and Stock - Two columns on bigger screens, stack on mobile */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div>
                            <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-1">
                                Price (₹) *
                            </label>
                            <div className="relative">
                                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">₹</span>
                                <input
                                    type="number"
                                    id="price"
                                    name="price"
                                    min="0"
                                    step="1"
                                    value={formData.price}
                                    onChange={handleChange}
                                    className={`block w-full pl-8 pr-3 py-3 text-gray-900 bg-gray-50 border rounded-lg text-sm ${
                                        error.price ? 'border-red-500' : 'border-gray-300'
                                    } focus:ring-2 focus:ring-orange-500 focus:border-orange-500`}
                                    placeholder="0"
                                />
                            </div>
                            {error.price && <p className="mt-1 text-xs text-red-500">{error.price}</p>}
                        </div>
                        
                        <div>
                            <label htmlFor="stock" className="block text-sm font-medium text-gray-700 mb-1">
                                Stock Quantity *
                            </label>
                            <input
                                type="number"
                                id="stock"
                                name="stock"
                                min="0"
                                value={formData.stock}
                                onChange={handleChange}
                                className={`block w-full px-3 py-3 text-gray-900 bg-gray-50 border rounded-lg text-sm ${
                                    error.stock ? 'border-red-500' : 'border-gray-300'
                                } focus:ring-2 focus:ring-orange-500 focus:border-orange-500`}
                                placeholder="0"
                            />
                            {error.stock && <p className="mt-1 text-xs text-red-500">{error.stock}</p>}
                        </div>
                    </div>
                    
                    {/* Category */}
                    <div>
                        <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                            Category *
                        </label>
                        <select
                            id="category"
                            name="category"
                            value={formData.category}
                            onChange={handleChange}
                            className="block w-full px-3 py-3 text-gray-900 bg-gray-50 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        >
                            <option value="juices">Juices 🍊</option>
                            <option value="shakes">Shakes 🥤</option>
                        </select>
                    </div>
                    
                    {/* Image URL */}
                    <div>
                        <label htmlFor="image" className="block text-sm font-medium text-gray-700 mb-1">
                            Image URL *
                        </label>
                        <input
                            type="text"
                            id="image"
                            name="image"
                            value={formData.image}
                            onChange={handleChange}
                            className={`block w-full px-3 py-3 text-gray-900 bg-gray-50 border rounded-lg text-sm ${
                                error.image ? 'border-red-500' : 'border-gray-300'
                            } focus:ring-2 focus:ring-orange-500 focus:border-orange-500`}
                            placeholder="/images/product.jpg"
                        />
                        {error.image && <p className="mt-1 text-xs text-red-500">{error.image}</p>}
                        <p className="mt-1 text-xs text-gray-500">Use relative path from public folder (e.g., /images/juice.png)</p>
                    </div>
                    
                    {formData.image && (
                        <div className="mt-4">
                            <p className="text-sm font-medium text-gray-700 mb-2">Image Preview</p>
                            <div className="bg-gray-100 rounded-lg p-4 flex items-center justify-center">
                                <img 
                                    src={formData.image.startsWith('http') ? formData.image : `${formData.image}`} 
                                    alt="Product preview"
                                    className="max-h-40 rounded object-contain" 
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).src = '/images/placeholder.png';
                                        (e.target as HTMLImageElement).onerror = null;
                                    }}
                                />
                            </div>
                        </div>
                    )}
                </div>
                
                <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 -mx-4">
                    <button
                        type="submit"
                        disabled={isLoading}
                        className={`w-full flex justify-center items-center font-semibold py-3 px-4 rounded-xl transition duration-200 text-sm ${
                            isLoading 
                            ? 'bg-gray-400 cursor-not-allowed text-white' 
                            : 'bg-orange-500 hover:bg-orange-600 text-white shadow-md hover:shadow-lg'
                        }`}
                    >
                        {isLoading ? (
                            <>
                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Adding Product...
                            </>
                        ) : 'Add Product'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default AddProductPage;