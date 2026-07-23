// Blog content — hardcoded, no CMS. Keep posts here; add a new entry to grow the blog.

export type BlogBlock =
  | { type: 'p'; text: string }
  | { type: 'h2'; text: string }
  | { type: 'ul'; items: string[] }

export interface BlogPost {
  slug: string
  title: string
  description: string
  date: string // ISO
  readTime: string
  content: BlogBlock[]
}

export const blogPosts: BlogPost[] = [
  {
    slug: 'tracking-online-ibdp-myp-classes',
    title: 'How to Track Online IBDP & MYP Tuition Classes: A Parent’s Guide',
    description:
      'Paying for IBDP or MYP online tuition but not sure what actually happens in class? Here’s what transparent class tracking looks like and why it matters.',
    date: '2026-05-12',
    readTime: '4 min read',
    content: [
      { type: 'p', text: 'If your child takes online IBDP or MYP tuition, you’ve probably asked yourself: what actually happened in that hour? Was the class held on time? What topics were covered? Is my child keeping pace with the syllabus?' },
      { type: 'p', text: 'Most online tutoring still runs on trust alone — a WhatsApp message here, a verbal update there. For a subject like IBDP Physics HL or MYP Individuals & Societies, where consistency across months matters, that’s not enough.' },
      { type: 'h2', text: 'What transparent class tracking looks like' },
      { type: 'ul', items: [
        'Every class is logged with a start and end time — no guessing at duration.',
        'Screenshots or notes from the session, so you can see what was actually covered.',
        'A monthly log per subject, showing attendance and hours at a glance.',
        'Credits or hours purchased are deducted automatically as classes happen — no manual bookkeeping.',
      ] },
      { type: 'p', text: 'This is exactly what ClassLogger does for tutors and parents. A tutor starts a class from a simple floating widget (no software install needed), and when it ends, you get a shareable link with the class summary — duration, topics, and screenshots.' },
      { type: 'h2', text: 'Why this matters more for IBDP and MYP specifically' },
      { type: 'p', text: 'IBDP and MYP have tight, assessment-linked syllabi. A missed or shortened class on IA preparation or a Group 4 topic isn’t just an inconvenience — it can affect internal assessment timelines. Parents managing multiple subjects across IBDP or MYP benefit from seeing exactly how many hours each subject has actually received.' },
      { type: 'p', text: 'If you’re looking for an IBDP or MYP tutor who logs classes transparently, you can submit your requirement and we’ll match you with a vetted tutor — see our “Find a Tutor” page.' },
    ],
  },
  {
    slug: 'choosing-ibdp-myp-tutor-checklist',
    title: 'Finding the Right IBDP or MYP Tutor: A Parent’s Checklist',
    description:
      'What to actually check before hiring an IBDP or MYP tutor — beyond just subject knowledge. A practical checklist for parents.',
    date: '2026-05-28',
    readTime: '5 min read',
    content: [
      { type: 'p', text: 'IBDP and MYP tutoring is a different beast from generic tuition. The curriculum is inquiry-based, assessment criteria are specific (IB command terms, MYP criteria A–D), and a tutor who doesn’t understand the framework can do more harm than good.' },
      { type: 'h2', text: 'What to check before hiring' },
      { type: 'ul', items: [
        'IB/MYP familiarity — has the tutor actually taught the current syllabus, not just the subject in general?',
        'Assessment literacy — do they understand IA, EE, or MYP criteria-based grading, not just content delivery?',
        'Communication style — will they explain concepts your child’s way, or just re-teach the textbook?',
        'Class tracking — will you get a record of what was actually covered, or just a verbal “it went well”?',
        'Scheduling reliability — online tuition only works if classes actually happen on time, consistently.',
      ] },
      { type: 'h2', text: 'Why "transparent by default" beats trust-based tutoring' },
      { type: 'p', text: 'A good tutor won’t mind you seeing what was covered — in fact, the best ones want you to see the progress. Platforms like ClassLogger make this automatic: every class is logged, timestamped, and summarized, so there’s no need to take anyone’s word for it.' },
      { type: 'p', text: 'If you’d rather skip the search and have us match you with a vetted IBDP or MYP tutor, submit your requirement on our Find a Tutor page — tell us the subject, grade level, and preferred schedule, and we’ll take it from there.' },
    ],
  },
  {
    slug: 'what-makes-a-great-online-ib-tutor',
    title: 'What Makes a Great Online IB Tutor? (And How to Apply)',
    description:
      'Thinking about tutoring IBDP or MYP students online? Here’s what parents actually look for, and how ClassLogger’s vetted tutor program works.',
    date: '2026-06-10',
    readTime: '4 min read',
    content: [
      { type: 'p', text: 'Online IB tutoring is growing fast, and so is the number of platforms claiming to connect tutors and parents instantly, no vetting required. That’s good for volume, but it’s also why many parents are wary of open marketplaces.' },
      { type: 'h2', text: 'What separates a great IB tutor from an average one' },
      { type: 'ul', items: [
        'Genuine familiarity with the IBDP or MYP syllabus — not just the subject content, but how it’s assessed.',
        'Consistency — showing up on time, every time, for months at a stretch.',
        'Clear communication with parents — not just the student.',
        'Comfort with being tracked — confident tutors don’t mind transparent class logs.',
      ] },
      { type: 'h2', text: 'How ClassLogger’s tutor program works' },
      { type: 'p', text: 'We don’t run an open marketplace. Every tutor application is personally reviewed before approval — we look at your subject experience, IBDP/MYP familiarity, and qualifications. Once approved, you get access to ClassLogger’s class tracking tools: a floating widget to start and end classes, automatic screenshots, and shareable class summaries for parents.' },
      { type: 'p', text: 'If you teach IBDP or MYP subjects and want to tutor online with tools that make you look professional and organized from day one, apply on our Become a Tutor page.' },
    ],
  },
]

export function getPostBySlug(slug: string): BlogPost | undefined {
  return blogPosts.find(p => p.slug === slug)
}
