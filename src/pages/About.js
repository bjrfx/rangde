import React, { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import { ArrowRight, Play } from 'lucide-react';
import introVideo from '../assets/video/masakali-intro.mp4';

function AnimatedSection({ children, className = '', delay = 0 }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });
  return (
    <motion.div ref={ref} initial={{ opacity: 0, y: 40 }} animate={isInView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.7, delay }} className={className}>
      {children}
    </motion.div>
  );
}

const timeline = [
  { year: '2021', title: 'The Beginning', desc: 'Masakali Indian Cuisine opens its first location in Stittsville, Ottawa, bringing authentic Indian flavors to the community.' },
  { year: '2022', title: 'Growing Roots', desc: 'Expanding to Wellington Street, Ottawa. Launch of RangDe Indian Cuisine at 700 March Rd.' },
  { year: '2023', title: 'Restobar Launch', desc: 'Masakali Restobar opens in the vibrant Byward Market, offering a modern fusion dining experience.' },
  { year: '2024', title: 'Montreal Expansion', desc: 'Masakali arrives in Montreal, bringing our signature flavors to Quebec.' },
  { year: '2026', title: 'Going International', desc: 'Masakali launches in Cupertino, California, USA — our first international location in the heart of Silicon Valley.' },
  { year: '2026', title: 'Digital Future', desc: 'Launch of unified digital platform for all locations. Building the future of Masakali Restaurant Group.' },
];

