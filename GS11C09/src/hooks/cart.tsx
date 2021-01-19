import React, {
  createContext,
  useState,
  useCallback,
  useContext,
  useEffect,
} from 'react';

import AsyncStorage from '@react-native-community/async-storage';

interface Product {
  id: string;
  title: string;
  image_url: string;
  price: number;
  quantity: number;
}

interface CartContext {
  products: Product[];
  addToCart(item: Omit<Product, 'quantity'>): void;
  increment(id: string): void;
  decrement(id: string): void;
}

const CartContext = createContext<CartContext | null>(null);

const CartProvider: React.FC = ({ children }) => {
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    async function loadProducts(): Promise<void> {
      const items = await AsyncStorage.getItem('@GoMarketplace:cart');

      if (items) {
        setProducts(JSON.parse(items));
      }
    }

    loadProducts();
  }, []);

  const addToCart = useCallback(
    async product => {
      let itemExists = false;
      const newProducts = products.map(item => {
        if (item.id === product.id) {
          itemExists = true;
          return {
            ...item,
            quantity: item.quantity + 1,
          };
        }

        return item;
      });

      if (itemExists) {
        setProducts([...newProducts]);
        AsyncStorage.setItem(
          '@GoMarketplace:cart',
          JSON.stringify(newProducts),
        );
      } else {
        setProducts([...products, { ...product, quantity: 1 }]);
        AsyncStorage.setItem(
          '@GoMarketplace:cart',
          JSON.stringify([...products, { ...product, quantity: 1 }]),
        );
      }
    },
    [products],
  );

  const increment = useCallback(
    async id => {
      const incrementedProducts = products.map(product => {
        if (product.id === id) {
          return {
            ...product,
            quantity: product.quantity + 1,
          };
        }
        return product;
      });

      setProducts(incrementedProducts);
      AsyncStorage.setItem(
        '@GoMarketplace:cart',
        JSON.stringify(incrementedProducts),
      );
    },
    [products],
  );

  const decrement = useCallback(
    async id => {
      const decrementedProducts = products.map(product => {
        if (product.id === id && product.quantity > 1) {
          return {
            ...product,
            quantity: product.quantity - 1,
          };
        }
        return product;
      });

      setProducts(decrementedProducts);
      AsyncStorage.setItem(
        '@GoMarketplace:cart',
        JSON.stringify(decrementedProducts),
      );
    },
    [products],
  );

  const value = React.useMemo(
    () => ({ addToCart, increment, decrement, products }),
    [products, addToCart, increment, decrement],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

function useCart(): CartContext {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error(`useCart must be used within a CartProvider`);
  }

  return context;
}

export { CartProvider, useCart };
