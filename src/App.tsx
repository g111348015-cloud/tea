import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, User } from 'firebase/auth';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, getDocs, doc, setDoc, where } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { ShoppingBag, User as UserIcon, LogOut, ClipboardList, Settings, Star, ChevronRight, X, Minus, Plus } from 'lucide-react';
import { auth, db } from './lib/firebase';
import { Category, Product, Order, OrderItem, OrderStatus } from './types';
import { INITIAL_CATEGORIES, INITIAL_PRODUCTS, SUGAR_LEVELS, ICE_LEVELS } from './constants';
import { cn } from './lib/utils';
import { handleFirestoreError, OperationType } from './lib/firestore-utils';

// --- Contexts ---
interface AuthContextType {
  user: User | null;
  isAdmin: boolean;
  loading: boolean;
  login: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface CartItem extends OrderItem {
  id: string; // unique for cart instance
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: OrderItem) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
  total: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within CartProvider');
  return context;
};

// --- Seed Data ---
const seedData = async (uid?: string) => {
  try {
    // 1. First, make sure the user is an admin so they have permission to write
    if (uid) {
      const adminPath = `admins/${uid}`;
      await setDoc(doc(db, 'admins', uid), { role: 'admin' }, { merge: true });
      console.log("Admin privileges granted to:", uid);
    }

    // 2. Then, seed the data if categories are missing
    const catSnap = await getDocs(collection(db, 'categories'));
    if (catSnap.empty) {
      console.log("Seeding initial categories and products...");
      const catMap: Record<string, string> = {};
      for (const cat of INITIAL_CATEGORIES) {
        const docRef = await addDoc(collection(db, 'categories'), cat);
        catMap[cat.name] = docRef.id;
      }
      for (const prod of INITIAL_PRODUCTS) {
        const { categoryName, ...rest } = prod;
        await addDoc(collection(db, 'products'), {
          ...rest,
          categoryId: catMap[categoryName]
        });
      }
      console.log("Seeding complete.");
    }
  } catch (e) {
    console.warn("Seeding or admin setup failed:", e);
  }
};

// --- Components ---

const NavRail = () => {
  const { user, isAdmin, login, logout } = useAuth();
  const location = useLocation();

  return (
    <nav className="w-20 h-[calc(100vh-3rem)] flex flex-col items-center py-8 gap-10 bg-white/40 backdrop-blur-xl border border-white/60 rounded-[32px] shadow-sm sticky top-6">
      <Link to="/" className="w-12 h-12 bg-brand-emerald rounded-2xl flex items-center justify-center shadow-lg shadow-brand-emerald/20 transition-transform hover:scale-105">
        <span className="text-white font-bold text-xl">五</span>
      </Link>
      
      <div className="flex flex-col gap-8">
        <Link 
          to="/" 
          className={cn(
            "p-3 rounded-xl transition-all",
            location.pathname === '/' ? "bg-brand-emerald/10 text-brand-emerald" : "text-brand-stone-400 hover:text-brand-stone-500"
          )}
        >
          <ShoppingBag size={24} />
        </Link>

        <Link 
          to="/orders" 
          className={cn(
            "p-3 rounded-xl transition-all",
            location.pathname === '/orders' ? "bg-brand-emerald/10 text-brand-emerald" : "text-brand-stone-400 hover:text-brand-stone-500"
          )}
        >
          <ClipboardList size={24} />
        </Link>
        
        {isAdmin && (
          <Link 
            to="/admin" 
            className={cn(
              "p-3 rounded-xl transition-all",
              location.pathname === '/admin' ? "bg-brand-emerald/10 text-brand-emerald" : "text-brand-stone-400 hover:text-brand-stone-500"
            )}
          >
            <Settings size={24} />
          </Link>
        )}
      </div>

      <div className="mt-auto flex flex-col items-center gap-4">
        {user ? (
          <>
            <img src={user.photoURL || ''} alt="avatar" className="w-10 h-10 rounded-full border-2 border-white shadow-sm" />
            <button onClick={logout} className="p-2 text-brand-stone-400 hover:text-red-500 transition-colors">
              <LogOut size={20} />
            </button>
          </>
        ) : (
          <button onClick={login} className="p-3 text-brand-stone-400 hover:text-brand-emerald transition-colors">
            <UserIcon size={24} />
          </button>
        )}
      </div>
    </nav>
  );
};

