const quickBotConfig = {
  apiBase: '/api',
  themeColor: '#f59e0b',
  assistantName: 'Quick Bot',
  defaultMenuBranch: null,
  defaultCallCountryCode: '+1',
  hideOnAdminRoutes: true,
  locations: [
    {
      id: 'rangde',
      name: 'Kanata, Ottawa',
      slug: 'rangde',
      menuBranch: null,
      restaurantId: null,
      aliases: ['kanata', 'ottawa', 'rangde', 'march rd'],
      fallbackPhone: '(613) 595-0777',
    },
    {
      id: 'stittsville',
      name: 'Stittsville, Ottawa',
      slug: 'stittsville',
      menuBranch: 'stittsville',
      aliases: ['stittsville', 'ottawa'],
      fallbackPhone: '+16138783939',
    },
    {
      id: 'wellington',
      name: 'Wellington, Ottawa',
      slug: 'wellington',
      menuBranch: 'wellington',
      aliases: ['wellington', 'ottawa'],
      fallbackPhone: '+16137929777',
    },
  ],
  menuCategories: [
    { key: 'veg-appetizers', label: 'Veg Appetizers' },
    { key: 'non-veg-appetizers', label: 'Non Veg Appetizers' },
    { key: 'chaat', label: 'Chaat' },
    { key: 'veg-curries', label: 'Veg Curries' },
    { key: 'chicken-curries', label: 'Chicken Curries' },
    { key: 'biryani', label: 'Biryani' },
    { key: 'desserts', label: 'Desserts' },
  ],
};

export default quickBotConfig;
