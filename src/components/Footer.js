import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Phone, Mail, Clock, Instagram, Facebook, ArrowUpRight } from 'lucide-react';

const footerLinks = {
  explore: [
    { name: 'Home', path: '/' },
    { name: 'About Us', path: '/about' },
    { name: 'Our Menu', path: '/menu' },
    { name: 'Locations', path: '/locations' },
  ],
  services: [
    { name: 'Reserve a Table', path: '/reservations' },
    { name: 'Catering Services', path: '/catering' },
    { name: 'Contact Us', path: '/contact' },
    // { name: 'Admin Portal', path: '/admin/login' },
  ],
};

const brands = [
  { name: 'Masakali Ottawa', url: 'https://masakaliottawa.ca' },
  { name: 'Masakali Restobar', url: 'https://masakalirestrobar.ca' },
  { name: 'RangDe Ottawa', url: 'https://rangdeottawa.com' },
  { name: 'Masakali Montreal', url: 'https://masakalimontreal.ca' },
  { name: 'Masakali California', url: 'https://masakalicalifornia.com' },
];

export default function Footer() {
  return (
    <footer className="bg-neutral-100 dark:bg-neutral-950 border-t border-neutral-200 dark:border-neutral-800/50">
      {/* Main Footer */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="lg:col-span-1">
            <Link to="/" className="inline-block mb-6">
              <img
                src="/logo/RangDe-Indian-Cuisine.png"
                alt="RangDe Indian Cuisine"
                className="h-40 w-auto"
                onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }}
              />
              <span className="hidden font-display text-2xl text-gold-gradient font-bold">RangDe</span>
            </Link>
            <p className="text-neutral-500 dark:text-neutral-400 text-sm leading-relaxed mb-6">
              Premium Indian cuisine across multiple locations. Experience the rich flavors of India, crafted with passion since 2021.
            </p>
            <div className="flex space-x-3">
              <a href="#" className="w-10 h-10 rounded-full bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center text-neutral-500 dark:text-neutral-400 hover:bg-amber-500/20 hover:text-amber-600 dark:hover:text-amber-400 transition-all">
                <Instagram size={18} />
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center text-neutral-500 dark:text-neutral-400 hover:bg-amber-500/20 hover:text-amber-600 dark:hover:text-amber-400 transition-all">
                <Facebook size={18} />
              </a>
            </div>
          </div>

          {/* Explore */}
          <div>
            <h3 className="text-amber-600 dark:text-amber-400 font-semibold text-sm uppercase tracking-wider mb-6">Explore</h3>
            <ul className="space-y-3">
              {footerLinks.explore.map((link) => (
                <li key={link.path}>
                  <Link to={link.path} className="text-neutral-500 dark:text-neutral-400 text-sm hover:text-neutral-900 dark:hover:text-white transition-colors">
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Services */}
          <div>
            <h3 className="text-amber-600 dark:text-amber-400 font-semibold text-sm uppercase tracking-wider mb-6">Services</h3>
            <ul className="space-y-3">
              {footerLinks.services.map((link) => (
                <li key={link.path}>
                  <Link to={link.path} className="text-neutral-500 dark:text-neutral-400 text-sm hover:text-neutral-900 dark:hover:text-white transition-colors">
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Our Brands */}
          <div>
            <h3 className="text-amber-600 dark:text-amber-400 font-semibold text-sm uppercase tracking-wider mb-6">Our Brands</h3>
            <ul className="space-y-3">
              {brands.map((brand) => (
                <li key={brand.name}>
                  <a
                    href={brand.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-neutral-500 dark:text-neutral-400 text-sm hover:text-neutral-900 dark:hover:text-white transition-colors inline-flex items-center gap-1"
                  >
                    {brand.name}
                    <ArrowUpRight size={12} />
                  </a>
                </li>
              ))}
            </ul>

            <div className="mt-8">
              <h3 className="text-amber-600 dark:text-amber-400 font-semibold text-sm uppercase tracking-wider mb-4">Contact</h3>
              <div className="space-y-2">
                <a href="tel:+16135950777" className="text-neutral-500 dark:text-neutral-400 text-sm hover:text-neutral-900 dark:hover:text-white transition-colors flex items-center gap-2">
                  <Phone size={14} /> (613) 595-0777
                </a>
                <a href="mailto:info@rangdeottawa.com" className="text-neutral-500 dark:text-neutral-400 text-sm hover:text-neutral-900 dark:hover:text-white transition-colors flex items-center gap-2">
                  <Mail size={14} /> info@rangdeottawa.com
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-neutral-200 dark:border-neutral-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-neutral-400 dark:text-neutral-500 text-xs">
            © {new Date().getFullYear()} RangDe Indian Cuisine. All rights reserved.
          </p>
          <p className="text-neutral-400 dark:text-neutral-600 text-xs">
            Est. 2026 · Ottawa · Montreal · California
          </p>
        </div>
      </div>
    </footer>
  );
}
