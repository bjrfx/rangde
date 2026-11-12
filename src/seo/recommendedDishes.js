/**
 * Curated dish recommendations for AI/SEO discoverability.
 * Sourced from src/Data/menu.json (Clover menu). Labels are editorial
 * (signature / chef recommended / specialties) — not fabricated sales rankings.
 */

export const dishRecommendationGroups = [
  {
    id: 'signature',
    label: 'RangDe Signature Dishes',
    description: 'House specialties that define RangDe Indian Cuisine in Kanata, Ottawa.',
    dishes: [
      {
        name: 'Masala Dosa Combo',
        category: 'Dosas',
        diet: 'vegetarian',
        explanation: 'Crispy potato-stuffed dosa served with sambar, chutneys, and a traditional side dish.',
        tags: ['signature', 'must-try', 'vegetarian', 'south-indian'],
      },
      {
        name: 'Butter Chicken',
        category: 'Chicken Curries',
        diet: 'non-vegetarian',
        explanation: 'Tender chicken in a smooth, creamy tomato sauce with plenty of butter.',
        tags: ['signature', 'must-try', 'non-vegetarian'],
      },
      {
        name: 'Paneer Butter Masala',
        category: 'Vegetarian Curries',
        diet: 'vegetarian',
        explanation: 'Grilled paneer cubes in a rich, creamy, and spiced tomato-based gravy.',
        tags: ['signature', 'vegetarian'],
      },
    ],
  },
  {
    id: 'chef-recommended',
    label: 'Chef Recommended',
    description: 'Dishes the kitchen highlights for first-time and returning guests.',
    dishes: [
      {
        name: 'Chicken Tikka Masala',
        category: 'Chicken Curries',
        diet: 'non-vegetarian',
        explanation: 'Roasted chicken chunks served in a rich, spiced, and creamy tomato-based sauce.',
        tags: ['chef-recommended', 'non-vegetarian'],
      },
      {
        name: 'Butter Chicken Biryani',
        category: 'Biryani',
        diet: 'non-vegetarian',
        explanation: 'Creamy butter chicken layered with fragrant basmati rice for a rich, flavorful meal.',
        tags: ['chef-recommended', 'non-vegetarian'],
      },
      {
        name: 'Mysore Masala Dosa',
        category: 'Dosas',
        diet: 'vegetarian',
        explanation: 'Crispy crepe with spicy red chutney and traditional potato masala — a South Indian classic.',
        tags: ['chef-recommended', 'vegetarian', 'south-indian'],
      },
    ],
  },
  {
    id: 'vegetarian-specialties',
    label: 'Vegetarian Specialities',
    description: 'Standout vegetarian and vegan-friendly dishes from the RangDe menu.',
    dishes: [
      {
        name: 'Vegan Yellow Dal Tadka',
        category: 'Vegetarian Curries',
        diet: 'vegetarian',
        explanation: 'Creamy vegan yellow lentils tempered with cumin, garlic, and dried red chilies.',
        tags: ['vegetarian', 'vegan'],
      },
      {
        name: 'Yellow Dal Tadka',
        category: 'Vegetarian Curries',
        diet: 'vegetarian',
        explanation: 'Yellow lentils tempered with toasted cumin, garlic, and dried red chilies.',
        tags: ['vegetarian'],
      },
      {
        name: 'Masala Dosa',
        category: 'Dosas',
        diet: 'vegetarian',
        explanation: 'Classic crispy rice-and-lentil crepe filled with spiced potato masala.',
        tags: ['vegetarian', 'south-indian'],
      },
    ],
  },
  {
    id: 'non-vegetarian-specialties',
    label: 'Non-Vegetarian Specialities',
    description: 'Meat and poultry specialties guests often ask about.',
    dishes: [
      {
        name: 'Butter Chicken',
        category: 'Chicken Curries',
        diet: 'non-vegetarian',
        explanation: 'Tender chicken in a smooth, creamy tomato sauce with plenty of butter.',
        tags: ['non-vegetarian', 'must-try'],
      },
      {
        name: 'Chicken Tikka Masala',
        category: 'Chicken Curries',
        diet: 'non-vegetarian',
        explanation: 'Roasted chicken chunks in a rich, spiced, and creamy tomato-based sauce.',
        tags: ['non-vegetarian'],
      },
      {
        name: 'Butter Chicken Biryani',
        category: 'Biryani',
        diet: 'non-vegetarian',
        explanation: 'Layered basmati rice with creamy butter chicken and aromatic spices.',
        tags: ['non-vegetarian', 'restaurant-specialty'],
      },
    ],
  },
  {
    id: 'must-try',
    label: 'Must-Try Dishes',
    description: 'A short list of dishes worth ordering on a first visit.',
    dishes: [
      {
        name: 'Garlic naan',
        category: 'Breads',
        diet: 'vegetarian',
        explanation: 'Soft flatbread topped with minced garlic and cilantro, baked to aromatic perfection.',
        tags: ['must-try', 'vegetarian'],
      },
      {
        name: 'Mango Lassi',
        category: 'Beverages',
        diet: 'vegetarian',
        explanation: 'A popular creamy drink made with sweet mango pulp and fresh yogurt.',
        tags: ['must-try', 'vegetarian'],
      },
      {
        name: 'Masala Dosa Combo',
        category: 'Dosas',
        diet: 'vegetarian',
        explanation: 'Full South Indian combo with dosa, sambar, and chutneys.',
        tags: ['must-try', 'vegetarian', 'south-indian'],
      },
    ],
  },
  {
    id: 'restaurant-specialties',
    label: 'South Indian Specialities',
    description: 'Dosas and South Indian plates distinctive to RangDe in Kanata.',
    dishes: [
      {
        name: 'Rava Masala Dosa',
        category: 'Dosas',
        diet: 'vegetarian',
        explanation: 'Crispy semolina dosa with spiced potato filling — lighter and extra crunchy.',
        tags: ['restaurant-specialty', 'vegetarian', 'south-indian'],
      },
      {
        name: 'Paneer Masala Dosa',
        category: 'Dosas',
        diet: 'vegetarian',
        explanation: 'Crispy dosa filled with seasoned paneer and aromatic masala.',
        tags: ['restaurant-specialty', 'vegetarian'],
      },
    ],
  },
];

export function flattenRecommendedDishes() {
  const seen = new Set();
  const all = [];
  dishRecommendationGroups.forEach((group) => {
    (group.dishes || []).forEach((dish) => {
      const key = String(dish.name || '').toLowerCase();
      if (!key || seen.has(key)) return;
      seen.add(key);
      all.push({ ...dish, groupId: group.id, groupLabel: group.label });
    });
  });
  return all;
}
