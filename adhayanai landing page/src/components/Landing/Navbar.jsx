import React, { useState, useEffect } from 'react';
import { Menu, X, Rocket, GraduationCap, ChevronDown, User, School } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const STUDENT_URL = import.meta.env.VITE_STUDENT_URL || "https://adhyanai-student.onrender.com/";
  const TEACHER_URL = import.meta.env.VITE_TEACHER_URL || "https://adhyanai-teacher.onrender.com/";

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (e, id) => {
    e.preventDefault();
    const element = document.getElementById(id);
    if (element) {
      const offset = 80; // height of navbar + some padding
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = element.getBoundingClientRect().top;
      const elementPosition = elementRect - bodyRect;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
      setIsOpen(false);
    }
  };

  return (
    <nav className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ${scrolled ? 'bg-white/90 backdrop-blur-md shadow-sm' : 'bg-transparent'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex-shrink-0 flex items-center cursor-pointer" onClick={(e) => scrollToSection(e, 'hero')}>
            <div className="w-14 to-indigo-600 flex items-center justify-center text-white">
              <img src="/logo02.png" alt="ADHYAN.AI" />
            </div>
            <span className="font-bold text-gray-900 text-xl tracking-tight">ADHYAN.AI</span>
          </div>
          
          {/* Desktop Links */}
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-8">
              {['Features', 'How It Works', 'Pricing', 'Our Team'].map((item) => (
                <a
                  key={item}
                  href={`#${item.toLowerCase().replace(/\s+/g, '-')}`}
                  onClick={(e) => scrollToSection(e, item.toLowerCase().replace(/\s+/g, '-'))}
                  className="text-gray-600 hover:text-purple-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  {item}
                </a>
              ))}
            </div>
          </div>

          {/* Desktop Right Side - Start With Dropdown */}
          <div className="hidden md:flex items-center gap-4 relative">
             <div className="relative group">
                <button 
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  onBlur={() => setTimeout(() => setIsDropdownOpen(false), 200)}
                  className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-5 py-2 rounded-full font-medium text-sm hover:shadow-lg hover:opacity-90 transition-all transform hover:-translate-y-0.5 cursor-pointer"
                >
                  Start with
                  <ChevronDown size={16} />
                </button>

                {/* Dropdown Card */}
                <div className={`absolute top-full right-0 mt-3 w-64 p-2 bg-white rounded-xl shadow-xl border border-gray-100 transform origin-top-right transition-all duration-200 ${isDropdownOpen ? 'opacity-100 scale-100 visible' : 'opacity-0 scale-95 invisible'}`}>
                  <div className="flex flex-col gap-1">
                    <a 
                      href={TEACHER_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-purple-50 transition-colors group/item"
                    >
                      <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 group-hover/item:bg-purple-200 transition-colors">
                        <User size={20} />
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">Teacher</div>
                        <div className="text-xs text-gray-500">Manage classrooms</div>
                      </div>
                    </a>
                    
                    <a 
                      href={STUDENT_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-indigo-50 transition-colors group/item"
                    >
                      <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 group-hover/item:bg-indigo-200 transition-colors">
                        <GraduationCap size={20} />
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">Student</div>
                        <div className="text-xs text-gray-500">Join learning</div>
                      </div>
                    </a>
                  </div>
                </div>
             </div>
          </div>

          {/* Mobile Menu Button */}
          <div className="-mr-2 flex md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
            >
              <span className="sr-only">Open main menu</span>
              {isOpen ? <X className="block h-6 w-6" /> : <Menu className="block h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="md:hidden bg-white border-b border-gray-100 shadow-lg overflow-hidden"
          >
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
               {['Features', 'How It Works', 'Pricing', 'About'].map((item) => (
                  <a
                    key={item}
                    href={`#${item.toLowerCase().replace(/\s+/g, '-')}`}
                    onClick={(e) => scrollToSection(e, item.toLowerCase().replace(/\s+/g, '-'))}
                    className="text-gray-600 hover:text-purple-600 block px-3 py-2 rounded-md text-base font-medium"
                  >
                    {item}
                  </a>
                ))}
            
              <div className="mt-4 pt-4 border-t border-gray-100 px-3">
                <p className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">Start With</p>
                <div className="grid grid-cols-2 gap-3">
                   <a 
                      href={TEACHER_URL}
                      className="flex flex-col items-center justify-center p-3 rounded-xl bg-purple-50 text-purple-700 border border-purple-100"
                    >
                      <User size={20} className="mb-1" />
                      <span className="text-sm font-medium">Teacher</span>
                   </a>
                   <a 
                      href={STUDENT_URL}
                      className="flex flex-col items-center justify-center p-3 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-100"
                    >
                      <GraduationCap size={20} className="mb-1" />
                      <span className="text-sm font-medium">Student</span>
                   </a>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