const ProductCard = ({ product, onSelect }: { product: Product; onSelect: (p: Product) => void; key?: any }) => {
  return (
    <div 
      onClick={() => onSelect(product)}
      className="bg-white/80 border border-white p-5 rounded-[2rem] group cursor-pointer hover:shadow-xl hover:shadow-stone-200/50 transition-all flex flex-col h-full"
    >
      <div className="w-full aspect-square bg-emerald-50 rounded-2xl mb-4 flex items-center justify-center group-hover:scale-[1.02] transition-transform">
         <div className="w-12 h-20 bg-brand-emerald/20 rounded-t-full relative">
            <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-brand-emerald/40"></div>
         </div>
         {product.isPopular && (
           <div className="absolute top-2 right-2 bg-white/80 p-1.5 rounded-full shadow-sm">
             <Star size={14} className="fill-brand-emerald text-brand-emerald" />
           </div>
         )}
      </div>
      
      <div className="flex-1">
        <h3 className="font-bold text-brand-stone-800 leading-tight">{product.name}</h3>
        <p className="text-[10px] text-brand-stone-500 font-medium uppercase tracking-wider mt-1">{product.englishName}</p>
      </div>

      <div className="flex justify-between items-center mt-4">
        <div className="flex flex-col">
          <span className="text-[9px] text-brand-stone-400 font-bold uppercase">Price From</span>
          <span className="text-brand-emerald font-bold">$ {product.priceM || product.priceL}</span>
        </div>
        <div className="bg-brand-emerald/10 text-brand-emerald p-2 rounded-xl group-hover:bg-brand-emerald group-hover:text-white transition-colors">
          <Plus size={16} />
        </div>
      </div>
    </div>
  );
};

