"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpenCheck,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  Compass,
  GraduationCap,
  Handshake,
  Menu,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import PaceLogo from "@/components/PaceLogo";
import "./landing.css";

const journeySteps = [
  {
    label: "Explore",
    icon: Compass,
    title: "Find a direction that feels like yours.",
    description:
      "Use career information and counselor guidance to clarify your interests, strengths, and next steps.",
  },
  {
    label: "Prepare",
    icon: BookOpenCheck,
    title: "Get ready for the opportunities ahead.",
    description:
      "Build a career-focused profile, refine your resume or CV, and take part in competency evaluation.",
  },
  {
    label: "Connect",
    icon: Handshake,
    title: "Meet opportunity with support.",
    description:
      "Explore opportunities from authorized partners. A counselor endorsement is shared only with your approval.",
  },
];

const services = [
  {
    icon: CalendarDays,
    number: "01",
    eyebrow: "CAREER GUIDANCE",
    title: "Talk it through.",
    description:
      "Coordinate an appointment and keep career conversations with a counselor in reach.",
    tone: "maroon",
  },
  {
    icon: BookOpenCheck,
    number: "02",
    eyebrow: "CAREER READINESS",
    title: "Make your next step count.",
    description:
      "Work on your career profile, resume or CV, and career-related competencies.",
    tone: "gold",
  },
  {
    icon: BriefcaseBusiness,
    number: "03",
    eyebrow: "OPPORTUNITIES",
    title: "See what’s out there.",
    description:
      "Find career information and job opportunities shared by authorized organizations.",
    tone: "maroon",
  },
  {
    icon: Handshake,
    number: "04",
    eyebrow: "CONNECTIONS",
    title: "Build relationships, by choice.",
    description:
      "Student-approved counselor endorsements and voluntary alumni mentoring connect people with purpose.",
    tone: "gold",
  },
];

const audiences = [
  {
    icon: GraduationCap,
    label: "FOR STUDENTS",
    title: "Your career, your next step.",
    description:
      "Explore resources, request counselor appointments, prepare career materials, and review opportunities.",
    tone: "maroon",
  },
  {
    icon: Compass,
    label: "FOR COUNSELORS",
    title: "Guidance that stays human.",
    description:
      "Coordinate appointments, communicate with students, and support career preparation with professional judgment.",
    tone: "gold",
  },
  {
    icon: Users,
    label: "FOR ALUMNI",
    title: "Stay connected to what comes next.",
    description:
      "Maintain career-related information and choose whether to volunteer as a mentor. Mentoring is optional.",
    tone: "maroon",
  },
  {
    icon: BriefcaseBusiness,
    label: "FOR PARTNER RECRUITERS",
    title: "Connect through the Career Center.",
    description:
      "Authorized partners can share opportunities and coordinate recruitment activities within their approved access.",
    tone: "gold",
  },
];

const commitments = [
  {
    icon: BookOpenCheck,
    title: "Career-focused, not academic records",
    description:
      "PACE is not connected to official MSU–IIT academic records.",
  },
  {
    icon: Compass,
    title: "Counselor-led, not automated",
    description:
      "Career decisions and recommendations remain guided by people.",
  },
  {
    icon: Check,
    title: "Your say before an endorsement",
    description:
      "A proposed counselor endorsement is shared only if the student approves.",
  },
  {
    icon: ShieldCheck,
    title: "Access with purpose",
    description:
      "Recruiter access is authorized and limited to relevant platform functions.",
  },
];

