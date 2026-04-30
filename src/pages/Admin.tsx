import { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  addDoc, 
  updateDoc, 
  doc, 
  serverTimestamp,
  getDocs,
  writeBatch
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Order, Product, OrderStatus } from '../types';
import { formatPrice } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutDashboard, 
  Plus, 
  ShoppingBag, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  RefreshCcw,
  PlusCircle
} from 'lucide-react';

export function Admin() {
  const location = useLocation();
  const isAdminRoot = location.pathname === '/admin' || location.pathname === '/admin/';

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      <div className="flex gap-8 items-center mb-12">
        <h1 className="text-4xl font-bold tracking-tight">Tea Studio</h1>
        <div className="flex gap-4">
          <Link 
            to="/admin" 
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${isAdminRoot ? 'bg-brand text-white shadow-md shadow-brand/10' : 'bg-white text-text-muted border border-border hover:bg-border-light'}`}
          >
            Orders
          </Link>
          <Link 
            to="/admin/products" 
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${location.pathname === '/admin/products' ? 'bg-brand text-white shadow-md shadow-brand/10' : 'bg-white text-text-muted border border-border hover:bg-border-light'}`}
          >
            Inventory
          </Link>
          <SeedButton />
        </div>
      </div>

      <Routes>
        <Route index element={<OrdersView />} />
        <Route path="products" element={<ProductsView />} />
      </Routes>
    </div>
  );
}

