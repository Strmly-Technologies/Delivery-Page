'use client';

import { useRouter, useParams } from 'next/navigation';
import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { Apple, Plus, Trash2 } from 'lucide-react';

const EditProductPage = () => {
  const [categories] = useState<string[]>(['juices', 'shakes']);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const router = useRouter();
  const { id } = useParams() as { id: string };
  const productId = id;
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    imageUrl: '',
    isAvailable: true,
    smallPrice: '',
    mediumPrice: '',
    regularNutrients: [{ name: '', amount: '', unit: 'g' }],
    largeNutrients: [{ name: '', amount: '', unit: 'g' }]
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Add nutrient management functions
  const addNutrient = (size: 'regular' | 'large') => {
    const key = size === 'regular' ? 'regularNutrients' : 'largeNutrients';
    setFormData(prev => ({
      ...prev,
      [key]: [...prev[key], { name: '', amount: '', unit: 'g' }]
    }));
  };

  const removeNutrient = (size: 'regular' | 'large', index: number) => {
    const key = size === 'regular' ? 'regularNutrients' : 'largeNutrients';
    setFormData(prev => ({
      ...prev,
      [key]: prev[key].filter((_, i) => i !== index)
    }));
  };

  const updateNutrient = (size: 'regular' | 'large', index: number, field: string, value: string) => {
    const key = size === 'regular' ? 'regularNutrients' : 'largeNutrients';
    setFormData(prev => ({
      ...prev,
      [key]: prev[key].map((nutrient, i) => 
        i === index ? { ...nutrient, [field]: value } : nutrient
      )
    }));
  };

  const copyAndScaleNutrients = () => {
    const scaledNutrients = formData.regularNutrients.map(nutrient => {
      // Skip empty nutrients
      if (!nutrient.name.trim() || !nutrient.amount.trim()) return nutrient;

      const amount = parseFloat(nutrient.amount);
      if (isNaN(amount)) return nutrient;

      // Scale from 300ml to 500ml (5/3 times)
      const scaledAmount = (amount * 5 / 3).toFixed(2);

      return {
        name: nutrient.name,
        amount: scaledAmount.toString(),
        unit: nutrient.unit
      };
    });

    setFormData(prev => ({
      ...prev,
      largeNutrients: scaledNutrients
    }));
  };

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const response = await fetch(`/api/admin/products/${productId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch product');
        }
        const data = await response.json();
        
        setFormData({
          name: data.product.name || '',
          description: data.product.description || '',
          category: data.product.category || '',
          imageUrl: data.product.image || '',
          isAvailable: data.product.isAvailable ?? true,
          smallPrice: data.product.smallPrice?.toString() || '',
          mediumPrice: data.product.mediumPrice?.toString() || '',
          regularNutrients: data.product.regularNutrients && data.product.regularNutrients.length > 0 
            ? data.product.regularNutrients 
            : [{ name: '', amount: '', unit: 'g' }],
          largeNutrients: data.product.largeNutrients && data.product.largeNutrients.length > 0 
            ? data.product.largeNutrients 
            : [{ name: '', amount: '', unit: 'g' }]
        });
        
        if (data.product.image) {
          setImagePreview(data.product.image);
        }
      } catch (error) {
        console.error('Error fetching product:', error);
        toast.error('Failed to load product');
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
    } else if (name === 'smallPrice' || name === 'mediumPrice') {
      if (value === '' || /^\d*\.?\d{0,2}$/.test(value)) {
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
      }
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
      if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;

  if (!file.type.startsWith('image/')) {
    alert('Please select an image file');
    return;
  }

  if (file.size > 5 * 1024 * 1024) {
    alert('Image size should be less than 5MB');
    return;
  }

  const reader = new FileReader();
  reader.onloadend = () => {
    setImagePreview(reader.result as string);
  };
  reader.readAsDataURL(file);

  setIsUploading(true);
  const formDataToSend = new FormData();
  formDataToSend.append('image', file); // Changed from 'file' to 'image'

  try {
    const response = await fetch('/api/s3/upload', {
      method: 'POST',
      body: formDataToSend,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Upload failed');
    }

    const data = await response.json();
    setFormData(prev => ({ ...prev, imageUrl: data.url }));
    if (errors.imageUrl) setErrors(prev => ({ ...prev, imageUrl: '' }));
    toast.success('Image uploaded successfully');
  } catch (error: any) {
    console.error('Error uploading image:', error);
    alert(error.message || 'Failed to upload image');
  } finally {
    setIsUploading(false);
  }
};

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Please fix the errors in the form');
      return;
    }

    setIsLoading(true);
    
    try {
      // Filter out empty nutrients
      const filteredRegularNutrients = formData.regularNutrients.filter(
        n => n.name.trim() && n.amount.trim()
      );
      const filteredLargeNutrients = formData.largeNutrients.filter(
        n => n.name.trim() && n.amount.trim()
      );

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
          price: parseFloat(formData.smallPrice),
          smallPrice: parseFloat(formData.smallPrice),
          mediumPrice: parseFloat(formData.mediumPrice),
          regularNutrients: filteredRegularNutrients,
          largeNutrients: filteredLargeNutrients,
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update product');
      }
      
      toast.success('Product updated successfully!');
      router.push('/admin/products');
    } catch (error: any) {
      console.error('Update product error:', error);
      toast.error(error.message || 'Failed to update product');
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetching) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-orange-100">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading product...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <button 
            onClick={() => router.push('/admin/products')}
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
        
        <div className="bg-white shadow-2xl rounded-2xl overflow-hidden border border-orange-100">
          <div className="p-8">
            <form onSubmit={handleSubmit}>
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
                      className={`w-full text-black px-4 py-3 border ${errors.category ? 'border-orange-500' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition bg-white`}
                    >
                      <option value="">Select a category</option>
                      {categories.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat.charAt(0).toUpperCase() + cat.slice(1)}
                        </option>
                      ))}
                    </select>
                    {errors.category && <p className="mt-1 text-sm text-orange-600">{errors.category}</p>}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-black mb-2">
                        Regular Size (300mL) <span className="text-orange-600">*</span>
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
                      <label className="block text-sm font-semibold text-black mb-2">
                        Large Size (500mL) <span className="text-orange-600">*</span>
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
                          <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <label className="cursor-pointer bg-white text-orange-600 px-6 py-3 rounded-lg font-semibold hover:bg-orange-50 transition">
                              Change Image
                              <input
                                type="file"
                                accept="image/*"
                                onChange={handleImageChange}
                                className="hidden"
                                disabled={isUploading}
                              />
                            </label>
                          </div>
                        </div>
                      ) : (
                        <label className="flex flex-col items-center justify-center h-80 cursor-pointer">
                          <svg className="w-16 h-16 text-orange-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                          <p className="text-black font-medium mb-1">Click to upload image</p>
                          <p className="text-sm text-gray-500">PNG, JPG up to 5MB</p>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageChange}
                            className="hidden"
                            disabled={isUploading}
                          />
                        </label>
                      )}
                      {isUploading && (
                        <div className="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center">
                          <div className="text-center">
                            <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                            <p className="text-sm text-gray-600">Uploading...</p>
                          </div>
                        </div>
                      )}
                    </div>
                    {errors.imageUrl && <p className="mt-1 text-sm text-orange-600">{errors.imageUrl}</p>}
                  </div>
                </div>
              </div>

              {/* Nutritional Information Section */}
              <div className="mt-8 pt-8 border-t border-gray-200 space-y-6">
                <h3 className="text-lg font-bold text-gray-900 flex items-center">
                  <Apple className="w-5 h-5 mr-2 text-orange-600" />
                  Nutritional Information
                  <span className="text-sm font-normal text-gray-500 ml-2">(Optional)</span>
                </h3>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Regular Size Nutrients */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-gray-900">Regular Size (300mL)</h4>
                      <button
                        type="button"
                        onClick={() => addNutrient('regular')}
                        className="text-sm text-orange-600 hover:text-orange-700 font-medium flex items-center"
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Add Nutrient
                      </button>
                    </div>
                    
                    {formData.regularNutrients.map((nutrient, index) => (
                      <div key={index} className="grid grid-cols-12 gap-3 items-end">
                        <div className="col-span-5">
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Nutrient Name
                          </label>
                          <input
                            type="text"
                            value={nutrient.name}
                            onChange={(e) => updateNutrient('regular', index, 'name', e.target.value)}
                            placeholder="e.g., Calories, Protein"
                            className="w-full px-3 py-2 text-sm border text-black border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                          />
                        </div>
                        <div className="col-span-3">
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Amount
                          </label>
                          <input
                            type="text"
                            value={nutrient.amount}
                            onChange={(e) => updateNutrient('regular', index, 'amount', e.target.value)}
                            placeholder="100"
                            className="w-full px-3 py-2 text-sm border text-black border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                          />
                        </div>
                        <div className="col-span-3">
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Unit
                          </label>
                          <select
                            value={nutrient.unit}
                            onChange={(e) => updateNutrient('regular', index, 'unit', e.target.value)}
                            className="w-full px-3 py-2 text-sm border text-black border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                          >
                            <option value="g">g</option>
                            <option value="mg">mg</option>
                            <option value="mcg">mcg</option>
                            <option value="kcal">kcal</option>
                            <option value="ml">ml</option>
                            <option value="%">%</option>
                          </select>
                        </div>
                        <div className="col-span-1">
                          <button
                            type="button"
                            onClick={() => removeNutrient('regular', index)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Large Size Nutrients */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-gray-900">Large Size (500mL)</h4>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={copyAndScaleNutrients}
                          className="text-sm bg-orange-100 text-orange-600 hover:bg-orange-200 px-3 py-1.5 rounded-lg font-medium flex items-center"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                          </svg>
                          Copy & Scale from Regular
                        </button>
                        <button
                          type="button"
                          onClick={() => addNutrient('large')}
                          className="text-sm text-orange-600 hover:text-orange-700 font-medium flex items-center"
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Add Nutrient
                        </button>
                      </div>
                    </div>
                    
                    {formData.largeNutrients.map((nutrient, index) => (
                      <div key={index} className="grid grid-cols-12 gap-3 items-end">
                        <div className="col-span-5">
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Nutrient Name
                          </label>
                          <input
                            type="text"
                            value={nutrient.name}
                            onChange={(e) => updateNutrient('large', index, 'name', e.target.value)}
                            placeholder="e.g., Calories, Protein"
                            className="w-full px-3 py-2 text-sm border text-black border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                          />
                        </div>
                        <div className="col-span-3">
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Amount
                          </label>
                          <input
                            type="text"
                            value={nutrient.amount}
                            onChange={(e) => updateNutrient('large', index, 'amount', e.target.value)}
                            placeholder="150"
                            className="w-full px-3 py-2 text-sm border text-black border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                          />
                        </div>
                        <div className="col-span-3">
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Unit
                          </label>
                          <select
                            value={nutrient.unit}
                            onChange={(e) => updateNutrient('large', index, 'unit', e.target.value)}
                            className="w-full px-3 py-2 text-sm border text-black border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                          >
                            <option value="g">g</option>
                            <option value="mg">mg</option>
                            <option value="mcg">mcg</option>
                            <option value="kcal">kcal</option>
                            <option value="ml">ml</option>
                            <option value="%">%</option>
                          </select>
                        </div>
                        <div className="col-span-1">
                          <button
                            type="button"
                            onClick={() => removeNutrient('large', index)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-8 flex justify-end">
                <button
                  type="submit"
                  disabled={isLoading}
                  className={`px-8 py-3 rounded-lg font-semibold transition flex items-center ${
                    isLoading
                      ? 'bg-gray-300 cursor-not-allowed'
                      : 'bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg hover:shadow-xl'
                  }`}
                >
                  {isLoading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Updating...
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
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditProductPage;