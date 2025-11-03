'use client';

import { Apple, Plus, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import React, { useState } from 'react';

const AddProductPage = () => {
  const [categories] = useState<string[]>(['juices', 'shakes']);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const router = useRouter();
  
  const [formData, setFormData] = useState({
  name: '',
  description: '',
  category: '',
  stock: '0',
  imageUrl: '',
  isAvailable: true,
  smallPrice: '',
  mediumPrice: '',
  regularNutrients: [{ name: '', amount: '', unit: 'g' }],
  largeNutrients: [{ name: '', amount: '', unit: 'g' }]
});

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [imagePreview, setImagePreview] = useState<string | null>(null);
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
    } else if (name === 'stock') {
      if (value === '' || /^\d+$/.test(value)) {
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

  if (file.size > 2 * 1024 * 1024) {
    alert('Image size must be less than 2MB');
    return;
  }

  // Show preview immediately
  const reader = new FileReader();
  reader.onloadend = () => {
    setImagePreview(reader.result as string);
  };
  reader.readAsDataURL(file);

  setIsUploading(true);
  
  try {
    // Create form data for S3 upload
    const formData = new FormData();
    formData.append('image', file);

    // Upload to S3
    const uploadResponse = await fetch('/api/s3/upload', {
      method: 'POST',
      body: formData
    });

    if (!uploadResponse.ok) {
      const error = await uploadResponse.json();
      throw new Error(error.error || 'Failed to upload image');
    }

    const { url } = await uploadResponse.json();
    
    // Update form data with S3 URL
    setFormData(prev => ({ 
      ...prev, 
      imageUrl: url 
    }));
    
    if (errors.imageUrl) {
      setErrors(prev => ({ ...prev, imageUrl: '' }));
    }

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
      alert('Please fix the errors in the form');
      return;
    }

   setIsLoading(true);
    
    try {
      const productData = {
        ...formData,
        price: parseFloat(formData.smallPrice),
        stock: parseInt(formData.stock, 10)
      };

      const response = await fetch('/api/admin/add-product', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(productData),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create product');
      }

      router.push('/admin/products');
    } catch (error: any) {
      console.error('Error creating product:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const removeImage = () => {
    setImagePreview(null);
    setFormData(prev => ({ ...prev, imageUrl: '' }));
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
          <h1 className="text-4xl font-bold text-black">Add New Product</h1>
          <p className="mt-2 text-black opacity-70">Fill in the details below to create a new product</p>
        </div>
        
        {/* Form Card */}
        <div className="bg-white shadow-2xl rounded-2xl overflow-hidden border border-orange-100">
          <form onSubmit={handleSubmit}>
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

                    <div className="col-span-2 space-y-6 border-t border-gray-200 pt-6">
  <h3 className="text-lg font-bold text-gray-900 flex items-center">
    <Apple className="w-5 h-5 mr-2 text-orange-600" />
    Nutritional Information
    <span className="text-sm font-normal text-gray-500 ml-2">(Optional)</span>
  </h3>

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
                              Remove Image
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
                        <circle 
                          className="opacity-25" 
                          cx="12" 
                          cy="12" 
                          r="10" 
                          stroke="currentColor" 
                          strokeWidth="4" 
                          fill="none" 
                        />
                        <path 
                          className="opacity-75" 
                          fill="currentColor" 
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" 
                        />
                      </svg>
                      Uploading to S3...
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
                type="submit"
                className="px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg hover:from-orange-600 hover:to-orange-700 transition font-semibold flex items-center disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-orange-500/30"
                disabled={isLoading || isUploading}
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Creating Product...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Product
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddProductPage;