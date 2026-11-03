// BIZEASE DESK: the six desks. Safe to import in server and client code (no file access here).
export const DESK_NAME = 'BIZEASE DESK';

export const DESKS = [
  {
    slug: 'documents',
    name: 'Document Desk',
    icon: 'file',
    blurb: 'Invoices, quotations, vouchers, receipts and HR letters you can fill in and print or save as PDF.',
    planned: ['Overtime Calculator', 'Gratuity and Provident Fund Calculator', 'Agreement drafts'],
  },
  {
    slug: 'compliance',
    name: 'Compliance Desk',
    icon: 'shield',
    blurb: 'FBR and SECP due dates, company registration cost and compliance checklists for Pakistani businesses.',
    planned: ['Pakistan Compliance Calendar', 'Company Registration Cost', 'FBR Due Dates', 'Compliance Checker', 'Internal Audit Checklist', 'Board Meeting Minutes'],
  },
  {
    slug: 'cfo',
    name: 'CFO Desk',
    icon: 'trend',
    blurb: 'Financial statement analysis plus cash flow, working capital, budget and valuation tools for owners and finance teams.',
    planned: ['Loan Eligibility Estimator', 'Franchise ROI', 'KPI Dashboard Builder'],
    extra: [{ href: '/cfo-desk/', name: 'Financial Statement Analyzer', desc: 'Upload your statements and get ratios, strengths and weak areas.' }],
  },
  {
    slug: 'industry',
    name: 'Industry Desk',
    icon: 'building',
    blurb: 'Calculators for shops, property and construction, online sellers and freelancers, and restaurants.',
    planned: ['Construction Cost', 'Cement, Sand and Bricks'],
  },
  {
    slug: 'life',
    name: 'Life & Career Desk',
    icon: 'user',
    blurb: 'Budget, fuel, electricity and solar calculators, a CV builder, and GPA tools for students.',
    planned: ['Monthly Budget', 'Fuel Average', 'Electricity Bill', 'Solar ROI', 'CV Builder', 'GPA and CGPA'],
  },
  {
    slug: 'ai',
    name: 'AI Desk',
    icon: 'msg',
    blurb: 'AI helpers for business plans, letters and report explanations. Coming after the free tools.',
    planned: ['Business Plan Generator', 'Financial Report Explainer', 'Letter Writer', 'SWOT Analyzer'],
    soon: true,
  },
];

export const deskBySlug = (s) => DESKS.find((d) => d.slug === s) || null;
export const deskHref = (d) => `/desk/${d.slug}/`;
export const toolHref = (t) => `/desk/${t.desk}/${t.slug}/`;
