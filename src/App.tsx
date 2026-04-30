/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { ShoppingBag, Coffee, LayoutDashboard } from 'lucide-react';
import { Home } from './pages/Home';
import { Cart } from './pages/Cart';
import { Admin } from './pages/Admin';
import { CartProvider, useCart } from './context/CartContext';
import { motion } from 'motion/react';
import { cn } from './lib/utils';

function Navbar() {
  const { cart } = useCart();
  const itemCount = cart.reduce((acc, item) => acc + item.quantity, 0);
  const location = useLocation();

  return (
    <nav className="h-16 bg-white border-b border-border flex items-center justify-between px-8 shadow-sm fixed top-0 left-0 right-0 z-50">
      <Link to="/" className="flex items-center gap-3">
        <div className="w-8 h-8 bg-brand rounded-lg flex items-center justify-center text-white font-bold text-sm">茶</div>
        <h1 className="text-xl font-semibold tracking-tight text-text-main">
          Leaf & Steam <span className="text-text-muted font-normal">POS</span>
        </h1>
      </Link>

      <div className="flex items-center gap-6">
        <div className="flex bg-border-light p-1 rounded-md">
          <Link 
            to="/" 
            className={cn(
              "px-4 py-1.5 text-sm font-medium transition-all",
              location.pathname === '/' ? "bg-white rounded shadow-sm text-text-main" : "text-text-muted"
            )}
          >
            前台點單
          </Link>
          <Link 
            to="/admin" 
            className={cn(
              "px-4 py-1.5 text-sm font-medium transition-all",
              location.pathname.startsWith('/admin') ? "bg-white rounded shadow-sm text-text-main" : "text-text-muted"
            )}
          >
            後台管理
          </Link>
        </div>
        
        <Link to="/cart" className="relative p-2 hover:bg-surface rounded-full transition-colors group">
          <ShoppingBag size={20} className="text-text-main group-hover:text-brand" />
          {itemCount > 0 && (
            <span className="absolute top-0 right-0 bg-brand text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full font-bold">
              {itemCount}
            </span>
          )}
        </Link>
      </div>
    </nav>
  );
}

export default function App() {
  return (
    <CartProvider>
      <Router>
        <div className="min-h-screen pt-16 flex flex-col">
          <Navbar />
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/cart" element={<Cart />} />
              <Route path="/admin/*" element={<Admin />} />
            </Routes>
          </main>
          
          <footer className="py-6 px-8 border-t border-border flex justify-between items-center bg-white">
            <p className="text-xs text-text-muted uppercase tracking-widest font-bold">
              ZenTea Premium POS System
            </p>
            <div className="text-right">
              <p className="text-[10px] text-text-muted uppercase tracking-wider font-bold">{new Date().toLocaleDateString()}</p>
              <p className="text-xs font-mono text-text-main">{new Date().toLocaleTimeString()}</p>
            </div>
          </footer>
        </div>
      </Router>
    </CartProvider>
  );
}
