import Category from '../models/Category.js';
import Monument from '../models/Monument.js';

export async function getAllCategories({ skip = 0, limit = 50, activeOnly = false, search = '' } = {}) {
  const filter = activeOnly ? { isActive: true } : {};

  if (search && search.trim()) {
    const term = search.trim();
    filter.$or = [
      { name: { $regex: term, $options: 'i' } },
      { description: { $regex: term, $options: 'i' } }
    ];
  }
  
  const items = await Category.find(filter)
    .sort({ name: 1 })
    .skip(skip)
    .limit(limit);
  
  const total = await Category.countDocuments(filter);
  
  return { items, total };
}

export async function getCategoryById(id) {
  return await Category.findById(id);
}

export async function createCategory(data) {
  const category = new Category(data);
  return await category.save();
}

export async function updateCategory(id, data) {
  return await Category.findByIdAndUpdate(id, data, { new: true });
}

export async function deleteCategory(id) {
  // Verificar si hay monumentos usando esta categoría
  const monumentsCount = await Monument.countDocuments({ categoryId: id });
  
  if (monumentsCount > 0) {
    throw new Error(`No se puede eliminar la categoría. Hay ${monumentsCount} monumentos que la utilizan.`);
  }
  
  return await Category.findByIdAndDelete(id);
}

export async function getCategoriesWithCounts() {
  const categories = await Category.find({ isActive: true }).sort({ name: 1 });
  
  const categoriesWithCounts = await Promise.all(
    categories.map(async (category) => {
      const monumentsCount = await Monument.countDocuments({ 
        categoryId: category._id, 
        status: 'Disponible' 
      });
      
      return {
        ...category.toObject(),
        monumentsCount
      };
    })
  );
  
  return categoriesWithCounts;
}

export async function getCategoryStats() {
  const [total, active, uniqueColors] = await Promise.all([
    Category.countDocuments({}),
    Category.countDocuments({ isActive: true }),
    Category.distinct('color')
  ]);

  return {
    total,
    active,
    uniqueColors: uniqueColors.filter(Boolean).length
  };
}