
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
      console.log('Current items before adding:', items); // Debug log

      // Check if product already exists with same customization
      const existingItemIndex = items.findIndex(
        (i: any) => 
          i.productId === item.productId && 
          JSON.stringify(i.customization) === JSON.stringify(item.customization)
      );

      if (existingItemIndex !== -1) {
        // Update quantity instead of adding new item
        items[existingItemIndex].quantity += item.quantity;
        items[existingItemIndex].price = item.customization.finalPrice * items[existingItemIndex].quantity; // Update price
      } else {
        items.push(item);
      }

      console.log('Items to be stored:', items); // Debug log
      localStorage.setItem('cart', JSON.stringify(items));
      return true;
    } catch (error) {
      console.error('Error adding to cart:', error);
      throw error;
    }
  },


  removeItem: (productId: string, price: number) => {
  try {
    console.log('Removing item with productId:', productId, 'and price:', price); // Debug log
    const items = localCart.getItems();
    const filteredItems = items.filter((item: LocalCartItem) => 
      !(item.productId === productId && item.price === price)
    );
    localStorage.setItem('cart', JSON.stringify(filteredItems));
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