function VideoPlayer({ src }) {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const handlePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.muted = false;
      video.play();
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  return (
    <div className="relative w-full h-full cursor-pointer" onClick={handlePlayPause}>
      <video
        ref={videoRef}
        src={src}
        className="w-full h-full object-cover"
        playsInline
        loop
        muted
        preload="metadata"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />
      {/* Play overlay */}
      <div className={`absolute inset-0 flex items-center justify-center bg-black/30 transition-opacity duration-500 ${isPlaying ? 'opacity-0 hover:opacity-100' : 'opacity-100'}`}>
        <div className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 ${
          isPlaying
            ? 'bg-black/40 backdrop-blur-sm scale-75'
            : 'bg-gradient-to-br from-amber-500 to-amber-700 shadow-lg shadow-amber-500/30 scale-100'
        }`}>
          {isPlaying ? (
            <div className="flex gap-1.5">
              <div className="w-1.5 h-7 bg-white rounded-full" />
              <div className="w-1.5 h-7 bg-white rounded-full" />
            </div>
          ) : (
            <Play size={32} className="text-white ml-1" fill="white" />
          )}
        </div>
      </div>
    </div>
  );
}

export default function About() {
  return (
    <div className="min-h-screen pt-20 relative">
      {/* Indian ornamental overlays */}
      <div className="indian-mandala-tl" />
      <div className="indian-mandala-br" />

      {/* Hero */}
      <section className="py-24 bg-pattern bg-indian-paisley relative overflow-hidden bg-indian-arch">
        <div className="indian-vine-left" />
        <div className="indian-vine-right" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />
        <div className="max-w-7xl mx-auto px-4 relative z-10">
          <AnimatedSection className="max-w-3xl">
            <span className="text-amber-500 dark:text-amber-400 text-sm font-semibold uppercase tracking-wider">About Us</span>
            <div className="section-divider !mx-0" />
            <h1 className="font-display text-5xl md:text-6xl font-bold text-neutral-900 dark:text-white mt-4 mb-6">
              The Story of <span className="text-gold-gradient">Masakali</span>
            </h1>
            <p className="text-neutral-600 dark:text-neutral-400 text-lg leading-relaxed">
              What began as a dream in 2021 has grown into one of Canada's most exciting 
              Indian restaurant groups. Masakali is more than a restaurant — it's a celebration 
              of culture, flavor, and community.
            </p>
          </AnimatedSection>
        </div>
      </section>


      {/* Video Showcase */}
      <section className="py-28 bg-neutral-50 dark:bg-neutral-950 relative overflow-hidden">
        {/* Subtle background patterns */}
        <div className="absolute inset-0 opacity-[0.03]" style={{backgroundImage: 'radial-gradient(circle at 1px 1px, #d97706 1px, transparent 0)', backgroundSize: '40px 40px'}} />
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-amber-500/30 to-transparent" />
        <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-amber-500/30 to-transparent" />

        <div className="max-w-7xl mx-auto px-4 relative z-10">
          <AnimatedSection className="text-center mb-16">
            <span className="text-amber-500 dark:text-amber-400 text-sm font-semibold uppercase tracking-wider">Experience Masakali</span>
            <div className="section-divider" />
            <h2 className="font-display text-4xl md:text-5xl font-bold text-neutral-900 dark:text-white mt-4">
              A Glimpse Into Our <span className="text-gold-gradient">World</span>
            </h2>
            <p className="text-neutral-600 dark:text-neutral-400 mt-4 max-w-xl mx-auto">
              Where tradition meets artistry — discover the essence of Masakali
            </p>
          </AnimatedSection>

          <AnimatedSection delay={0.2}>
            <div className="flex justify-center">
              <div className="relative group">
                {/* Outer ornamental border */}
                <div className="absolute -inset-4 md:-inset-6 rounded-3xl opacity-60 group-hover:opacity-100 transition-opacity duration-700"
                  style={{
                    background: 'linear-gradient(135deg, #d97706 0%, #92400e 25%, #d97706 50%, #92400e 75%, #d97706 100%)',
                    backgroundSize: '200% 200%',
                    animation: 'shimmer 4s ease-in-out infinite',
                  }}
                />
                {/* Inner dark frame */}
                <div className="absolute -inset-3 md:-inset-5 rounded-3xl bg-neutral-100 dark:bg-neutral-950" />

                {/* Decorative corner accents */}
                <div className="absolute -top-6 -left-6 md:-top-8 md:-left-8 w-12 h-12 md:w-16 md:h-16 z-20">
                  <svg viewBox="0 0 60 60" fill="none" className="w-full h-full">
                    <path d="M2 58 V20 C2 10 10 2 20 2 H58" stroke="#d97706" strokeWidth="2" fill="none" opacity="0.8"/>
                    <circle cx="20" cy="2" r="3" fill="#d97706" opacity="0.6"/>
                    <path d="M8 30 C8 16 16 8 30 8" stroke="#d97706" strokeWidth="1" fill="none" opacity="0.4"/>
                  </svg>
                </div>
                <div className="absolute -top-6 -right-6 md:-top-8 md:-right-8 w-12 h-12 md:w-16 md:h-16 z-20 rotate-90">
                  <svg viewBox="0 0 60 60" fill="none" className="w-full h-full">
                    <path d="M2 58 V20 C2 10 10 2 20 2 H58" stroke="#d97706" strokeWidth="2" fill="none" opacity="0.8"/>
                    <circle cx="20" cy="2" r="3" fill="#d97706" opacity="0.6"/>
                    <path d="M8 30 C8 16 16 8 30 8" stroke="#d97706" strokeWidth="1" fill="none" opacity="0.4"/>
                  </svg>
                </div>
                <div className="absolute -bottom-6 -right-6 md:-bottom-8 md:-right-8 w-12 h-12 md:w-16 md:h-16 z-20 rotate-180">
                  <svg viewBox="0 0 60 60" fill="none" className="w-full h-full">
                    <path d="M2 58 V20 C2 10 10 2 20 2 H58" stroke="#d97706" strokeWidth="2" fill="none" opacity="0.8"/>
                    <circle cx="20" cy="2" r="3" fill="#d97706" opacity="0.6"/>
                    <path d="M8 30 C8 16 16 8 30 8" stroke="#d97706" strokeWidth="1" fill="none" opacity="0.4"/>
                  </svg>
                </div>
                <div className="absolute -bottom-6 -left-6 md:-bottom-8 md:-left-8 w-12 h-12 md:w-16 md:h-16 z-20 -rotate-90">
                  <svg viewBox="0 0 60 60" fill="none" className="w-full h-full">
                    <path d="M2 58 V20 C2 10 10 2 20 2 H58" stroke="#d97706" strokeWidth="2" fill="none" opacity="0.8"/>
                    <circle cx="20" cy="2" r="3" fill="#d97706" opacity="0.6"/>
                    <path d="M8 30 C8 16 16 8 30 8" stroke="#d97706" strokeWidth="1" fill="none" opacity="0.4"/>
                  </svg>
                </div>

                {/* Video container — portrait aspect ratio */}
                <div className="relative z-10 rounded-2xl overflow-hidden shadow-2xl shadow-amber-900/20"
                  style={{ width: 'min(360px, 80vw)', aspectRatio: '9/16' }}>
                  {/* Inner top ornamental bar */}
                  <div className="absolute top-0 left-0 right-0 h-1 z-30 bg-gradient-to-r from-transparent via-amber-500 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 h-1 z-30 bg-gradient-to-r from-transparent via-amber-500 to-transparent" />

                  <VideoPlayer src={introVideo} />
                </div>
              </div>
            </div>
          </AnimatedSection>
        </div>

        <style>{`
          @keyframes shimmer {
            0%, 100% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
          }
        `}</style>
      </section>

      {/* Timeline */}
      <section className="py-24 bg-neutral-50 dark:bg-neutral-950 bg-indian-jali relative overflow-hidden">
        <div className="max-w-4xl mx-auto px-4">
          <AnimatedSection className="text-center mb-16">
            <span className="text-amber-500 dark:text-amber-400 text-sm font-semibold uppercase tracking-wider">Our Journey</span>
            <div className="section-divider" />
            <h2 className="font-display text-4xl md:text-5xl font-bold text-neutral-900 dark:text-white mt-4">
              The Masakali <span className="text-gold-gradient">Timeline</span>
            </h2>
          </AnimatedSection>

          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-8 md:left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-amber-500/50 via-amber-500/20 to-transparent" />

            {timeline.map((item, i) => (
              <AnimatedSection key={item.year} delay={i * 0.1}>
                <div className={`relative flex items-start mb-12 ${
                  i % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'
                }`}>
                  {/* Dot */}
                  <div className="absolute left-8 md:left-1/2 w-4 h-4 bg-amber-500 rounded-full transform -translate-x-1/2 mt-2 ring-4 ring-neutral-50 dark:ring-neutral-950" />
                  
                  {/* Content */}
                  <div className={`ml-16 md:ml-0 md:w-1/2 ${
                    i % 2 === 0 ? 'md:pr-16 md:text-right' : 'md:pl-16'
                  }`}>
                    <span className="text-amber-500 dark:text-amber-400 font-bold text-xl font-display">{item.year}</span>
                    <h3 className="text-neutral-900 dark:text-white font-semibold text-lg mt-1 mb-2">{item.title}</h3>
                    <p className="text-neutral-500 text-sm leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* Restaurant Group Brands */}
      <section className="py-24 bg-pattern bg-indian-paisley relative overflow-hidden bg-indian-arch">
        <div className="max-w-7xl mx-auto px-4">
          <AnimatedSection className="text-center mb-16">
            <span className="text-amber-500 dark:text-amber-400 text-sm font-semibold uppercase tracking-wider">Our Family</span>
            <div className="section-divider" />
            <h2 className="font-display text-4xl md:text-5xl font-bold text-neutral-900 dark:text-white mt-4">
              Restaurant <span className="text-gold-gradient">Brands</span>
            </h2>
          </AnimatedSection>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { name: 'Masakali Indian Cuisine', logo: '/logo/Masakali-Indian-Cuisine.svg', desc: 'Our flagship brand serving authentic Indian cuisine across Ottawa, Montreal, and Cupertino, California.', locations: 4 },
              { name: 'Masakali Restobar', logo: '/logo/Masakali-RestoBar.png', desc: 'A modern Indian fusion experience at 97 Clarence St., Byward Market, Ottawa.', locations: 1 },
              { name: 'RangDe Indian Cuisine', logo: '/logo/RangDe-Indian-Cuisine.png', desc: 'Vibrant and colorful Indian dining at 700 March Rd Unit H, Kanata.', locations: 1 },
            ].map((brand, i) => (
              <AnimatedSection key={brand.name} delay={i * 0.1}>
                <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-8 text-center card-hover gold-glow-hover shadow-sm dark:shadow-none">
                  <div className="h-20 flex items-center justify-center mb-6">
                    <img src={brand.logo} alt={brand.name} className="max-h-full max-w-[200px] object-contain" 
                      onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }} />
                    <span className="hidden font-display text-2xl text-gold-gradient">{brand.name}</span>
                  </div>
                  <h3 className="text-neutral-900 dark:text-white font-semibold text-lg mb-2">{brand.name}</h3>
                  <p className="text-neutral-500 text-sm mb-4">{brand.desc}</p>
                  <span className="text-amber-500 dark:text-amber-400 text-sm">{brand.locations} Location{brand.locations > 1 ? 's' : ''}</span>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gradient-to-r from-amber-100/50 dark:from-amber-900/20 via-neutral-50 dark:via-neutral-950 to-amber-100/50 dark:to-amber-900/20 border-t border-amber-500/10 bg-indian-lotus relative">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <AnimatedSection>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-neutral-900 dark:text-white mb-6">
              Come Be a Part of Our Story
            </h2>
            <Link to="/reservations" className="btn-gold text-lg">
              Reserve Your Table <ArrowRight size={18} className="ml-2" />
            </Link>
          </AnimatedSection>
        </div>
      </section>
    </div>
  );
}
