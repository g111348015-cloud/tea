import { useCart } from '../context/CartContext';
import { formatPrice, cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { Trash2, ArrowLeft, CreditCard, ShoppingBag } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useState } from 'react';

export function Cart() {
  const { cart, removeFromCart, total, clearCart } = useCart();
  const [customerName, setCustomerName] = useState('');
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const navigate = useNavigate();

  const handleCheckout = async () => {
    if (!customerName.trim()) {
      alert('Please enter your name');
      return;
    }

    setIsCheckingOut(true);
    try {
      await addDoc(collection(db, 'orders'), {
        customerName,
        items: cart,
        total,
        status: 'pending',
        createdAt: serverTimestamp(),
      });
      clearCart();
      alert('Order placed successfully!');
      navigate('/');
    } catch (error) {
      console.error('Error placing order:', error);
      alert('Failed to place order.');
    } finally {
      setIsCheckingOut(false);
    }
  };

  if (cart.length === 0) {
    return (
      <div className="max-w-xl mx-auto px-6 py-32 text-center">
        <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-8 shadow-sm border border-border text-text-muted">
          <ShoppingBag size={32} />
        </div>
        <h2 className="text-4xl font-bold mb-4 tracking-tight">您的購物袋是空的</h2>
        <p className="text-text-muted mb-8">看來您還沒找到完美的茶飲。</p>
        <Link to="/" className="btn-primary inline-flex items-center gap-2">
          <ArrowLeft size={18} /> 返回菜單
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Cart Items */}
        <div className="flex-1">
          <div className="flex items-center gap-4 mb-12">
            <h1 className="text-4xl font-bold tracking-tight">當前訂單</h1>
            <span className="text-xs text-text-muted uppercase tracking-widest font-bold bg-white px-2 py-1 rounded border border-border">
              # {Math.floor(Math.random() * 999).toString().padStart(3, '0')}
            </span>
          </div>
          
          <div className="space-y-4">
            <AnimatePresence>
              {cart.map((item) => (
                <motion.div
                  key={item.productId}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-white border border-border rounded-2xl p-6 flex gap-6 items-center group relative overflow-hidden transition-all hover:shadow-md"
                >
                  <div className="w-16 h-16 rounded-xl overflow-hidden bg-brand-light flex-shrink-0 border border-brand-border">
                    <img 
                      src={item.image || 'https://images.unsplash.com/photo-1597481499750-3e6b22637e12?auto=format&fit=crop&q=80&w=200'} 
                      alt={item.name} 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-1">
                      <h3 className="font-bold text-lg">{item.name} (L)</h3>
                      <p className="font-bold text-brand">{formatPrice(item.price * item.quantity)}</p>
                    </div>
                    <div className="flex justify-between items-center text-xs text-text-muted font-medium">
                      <p>標準口味 / 定製款</p>
                      <p className="bg-border-light px-2 py-0.5 rounded text-text-main">數量 {item.quantity}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => removeFromCart(item.productId)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-text-muted hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all bg-surface rounded-full shadow-sm"
                  >
                    <Trash2 size={16} />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* Summary & Checkout */}
        <div className="w-full lg:w-80">
          <div className="bg-white border border-border rounded-[2rem] shadow-xl flex flex-col overflow-hidden sticky top-24">
            <div className="p-6 border-b border-border-light bg-surface/30">
              <h2 className="text-lg font-bold">結帳資訊</h2>
              <p className="text-xs text-text-muted">外帶 | {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
            </div>
            
            <div className="p-6 bg-surface space-y-4">
              <div className="space-y-4 mb-6">
                <div className="flex justify-between text-sm text-[#6B7280]">
                  <span>小計</span>
                  <span>{formatPrice(total)}</span>
                </div>
                <div className="flex justify-between text-sm text-[#6B7280]">
                  <span>服務費 (0%)</span>
                  <span>$0</span>
                </div>
                <div className="flex justify-between items-end pt-4 border-t border-border">
                  <span className="text-sm font-medium">總計</span>
                  <span className="text-2xl font-bold text-brand">{formatPrice(total)}</span>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-[10px] uppercase tracking-widest font-bold text-text-muted mb-2 block">
                    訂單姓名
                  </label>
                  <input 
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="輸入姓名..."
                    className="w-full px-4 py-3 rounded-xl bg-white border border-border focus:ring-2 focus:ring-brand focus:border-transparent text-sm outline-none transition-all shadow-sm"
                  />
                </div>
                <button 
                  onClick={handleCheckout}
                  disabled={isCheckingOut}
                  className="w-full py-4 bg-brand text-white rounded-2xl font-bold shadow-lg shadow-brand/20 flex items-center justify-center gap-2 disabled:opacity-50 hover:opacity-90 active:scale-[0.98] transition-all"
                >
                  {isCheckingOut ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white"></div>
                  ) : (
                    <>確認結帳</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
