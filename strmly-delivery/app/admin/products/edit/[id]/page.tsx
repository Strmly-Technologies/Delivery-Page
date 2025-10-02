'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ProductForm from '@/app/components/admin/ProductForm';
import { toast } from 'react-hot-toast';

interface EditProductPageProps {
  params: {
    id: string;
  };
}

const EditProductPage = ({ params }: EditProductPageProps) => {
  const [product, setProduct] = useState<any>(null);
  const [categories, setCategories] = useState<string[]>(['juice', 'shake']);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const router = useRouter();
  const { id } = params;

  useEffect(() => {
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
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="py-6">
      <h1 className="text-2xl font-bold mb-6">Edit Product</h1>
      <div className="bg-white shadow rounded-lg p-6">
        {product ? (
          <ProductForm 
            onSubmit={handleSubmit} 
            categories={['juice', 'shake']} 
            initialData={{
              ...product,
              category: product.category?.name || '',
            }}
            isLoading={isLoading} 
          />
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-600">Product not found</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default EditProductPage;