import React, { useEffect, useState } from "react";
import api from "../lib/api";

interface Category {
  id: string;
  name: string;
}

interface Variant {
  id?: string;
  name: string;
  sku: string;
  price: number | null;
  stockQuantity: number;
  _delete?: boolean;
}

interface Product {
  id: string;
  name: string;
  description: string | null;
  basePrice: string;
  imageUrl: string | null;
  isActive: boolean;
  category: Category;
  variants: Variant[];
}

const ProductsPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);

  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formCategoryId, setFormCategoryId] = useState("");
  const [formBasePrice, setFormBasePrice] = useState("");
  const [formImageUrl, setFormImageUrl] = useState("");
  const [formIsActive, setFormIsActive] = useState(true);
  const [formVariants, setFormVariants] = useState<Variant[]>([]);

  async function fetchProducts() {
    try {
      setLoading(true);
      const res = await api.get<Product[]>("/products/admin");
      setProducts(res.data);
    } catch (err) {
      console.error(err);
      setError("Failed to load products");
    } finally {
      setLoading(false);
    }
  }

  async function fetchCategories() {
    try {
      const res = await api.get<Category[]>("/categories/all");
      setCategories(res.data);
    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  function openCreateModal() {
    setEditingProduct(null);
    setFormName("");
    setFormDescription("");
    setFormCategoryId(categories[0]?.id ?? "");
    setFormBasePrice("");
    setFormImageUrl("");
    setFormIsActive(true);
    setFormVariants([]);
    setModalOpen(true);
  }

  function openEditModal(product: Product) {
    setEditingProduct(product);
    setFormName(product.name);
    setFormDescription(product.description ?? "");
    setFormCategoryId(product.category?.id ?? "");
    setFormBasePrice(product.basePrice);
    setFormImageUrl(product.imageUrl ?? "");
    setFormIsActive(product.isActive);
    setFormVariants(
      product.variants.map((v) => ({
        id: v.id,
        name: v.name,
        sku: v.sku,
        price: v.price,
        stockQuantity: v.stockQuantity,
      }))
    );
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingProduct(null);
  }

  function addVariant() {
    setFormVariants((prev) => [
      ...prev,
      { name: "", sku: "", price: null, stockQuantity: 0 },
    ]);
  }

  function updateVariant(index: number, field: keyof Variant, value: string | number | boolean | null) {
    setFormVariants((prev) =>
      prev.map((v, i) => (i === index ? { ...v, [field]: value } : v))
    );
  }

  function removeVariant(index: number) {
    setFormVariants((prev) => {
      const variant = prev[index];
      if (variant.id) {
        return prev.map((v, i) => (i === index ? { ...v, _delete: true } : v));
      }
      return prev.filter((_, i) => i !== index);
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formName.trim()) {
      alert("Name is required");
      return;
    }
    if (!formCategoryId) {
      alert("Category is required");
      return;
    }
    if (!formBasePrice || isNaN(Number(formBasePrice))) {
      alert("Valid base price is required");
      return;
    }

    const activeVariants = formVariants.filter((v) => !v._delete);
    for (const v of activeVariants) {
      if (!v.name.trim()) {
        alert("Variant name cannot be empty");
        return;
      }
      if (!v.sku.trim()) {
        alert("Variant SKU is required");
        return;
      }
    }

    setSaving(true);
    try {
      const payload = {
        name: formName.trim(),
        description: formDescription.trim() || null,
        categoryId: formCategoryId,
        basePrice: Number(formBasePrice),
        imageUrl: formImageUrl.trim() || null,
        isActive: formIsActive,
        variants: formVariants.map((v) => ({
          id: v.id,
          name: v.name.trim(),
          sku: v.sku.trim(),
          price: v.price !== null ? Number(v.price) : null,
          stockQuantity: v.stockQuantity,
          _delete: v._delete,
        })),
      };

      if (editingProduct) {
        await api.put(`/products/admin/${editingProduct.id}`, payload);
      } else {
        await api.post("/products/admin", payload);
      }
      closeModal();
      fetchProducts();
    } catch (err) {
      console.error(err);
      alert("Failed to save product");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(product: Product) {
    try {
      await api.put(`/products/admin/${product.id}`, {
        isActive: !product.isActive,
      });
      fetchProducts();
    } catch (err) {
      console.error(err);
      alert("Failed to update product");
    }
  }

  if (loading) {
    return <div>Loading products...</div>;
  }

  if (error) {
    return <div className="text-red-600">{error}</div>;
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Products</h1>
        <button
          className="rounded bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
          onClick={openCreateModal}
        >
          + Add Product
        </button>
      </div>
      <div className="overflow-x-auto rounded border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-2 text-left font-semibold text-slate-700">Name</th>
              <th className="px-4 py-2 text-left font-semibold text-slate-700">Category</th>
              <th className="px-4 py-2 text-left font-semibold text-slate-700">Price</th>
              <th className="px-4 py-2 text-left font-semibold text-slate-700">Variants</th>
              <th className="px-4 py-2 text-left font-semibold text-slate-700">Status</th>
              <th className="px-4 py-2 text-left font-semibold text-slate-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map((prod) => (
              <tr key={prod.id} className="border-t border-slate-200">
                <td className="px-4 py-2">
                  <div className="font-medium text-slate-900">{prod.name}</div>
                  {prod.description && (
                    <div className="text-xs text-slate-500">{prod.description}</div>
                  )}
                </td>
                <td className="px-4 py-2 text-slate-700">{prod.category?.name}</td>
                <td className="px-4 py-2 text-slate-700">
                  ₱{Number(prod.basePrice).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                </td>
                <td className="px-4 py-2 text-slate-700">{prod.variants?.length ?? 0}</td>
                <td className="px-4 py-2">
                  <button
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      prod.isActive
                        ? "bg-green-100 text-green-700 hover:bg-green-200"
                        : "bg-red-100 text-red-700 hover:bg-red-200"
                    }`}
                    onClick={() => toggleActive(prod)}
                  >
                    {prod.isActive ? "Active" : "Inactive"}
                  </button>
                </td>
                <td className="px-4 py-2">
                  <button
                    className="rounded border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    onClick={() => openEditModal(prod)}
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 px-4 py-6">
          <div className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-semibold text-slate-800">
              {editingProduct ? "Edit Product" : "Add Product"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Name *</label>
                  <input
                    type="text"
                    className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Category *</label>
                  <select
                    className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                    value={formCategoryId}
                    onChange={(e) => setFormCategoryId(e.target.value)}
                    required
                  >
                    <option value="">Select category</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Description</label>
                <textarea
                  className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                  rows={2}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Base Price *</label>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                    value={formBasePrice}
                    onChange={(e) => setFormBasePrice(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Image URL</label>
                  <input
                    type="text"
                    className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                    value={formImageUrl}
                    onChange={(e) => setFormImageUrl(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="prodIsActive"
                  checked={formIsActive}
                  onChange={(e) => setFormIsActive(e.target.checked)}
                />
                <label htmlFor="prodIsActive" className="text-sm text-slate-700">
                  Active
                </label>
              </div>

              <div className="border-t border-slate-200 pt-4">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-700">Variants</h3>
                  <button
                    type="button"
                    className="rounded border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    onClick={addVariant}
                  >
                    + Add Variant
                  </button>
                </div>
                {formVariants.filter((v) => !v._delete).length === 0 ? (
                  <p className="text-xs text-slate-500">No variants added.</p>
                ) : (
                  <div className="space-y-2">
                    {formVariants.map((variant, index) =>
                      variant._delete ? null : (
                        <div key={index} className="flex items-center gap-2 rounded border border-slate-200 bg-slate-50 p-2">
                          <input
                            type="text"
                            placeholder="Name"
                            className="flex-1 rounded border border-slate-300 px-2 py-1 text-xs focus:border-slate-500 focus:outline-none"
                            value={variant.name}
                            onChange={(e) => updateVariant(index, "name", e.target.value)}
                          />
                          <input
                            type="text"
                            placeholder="SKU"
                            className="w-24 rounded border border-slate-300 px-2 py-1 text-xs focus:border-slate-500 focus:outline-none"
                            value={variant.sku}
                            onChange={(e) => updateVariant(index, "sku", e.target.value)}
                          />
                          <input
                            type="number"
                            step="0.01"
                            placeholder="Price"
                            className="w-20 rounded border border-slate-300 px-2 py-1 text-xs focus:border-slate-500 focus:outline-none"
                            value={variant.price ?? ""}
                            onChange={(e) =>
                              updateVariant(index, "price", e.target.value ? Number(e.target.value) : null)
                            }
                          />
                          <input
                            type="number"
                            placeholder="Stock"
                            className="w-16 rounded border border-slate-300 px-2 py-1 text-xs focus:border-slate-500 focus:outline-none"
                            value={variant.stockQuantity}
                            onChange={(e) => updateVariant(index, "stockQuantity", Number(e.target.value) || 0)}
                          />
                          <button
                            type="button"
                            className="text-red-600 hover:text-red-800"
                            onClick={() => removeVariant(index)}
                          >
                            ×
                          </button>
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  className="rounded border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  onClick={closeModal}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductsPage;
