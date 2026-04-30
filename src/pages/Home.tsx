import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Product } from '../types';
import { useCart } from '../context/CartContext';
import { formatPrice, cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Leaf, Star } from 'lucide-react';

export function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const { addToCart } = useCart();
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  useEffect(() => {
    const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Product[];
      setProducts(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const categories = ['All', ...new Set(products.map(p => p.category))];
  const filteredProducts = selectedCategory === 'All' 
    ? products 
    : products.filter(p => p.category === selectedCategory);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand"></div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-64px-60px)] overflow-hidden">
      {/* Sidebar */}
      <aside className="w-56 p-6 border-r border-border flex flex-col gap-4 shrink-0 bg-white/50">
        <p className="text-[11px] font-bold text-text-muted uppercase tracking-[0.2em] mb-1">產品分類</p>
        <div className="space-y-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={cn(
                "w-full text-left px-4 py-3 rounded-xl font-medium transition-all duration-300",
                selectedCategory === cat 
                  ? "bg-brand text-white shadow-md shadow-brand/20" 
                  : "bg-white text-[#4B5563] border border-border hover:bg-border-light"
              )}
            >
              {cat === 'All' ? '全部商品' : cat}
            </button>
          ))}
        </div>
        
        <div className="mt-auto p-4 bg-white border border-border rounded-2xl">
          <p className="text-xs text-text-muted mb-1 uppercase tracking-wider font-bold">POS Ready</p>
          <p className="text-xl font-bold text-brand">{products.length} Items</p>
        </div>
      </aside>

      {/* Main Content (Bento Grid) */}
      <main className="flex-1 overflow-y-auto p-6 scrollbar-hide">
        {filteredProducts.length === 0 ? (
          <div className="text-center py-20 opacity-40">
            <Leaf size={48} className="mx-auto mb-4" />
            <p className="italic text-xl">The tea garden is resting...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-fr">
            <AnimatePresence mode="popLayout">
              {filteredProducts.map((product, idx) => {
                const isFeatured = idx === 0 && selectedCategory === 'All';
                return (
                  <motion.div
                    key={product.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.4, delay: idx * 0.05 }}
                    className={cn(
                      "card-bento flex flex-col justify-between group h-full",
                      isFeatured ? "md:col-span-2 md:row-span-2 bg-brand-light border-2 border-brand-border" : "bg-white"
                    )}
                  >
                    <div>
                      {isFeatured && (
                        <span className="px-3 py-1 bg-white text-brand text-[10px] font-bold uppercase rounded-full border border-brand-border inline-block mb-4">
                          本月主打
                        </span>
                      )}
                      <h3 className={cn(
                        "font-bold mb-1 group-hover:text-brand transition-colors",
                        isFeatured ? "text-3xl" : "text-lg"
                      )}>
                        {product.name}
                      </h3>
                      <p className={cn(
                        "text-text-muted",
                        isFeatured ? "text-sm max-w-xs mt-2" : "text-xs"
                      )}>
                        {product.description || '精心製作的特色茶飲'}
                      </p>
                    </div>

                    <div className="flex justify-between items-end mt-6">
                      <div className="flex items-baseline gap-1">
                        <p className={cn("font-bold", isFeatured ? "text-4xl" : "text-lg")}>
                          {formatPrice(product.price)}
                        </p>
                        <span className="text-xs text-text-muted font-normal">/ L</span>
                      </div>
                      <button 
                        onClick={() => addToCart(product)}
                        className={cn(
                          "bg-brand text-white rounded-full flex items-center justify-center shadow-lg transition-all duration-300 hover:scale-110 active:scale-95",
                          isFeatured ? "w-14 h-14 text-2xl" : "w-10 h-10"
                        )}
                      >
                        <Plus size={isFeatured ? 24 : 18} />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </main>
    </div>
  );
}
