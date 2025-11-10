export interface LocalCartItem {
  productId: string;
  customization: {
    size: string;
    quantity: string;
    ice?: string;
    sugar?: string;
    dilution?: string;
    finalPrice: number;
  };
  quantity: number;
  price: number;
  addedAt?: number;
}

const JUICE_X_PRODUCT_ID = process.env.NEXT_PUBLIC_PRODUCT_ID || '';

export const localCart = {
  getItems() {
    try {
      const items = localStorage.getItem('cart');
      return items ? JSON.parse(items) : [];
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return [];
    }
  },

  addItem(item: any) {
    try {
      const items = this.getItems();
      console.log('Current items before adding:', items);

      // Check if trying to add JuiceX when it's already in cart
      if (item.productId === JUICE_X_PRODUCT_ID) {
        const hasJuiceX = items.some((i: any) => i.productId === JUICE_X_PRODUCT_ID);
        if (hasJuiceX) {
          throw new Error('This special product is already in your cart. You can only add it once.');
        }
      }

      // Check if product already exists with same customization
      const existingItemIndex = items.findIndex(
        (i: any) => 
          i.productId === item.productId && 
          JSON.stringify(i.customization) === JSON.stringify(item.customization)
      );

      if (existingItemIndex !== -1) {
        // For JuiceX, don't allow quantity increase
        if (item.productId === JUICE_X_PRODUCT_ID) {
          throw new Error('This special product is already in your cart. You can only add it once.');
        }
        
        // Update quantity instead of adding new item
        items[existingItemIndex].quantity += item.quantity;
        items[existingItemIndex].price = item.customization.finalPrice * items[existingItemIndex].quantity;
      } else {
        items.push(item);
      }

      console.log('Items to be stored:', items);
      localStorage.setItem('cart', JSON.stringify(items));
      return true;
    } catch (error) {
      console.error('Error adding to cart:', error);
      throw error;
    }
  },

  removeItem: (productId: string, price: number) => {
    try {
      console.log('Removing item with productId:', productId, 'and price:', price);
      const items = localCart.getItems();
      const filteredItems = items.filter((item: LocalCartItem) => 
        !(item.productId === productId && item.price === price)
      );
      
      // Store the filtered items
      localStorage.setItem('cart', JSON.stringify(filteredItems));
      
      // Note: For local storage, we can't update server-side hasJuiceXInCart flag
      // This will be handled when the cart is synced to server during checkout
      
      return true;
    } catch (error) {
      console.error('Error removing item from cart:', error);
      throw error;
    }
  },

  clearCart: () => {
    localStorage.removeItem('cart');
  },

  updateItem: (productId: string, updates: Partial<LocalCartItem>) => {
    const items = localCart.getItems();
    const index = items.findIndex((item:LocalCartItem) => item.productId === productId);
    if (index !== -1) {
      items[index] = { ...items[index], ...updates };
      localStorage.setItem('cart', JSON.stringify(items));
    }
  }
};