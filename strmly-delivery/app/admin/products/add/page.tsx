'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AdminLayout from '@/app/components/layouts/AdminLayout';
import ProductForm from '@/app/components/admin/ProductForm';
import { toast } from 'react-hot-toast';

const AddProductPage = () => {
  const [categories, setCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Fetch categories
    const fetchCategories = async () => {
      try {
        const response = await fetch('/api/categories');
        const data = await response.json();
        if (response.ok) {
          setCategories(data.categories.map((cat: any) => cat.name));
        }
      } catch (error) {
        console.error('Error fetching categories:', error);
        toast.error('Failed to load categories');
      }
    };
    
    fetchCategories();
  }, []);

  const handleSubmit = async (productData: any) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/products', {
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

      toast.success('Product created successfully');
      router.push('/admin/products');
    } catch (error: any) {
      console.error('Error creating product:', error);
      toast.error(error.message || 'Failed to create product');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="py-6">
        <h1 className="text-2xl font-bold mb-6">Add New Product</h1>
        <div className="bg-white shadow rounded-lg p-6">
          <ProductForm 
            onSubmit={handleSubmit} 
            categories={categories} 
            isLoading={isLoading} 
          />
        </div>
      </div>
    </AdminLayout>
  );
};

export default AddProductPage;