const OrderModal = ({ product, onClose }: { product: Product | null, onClose: () => void }) => {
  const { addItem } = useCart();
  const [size, setSize] = useState<'M' | 'L'>(product?.priceL ? 'L' : 'M');
  const [sugar, setSugar] = useState(SUGAR_LEVELS[0]);
  const [ice, setIce] = useState(ICE_LEVELS[2]); // 微冰
  const [quantity, setQuantity] = useState(1);

  if (!product) return null;

  const handleAdd = () => {
    const price = size === 'M' ? (product.priceM || 0) : (product.priceL || 0);
    addItem({
      productId: product.id,
      name: product.name,
      size,
      sugar,
      ice,
      price,
      quantity
    });
    onClose();
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
    >
      <motion.div 
        initial={{ translateY: '100%' }}
        animate={{ translateY: 0 }}
        exit={{ translateY: '100%' }}
        className="w-full max-w-lg bg-brand-offwhite rounded-t-3xl sm:rounded-3xl p-6 sm:p-8 flex flex-col gap-6"
      >
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold text-brand-brown">{product.name}</h2>
            <p className="text-brand-brown/60 text-sm">{product.englishName}</p>
          </div>
          <button onClick={onClose} className="p-2 bg-brand-brown/10 rounded-full hover:bg-brand-brown/20">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-6">
          {/* Size */}
          <div>
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-brand-stone-500 mb-3">容量 SIZE</h4>
            <div className="flex gap-3">
              {product.priceM && (
                <button 
                  onClick={() => setSize('M')}
                  className={cn(
                    "flex-1 py-3 rounded-xl text-sm font-bold border-2 transition-all",
                    size === 'M' ? "border-brand-emerald bg-brand-emerald text-white shadow-lg shadow-brand-emerald/20" : "border-brand-stone-800/20 bg-white/50 text-brand-stone-800 hover:border-brand-stone-800/40"
                  )}
                >
                  中杯 M ($ {product.priceM})
                </button>
              )}
              {product.priceL && (
                <button 
                  onClick={() => setSize('L')}
                  className={cn(
                    "flex-1 py-3 rounded-xl text-sm font-bold border-2 transition-all",
                    size === 'L' ? "border-brand-emerald bg-brand-emerald text-white shadow-lg shadow-brand-emerald/20" : "border-brand-stone-800/20 bg-white/50 text-brand-stone-800 hover:border-brand-stone-800/40"
                  )}
                >
                  大杯 L ($ {product.priceL})
                </button>
              )}
            </div>
          </div>

          {/* Ice / Temp */}
          <div>
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-brand-stone-500 mb-3">冰度 ICE</h4>
            <div className="grid grid-cols-3 gap-2">
              {ICE_LEVELS.filter(i => product.isHot || (i !== '溫' && i !== '熱')).map(level => (
                <button 
                  key={level}
                  onClick={() => setIce(level)}
                  className={cn(
                    "py-2.5 rounded-lg text-xs font-bold border-2 transition-all",
                    ice === level ? "bg-brand-stone-800 text-white border-brand-stone-800" : "bg-white/50 border-brand-stone-800/10 text-brand-stone-800/60 hover:border-brand-stone-800/30"
                  )}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>

          {/* Sugar */}
          <div>
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-brand-stone-500 mb-3">甜度 SUGAR</h4>
            <div className="grid grid-cols-3 gap-2">
              {SUGAR_LEVELS.map(level => (
                <button 
                  key={level}
                  onClick={() => setSugar(level)}
                  className={cn(
                    "py-2.5 rounded-lg text-xs font-bold border-2 transition-all",
                    sugar === level ? "bg-brand-stone-800 text-white border-brand-stone-800" : "bg-white/50 border-brand-stone-800/10 text-brand-stone-800/60 hover:border-brand-stone-800/30"
                  )}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>

          {/* Quantity */}
          <div className="flex items-center justify-between border-t border-brand-stone-800/5 pt-6">
            <div className="flex items-center gap-4 bg-brand-stone-800/5 rounded-full p-1">
              <button 
                onClick={() => setQuantity(q => Math.max(1, q - 1))}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-brand-stone-800/10 text-brand-stone-800"
              >
                <Minus size={16} />
              </button>
              <span className="font-bold text-brand-stone-800 w-6 text-center">{quantity}</span>
              <button 
                onClick={() => setQuantity(q => q + 1)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-brand-stone-800/10 text-brand-stone-800"
              >
                <Plus size={16} />
              </button>
            </div>
            <button 
              onClick={handleAdd}
              className="flex-1 ml-6 bg-brand-emerald text-white py-4 rounded-2xl font-bold hover:shadow-lg hover:shadow-brand-emerald/20 transition-all"
            >
              加入購物車 $ {(size === 'M' ? (product.priceM || 0) : (product.priceL || 0)) * quantity}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

const CartSidebar = () => {
  const { items, total, removeItem, clearCart } = useCart();
  const { user, login } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!user) {
      login();
      return;
    }
    setIsSubmitting(true);
    const path = 'orders';
    try {
      await addDoc(collection(db, path), {
        items,
        total,
        status: 'pending',
        customerName: user.displayName || 'Anonymous',
        uid: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      clearCart();
      alert('茶飲製作中！');
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, path);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <aside className="w-[320px] h-[calc(100vh-3rem)] flex flex-col gap-6 sticky top-6">
      <div className="flex-1 bg-brand-stone-800 rounded-[40px] p-8 flex flex-col shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-brand-emerald/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
        
        <div className="flex justify-between items-center mb-8 relative">
          <h2 className="text-white text-xl font-bold">Current Order</h2>
          <span className="text-brand-stone-400 text-xs font-mono">#{items.length.toString().padStart(4, '0')}</span>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 space-y-6 scrollbar-hide relative">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center gap-4 opacity-30">
              <ShoppingBag size={48} className="text-white" />
              <p className="text-white text-sm font-medium">Your cart is empty</p>
            </div>
          ) : (
            items.map(item => (
              <div key={item.id} className="flex justify-between items-start group">
                <div className="flex-1">
                  <p className="text-white font-medium text-sm leading-tight">{item.name}</p>
                  <p className="text-brand-stone-400 text-[10px] mt-1">{item.size}, {item.sugar}, {item.ice} x {item.quantity}</p>
                </div>
                <div className="text-right flex flex-col items-end gap-1">
                  <p className="text-white font-bold text-sm">$ {item.price * item.quantity}</p>
                  <button onClick={() => removeItem(item.id)} className="text-brand-stone-500 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 p-1">
                    <X size={12} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="border-t border-brand-stone-700 pt-6 mt-6 relative">
          <div className="flex justify-between items-center mb-6">
            <span className="text-brand-stone-400 text-sm">Subtotal</span>
            <span className="text-white text-sm">$ {total}</span>
          </div>
          <div className="flex justify-between items-center mb-8">
            <span className="text-white font-bold text-lg">Total</span>
            <span className="text-brand-emerald font-bold text-2xl font-mono">$ {total}</span>
          </div>
          <button 
            disabled={items.length === 0 || isSubmitting}
            onClick={handleSubmit}
            className="w-full bg-brand-emerald hover:bg-brand-emerald/90 text-white py-4 rounded-2xl font-bold transition-all shadow-lg shadow-brand-emerald/10 disabled:opacity-50 disabled:grayscale"
          >
            {isSubmitting ? 'PROCESSING...' : user ? 'PLACE ORDER' : 'LOGIN TO ORDER'}
          </button>
        </div>
      </div>

      <div className="h-32 bg-white/40 backdrop-blur-xl border border-white/60 rounded-[32px] p-5 flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
          <div className="w-2 h-2 bg-brand-emerald rounded-full animate-pulse"></div>
        </div>
        <div>
          <p className="text-[10px] font-bold text-brand-stone-500 uppercase tracking-widest">System Cloud</p>
          <p className="text-sm text-brand-stone-800 font-semibold">Database Synced</p>
          <p className="text-[10px] text-brand-stone-400">Connection Active</p>
        </div>
      </div>
    </aside>
  );
};

// --- Pages ---

const MenuPage = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  useEffect(() => {
    const pathCat = 'categories';
    const unsubCat = onSnapshot(query(collection(db, pathCat), orderBy('order')), (snap) => {
      const cats = snap.docs.map(d => ({ id: d.id, ...d.data() } as Category));
      setCategories(cats);
      if (cats.length > 0 && !activeCategory) setActiveCategory(cats[0].id);
    }, (e) => handleFirestoreError(e, OperationType.GET, pathCat));

    const pathProd = 'products';
    const unsubProd = onSnapshot(collection(db, pathProd), (snap) => {
      setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() } as Product)));
    }, (e) => handleFirestoreError(e, OperationType.GET, pathProd));
    return () => { unsubCat(); unsubProd(); };
  }, []);

  const filteredProducts = products.filter(p => p.categoryId === activeCategory);

  return (
    <div className="flex flex-col gap-6 h-full">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-bold text-brand-stone-800 tracking-tight">WooTea Artisan</h1>
          <p className="text-brand-stone-500 font-medium uppercase tracking-[0.2em] text-[10px] mt-1">Premium Tea Brewing Experience</p>
        </div>
        <div className="flex gap-3">
          <div className="bg-brand-emerald text-white px-4 py-2 rounded-full text-[10px] font-bold shadow-md shadow-brand-emerald/10">STORE OPEN</div>
        </div>
      </header>

      <section className="flex-1 bg-white/40 backdrop-blur-xl border border-white/60 rounded-[40px] p-8 flex flex-col gap-8 shadow-sm">
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={cn(
                "px-6 py-2.5 rounded-full text-xs font-bold whitespace-nowrap transition-all",
                activeCategory === cat.id 
                  ? "bg-brand-emerald text-white shadow-lg shadow-brand-emerald/20" 
                  : "bg-white/80 text-brand-stone-500 hover:bg-white"
              )}
            >
              {cat.name}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto pr-2 scrollbar-hide">
          {filteredProducts.map(p => (
            <ProductCard key={p.id} product={p} onSelect={setSelectedProduct} />
          ))}
        </div>
      </section>

      <AnimatePresence>
        {selectedProduct && <OrderModal product={selectedProduct} onClose={() => setSelectedProduct(null)} />}
      </AnimatePresence>
    </div>
  );
};

const OrdersPage = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    if (!user) return;
    const path = 'orders';
    const unsub = onSnapshot(
      query(collection(db, path), where('uid', '==', user.uid), orderBy('createdAt', 'desc')),
      (snap) => {
        setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() } as Order)));
      },
      (e) => handleFirestoreError(e, OperationType.GET, path)
    );
    return unsub;
  }, [user]);

  if (!user) return (
    <div className="h-full flex flex-col items-center justify-center gap-4 text-brand-stone-400">
      <UserIcon size={48} className="opacity-20" />
      <p className="font-medium">Please login to view your orders</p>
    </div>
  );

  return (
    <div className="flex flex-col gap-6 h-full">
      <header>
        <h1 className="text-4xl font-bold text-brand-stone-800 tracking-tight">Order History</h1>
        <p className="text-brand-stone-500 font-medium uppercase tracking-[0.2em] text-[10px] mt-1">Review your past tea journeys</p>
      </header>
      
      <section className="flex-1 bg-white/40 backdrop-blur-xl border border-white/60 rounded-[40px] p-8 flex flex-col gap-6 overflow-y-auto scrollbar-hide shadow-sm">
        {orders.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center gap-4 text-brand-stone-400 opacity-30">
            <ClipboardList size={64} />
            <p>No orders yet</p>
          </div>
        ) : (
          orders.map(order => (
            <div key={order.id} className="bg-white/60 border border-white p-6 rounded-3xl flex flex-col gap-4">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-bold text-brand-stone-400 uppercase tracking-widest block mb-1">ORDER ID: {order.id.slice(0, 8)}</span>
                  <p className="text-sm font-semibold">{order.createdAt?.toDate?.()?.toLocaleString() || 'Just now'}</p>
                </div>
                <div className={cn(
                  "px-4 py-1.5 rounded-full text-[10px] font-bold uppercase shadow-sm",
                  order.status === 'pending' ? "bg-yellow-100 text-yellow-700" :
                  order.status === 'preparing' ? "bg-blue-100 text-blue-700" :
                  order.status === 'completed' ? "bg-green-100 text-green-700" :
                  "bg-gray-100 text-gray-700"
                )}>
                  {order.status}
                </div>
              </div>
              <div className="space-y-2">
                {order.items?.map((item, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-brand-stone-600 font-medium">{item.name} <span className="text-[10px] font-normal opacity-60">({item.size})</span> x {item.quantity}</span>
                    <span className="font-mono font-bold">$ {item.price * item.quantity}</span>
                  </div>
                ))}
              </div>
              <div className="mt-2 pt-4 border-t border-brand-stone-800/5 flex justify-between items-center">
                <span className="text-[10px] font-bold text-brand-stone-400 uppercase">Total Amount</span>
                <span className="text-xl font-bold font-mono text-brand-emerald">$ {order.total}</span>
              </div>
            </div>
          ))
        )}
      </section>
    </div>
  );
};

