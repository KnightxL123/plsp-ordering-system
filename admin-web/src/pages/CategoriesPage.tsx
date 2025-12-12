import React, { useEffect, useState } from "react";
import api from "../lib/api";

interface Category {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
}

const CategoriesPage: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formIsActive, setFormIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  async function fetchCategories() {
    try {
      setLoading(true);
      const res = await api.get<Category[]>("/categories/all");
      setCategories(res.data);
    } catch (err) {
      console.error(err);
      setError("Failed to load categories");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchCategories();
  }, []);

  function openCreateModal() {
    setEditingCategory(null);
    setFormName("");
    setFormDescription("");
    setFormIsActive(true);
    setModalOpen(true);
  }

  function openEditModal(category: Category) {
    setEditingCategory(category);
    setFormName(category.name);
    setFormDescription(category.description ?? "");
    setFormIsActive(category.isActive);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingCategory(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formName.trim()) {
      alert("Name is required");
      return;
    }

    setSaving(true);
    try {
      if (editingCategory) {
        await api.put(`/categories/${editingCategory.id}`, {
          name: formName.trim(),
          description: formDescription.trim() || null,
          isActive: formIsActive,
        });
      } else {
        await api.post("/categories", {
          name: formName.trim(),
          description: formDescription.trim() || null,
          isActive: formIsActive,
        });
      }
      closeModal();
      fetchCategories();
    } catch (err) {
      console.error(err);
      alert("Failed to save category");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(category: Category) {
    try {
      await api.put(`/categories/${category.id}`, {
        isActive: !category.isActive,
      });
      fetchCategories();
    } catch (err) {
      console.error(err);
      alert("Failed to update category");
    }
  }

  if (loading) {
    return <div>Loading categories...</div>;
  }

  if (error) {
    return <div className="text-red-600">{error}</div>;
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Categories</h1>
        <button
          className="rounded bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
          onClick={openCreateModal}
        >
          + Add Category
        </button>
      </div>
      <div className="overflow-x-auto rounded border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-2 text-left font-semibold text-slate-700">Name</th>
              <th className="px-4 py-2 text-left font-semibold text-slate-700">Description</th>
              <th className="px-4 py-2 text-left font-semibold text-slate-700">Active</th>
              <th className="px-4 py-2 text-left font-semibold text-slate-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((cat) => (
              <tr key={cat.id} className="border-t border-slate-200">
                <td className="px-4 py-2">{cat.name}</td>
                <td className="px-4 py-2 text-slate-600">
                  {cat.description ?? <span className="italic text-slate-400">No description</span>}
                </td>
                <td className="px-4 py-2">
                  <button
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      cat.isActive
                        ? "bg-green-100 text-green-700 hover:bg-green-200"
                        : "bg-red-100 text-red-700 hover:bg-red-200"
                    }`}
                    onClick={() => toggleActive(cat)}
                  >
                    {cat.isActive ? "Active" : "Inactive"}
                  </button>
                </td>
                <td className="px-4 py-2">
                  <button
                    className="rounded border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    onClick={() => openEditModal(cat)}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-semibold text-slate-800">
              {editingCategory ? "Edit Category" : "Add Category"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
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
                <label className="mb-1 block text-sm font-medium text-slate-700">Description</label>
                <textarea
                  className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                  rows={3}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formIsActive}
                  onChange={(e) => setFormIsActive(e.target.checked)}
                />
                <label htmlFor="isActive" className="text-sm text-slate-700">
                  Active
                </label>
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

export default CategoriesPage;
