import React, { useState, useEffect } from 'react';
import {
  X,
  Package,
  Plus,
  Edit2,
  Trash2,
  Check,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
  Cloud,
  RefreshCw,
  Loader2,
  Lock,
} from 'lucide-react';
import { Product } from '../../types';
import {
  getProducts,
  addProduct as addProductLocal,
  updateProduct as updateProductLocal,
  deleteProduct as deleteProductLocal,
  toggleProductActive as toggleProductActiveLocal,
  saveProducts,
  subscribeToStore,
} from '../../services/storage';
import {
  fetchProductsFromSupabase,
  createProductInSupabase,
  updateProductInSupabase,
  toggleProductActiveInSupabase,
  deleteProductFromSupabase,
  setupSupabaseRealtime,
} from '../../services/supabaseData';
import { getSupabasePublishableKey } from '../../services/supabase';

interface ManageProductsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ManageProductsModal: React.FC<ManageProductsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [products, setProducts] = useState<Product[]>(getProducts());
  const [newProductName, setNewProductName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [cloudSynced, setCloudSynced] = useState<boolean>(false);
  const [rlsNotice, setRlsNotice] = useState<string | null>(null);

  // Sync with Supabase on mount/open
  const syncFromCloud = async () => {
    const key = getSupabasePublishableKey();
    if (!key) return;

    setLoading(true);
    try {
      const res = await fetchProductsFromSupabase();
      if (res.success && res.data) {
        setCloudSynced(true);
        setRlsNotice(null);
        if (res.data.length > 0) {
          // Merge / update local products
          saveProducts(res.data);
          setProducts(res.data);
        }
      } else if (res.isRlsError) {
        setRlsNotice('Supabase RLS is active: ensure authenticated role has permission on public.products.');
      }
    } catch {
      // offline or error, continue with local
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setProducts(getProducts());
      syncFromCloud();
    }
  }, [isOpen]);

  // Realtime subscription and local store subscription
  useEffect(() => {
    const unsubLocal = subscribeToStore(() => {
      setProducts(getProducts());
    });

    const unsubCloud = setupSupabaseRealtime(
      () => {},
      () => {
        // remote product changed
        syncFromCloud();
      }
    );

    return () => {
      unsubLocal();
      unsubCloud();
    };
  }, []);

  if (!isOpen) return null;

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    const trimmed = newProductName.trim();
    if (!trimmed) {
      setErrorMessage('Please enter a product name.');
      return;
    }
    // Check if duplicate name already exists
    if (products.some((p) => p.name.toLowerCase() === trimmed.toLowerCase())) {
      setErrorMessage('A product with this name already exists.');
      return;
    }

    const newProdId = `prod-${Date.now()}`;
    // 1. Add locally
    const createdLocal = addProductLocal(trimmed, newProdId);

    // 2. Add to Supabase
    try {
      const sbRes = await createProductInSupabase(createdLocal);
      if (!sbRes.success && sbRes.isRlsError) {
        setRlsNotice('Saved locally, but Supabase RLS blocked insert. Please check RLS policies.');
      } else if (sbRes.success) {
        setCloudSynced(true);
      }
    } catch (err: any) {
      console.warn('Could not write product to Supabase immediately:', err);
    }

    setNewProductName('');
  };

  const handleStartEdit = (product: Product) => {
    setEditingId(product.id);
    setEditingName(product.name);
    setErrorMessage(null);
  };

  const handleSaveEdit = async (id: string) => {
    setErrorMessage(null);
    const trimmed = editingName.trim();
    if (!trimmed) {
      setErrorMessage('Product name cannot be empty.');
      return;
    }
    if (
      products.some(
        (p) => p.id !== id && p.name.toLowerCase() === trimmed.toLowerCase()
      )
    ) {
      setErrorMessage('Another product with this name already exists.');
      return;
    }

    // 1. Update locally
    updateProductLocal(id, trimmed);

    // 2. Update Supabase
    try {
      await updateProductInSupabase(id, trimmed);
    } catch (err: any) {
      console.warn('Could not update product in Supabase:', err);
    }

    setEditingId(null);
    setEditingName('');
  };

  const handleToggleActive = async (product: Product) => {
    const nextState = product.isActive === false ? true : false;
    // 1. Update locally
    toggleProductActiveLocal(product.id, nextState);

    // 2. Update in Supabase
    try {
      await toggleProductActiveInSupabase(product.id, nextState);
    } catch (err: any) {
      console.warn('Could not toggle product in Supabase:', err);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingName('');
  };

  const handleDelete = async (product: Product) => {
    if (
      confirm(
        `Are you sure you want to delete "${product.name}"? Previous invoices will retain this product name.`
      )
    ) {
      // 1. Delete locally
      deleteProductLocal(product.id);

      // 2. Delete in Supabase
      try {
        await deleteProductFromSupabase(product.id);
      } catch (err: any) {
        console.warn('Could not delete product in Supabase:', err);
      }

      if (editingId === product.id) {
        handleCancelEdit();
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl border border-stone-200 overflow-hidden my-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-800 to-amber-900 text-white px-5 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-700/60 flex items-center justify-center border border-amber-500/30">
              <Package className="w-5 h-5 text-amber-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base sm:text-lg">Manage Products</h3>
                {cloudSynced && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 flex items-center gap-1">
                    <Cloud className="w-3 h-3 text-emerald-300" /> Cloud Synced
                  </span>
                )}
              </div>
              <p className="text-[11px] text-amber-200">
                Products available for quick selection when creating bills
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-amber-200 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1 text-sm text-stone-800">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-300 text-rose-800 text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {rlsNotice && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs font-medium flex items-center gap-2">
              <Lock className="w-4 h-4 text-amber-700 shrink-0" />
              <span>{rlsNotice}</span>
            </div>
          )}

          {/* Add Product Form */}
          <form
            onSubmit={handleAdd}
            className="p-3.5 sm:p-4 rounded-2xl bg-amber-50/70 border border-amber-300 space-y-2.5"
          >
            <label className="block text-xs font-bold text-amber-950 uppercase tracking-wider">
              Add New Product
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                placeholder="Enter product name (e.g. Royal Chandan 250g)"
                value={newProductName}
                onChange={(e) => setNewProductName(e.target.value)}
                className="flex-1 px-3.5 py-2.5 rounded-xl border border-stone-300 bg-white font-bold text-stone-900 text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500"
              />
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-amber-700 hover:bg-amber-800 active:scale-98 text-white font-extrabold text-sm shadow-xs transition flex items-center justify-center gap-1.5 shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Add Product</span>
              </button>
            </div>
          </form>

          {/* Product List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-stone-600 uppercase tracking-wider pb-1 border-b border-stone-200">
              <span className="flex items-center gap-1.5">
                <span>Products ({products.length})</span>
                {loading && <Loader2 className="w-3.5 h-3.5 animate-spin text-stone-400" />}
              </span>
              <span className="text-[11px] text-stone-400 font-normal normal-case">
                Toggle Active status or click edit/delete
              </span>
            </div>

            {products.length === 0 ? (
              <div className="text-center py-8 text-stone-400 text-xs">
                No products added yet. Enter a product name above to add one.
              </div>
            ) : (
              <div className="divide-y divide-stone-100 max-h-72 overflow-y-auto pr-1">
                {products.map((product, idx) => {
                  const isActive = product.isActive !== false;
                  return (
                    <div
                      key={product.id}
                      className={`py-2.5 flex items-center justify-between gap-3 text-sm px-2 rounded-xl transition ${
                        isActive ? 'hover:bg-stone-50/80' : 'bg-stone-50/40 opacity-75'
                      }`}
                    >
                      {editingId === product.id ? (
                        <div className="flex-1 flex items-center gap-2">
                          <input
                            type="text"
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            className="flex-1 px-3 py-1.5 rounded-lg border border-amber-500 font-bold text-stone-900 text-sm bg-white"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveEdit(product.id);
                              if (e.key === 'Escape') handleCancelEdit();
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(product.id)}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 shadow-xs"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Save</span>
                          </button>
                          <button
                            type="button"
                            onClick={handleCancelEdit}
                            className="px-2.5 py-1.5 rounded-lg border border-stone-300 text-stone-600 text-xs hover:bg-stone-100"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-2.5 flex-1 min-w-0">
                            <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-900 text-xs font-black flex items-center justify-center shrink-0">
                              {idx + 1}
                            </span>
                            <div className="min-w-0">
                              <div className="font-bold text-stone-900 truncate">
                                {product.name}
                              </div>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span
                                  className={`inline-block px-2 py-0.2 rounded-full text-[10px] font-bold ${
                                    isActive
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : 'bg-stone-200 text-stone-600'
                                  }`}
                                >
                                  {isActive ? 'Active in Billing' : 'Deactivated'}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {/* Activate / Deactivate Toggle Button */}
                            <button
                              type="button"
                              onClick={() => handleToggleActive(product)}
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                                isActive
                                  ? 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                              }`}
                              title={isActive ? 'Deactivate product' : 'Activate product'}
                            >
                              {isActive ? (
                                <>
                                  <ToggleRight className="w-4 h-4 text-emerald-600" />
                                  <span>Active</span>
                                </>
                              ) : (
                                <>
                                  <ToggleLeft className="w-4 h-4 text-stone-400" />
                                  <span>Inactive</span>
                                </>
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleStartEdit(product)}
                              className="p-1.5 rounded-lg text-stone-500 hover:text-amber-800 hover:bg-amber-50 transition"
                              title="Edit product name"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(product)}
                              className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition"
                              title="Delete product"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 bg-stone-50 border-t border-stone-200 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