const AdminDashboard = () => {
  const { isAdmin } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    if (!isAdmin) return;
    const path = 'orders';
    const unsub = onSnapshot(
      query(collection(db, path), orderBy('createdAt', 'desc')),
      (snap) => {
        setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() } as Order)));
      },
      (e) => handleFirestoreError(e, OperationType.GET, path)
    );
    return unsub;
  }, [isAdmin]);

  const updateStatus = async (orderId: string, status: OrderStatus) => {
    const path = `orders/${orderId}`;
    try {
      await setDoc(doc(db, 'orders', orderId), { status, updatedAt: serverTimestamp() }, { merge: true });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, path);
    }
  };

  if (!isAdmin) return (
    <div className="h-full flex flex-col items-center justify-center gap-4 text-red-500">
      <X size={48} />
      <p className="font-bold">ACCESS DENIED</p>
    </div>
  );

  return (
    <div className="flex flex-col gap-6 h-full">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-bold text-brand-stone-800 tracking-tight">Admin Console</h1>
          <p className="text-brand-stone-500 font-medium uppercase tracking-[0.2em] text-[10px] mt-1">Operational Fleet Management</p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-bold font-mono text-brand-emerald">{orders.filter(o => o.status !== 'completed' && o.status !== 'cancelled').length}</p>
          <p className="text-[10px] font-bold opacity-40 uppercase tracking-widest">Active Orders</p>
        </div>
      </header>

      <section className="flex-1 bg-white/40 backdrop-blur-xl border border-white/60 rounded-[40px] p-8 overflow-hidden flex flex-col shadow-sm">
        <div className="overflow-y-auto pr-2 scrollbar-hide flex-1">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-brand-stone-800/5 text-[10px] font-bold opacity-40 uppercase tracking-widest">
                <th className="pb-4">Customer</th>
                <th className="pb-4">Details</th>
                <th className="pb-4">Status</th>
                <th className="pb-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-stone-800/5">
              {orders.map(order => (
                <tr key={order.id} className="group hover:bg-white/20 transition-colors">
                  <td className="py-6 align-top">
                    <p className="font-bold text-brand-stone-800">{order.customerName}</p>
                    <p className="text-[9px] opacity-40 font-mono tracking-tighter">{order.id}</p>
                    <p className="text-[10px] opacity-60 mt-1">{order.createdAt?.toDate?.()?.toLocaleTimeString()}</p>
                  </td>
                  <td className="py-6 align-top">
                    <div className="space-y-1">
                      {order.items.map((item, i) => (
                        <p key={i} className="text-xs text-brand-stone-600">
                          <span className="font-bold">{item.name}</span> <span className="opacity-40 italic">{item.size}/{item.sugar}/{item.ice}</span> x {item.quantity}
                        </p>
                      ))}
                      <p className="text-xs font-bold font-mono text-brand-emerald mt-2">$ {order.total}</p>
                    </div>
                  </td>
                  <td className="py-6 align-top">
                    <span className={cn(
                      "px-3 py-1 rounded-full text-[9px] font-bold uppercase shadow-sm",
                      order.status === 'pending' ? "bg-yellow-100 text-yellow-700" :
                      order.status === 'preparing' ? "bg-blue-100 text-blue-700" :
                      order.status === 'completed' ? "bg-green-100 text-green-700" :
                      "bg-gray-100 text-gray-700"
                    )}>
                      {order.status}
                    </span>
                  </td>
                  <td className="py-6 align-top">
                    <div className="flex flex-wrap gap-1 justify-end">
                      {(['pending', 'preparing', 'completed', 'cancelled'] as OrderStatus[]).map(s => (
                        <button 
                          key={s}
                          onClick={() => updateStatus(order.id, s)}
                          className={cn(
                            "px-2 py-1 rounded-lg text-[8px] uppercase font-bold transition-all border",
                            order.status === s 
                              ? "bg-brand-stone-800 text-white border-brand-stone-800" 
                              : "bg-white/50 border-white/80 text-brand-stone-400 hover:bg-white hover:text-brand-stone-800"
                          )}
                        >
                          {s.slice(0, 4)}
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        await seedData(u.uid);
        const adminSnap = await getDocs(query(collection(db, 'admins'), where('__name__', '==', u.uid)));
        setIsAdmin(!adminSnap.empty);
      } else {
        setIsAdmin(false);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const login = async () => {
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (error: any) {
      if (error.code !== 'auth/popup-closed-by-user') {
        console.error("Login failed:", error);
      }
    }
  };
  const logout = () => signOut(auth);

  const addItem = (item: OrderItem) => {
    setCartItems(prev => [...prev, { ...item, id: Math.random().toString(36).slice(2) }]);
  };
  const removeItem = (id: string) => setCartItems(prev => prev.filter(i => i.id !== id));
  const clearCart = () => setCartItems([]);
  const cartTotal = cartItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);

  return (
    <Router>
      <AuthContext.Provider value={{ user, isAdmin, loading, login, logout }}>
        <CartContext.Provider value={{ items: cartItems, addItem, removeItem, clearCart, total: cartTotal }}>
          <div className="h-screen w-full flex overflow-hidden p-6 gap-6 font-sans">
            <NavRail />
            <main className="flex-1 flex flex-col overflow-hidden">
              <AnimatePresence mode="wait">
                <Routes>
                  <Route path="/" element={<MenuPage />} />
                  <Route path="/orders" element={<OrdersPage />} />
                  <Route path="/admin" element={<AdminDashboard />} />
                </Routes>
              </AnimatePresence>
            </main>
            <CartSidebar />
          </div>
        </CartContext.Provider>
      </AuthContext.Provider>
    </Router>
  );
}
