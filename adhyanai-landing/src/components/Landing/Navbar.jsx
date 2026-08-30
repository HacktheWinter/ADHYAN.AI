import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, GraduationCap, ChevronDown, User, Sparkles, ArrowUpRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();
  const isHomePage = location.pathname === '/';

  const STUDENT_URL = import.meta.env.VITE_STUDENT_URL || "https://student.adhyanai.tech/";
  const TEACHER_URL = import.meta.env.VITE_TEACHER_URL || "https://teacher.adhyanai.tech/login";

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleNavClick = (e, id) => {
    e.preventDefault();
    if (!isHomePage) {
      navigate(`/#${id}`);
      setTimeout(() => {
        const element = document.getElementById(id);
        if (element) {
          const offset = 80;
          const bodyRect = document.body.getBoundingClientRect().top;
          const elementRect = element.getBoundingClientRect().top;
          const offsetPosition = elementRect - bodyRect - offset;
          window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
        }
      }, 100);
    } else {
      const element = document.getElementById(id);
      if (element) {
        const offset = 80;
        const bodyRect = document.body.getBoundingClientRect().top;
        const elementRect = element.getBoundingClientRect().top;
        const offsetPosition = elementRect - bodyRect - offset;
        window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
      }
    }
    setIsOpen(false);
  };

  const navLinks = [
    { name: 'Features', id: 'features' },
    { name: 'Demo', id: 'demo' },
    { name: 'How It Works', id: 'how-it-works' },
    { name: 'Pricing', id: 'pricing' },
    { name: 'Team', id: 'our-team' },
    { name: 'FAQ', id: 'faq' }
  ];

  return (
    <header className="fixed top-0 left-0 w-full z-50 transition-all duration-300 px-4 sm:px-6 lg:px-8 pt-4">
      <nav
        className={`max-w-7xl mx-auto rounded-full transition-all duration-300 px-5 sm:px-6 py-2.5 flex items-center justify-between ${
          scrolled
            ? 'bg-white/85 backdrop-blur-xl shadow-[0_8px_30px_rgba(0,0,0,0.08)] border border-gray-200/80'
            : 'bg-white/60 backdrop-blur-md border border-white/80 shadow-xs'
        }`}
      >
        {/* Brand Logo */}
        <Link
          to="/"
          className="flex items-center gap-2.5 cursor-pointer select-none"
          onClick={(e) => {
            if (isHomePage) {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }
          }}
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-purple-500/20 p-1">
            <img src="/logo02.png" alt="ADHYAN.AI Logo" className="w-full h-full object-contain" />
          </div>
          <span className="font-extrabold text-gray-900 text-lg tracking-tight">
            ADHYAN<span className="text-purple-600">.AI</span>
          </span>
        </Link>

        {/* Desktop Navigation Links */}
        <div className="hidden md:flex items-center space-x-1 lg:space-x-2">
          {navLinks.map((item) => (
            <a
              key={item.name}
              href={`#${item.id}`}
              onClick={(e) => handleNavClick(e, item.id)}
              className="text-gray-600 hover:text-purple-600 px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors hover:bg-purple-50/80"
            >
              {item.name}
            </a>
          ))}
        </div>

        {/* Desktop Portal CTA with Dropdown */}
        <div className="hidden md:flex items-center gap-3 relative">
          <div className="relative">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              onBlur={() => setTimeout(() => setIsDropdownOpen(false), 250)}
              className="flex items-center gap-2 bg-gradient-to-r from-purple-600 via-indigo-600 to-indigo-700 text-white px-5 py-2 rounded-full font-semibold text-xs sm:text-sm shadow-md shadow-purple-500/25 hover:shadow-lg hover:shadow-purple-500/35 transform hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer"
            >
              <span>Get Started</span>
              <ChevronDown size={15} className={`transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Card */}
            <div
              className={`absolute top-full right-0 mt-2.5 w-64 p-2 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-100 transform origin-top-right transition-all duration-200 ${
                isDropdownOpen ? 'opacity-100 scale-100 visible' : 'opacity-0 scale-95 invisible'
              }`}
            >
              <div className="flex flex-col gap-1.5">
                <a
                  href={STUDENT_URL}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-purple-50/80 transition-colors group"
                >
                  <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center group-hover:bg-purple-600 group-hover:text-white transition-colors">
                    <GraduationCap size={20} />
                  </div>
                  <div>
                    <div className="font-bold text-sm text-gray-900 flex items-center gap-1">
                      Student Portal <ArrowUpRight size={13} className="text-gray-400 group-hover:text-purple-600" />
                    </div>
                    <div className="text-[11px] text-gray-500">Practice & take exams</div>
                  </div>
                </a>

                <a
                  href={TEACHER_URL}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-indigo-50/80 transition-colors group"
                >
                  <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                    <User size={20} />
                  </div>
                  <div>
                    <div className="font-bold text-sm text-gray-900 flex items-center gap-1">
                      Teacher Portal <ArrowUpRight size={13} className="text-gray-400 group-hover:text-indigo-600" />
                    </div>
                    <div className="text-[11px] text-gray-500">Create classes & grade</div>
                  </div>
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Menu Button */}
        <div className="flex md:hidden">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-2 rounded-full text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none"
            aria-label="Toggle Navigation Menu"
          >
            {isOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </nav>

      {/* Mobile Drawer & Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="md:hidden fixed inset-0 bg-gray-950/20 backdrop-blur-xs -z-10"
            />

            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              className="md:hidden mt-2 max-w-7xl mx-auto rounded-3xl bg-white/95 backdrop-blur-xl border border-gray-200/80 shadow-2xl p-4 overflow-hidden"
            >
              <div className="space-y-1 pb-3">
                {navLinks.map((item) => (
                  <a
                    key={item.name}
                    href={`#${item.id}`}
                    onClick={(e) => handleNavClick(e, item.id)}
                    className="text-gray-700 hover:text-purple-600 hover:bg-purple-50 block px-4 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer"
                  >
                    {item.name}
                  </a>
                ))}
              </div>

              <div className="pt-3 border-t border-gray-100">
                <p className="text-[11px] font-mono text-gray-400 uppercase tracking-wider mb-2 px-2">Launch Portals</p>
                <div className="grid grid-cols-2 gap-2">
                  <a
                    href={STUDENT_URL}
                    className="flex items-center justify-center gap-2 p-3 rounded-2xl bg-purple-50 hover:bg-purple-100 text-purple-700 font-semibold text-xs border border-purple-100 transition-colors"
                  >
                    <GraduationCap size={16} />
                    <span>Student</span>
                  </a>
                  <a
                    href={TEACHER_URL}
                    className="flex items-center justify-center gap-2 p-3 rounded-2xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-xs border border-indigo-100 transition-colors"
                  >
                    <User size={16} />
                    <span>Teacher</span>
                  </a>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  );
};

export default Navbar;
