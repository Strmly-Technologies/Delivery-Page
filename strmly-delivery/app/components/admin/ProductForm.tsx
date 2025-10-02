import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import Image from 'next/image';

interface ProductFormProps {
  onSubmit: (data: any) => void;
  categories: string[];
  initialData?: any;
  isLoading?: boolean;
}

const ProductForm = ({ onSubmit, categories, initialData = {}, isLoading = false }: ProductFormProps) => {
  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm({
    defaultValues: {
      name: initialData.name || '',
      description: initialData.description || '',
      price: initialData.price || '',
      category: initialData.category || '',
      imageUrl: initialData.imageUrl || '',
      isAvailable: initialData.isAvailable ?? true,
    }
  });

  const [uploading, setUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState(initialData.imageUrl || '');
  const [uploadError, setUploadError] = useState('');

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.includes('image/')) {
      setUploadError('Please upload an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Image size should be less than 5MB');
      return;
    }

    setUploading(true);
    setUploadError('');

    try {
      // Create form data
      const formData = new FormData();
      formData.append('image', file);

      // Upload to S3 using your existing endpoint
      const response = await fetch('/api/admin/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload image');
      }

      // Set the image URL in the form
      setValue('imageUrl', data.imageUrl);
      setImagePreview(data.imageUrl);
    } catch (error) {
      console.error('Error uploading image:', error);
      setUploadError('Failed to upload image. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const watchImageUrl = watch('imageUrl');

  const processSubmit = (data: any) => {
    // Convert price to number
    data.price = parseFloat(data.price);
    onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit(processSubmit)} className="space-y-6">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">Product Name</label>
        <input
          type="text"
          id="name"
          {...register('name', { required: 'Product name is required' })}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
        />
        {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message?.toString()}</p>}
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description</label>
        <textarea
          id="description"
          rows={3}
          {...register('description', { required: 'Description is required' })}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
        />
        {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description.message?.toString()}</p>}
      </div>

      <div>
        <label htmlFor="price" className="block text-sm font-medium text-gray-700">Price (₹)</label>
        <input
          type="number"
          id="price"
          step="0.01"
          {...register('price', { 
            required: 'Price is required',
            min: { value: 0, message: 'Price cannot be negative' }
          })}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
        />
        {errors.price && <p className="text-red-500 text-xs mt-1">{errors.price.message?.toString()}</p>}
      </div>

      <div>
        <label htmlFor="category" className="block text-sm font-medium text-gray-700">Category</label>
        <select
          id="category"
          {...register('category', { required: 'Category is required' })}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
        >
          <option value="">Select a category</option>
          {categories.map(category => (
            <option key={category} value={category}>{category}</option>
          ))}
        </select>
        {errors.category && <p className="text-red-500 text-xs mt-1">{errors.category.message?.toString()}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Product Image</label>
        <div className="mt-1 flex items-center space-x-6">
          <div className="flex-shrink-0">
            {imagePreview ? (
              <div className="relative h-40 w-40">
                <Image 
                  src={imagePreview} 
                  alt="Product preview" 
                  fill 
                  className="object-cover rounded-md"
                />
              </div>
            ) : (
              <div className="h-40 w-40 border-2 border-dashed border-gray-300 rounded-md flex items-center justify-center text-gray-400">
                No image
              </div>
            )}
          </div>
          
          <div className="flex-1">
            <input
              type="hidden"
              {...register('imageUrl', { required: 'Product image is required' })}
            />
            
            <label className="cursor-pointer inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none">
              {uploading ? 'Uploading...' : 'Upload Image'}
              <input
                type="file"
                className="sr-only"
                accept="image/*"
                onChange={handleImageUpload}
                disabled={uploading}
              />
            </label>
            
            {uploadError && <p className="text-red-500 text-xs mt-1">{uploadError}</p>}
            {errors.imageUrl && <p className="text-red-500 text-xs mt-1">{errors.imageUrl.message?.toString()}</p>}
          </div>
        </div>
      </div>

      <div>
        <div className="flex items-center">
          <input
            type="checkbox"
            id="isAvailable"
            {...register('isAvailable')}
            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
          />
          <label htmlFor="isAvailable" className="ml-2 block text-sm text-gray-900">
            Available for purchase
          </label>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isLoading || uploading}
          className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${(isLoading || uploading) ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {isLoading ? 'Saving...' : initialData.id ? 'Update Product' : 'Add Product'}
        </button>
      </div>
    </form>
  );
};

export default ProductForm;