function Reveal({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial={reduceMotion ? false : { opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

function JourneyGuide() {
  const [activeStep, setActiveStep] = useState(0);
  const reduceMotion = useReducedMotion();
  const currentStep = journeySteps[activeStep];
  const CurrentIcon = currentStep.icon;

  return (
    <section className="pace-journey-card" aria-labelledby="pace-journey-heading">
      <div className="pace-journey-heading">
        <div>
          <p className="pace-card-kicker">A CAREER JOURNEY, WITH SUPPORT</p>
          <h2 id="pace-journey-heading">Where would you like to begin?</h2>
        </div>
        <span className="pace-card-mark" aria-hidden="true">P</span>
      </div>

      <div className="pace-route-map" role="group" aria-label="Three connected stages of career development">
        <svg
          className="pace-route-line"
          viewBox="0 0 480 190"
          fill="none"
          aria-hidden="true"
          preserveAspectRatio="none"
        >
          <path
            d="M48 140C116 142 154 48 240 48C326 48 364 142 432 140"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray="2 10"
          />
        </svg>
        {journeySteps.map(({ icon: Icon, label }, index) => (
          <button
            key={label}
            type="button"
            className={`pace-route-stop pace-route-stop-${index + 1}${activeStep === index ? " is-active" : ""}`}
            onClick={() => setActiveStep(index)}
            aria-pressed={activeStep === index}
          >
            <span className="pace-route-icon"><Icon size={20} strokeWidth={1.8} /></span>
            <span className="pace-route-label">{label}</span>
          </button>
        ))}
        <span className="pace-route-spark pace-route-spark-one" aria-hidden="true">✳</span>
        <span className="pace-route-spark pace-route-spark-two" aria-hidden="true">✳</span>
      </div>

      <div className="pace-journey-detail" aria-live="polite">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={currentStep.label}
            className="pace-journey-detail-inner"
            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <span className="pace-journey-detail-icon"><CurrentIcon size={19} /></span>
            <div>
              <p className="pace-journey-detail-title">{currentStep.title}</p>
              <p className="pace-journey-detail-copy">{currentStep.description}</p>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
      <p className="pace-journey-note">An overview of PACE services—not personal progress tracking.</p>
    </section>
  );
}

export default function PaceLandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);

  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <main id="pace-landing">
      <header className="pace-header">
        <div className="pace-container pace-header-inner">
          <Link href="/" aria-label="PACE MSU–IIT home" className="pace-brand">
            <span className="pace-brand-logo"><PaceLogo size={42} showText={false} /></span>
            <span className="pace-brand-copy">
              <strong>P.A.C.E.</strong>
              <small>MSU–IIT CAREER CENTER</small>
            </span>
          </Link>

          <nav aria-label="Main navigation" className="pace-desktop-nav">
            <a href="#services">Career services</a>
            <a href="#community">Who it serves</a>
            <a href="#principles">Our approach</a>
          </nav>

          <div className="pace-header-actions">
            <Link href="/auth/login" className="pace-sign-in">Sign in</Link>
            <Link href="/auth/register" className="pace-header-cta">
              Create an account <ArrowUpRight size={15} />
            </Link>
          </div>

          <button
            type="button"
            className="pace-menu-toggle"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X size={21} /> : <Menu size={21} />}
          </button>
        </div>

        {menuOpen && (
          <nav id="pace-mobile-nav" aria-label="Mobile navigation" className="pace-mobile-nav">
            <a href="#services" onClick={closeMenu}>Career services <ArrowRight size={16} /></a>
            <a href="#community" onClick={closeMenu}>Who it serves <ArrowRight size={16} /></a>
            <a href="#principles" onClick={closeMenu}>Our approach <ArrowRight size={16} /></a>
            <Link href="/auth/login" onClick={closeMenu}>Sign in <ArrowUpRight size={16} /></Link>
            <Link href="/auth/register" onClick={closeMenu}>Create an account <ArrowUpRight size={16} /></Link>
          </nav>
        )}
      </header>

      <section className="pace-hero">
        <div className="pace-hero-decoration pace-hero-decoration-one" aria-hidden="true" />
        <div className="pace-hero-decoration pace-hero-decoration-two" aria-hidden="true" />
        <div className="pace-container pace-hero-grid">
          <div className="pace-hero-copy">
            <p className="pace-eyebrow"><span /> MSU–IIT OFFICE OF GUIDANCE AND COUNSELING</p>
            <h1>
              A clearer route
              <span>from campus to career.</span>
            </h1>
            <p className="pace-hero-description">
              PACE brings students, counselors, alumni, and authorized partner recruiters
              together around career guidance, preparation, and opportunity.
            </p>
            <div className="pace-hero-actions">
              <Link href="/auth/register" className="pace-button pace-button-primary">
                Start with PACE <ArrowRight size={17} />
              </Link>
              <a href="#services" className="pace-button pace-button-secondary">
                Explore career services <span aria-hidden="true">↓</span>
              </a>
            </div>
            <p className="pace-hero-note">
              <ShieldCheck size={16} /> A university career service, designed around people.
            </p>
          </div>
          <JourneyGuide />
        </div>
        <div className="pace-hero-bottom" aria-hidden="true">
          <span>EXPLORE</span><span className="pace-scroll-line" />
        </div>
      </section>

      <section id="services" className="pace-section pace-services">
        <div className="pace-container">
          <Reveal className="pace-section-intro">
            <div>
              <p className="pace-eyebrow">ONE CONNECTED CAREER SERVICE</p>
              <h2>Make room for what comes next.</h2>
            </div>
            <p className="pace-section-lede">
              Career development is more than finding a job. PACE is designed to bring
              guidance, preparation, and meaningful connections into one place.
            </p>
          </Reveal>

          <div className="pace-service-grid">
            {services.map(({ icon: Icon, number, eyebrow, title, description, tone }, index) => (
              <Reveal key={number} delay={index * 0.06}>
                <article className={`pace-service-card pace-tone-${tone}`}>
                  <div className="pace-service-card-top">
                    <span className="pace-service-icon"><Icon size={21} strokeWidth={1.8} /></span>
                    <span className="pace-service-number">{number}</span>
                  </div>
                  <p className="pace-card-kicker">{eyebrow}</p>
                  <h3>{title}</h3>
                  <p className="pace-card-copy">{description}</p>
                  <span className="pace-card-arrow" aria-hidden="true"><ArrowUpRight size={18} /></span>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section id="community" className="pace-section pace-community">
        <div className="pace-container">
          <Reveal className="pace-community-heading">
            <p className="pace-eyebrow">A SHARED CAREER CENTER</p>
            <h2>Different roles.<br /><span>One community moving forward.</span></h2>
            <p>
              Each person has a part to play—and a workspace shaped around what they need.
            </p>
          </Reveal>

          <div className="pace-audience-grid">
            {audiences.map(({ icon: Icon, label, title, description, tone }, index) => (
              <Reveal key={label} delay={index * 0.05}>
                <article className={`pace-audience-card pace-tone-${tone}`}>
                  <span className="pace-audience-icon"><Icon size={22} strokeWidth={1.8} /></span>
                  <p className="pace-card-kicker">{label}</p>
                  <h3>{title}</h3>
                  <p className="pace-card-copy">{description}</p>
                  <Link href="/auth/login" className="pace-text-link">
                    Go to your workspace <ArrowRight size={16} />
                  </Link>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section id="principles" className="pace-principles">
        <div className="pace-container pace-principles-grid">
          <Reveal className="pace-principles-copy">
            <p className="pace-eyebrow">BUILT WITH CARE</p>
            <h2>Career growth should open doors—not make decisions for you.</h2>
            <p>
              PACE supports the people and processes behind career development. It does
              not replace a counselor’s judgment or take away a student’s choice.
            </p>
            <Link href="/auth/login" className="pace-principles-link">
              Access your workspace <ArrowRight size={17} />
            </Link>
          </Reveal>
          <div className="pace-commitment-list">
            {commitments.map(({ icon: Icon, title, description }, index) => (
              <Reveal key={title} delay={index * 0.05}>
                <article className="pace-commitment">
                  <span className="pace-commitment-icon"><Icon size={19} /></span>
                  <div>
                    <h3>{title}</h3>
                    <p>{description}</p>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="pace-closing">
        <Reveal className="pace-container pace-closing-panel">
          <div>
            <p className="pace-eyebrow">YOUR NEXT STEP STARTS HERE</p>
            <h2>Let’s make it a little clearer.</h2>
            <p>Sign in to find the PACE services available to your account.</p>
          </div>
          <Link href="/auth/login" className="pace-button pace-button-primary">
            Sign in to PACE <ArrowRight size={17} />
          </Link>
        </Reveal>
      </section>

      <footer className="pace-footer">
        <div className="pace-container pace-footer-inner">
          <Link href="/" aria-label="PACE MSU–IIT home" className="pace-brand pace-footer-brand">
            <span className="pace-brand-logo"><PaceLogo size={36} showText={false} /></span>
            <span className="pace-brand-copy">
              <strong>P.A.C.E.</strong>
              <small>MSU–IIT CAREER CENTER</small>
            </span>
          </Link>
          <p>Office of Guidance and Counseling · Mindanao State University–Iligan Institute of Technology</p>
          <Link href="/auth/login" className="pace-footer-link">Portal sign in <ArrowUpRight size={15} /></Link>
        </div>
      </footer>
    </main>
  );
}
