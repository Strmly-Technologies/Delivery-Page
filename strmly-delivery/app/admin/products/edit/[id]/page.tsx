'use client';

import { useRouter, useParams } from 'next/navigation';
import React, { useState, useEffect, use } from 'react';
import { toast } from 'react-hot-toast';



const EditProductPage = () => {
  const [categories] = useState<string[]>(['juices', 'shakes']);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const router = useRouter();
  const { id } = useParams() as { id: string };
  const productId = id;
  console.log('Product ID from params:', productId);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    imageUrl: '',
    isAvailable: true,
    smallPrice: '',
    mediumPrice: '',
    largePrice: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [imagePreview, setImagePreview] = useState<string | null>(null);

 useEffect(() => {
  const fetchProduct = async () => {
    try {
      setIsFetching(true);
      console.log('Fetching product with ID:', productId);
      const response = await fetch(`/api/admin/products/${productId}`, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch product');
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch product');
      }

      // Map API response to form data
      setFormData({
        name: data.product.name,
        description: data.product.description,
        category: data.product.category,
        imageUrl: data.product.image,
        isAvailable: true,
        smallPrice: data.product.smallPrice.toString(),
        mediumPrice: data.product.mediumPrice.toString(),
        largePrice: data.product.largePrice.toString(),
      });
      setImagePreview(data.product.image);

    } catch (error) {
      console.error('Error fetching product:', error);
      router.push('/admin/products');
    } finally {
      setIsFetching(false);
    }
  };

  if (productId) {
    fetchProduct();
  }
}, [productId, router]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Product name is required';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }

    if (!formData.category) {
      newErrors.category = 'Please select a category';
    }

    if (!formData.smallPrice || parseFloat(formData.smallPrice) <= 0) {
      newErrors.smallPrice = 'Small price must be greater than 0';
    }

    if (!formData.mediumPrice || parseFloat(formData.mediumPrice) <= 0) {
      newErrors.mediumPrice = 'Medium price must be greater than 0';
    }

    if (!formData.largePrice || parseFloat(formData.largePrice) <= 0) {
      newErrors.largePrice = 'Large price must be greater than 0';
    }

    if (!formData.imageUrl) {
      newErrors.imageUrl = 'Please upload a product image';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else if (name === 'smallPrice' || name === 'mediumPrice' || name === 'largePrice') {
      if (value === '' || /^\d*\.?\d{0,2}$/.test(value)) {
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
      }
    } 
     else {
      setFormData(prev => ({ ...prev, [name]: value }));
      if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('Image size must be less than 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    setIsUploading(true);
    
    // Simulate upload - replace with actual API call
    setTimeout(() => {
      setFormData(prev => ({ ...prev, imageUrl: reader.result as string }));
      if (errors.imageUrl) setErrors(prev => ({ ...prev, imageUrl: '' }));
      setIsUploading(false);
      alert('Image uploaded successfully');
    }, 1500);
  };
  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  if (!validateForm()) {
    toast.error('Please fix the errors in the form');
    return;
  }

  setIsLoading(true);
  
  try {
    const response = await fetch(`/api/admin/products/${productId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: formData.name,
        description: formData.description,
        category: formData.category,
        image: formData.imageUrl,
        price: parseFloat(formData.smallPrice), // Base price is same as small price
        smallPrice: parseFloat(formData.smallPrice),
        mediumPrice: parseFloat(formData.mediumPrice),
        largePrice: parseFloat(formData.largePrice),
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to update product');
    }

    if (!data.success) {
      throw new Error(data.error || 'Failed to update product');
    }

    toast.success('Product updated successfully');
    router.push('/admin/products');
    
  } catch (error) {
    console.error('Error updating product:', error);
    toast.error(error instanceof Error ? error.message : 'Failed to update product');
  } finally {
    setIsLoading(false);
  }
};



  const removeImage = () => {
    setImagePreview(null);
    setFormData(prev => ({ ...prev, imageUrl: '' }));
  };

  if (isFetching) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-white flex items-center justify-center">
        <div className="text-center">
          <svg className="animate-spin h-12 w-12 text-orange-600 mx-auto mb-4" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="text-black font-semibold">Loading product...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-white py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button 
            className="group flex items-center text-black hover:text-orange-600 mb-4 transition-colors font-medium"
          >
            <svg className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Products
          </button>
          <h1 className="text-4xl font-bold text-black">Edit Product</h1>
          <p className="mt-2 text-black opacity-70">Update the product details below</p>
        </div>
        
        {/* Form Card */}
        <div className="bg-white shadow-2xl rounded-2xl overflow-hidden border border-orange-100">
          <div className="p-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left Column */}
              <div className="space-y-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-semibold text-black mb-2">
                    Product Name <span className="text-orange-600">*</span>
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className={`w-full text-black px-4 py-3 border ${errors.name ? 'border-orange-500' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition bg-white`}
                    placeholder="e.g., Fresh Orange Juice"
                  />
                  {errors.name && <p className="mt-1 text-sm text-orange-600">{errors.name}</p>}
                </div>
                
                <div>
                  <label htmlFor="description" className="block text-sm font-semibold text-black mb-2">
                    Description <span className="text-orange-600">*</span>
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    rows={5}
                    value={formData.description}
                    onChange={handleChange}
                    className={`w-full text-black px-4 py-3 border ${errors.description ? 'border-orange-500' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition resize-none bg-white`}
                    placeholder="Describe your product in detail..."
                  />
                  {errors.description && <p className="mt-1 text-sm text-orange-600">{errors.description}</p>}
                </div>
                
                <div>
                  <label htmlFor="category" className="block text-sm font-semibold text-black mb-2">
                    Category <span className="text-orange-600">*</span>
                  </label>
                  <select
                    id="category"
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    className={`w-full px-4 text-black py-3 border ${errors.category ? 'border-orange-500' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition bg-white`}
                  >
                    <option value="" className="text-black">Select a category</option>
                    {categories.map((category) => (
                      <option key={category} value={category} className="capitalize text-black">
                        {category.charAt(0).toUpperCase() + category.slice(1)}
                      </option>
                    ))}
                  </select>
                  {errors.category && <p className="mt-1 text-sm text-orange-600">{errors.category}</p>}
                </div>

                {/* Price Fields */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-black">Size Pricing <span className="text-orange-600">*</span></h3>
                  
                  <div>
                    <label className="block text-sm font-medium text-black mb-2">
                      Small Size (₹)
                    </label>
                    <input
                      type="text"
                      name="smallPrice"
                      value={formData.smallPrice}
                      onChange={handleChange}
                      className={`w-full text-black px-4 py-3 border ${errors.smallPrice ? 'border-orange-500' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition bg-white`}
                      placeholder="0.00"
                    />
                    {errors.smallPrice && <p className="mt-1 text-sm text-orange-600">{errors.smallPrice}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-black mb-2">
                      Medium Size (₹)
                    </label>
                    <input
                      type="text"
                      name="mediumPrice"
                      value={formData.mediumPrice}
                      onChange={handleChange}
                      className={`w-full text-black px-4 py-3 border ${errors.mediumPrice ? 'border-orange-500' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition bg-white`}
                      placeholder="0.00"
                    />
                    {errors.mediumPrice && <p className="mt-1 text-sm text-orange-600">{errors.mediumPrice}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-black mb-2">
                      Large Size (₹)
                    </label>
                    <input
                      type="text"
                      name="largePrice"
                      value={formData.largePrice}
                      onChange={handleChange}
                      className={`w-full text-black px-4 py-3 border ${errors.largePrice ? 'border-orange-500' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition bg-white`}
                      placeholder="0.00"
                    />
                    {errors.largePrice && <p className="mt-1 text-sm text-orange-600">{errors.largePrice}</p>}
                  </div>
                </div>
              </div>
              
              {/* Right Column */}
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-black mb-2">
                    Product Image <span className="text-orange-600">*</span>
                  </label>
                  <div className={`relative border-2 ${errors.imageUrl ? 'border-orange-500' : 'border-gray-300'} border-dashed rounded-xl overflow-hidden bg-orange-50 hover:bg-orange-100 transition`}>
                    {imagePreview ? (
                      <div className="relative h-80 group">
                        <img 
                          src={imagePreview} 
                          alt="Preview" 
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all flex items-center justify-center">
                          <button
                            type="button"
                            onClick={removeImage}
                            className="opacity-0 group-hover:opacity-100 transition-opacity bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 font-medium"
                          >
                            Change Image
                          </button>
                        </div>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center h-80 cursor-pointer">
                        <div className="flex flex-col items-center justify-center space-y-3">
                          <div className="w-16 h-16 bg-orange-200 rounded-full flex items-center justify-center">
                            <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                          </div>
                          <div className="text-center">
                            <p className="text-sm font-medium text-black">
                              <span className="text-orange-600 hover:text-orange-700">Click to upload</span> or drag and drop
                            </p>
                            <p className="text-xs text-black opacity-70 mt-1">PNG, JPG or WEBP (Max 2MB)</p>
                          </div>
                        </div>
                        <input 
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          onChange={handleImageChange}
                          disabled={isUploading}
                        />
                      </label>
                    )}
                  </div>
                  {isUploading && (
                    <div className="mt-2 flex items-center text-sm text-orange-600">
                      <svg className="animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Uploading image...
                    </div>
                  )}
                  {errors.imageUrl && <p className="mt-1 text-sm text-orange-600">{errors.imageUrl}</p>}
                </div>
                
                <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <input
                      id="isAvailable"
                      name="isAvailable"
                      type="checkbox"
                      checked={formData.isAvailable}
                      onChange={handleChange}
                      className="h-5 w-5 mt-0.5 text-orange-600 focus:ring-orange-500 border-gray-300 rounded cursor-pointer"
                    />
                    <label htmlFor="isAvailable" className="ml-3 block cursor-pointer">
                      <span className="text-sm font-semibold text-black">Available for Purchase</span>
                      <p className="text-xs text-black opacity-70 mt-1">Check this box to make the product visible and purchasable in your store</p>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Footer Actions */}
          <div className="bg-orange-50 px-8 py-6 flex justify-end space-x-3 border-t-2 border-orange-100">
            <button
              type="button"
              className="px-6 py-3 bg-white border-2 border-gray-300 text-black rounded-lg hover:bg-gray-50 transition font-semibold"
              disabled={isLoading || isUploading}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg hover:from-orange-600 hover:to-orange-700 transition font-semibold flex items-center disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-orange-500/30"
              disabled={isLoading || isUploading}
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Updating Product...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Update Product
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditProductPage;