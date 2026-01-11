import React from 'react';
import Navbar from '../components/Landing/Navbar';
import Features from '../components/Landing/Features';
import HowItWorks from '../components/Landing/HowItWorks';
import Demo from '../components/Landing/Demo';
import Stats from '../components/Landing/Stats';
import Testimonials from '../components/Landing/Testimonials';
import Pricing from '../components/Landing/Pricing';
import FAQ from '../components/Landing/FAQ';
import FinalCTA from '../components/Landing/FinalCTA';
import Footer from '../components/Landing/Footer';
import Hero from '../components/Landing/Hero';

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-gray-50 overflow-x-hidden">
      <Navbar />
      <main>
        <Hero />
        <Features />
        <HowItWorks />
        <Demo />
        <Stats />
        <Testimonials />
        <Pricing />
        <FAQ />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
};

export default LandingPage;
