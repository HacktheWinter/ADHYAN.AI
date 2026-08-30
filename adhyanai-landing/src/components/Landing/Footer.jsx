import React from "react";
import { Link } from "react-router-dom";
import { Mail, Phone, MapPin, ArrowUpRight, Github, Twitter, Linkedin, Instagram } from "lucide-react";

const Footer = () => {
  const scrollToSection = (e, id) => {
    e.preventDefault();
    const element = document.getElementById(id);
    if (element) {
      const offset = 80;
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = element.getBoundingClientRect().top;
      const elementPosition = elementRect - bodyRect;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  return (
    <footer className="bg-gray-950 border-t border-gray-800 text-gray-400 pt-12 pb-8 sm:pt-16 sm:pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Main Grid: Responsive 3-col on Mobile & 5-col on Desktop */}
        <div className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-5 gap-y-8 gap-x-4 sm:gap-8 lg:gap-10 mb-8 sm:mb-12">

          {/* Brand & Description Column (Spans full width on mobile/tablet, 2 cols on lg) */}
          <div className="col-span-3 sm:col-span-3 lg:col-span-2">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-purple-500/20 p-1">
                <img src="/logo02.png" alt="ADHYAN.AI" className="w-full h-full object-contain" />
              </div>
              <span className="font-extrabold text-white text-lg sm:text-xl tracking-tight">
                ADHYAN<span className="text-purple-500">.AI</span>
              </span>
            </div>

            <p className="text-gray-400 text-xs sm:text-sm leading-relaxed max-w-sm mb-4">
              Empowering learners and educators with intelligent AI assessment generation, live classrooms, and automated semantic grading.
            </p>

            {/* Direct Contacts */}
            <div className="space-y-2 text-xs sm:text-sm mb-4">
              <div className="flex items-center gap-2 text-gray-300">
                <Mail size={14} className="text-purple-400 shrink-0" />
                <a href="mailto:adhyan.ai.73@gmail.com" className="hover:text-purple-400 transition-colors truncate">
                  adhyan.ai.73@gmail.com
                </a>
              </div>
              <div className="flex items-center gap-2 text-gray-300">
                <Phone size={14} className="text-purple-400 shrink-0" />
                <a href="tel:+918294083237" className="hover:text-purple-400 transition-colors">
                  +91 82940 83237
                </a>
                <span className="text-gray-600">/</span>
                <a href="tel:+919690621247" className="hover:text-purple-400 transition-colors">
                  +91 96906 21247
                </a>
              </div>
            </div>

            {/* Social Media Icons */}
            <div className="flex items-center gap-3.5">
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-purple-400 transition-colors" aria-label="Twitter">
                <Twitter size={16} />
              </a>
              <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-purple-400 transition-colors" aria-label="GitHub">
                <Github size={16} />
              </a>
              <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-purple-400 transition-colors" aria-label="LinkedIn">
                <Linkedin size={16} />
              </a>
              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-purple-400 transition-colors" aria-label="Instagram">
                <Instagram size={16} />
              </a>
            </div>
          </div>

          {/* Column 1: Product */}
          <div className="col-span-1">
            <h4 className="font-bold text-white text-xs sm:text-sm uppercase tracking-wider mb-3 font-mono">Product</h4>
            <ul className="space-y-2 text-xs sm:text-sm">
              <li>
                <a href="#features" onClick={(e) => scrollToSection(e, 'features')} className="hover:text-purple-400 transition-colors">
                  Features
                </a>
              </li>
              <li>
                <a href="#pricing" onClick={(e) => scrollToSection(e, 'pricing')} className="hover:text-purple-400 transition-colors">
                  Pricing
                </a>
              </li>
              <li>
                <a href="#features" onClick={(e) => scrollToSection(e, 'features')} className="hover:text-purple-400 transition-colors">
                  For Schools
                </a>
              </li>
              <li>
                <a href="#our-team" onClick={(e) => scrollToSection(e, 'our-team')} className="hover:text-purple-400 transition-colors">
                  Team
                </a>
              </li>
            </ul>
          </div>

          {/* Column 2: Resources */}
          <div className="col-span-1">
            <h4 className="font-bold text-white text-xs sm:text-sm uppercase tracking-wider mb-3 font-mono">Resources</h4>
            <ul className="space-y-2 text-xs sm:text-sm">
              <li>
                <a href="#demo" onClick={(e) => scrollToSection(e, 'demo')} className="hover:text-purple-400 transition-colors">
                  Simulator
                </a>
              </li>
              <li>
                <a href="#faq" onClick={(e) => scrollToSection(e, 'faq')} className="hover:text-purple-400 transition-colors">
                  Help Center
                </a>
              </li>
              <li>
                <a href="#how-it-works" onClick={(e) => scrollToSection(e, 'how-it-works')} className="hover:text-purple-400 transition-colors">
                  Workflow
                </a>
              </li>
              <li>
                <a href="mailto:adhyan.ai.73@gmail.com" className="hover:text-purple-400 transition-colors">
                  Support
                </a>
              </li>
            </ul>
          </div>

          {/* Column 3: Company */}
          <div className="col-span-1">
            <h4 className="font-bold text-white text-xs sm:text-sm uppercase tracking-wider mb-3 font-mono">Company</h4>
            <ul className="space-y-2 text-xs sm:text-sm">
              <li>
                <a href="#our-team" onClick={(e) => scrollToSection(e, 'our-team')} className="hover:text-purple-400 transition-colors">
                  About Us
                </a>
              </li>
              <li>
                <Link to="/privacy" className="hover:text-purple-400 transition-colors">
                  Privacy
                </Link>
              </li>
              <li>
                <Link to="/terms" className="hover:text-purple-400 transition-colors">
                  Terms
                </Link>
              </li>
              <li>
                <a href="mailto:adhyan.ai.73@gmail.com" className="hover:text-purple-400 transition-colors">
                  Contact
                </a>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-900 pt-6 flex flex-col sm:flex-row justify-between items-center gap-3 text-[11px] sm:text-xs text-gray-500">
          <p>
            &copy; {new Date().getFullYear()} ADHYAN.AI. All rights reserved.
          </p>
          <div className="flex items-center gap-4 sm:gap-6">
            <Link to="/privacy" className="hover:text-gray-300 transition-colors">
              Privacy Policy
            </Link>
            <Link to="/terms" className="hover:text-gray-300 transition-colors">
              Terms of Service
            </Link>
            <a href="mailto:adhyan.ai.73@gmail.com" className="hover:text-gray-300 transition-colors">
              Contact Desk
            </a>
          </div>
        </div>

      </div>
    </footer>
  );
};

export default Footer;
