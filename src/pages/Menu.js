import React, { useState, useEffect, useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Search, Filter, ChefHat, Flame, Leaf, ChevronDown, ChevronUp, LayoutGrid, List } from 'lucide-react';
import menuData from '../Data/menu.json';

function AnimatedSection({ children, className = '', delay = 0 }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-30px' });
  return (
    <motion.div ref={ref} initial={{ opacity: 0, y: 30 }} animate={isInView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.5, delay }} className={className}>
      {children}
    </motion.div>
  );
}

const spiceColors = {
  mild: { bg: 'bg-green-500/10', text: 'text-green-600 dark:text-green-400', label: 'Mild' },
  medium: { bg: 'bg-yellow-500/10', text: 'text-yellow-600 dark:text-yellow-400', label: 'Medium' },
  hot: { bg: 'bg-orange-500/10', text: 'text-orange-600 dark:text-orange-400', label: 'Hot' },
  extra_hot: { bg: 'bg-red-500/10', text: 'text-red-600 dark:text-red-400', label: 'Extra Hot' },
};

function getItemImageUrl(item) {
  const firstImage = Array.isArray(item.images) ? item.images[0]?.source : null;
  return firstImage || item.image_url || null;
}

export default function Menu() {
  const [categories, setCategories] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [activeCategory, setActiveCategory] = useState(null);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState('compact');
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [brokenImages, setBrokenImages] = useState({});

  useEffect(() => {
    try {
      // Transform categories from object to sorted array
      const rawCats = menuData.categories || {};
      const cats = Object.values(rawCats)
        .filter(cat => cat.items && cat.items.length > 0)
        .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
        .map(cat => ({
          id: cat.id,
          name: cat.name,
          slug: (cat.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
          sort_order: cat.sortOrder || 0,
        }));

      // Transform items - map categoryIds to category_id, convert price from cents to dollars
      const rawItems = menuData.items || [];
      const items = rawItems
        .filter(item => item.available !== false)
        .map(item => ({
          id: item.id,
          name: item.name || '',
          description: item.description || '',
          price: item.price ? Number((item.price / 100).toFixed(2)) : 0,
          image_url: item.images && item.images.length > 0 ? item.images[0].source : null,
          images: item.images || [],
          category_id: item.categoryIds && item.categoryIds.length > 0 ? item.categoryIds[0] : null,
          is_vegetarian: false,
          spice_level: 'medium',
          is_featured: false,
        }))
        .filter(item => item.category_id); // Only include items that belong to a category

      setCategories(cats);
      setMenuItems(items);
    } catch (err) {
      console.error('Error loading menu data:', err);
    }
    setLoading(false);
  }, []);

  const filteredItems = menuItems.filter(item => {
    if (activeCategory && item.category_id !== activeCategory) return false;
    if (search && !item.name.toLowerCase().includes(search.toLowerCase()) && !item.description?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const groupedItems = categories
    .filter(cat => !activeCategory || cat.id === activeCategory)
    .map(cat => ({
      ...cat,
      items: filteredItems.filter(item => item.category_id === cat.id),
    }))
    .filter(cat => cat.items.length > 0);

  return (
    <div className="min-h-screen pt-20 relative">
      {/* Indian ornamental overlays */}
      <div className="indian-mandala-tl" />
      <div className="indian-mandala-br" />

      {/* Hero */}
      <section className="py-20 bg-pattern bg-indian-paisley relative overflow-hidden bg-indian-arch">
        <div className="indian-vine-left" />
        <div className="indian-vine-right" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />
        <div className="max-w-7xl mx-auto px-4 relative z-10">
          <AnimatedSection>
            <span className="text-amber-500 dark:text-amber-400 text-sm font-semibold uppercase tracking-wider">Our Menu</span>
            <div className="section-divider !mx-0" />
            <h1 className="font-display text-5xl md:text-6xl font-bold text-neutral-900 dark:text-white mt-4 mb-4">
              <span className="text-gold-gradient">Menu</span>
            </h1>
            <p className="text-neutral-600 dark:text-neutral-400 text-lg max-w-2xl">
              Discover our carefully curated menu featuring authentic Indian dishes,
              from classic curries to innovative creations.
            </p>
          </AnimatedSection>
        </div>
      </section>

      {/* Filters */}
      <section className="sticky top-20 z-40 bg-white/95 dark:bg-neutral-950/95 backdrop-blur-xl border-b border-neutral-200 dark:border-neutral-800/50">
        <div className="max-w-7xl mx-auto px-4 py-3 md:py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-medium text-neutral-600 dark:text-neutral-300">
              <Filter size={16} className="text-amber-500" />
              <span>Menu Filters</span>
            </div>
            <button
              onClick={() => setIsFiltersOpen(!isFiltersOpen)}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg border border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 transition-all"
              aria-expanded={isFiltersOpen}
              aria-controls="menu-filters-panel"
            >
              <span>{isFiltersOpen ? 'Close' : 'Open'}</span>
              {isFiltersOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          </div>

          {isFiltersOpen && (
            <div id="menu-filters-panel" className="mt-3 space-y-3">
              <div className="relative w-full md:max-w-md">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 dark:text-neutral-500" />
                <input
                  type="text"
                  placeholder="Search dishes..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="input-dark !pl-10"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setViewMode('compact')}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border transition-all ${viewMode === 'compact'
                    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                    : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700'
                    }`}
                  aria-pressed={viewMode === 'compact'}
                >
                  <LayoutGrid size={15} /> Compact
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('card')}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border transition-all ${viewMode === 'card'
                    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                    : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700'
                    }`}
                  aria-pressed={viewMode === 'card'}
                >
                  <LayoutGrid size={15} /> Card
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border transition-all ${viewMode === 'list'
                    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                    : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700'
                    }`}
                  aria-pressed={viewMode === 'list'}
                >
                  <List size={15} /> List
                </button>
              </div>

              <div className="overflow-x-auto pb-1">
                <div className="flex gap-2 min-w-max">
                  <button
                    onClick={() => setActiveCategory(null)}
                    className={`whitespace-nowrap px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${!activeCategory ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700 hover:text-neutral-900 dark:hover:text-white'
                      }`}
                  >
                    All
                  </button>
                  {categories.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => setActiveCategory(cat.id === activeCategory ? null : cat.id)}
                      className={`whitespace-nowrap px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${activeCategory === cat.id ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700 hover:text-neutral-900 dark:hover:text-white'
                        }`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Menu Items */}
      <section className="py-16 bg-neutral-50 dark:bg-dark-950 bg-indian-jali relative overflow-hidden">
        <div className="indian-vine-left" />
        <div className="indian-vine-right" />
        <div className="max-w-7xl mx-auto px-4">
          {loading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white/80 dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6">
                  <div className="skeleton h-40 mb-4 rounded-xl" />
                  <div className="skeleton h-5 w-3/4 mb-2" />
                  <div className="skeleton h-4 w-full mb-4" />
                  <div className="skeleton h-4 w-1/4" />
                </div>
              ))}
            </div>
          ) : groupedItems.length === 0 ? (
            <div className="text-center py-20">
              <ChefHat size={48} className="text-neutral-300 dark:text-neutral-700 mx-auto mb-4" />
              <p className="text-neutral-500 text-lg">No dishes found matching your filters.</p>
            </div>
          ) : (
            groupedItems.map((category) => (
              <div key={category.id} className="mb-16">
                <AnimatedSection>
                  <div className="flex items-center gap-4 mb-8">
                    <h2 className="font-display text-2xl md:text-3xl font-bold text-neutral-900 dark:text-white">
                      {category.name}
                    </h2>
                    <div className="flex-1 h-px bg-neutral-200 dark:bg-neutral-800" />
                    <span className="text-neutral-400 dark:text-neutral-600 text-sm">{category.items.length} items</span>
                  </div>
                </AnimatedSection>

                {viewMode === 'compact' ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {category.items.map((item, i) => {
                      const spice = spiceColors[item.spice_level] || spiceColors.medium;
                      return (
                        <AnimatedSection key={item.id} delay={Math.min(i * 0.03, 0.2)}>
                          <div className="bg-white/80 dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 h-full shadow-sm dark:shadow-none">
                            <h3 className="text-neutral-900 dark:text-white font-semibold text-sm leading-tight mb-2 line-clamp-2">
                              {item.name}
                            </h3>
                            <p className="text-neutral-500 text-xs mb-3 line-clamp-2 min-h-[2rem]">
                              {item.description || 'No description available.'}
                            </p>
                            <div className="flex items-center gap-2 flex-wrap">
                              {item.is_vegetarian && (
                                <span className="inline-flex items-center gap-1 text-[11px] px-2 py-1 bg-green-500/10 text-green-600 dark:text-green-400 rounded-full">
                                  <Leaf size={10} /> Veg
                                </span>
                              )}
                              {/* <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-1 ${spice.bg} ${spice.text} rounded-full`}>
                                <Flame size={10} /> {spice.label}
                              </span> */}
                            </div>
                          </div>
                        </AnimatedSection>
                      );
                    })}
                  </div>
                ) : viewMode === 'card' ? (
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {category.items.map((item, i) => {
                      const spice = spiceColors[item.spice_level] || spiceColors.medium;
                      const imageUrl = getItemImageUrl(item);
                      const hasImage = Boolean(imageUrl) && !brokenImages[item.id];
                      return (
                        <AnimatedSection key={item.id} delay={Math.min(i * 0.05, 0.3)}>
                          <div className="group bg-white/80 dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden card-hover gold-glow-hover shadow-sm dark:shadow-none">
                            <div className="h-44 bg-gradient-to-br from-amber-100 dark:from-amber-900/20 to-neutral-100 dark:to-neutral-900 flex items-center justify-center relative">
                              {hasImage ? (
                                <img
                                  src={imageUrl}
                                  alt={item.name}
                                  loading="lazy"
                                  referrerPolicy="no-referrer"
                                  className="w-full h-full object-cover"
                                  onError={() => setBrokenImages(prev => ({ ...prev, [item.id]: true }))}
                                />
                              ) : (
                                <ChefHat size={40} className="text-amber-500/20 group-hover:text-amber-400/40 transition-colors" />
                              )}
                              {item.is_featured && (
                                <span className="absolute top-3 right-3 px-2 py-1 bg-amber-500 text-black text-xs font-bold rounded-full">
                                  ★ Featured
                                </span>
                              )}
                            </div>

                            <div className="p-6">
                              <div className="flex items-start justify-between mb-2">
                                <h3 className="text-neutral-900 dark:text-white font-semibold text-lg leading-tight flex-1 mr-3">{item.name}</h3>
                              </div>
                              <p className="text-neutral-500 text-sm mb-4 line-clamp-2">{item.description}</p>
                              <div className="flex items-center gap-2 flex-wrap">
                                {item.is_vegetarian && (
                                  <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 bg-green-500/10 text-green-600 dark:text-green-400 rounded-full">
                                    <Leaf size={12} /> Veg
                                  </span>
                                )}
                                <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 ${spice.bg} ${spice.text} rounded-full`}>
                                  <Flame size={12} /> {spice.label}
                                </span>
                              </div>
                            </div>
                          </div>
                        </AnimatedSection>
                      );
                    })}
                  </div>
                ) : (
                  <AnimatedSection>
                    <div className="bg-white/85 dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden shadow-sm dark:shadow-none">
                      {category.items.map((item, i) => {
                        const imageUrl = getItemImageUrl(item);
                        const hasImage = Boolean(imageUrl) && !brokenImages[item.id];
                        const isLastItem = i === category.items.length - 1;
                        return (
                          <div
                            key={item.id}
                            className={`p-4 md:p-6 ${isLastItem ? '' : 'border-b border-neutral-200 dark:border-neutral-800'}`}
                          >
                            <div className="flex flex-col sm:flex-row gap-4 md:gap-6">
                              <div className="w-full sm:w-44 h-28 rounded-md overflow-hidden bg-gradient-to-br from-amber-100 dark:from-amber-900/20 to-neutral-100 dark:to-neutral-900 flex items-center justify-center shrink-0">
                                {hasImage ? (
                                  <img
                                    src={imageUrl}
                                    alt={item.name}
                                    loading="lazy"
                                    referrerPolicy="no-referrer"
                                    className="w-full h-full object-cover"
                                    onError={() => setBrokenImages(prev => ({ ...prev, [item.id]: true }))}
                                  />
                                ) : (
                                  <ChefHat size={30} className="text-amber-500/25" />
                                )}
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="border-b border-neutral-200 dark:border-neutral-700 pb-2 mb-3">
                                  <h3 className="text-neutral-900 dark:text-white font-semibold text-2xl leading-tight">{item.name}</h3>
                                </div>
                                <p className="text-neutral-600 dark:text-neutral-300 text-base leading-relaxed">
                                  {item.description || 'No description available.'}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </AnimatedSection>
                )}
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
