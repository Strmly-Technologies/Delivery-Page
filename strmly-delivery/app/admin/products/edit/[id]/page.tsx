'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AdminLayout from '@/app/components/layouts/AdminLayout';
import ProductForm from '@/app/components/admin/ProductForm';
import { toast } from 'react-hot-toast';

interface EditProductPageProps {
  params: {
    id: string;
  };
}

const EditProductPage = ({ params }: EditProductPageProps) => {
  const [product, setProduct] = useState<any>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const router = useRouter();
  const { id } = params;

  useEffect(() => {
    // Fetch product data and categories
    const fetchData = async () => {
      setIsFetching(true);
      try {
        const [productRes, categoriesRes] = await Promise.all([
          fetch(`/api/admin/products/${id}`),
          fetch('/api/categories')
        ]);

        const productData = await productRes.json();
        const categoriesData = await categoriesRes.json();

        if (!productRes.ok) {
          throw new Error(productData.error || 'Failed to fetch product');
        }

        if (!categoriesRes.ok) {
          throw new Error(categoriesData.error || 'Failed to fetch categories');
        }

        setProduct(productData.product);
        setCategories(categoriesData.categories.map((cat: any) => cat.name));
      } catch (error: any) {
        console.error('Error fetching data:', error);
        toast.error(error.message || 'Failed to fetch data');
        router.push('/admin/products');
      } finally {
        setIsFetching(false);
      }
    };

    if (id) {
      fetchData();
    }
  }, [id, router]);

  const handleSubmit = async (productData: any) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/admin/products/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(productData),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update product');
      }

      toast.success('Product updated successfully');
      router.push('/admin/products');
    } catch (error: any) {
      console.error('Error updating product:', error);
      toast.error(error.message || 'Failed to update product');
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetching) {
    return (
      <AdminLayout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="py-6">
        <h1 className="text-2xl font-bold mb-6">Edit Product</h1>
        <div className="bg-white shadow rounded-lg p-6">
          {product && (
            <ProductForm 
              onSubmit={handleSubmit} 
              categories={categories} 
              initialData={{
                ...product,
                category: product.category?.name || '',
              }}
              isLoading={isLoading} 
            />
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default EditProductPage;
    
    if (!validateForm() || !product) return;
    
    try {
      setSubmitting(true);
      const token = await window.cookieStore.get('authToken').then((cookie) => cookie?.value);
      
      let updatedProduct = { ...product };
      
      // If a new image was selected, upload it
      if (imageFile) {
        const formData = new FormData();
        formData.append('image', imageFile);
        
        const uploadResponse = await fetch('/api/admin/upload', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        });
        
        if (!uploadResponse.ok) {
          throw new Error('Failed to upload image');
        }
        
        const uploadData = await uploadResponse.json();
        if (uploadData.success) {
          updatedProduct.image = uploadData.imageUrl;
        } else {
          throw new Error(uploadData.error || 'Failed to upload image');
        }
      }
      
      // Update the product
      const updateResponse = await fetch(`/api/admin/products/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updatedProduct)
      });
      
      if (!updateResponse.ok) {
        throw new Error('Failed to update product');
      }
      
      const updateData = await updateResponse.json();
      if (updateData.success) {
        alert('Product updated successfully');
        router.push('/admin/products');
      } else {
        throw new Error(updateData.error || 'Failed to update product');
      }
    } catch (error) {
      console.error('Error updating product:', error);
      alert(`Failed to update product: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex">
        {/* Sidebar */}
        <div className="w-64 bg-white shadow-md">
          <div className="p-6">
            <h1 className="text-2xl font-bold text-orange-600">STRMLY Admin</h1>
          </div>
          <nav className="mt-6">
            {/* Sidebar items */}
          </nav>
        </div>
        
        {/* Loading spinner */}
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-orange-600"></div>
          <p className="ml-4 text-lg text-gray-600">Loading product...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-md">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-orange-600">STRMLY Admin</h1>
        </div>
        <nav className="mt-6">
          <Link href="/admin" className="block py-3 px-6 text-gray-600 hover:bg-gray-50 hover:text-gray-900 font-medium">
            <div className="flex items-center">
              <BarChart3 className="h-5 w-5 mr-3" />
              Dashboard
            </div>
          </Link>
          <Link href="/admin/products" className="block py-3 px-6 bg-orange-50 text-orange-600 border-l-4 border-orange-600 font-medium">
            <div className="flex items-center">
              <Package2 className="h-5 w-5 mr-3" />
              Products
            </div>
          </Link>
          <Link href="/admin/orders" className="block py-3 px-6 text-gray-600 hover:bg-gray-50 hover:text-gray-900 font-medium">
            <div className="flex items-center">
              <ShoppingCart className="h-5 w-5 mr-3" />
              Orders
            </div>
          </Link>
          <Link href="/admin/settings" className="block py-3 px-6 text-gray-600 hover:bg-gray-50 hover:text-gray-900 font-medium">
            <div className="flex items-center">
              <Settings className="h-5 w-5 mr-3" />
              Settings
            </div>
          </Link>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-8">
        <div className="mb-6">
          <Link href="/admin/products" className="text-gray-600 hover:text-gray-900 flex items-center">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Products
          </Link>
        </div>

        <h1 className="text-2xl font-semibold text-gray-800 mb-6">Edit Product</h1>
        
        {product ? (
          <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column - Product Details */}
              <div className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                    Product Name *
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    value={product.name}
                    onChange={handleChange}
                    className={`block w-full rounded-md border ${errors.name ? 'border-red-500' : 'border-gray-300'} shadow-sm py-2 px-3 focus:outline-none focus:ring-orange-500 focus:border-orange-500`}
                  />
                  {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                </div>
                
                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                    Description *
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    rows={4}
                    value={product.description}
                    onChange={handleChange}
                    className={`block w-full rounded-md border ${errors.description ? 'border-red-500' : 'border-gray-300'} shadow-sm py-2 px-3 focus:outline-none focus:ring-orange-500 focus:border-orange-500`}
                  />
                  {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description}</p>}
                </div>
                
                <div>
                  <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                    Category *
                  </label>
                  <select
                    id="category"
                    name="category"
                    value={product.category}
                    onChange={handleChange}
                    className={`block w-full rounded-md border ${errors.category ? 'border-red-500' : 'border-gray-300'} shadow-sm py-2 px-3 focus:outline-none focus:ring-orange-500 focus:border-orange-500`}
                  >
                    <option value="juices">Juices</option>
                    <option value="shakes">Shakes</option>
                  </select>
                  {errors.category && <p className="text-red-500 text-xs mt-1">{errors.category}</p>}
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-1">
                      Price (₹) *
                    </label>
                    <input
                      id="price"
                      name="price"
                      type="number"
                      min="0"
                      step="1"
                      value={product.price}
                      onChange={handleChange}
                      className={`block w-full rounded-md border ${errors.price ? 'border-red-500' : 'border-gray-300'} shadow-sm py-2 px-3 focus:outline-none focus:ring-orange-500 focus:border-orange-500`}
                    />
                    {errors.price && <p className="text-red-500 text-xs mt-1">{errors.price}</p>}
                  </div>
                  
                  <div>
                    <label htmlFor="stock" className="block text-sm font-medium text-gray-700 mb-1">
                      Stock *
                    </label>
                    <input
                      id="stock"
                      name="stock"
                      type="number"
                      min="0"
                      step="1"
                      value={product.stock}
                      onChange={handleChange}
                      className={`block w-full rounded-md border ${errors.stock ? 'border-red-500' : 'border-gray-300'} shadow-sm py-2 px-3 focus:outline-none focus:ring-orange-500 focus:border-orange-500`}
                    />
                    {errors.stock && <p className="text-red-500 text-xs mt-1">{errors.stock}</p>}
                  </div>
                </div>
              </div>
              
              {/* Right Column - Image */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Product Image *
                </label>
                
                <div className={`border-2 border-dashed ${errors.image ? 'border-red-500' : 'border-gray-300'} rounded-md p-4 text-center`}>
                  {imagePreview ? (
                    <div className="mb-4">
                      <div className="relative h-48 w-full">
                        <Image 
                          src={imagePreview}
                          alt="Product preview"
                          fill
                          className="object-contain"
                        />
                      </div>
                      <button
                        type="button"
                        className="mt-3 text-sm text-orange-600 hover:text-orange-500"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        Change image
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex justify-center">
                        <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center">
                          <Package2 className="h-6 w-6 text-gray-400" />
                        </div>
                      </div>
                      <div className="text-sm text-gray-600">
                        <label
                          htmlFor="file-upload"
                          className="relative cursor-pointer rounded-md font-medium text-orange-600 hover:text-orange-500"
                        >
                          <span>Upload a file</span>
                          <input
                            id="file-upload"
                            ref={fileInputRef}
                            name="image"
                            type="file"
                            className="sr-only"
                            onChange={handleFileChange}
                            accept="image/*"
                          />
                        </label>
                        <p className="pl-1">or drag and drop</p>
                      </div>
                      <p className="text-xs text-gray-500">
                        PNG, JPG, GIF up to 10MB
                      </p>
                    </div>
                  )}
                  
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={handleFileChange}
                  />
                </div>
                
                {errors.image && <p className="text-red-500 text-xs mt-1">{errors.image}</p>}
              </div>
            </div>
            
            {/* Form Actions */}
            <div className="mt-6 flex justify-end space-x-3">
              <Link
                href="/admin/products"
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={submitting}
                className={`px-4 py-2 rounded-md shadow-sm text-sm font-medium text-white ${
                  submitting ? 'bg-orange-400 cursor-not-allowed' : 'bg-orange-600 hover:bg-orange-700'
                }`}
              >
                {submitting ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        ) : (
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <p className="text-gray-600">Product not found or failed to load.</p>
            <Link 
              href="/admin/products"
              className="mt-4 inline-block px-4 py-2 bg-orange-600 text-white rounded-md"
            >
              Back to Products
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
