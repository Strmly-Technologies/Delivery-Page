export interface LocalCartItem {
  productId: string;
  product: {
    _id: string;
    name: string;
    description: string;
    price: number;
    category: 'juices' | 'shakes';
    image: string;
  };
  customization: {
    size: string;
    quantity: string;
    ice?: string;
    sugar?: string;
    dilution?: string;
    finalPrice: number;
  };
  price: number;
  quantity: number;
  addedAt: string;
}

export const localCart = {
  getItems: (): LocalCartItem[] => {
    if (typeof window === 'undefined') return [];
    const items = localStorage.getItem('cart');
    return items ? JSON.parse(items) : [];
  },

  addItem: (item: LocalCartItem) => {
    const items = localCart.getItems();
    items.push(item);
    localStorage.setItem('cart', JSON.stringify(items));
  },

  removeItem: (productId: string) => {
    const items = localCart.getItems();
    const filteredItems = items.filter(item => item.productId !== productId);
    localStorage.setItem('cart', JSON.stringify(filteredItems));
  },

  clearCart: () => {
    localStorage.removeItem('cart');
  },

  updateItem: (productId: string, updates: Partial<LocalCartItem>) => {
    const items = localCart.getItems();
    const index = items.findIndex(item => item.productId === productId);
    if (index !== -1) {
      items[index] = { ...items[index], ...updates };
      localStorage.setItem('cart', JSON.stringify(items));
    }
  }
};