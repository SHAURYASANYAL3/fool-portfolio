import { useRef } from 'react';
import { motion, useScroll, useTransform, MotionValue } from 'framer-motion';
import { LiveProjectButton } from '../components/LiveProjectButton';
import { FadeIn } from '../components/FadeIn';

const projects = [
  {
    id: "01",
    name: "Nextlevel Studio",
    category: "Client",
    images: {
      leftTop: "https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260412_055344_5eff02e0-87a5-41ce-b64f-eb08da8f33db.png&w=1280&q=85",
      leftBottom: "https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260412_055431_11d841fd-8b41-46a5-82e4-b04f2407a7d8.png&w=1280&q=85",
      right: "https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260412_055451_e317bf2d-28d4-48cc-86b0-6f72f25b6327.png&w=1280&q=85"
    }
  },
  {
    id: "02",
    name: "Aura Brand Identity",
    category: "Personal",
    images: {
      leftTop: "https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260412_055654_911201c5-36d9-4bc6-bac7-331adfce159f.png&w=1280&q=85",
      leftBottom: "https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260412_055723_5ceda0b8-d9c2-4665-b2e3-83ba19ba76d1.png&w=1280&q=85",
      right: "https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260412_055753_adc5dcbd-a8e6-49c0-b43a-9b030d835cea.png&w=1280&q=85"
    }
  },
  {
    id: "03",
    name: "Solaris Digital",
    category: "Client",
    images: {
      leftTop: "https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260412_055759_963cfb0b-4bd1-4b0f-9d0a-09bd6cf95b2f.png&w=1280&q=85",
      leftBottom: "https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260412_060108_438f781a-9846-4dcc-89ab-c4e6cb830f5b.png&w=1280&q=85",
      right: "https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260412_055818_9d062121-ad7e-46b9-999a-1a6a692ef1ee.png&w=1280&q=85"
    }
  }
];

function ProjectCard({ project, i, progress }: { project: typeof projects[0], i: number, progress: MotionValue<number> }) {
  const targetScale = 1 - (projects.length - 1 - i) * 0.03;
  
  // Card scales down when the next cards scroll up over it
  const scale = useTransform(progress, [i * 0.25, 1], [1, targetScale]);

  return (
    <div className="h-[85vh] flex items-center justify-center sticky" style={{ top: `calc(6rem + ${i * 28}px)` }}>
      <motion.div 
        style={{ scale }}
        className="w-full max-w-6xl rounded-[40px] sm:rounded-[50px] md:rounded-[60px] border-2 border-[#D7E2EA] bg-[#0C0C0C] p-4 sm:p-6 md:p-8 flex flex-col gap-4 sm:gap-6 md:gap-8 origin-top"
      >
        {/* Top Row */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-0">
          <div className="flex items-center gap-4 sm:gap-6 md:gap-8">
            <span className="font-black leading-none text-[clamp(3rem,10vw,80px)] text-[#D7E2EA]">
              {project.id}
            </span>
            <div className="flex flex-col">
              <span className="font-light tracking-widest uppercase text-xs sm:text-sm opacity-60">
                {project.category}
              </span>
              <h3 className="font-medium uppercase text-xl sm:text-2xl md:text-3xl">
                {project.name}
              </h3>
            </div>
          </div>
          <div className="self-start md:self-auto">
            <LiveProjectButton />
          </div>
        </div>

        {/* Bottom Row - Image Grid */}
        <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 h-full min-h-0 overflow-hidden">
          {/* Left Column (40%) */}
          <div className="flex flex-col gap-4 sm:gap-6 w-full sm:w-[40%] min-h-0">
            <div className="w-full rounded-[30px] sm:rounded-[40px] md:rounded-[50px] overflow-hidden" style={{ height: 'clamp(130px, 16vw, 230px)' }}>
              <img src={project.images.leftTop} alt="Project detail 1" className="w-full h-full object-cover" />
            </div>
            <div className="w-full rounded-[30px] sm:rounded-[40px] md:rounded-[50px] overflow-hidden flex-1" style={{ minHeight: 'clamp(160px, 22vw, 340px)' }}>
              <img src={project.images.leftBottom} alt="Project detail 2" className="w-full h-full object-cover" />
            </div>
          </div>
          
          {/* Right Column (60%) */}
          <div className="w-full sm:w-[60%] rounded-[30px] sm:rounded-[40px] md:rounded-[50px] overflow-hidden h-[300px] sm:h-auto min-h-0">
            <img src={project.images.right} alt="Project main" className="w-full h-full object-cover" />
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export function ProjectsSection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end']
  });

  return (
    <section id="projects" ref={containerRef} className="bg-[#0C0C0C] rounded-t-[40px] sm:rounded-t-[50px] md:rounded-t-[60px] -mt-10 sm:-mt-12 md:-mt-14 relative z-20 px-5 sm:px-8 md:px-10 py-24 sm:py-32">
      <FadeIn y={40} className="mb-16 sm:mb-20">
        <h2 className="hero-heading font-black uppercase text-center text-[clamp(3rem,12vw,160px)] leading-none">
          Project
        </h2>
      </FadeIn>

      <div className="relative pb-[10vh]">
        {projects.map((project, i) => (
          <ProjectCard key={project.id} project={project} i={i} progress={scrollYProgress} />
        ))}
      </div>
    </section>
  );
}