function OrdersView() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Order[]);
      setLoading(false);
    }, (error) => {
      console.error(error);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const updateStatus = async (orderId: string, status: OrderStatus) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), { status });
    } catch (error) {
      alert('Error updating order');
    }
  };

  const getStatusIcon = (status: OrderStatus) => {
    switch (status) {
      case 'pending': return <Clock className="text-amber-500" size={18} />;
      case 'preparing': return <RefreshCcw className="text-blue-500 animate-spin-slow" size={18} />;
      case 'completed': return <CheckCircle2 className="text-emerald-500" size={18} />;
      case 'cancelled': return <XCircle className="text-red-500" size={18} />;
    }
  };

  return (
    <div className="space-y-6">
      {loading ? (
        <div className="h-40 flex items-center justify-center">Loading...</div>
      ) : orders.length === 0 ? (
        <div className="card-bento p-20 text-center text-text-muted italic">
          No orders found.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {orders.map((order) => (
              <motion.div
                key={order.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="card-bento"
              >
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <p className="text-[10px] uppercase tracking-widest font-bold text-text-muted mb-1">Order ID / {order.id.slice(-6)}</p>
                    <h3 className="text-xl font-bold">{order.customerName}</h3>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1 bg-surface rounded-full border border-border">
                    {getStatusIcon(order.status)}
                    <span className="text-[10px] font-bold uppercase tracking-wider">{order.status}</span>
                  </div>
                </div>

                <div className="space-y-3 mb-6 max-h-40 overflow-y-auto pr-2 scrollbar-thin">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span className="text-[#1a1a1a]/60">{item.quantity}x {item.name}</span>
                      <span className="font-medium">{formatPrice(item.price * item.quantity)}</span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-border pt-4 mb-6 flex justify-between items-center">
                  <span className="text-sm font-bold uppercase tracking-widest text-[#1a1a1a]/30">Total</span>
                  <span className="text-xl font-bold text-brand">{formatPrice(order.total)}</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={() => updateStatus(order.id, 'preparing')}
                    className="p-2 text-[10px] font-bold uppercase tracking-widest bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    Preparing
                  </button>
                  <button 
                    onClick={() => updateStatus(order.id, 'completed')}
                    className="p-2 text-[10px] font-bold uppercase tracking-widest bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors"
                  >
                    Complete
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

function ProductsView() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: '',
    price: 0,
    category: 'Green Tea',
    description: '',
    imageUrl: '',
    available: true
  });

  useEffect(() => {
    const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Product[]);
    });
    return () => unsubscribe();
  }, []);

  const handleAddProduct = async () => {
    if (!newProduct.name || newProduct.price <= 0) return;
    try {
      await addDoc(collection(db, 'products'), {
        ...newProduct,
        createdAt: Date.now()
      });
      setIsAdding(false);
      setNewProduct({
        name: '',
        price: 0,
        category: 'Green Tea',
        description: '',
        imageUrl: '',
        available: true
      });
    } catch (e) {
      alert('Error adding product');
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold tracking-tight">Menu Items</h2>
        <div className="flex gap-2">
          <button 
            onClick={async () => {
              const groups: { [key: string]: string[] } = {};
              products.forEach(p => {
                if (!groups[p.name]) groups[p.name] = [];
                groups[p.name].push(p.id);
              });
              
              const toDelete: string[] = [];
              Object.values(groups).forEach(ids => {
                if (ids.length > 1) {
                  // Keep the first one, delete the rest
                  toDelete.push(...ids.slice(1));
                }
              });

              if (toDelete.length === 0) {
                alert('No duplicates found.');
                return;
              }

              if (confirm(`Found ${toDelete.length} duplicates. Clean them up?`)) {
                const batch = writeBatch(db);
                toDelete.forEach(id => batch.delete(doc(db, 'products', id)));
                await batch.commit();
                alert('Duplicates cleaned!');
              }
            }}
            className="flex items-center gap-2 px-4 py-2 border border-red-200 text-red-600 rounded-xl hover:bg-red-50 transition-colors text-sm font-bold"
          >
            <XCircle size={16} /> 清理重複品項
          </button>
          <button 
            onClick={() => setIsAdding(!isAdding)}
            className="flex items-center gap-2 btn-primary"
          >
            <PlusCircle size={18} /> Add Product
          </button>
        </div>
      </div>

      {isAdding && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card-bento bg-brand-light border-brand-border"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <input 
                type="text" 
                placeholder="Name" 
                className="w-full p-3 rounded-xl bg-white border border-border text-sm outline-none focus:ring-2 focus:ring-brand"
                value={newProduct.name}
                onChange={e => setNewProduct({...newProduct, name: e.target.value})}
              />
              <input 
                type="number" 
                placeholder="Price" 
                className="w-full p-3 rounded-xl bg-white border border-border text-sm outline-none focus:ring-2 focus:ring-brand"
                value={newProduct.price || ''}
                onChange={e => setNewProduct({...newProduct, price: Number(e.target.value)})}
              />
              <select 
                className="w-full p-3 rounded-xl bg-white border border-border text-sm outline-none focus:ring-2 focus:ring-brand"
                value={newProduct.category}
                onChange={e => setNewProduct({...newProduct, category: e.target.value})}
              >
                <option>Green Tea</option>
                <option>Black Tea</option>
                <option>Oolong</option>
                <option>Milk Tea</option>
                <option>Herbal</option>
              </select>
            </div>
            <div className="space-y-4">
              <textarea 
                placeholder="Description" 
                className="w-full p-3 rounded-xl bg-white border border-border text-sm h-32 outline-none focus:ring-2 focus:ring-brand"
                value={newProduct.description}
                onChange={e => setNewProduct({...newProduct, description: e.target.value})}
              ></textarea>
              <button 
                onClick={handleAddProduct}
                className="w-full btn-primary h-12"
              >
                Save Item
              </button>
            </div>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {products.map(p => (
          <div key={p.id} className="card-bento p-4 flex gap-4 items-center">
            <img src={p.imageUrl || 'https://images.unsplash.com/photo-1597481499750-3e6b22637e12?auto=format&fit=crop&q=80&w=200'} className="w-16 h-16 rounded-lg object-cover" />
            <div>
              <h4 className="font-bold">{p.name}</h4>
              <p className="text-xs text-text-muted">{formatPrice(p.price)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SeedButton() {
  const seed = async () => {
    const products = [
      { 
        name: '三窨十五茉', 
        category: '研選純茶', 
        price: 45, 
        description: 'Fifteen Jasmine Flowers Tea | 三窨工法，每杯彷彿都喝得到十五朵茉莉花香。', 
        imageUrl: 'https://images.unsplash.com/photo-1594631252845-29fc4586d56c?auto=format&fit=crop&q=80&w=800' 
      },
      { 
        name: '桂花輕烏龍', 
        category: '研選純茶', 
        price: 45, 
        description: 'Osmanthus Light Oolong tea | 以桂花入輕烏龍茶，香氣滿溢迷人，餘韻悠長柔和。', 
        imageUrl: 'https://images.unsplash.com/photo-1563911302283-d2bc129e7570?auto=format&fit=crop&q=80&w=800' 
      },
      { 
        name: '茶花紅烏龍', 
        category: '研選純茶', 
        price: 45, 
        description: 'Camellia Red Oolong Tea | 以山茶花為主調，使紅烏龍茶味升級，茶感清香怡人，尾韻帶有淡甜香。', 
        imageUrl: 'https://images.unsplash.com/photo-1544787210-2211d24731b7?auto=format&fit=crop&q=80&w=800' 
      },
      { 
        name: '朱槿普洱紅', 
        category: '研選純茶', 
        price: 40, 
        description: "Hibiscus Pu'er tea | 普洱具扶桑花香，帶有紅茶的熟果味，宛如漫步在熱帶雨林，奔放清新。", 
        imageUrl: 'https://images.unsplash.com/photo-1597481499750-3e6b22637e12?auto=format&fit=crop&q=80&w=800' 
      },
      { 
        name: '米香玉露菁', 
        category: '研選純茶', 
        price: 40, 
        description: 'Rice Aroma Green Tea | 以米香搭配綠茶融合出豐富層次，茶感輕盈回甘，猶如置身田野間。', 
        imageUrl: 'https://images.unsplash.com/photo-1582793988951-9aed55099993?auto=format&fit=crop&q=80&w=800' 
      },
    ];

    const batch = writeBatch(db);
    const existing = await getDocs(collection(db, 'products'));
    
    if (existing.size > 0) {
      if (!confirm('Inventory already has items. Do you want to add these new items from the menu update?')) return;
    }

    products.forEach(p => {
      const docRef = doc(collection(db, 'products'));
      batch.set(docRef, { ...p, available: true, createdAt: Date.now() });
    });

    await batch.commit();
    alert('Tea garden seeded with new menu items!');
  };

  return (
    <button 
      onClick={seed}
      className="p-2 border border-black/10 rounded-full hover:bg-black/5 transition-colors"
      title="Seed Inventory"
    >
      <LayoutDashboard size={18} />
    </button>
  );
}
