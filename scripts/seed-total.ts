import { createClient } from "@supabase/supabase-js";
import { v4 as uuidv4 } from "uuid";
import { addWorkdays } from "../lib/workday-helper";  // (start, workdays, tenantCountry, userCountry, timezone, extraHolidays)

const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL || '');
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
const ORG_ID = "TNT-SEED26";

const safe = async (table: string, data: any) => {
  const { error } = await supabase.from(table).insert(data);
  if (error) { console.error(`❌ [${table}]:`, error.message); throw error; }
};

// ══════════════════════════════════════════════════════════════════
// DATA BLUEPRINTS
// ══════════════════════════════════════════════════════════════════

const JOB_TITLES = [
  { title: "Branch Manager", family: "Core", scope: "US" },
  { title: "Non-Producing Branch Manager", family: "Core", scope: "US" },
  { title: "Market Leader", family: "Core", scope: "US" },
  { title: "Loan Officer", family: "Core", scope: "US" },
  { title: "Processor", family: "Operations", scope: "COL" },
  { title: "Loan Officer Assistant", family: "Operations", scope: "COL" },
  { title: "Business Developer", family: "Operations", scope: "COL" },
  { title: "Finance Manager", family: "Administrative", scope: "Admin" },
  { title: "HR Manager", family: "Administrative", scope: "Admin" },
  { title: "Finance Analyst", family: "Administrative", scope: "Admin" },
  { title: "HR Analyst", family: "Administrative", scope: "Admin" },
];

const ROLE_SPECIALIZATIONS: Record<string, string[]> = {
  "Branch Manager": ["Senior Branch Manager - East Coast", "Branch Manager - Southeast Region", "Branch Manager - West Coast"],
  "Non-Producing Branch Manager": ["NPBM - Florida Division", "NPBM - Texas Division"],
  "Market Leader": ["Market Leader - Northeast", "Market Leader - Southwest", "Market Leader - Midwest"],
  "Loan Officer": ["Senior Loan Officer - FHA Specialist", "Loan Officer - VA Specialist", "Junior Loan Officer - Conventional", "Loan Officer - Jumbo Products"],
  "Processor": ["Senior Processor - Compliance", "Processor - Underwriting Support", "Junior Processor"],
  "Loan Officer Assistant": ["LOA - Pipeline Coordinator", "LOA - Document Specialist", "LOA - Client Relations"],
  "Business Developer": ["BD - Realtor Partnerships", "BD - Builder Accounts", "BD - Digital Marketing"],
  "Finance Manager": ["Finance Manager - P&L Offshore", "Finance Manager - Treasury"],
  "HR Manager": ["HR Manager - Recruitment", "HR Manager - Payroll & Benefits"],
  "Finance Analyst": ["Financial Analyst - FP&A", "Financial Analyst - Cost Control"],
  "HR Analyst": ["HR Analyst - People Analytics", "HR Analyst - Compliance & Audit"],
};

const DISTRIBUTION = [
  { title: "Branch Manager", count: 8, lat: false },
  { title: "Non-Producing Branch Manager", count: 5, lat: false },
  { title: "Market Leader", count: 5, lat: false },
  { title: "Loan Officer", count: 20, lat: false },
  { title: "Processor", count: 10, lat: true },
  { title: "Loan Officer Assistant", count: 10, lat: true },
  { title: "Business Developer", count: 10, lat: true },
  { title: "Finance Manager", count: 5, lat: true },
  { title: "HR Manager", count: 5, lat: true },
  { title: "Finance Analyst", count: 10, lat: true },
  { title: "HR Analyst", count: 12, lat: true },
];

const LAT_FIRST = ["Carlos","María","Juan","Ana","Luis","Sofía","Diego","Valeria","Jorge","Camila","Andrés","Laura","Santiago","Isabella","Julián","Natalia","Sebastián","Daniela","Alejandro","Gabriela"];
const LAT_LAST = ["Mendoza","García","Martínez","López","González","Pérez","Rodríguez","Sánchez","Ramírez","Torres","Flores","Rivera","Gómez","Herrera","Cruz","Morales"];
const US_FIRST = ["James","Sarah","Michael","Emily","David","Jessica","John","Ashley","Robert","Amanda","Christopher","Nicole","Matthew","Stephanie","Daniel","Megan","Andrew","Lauren","Joshua","Rachel"];
const US_LAST = ["Smith","Johnson","Williams","Brown","Jones","Miller","Davis","Wilson","Anderson","Thomas","Jackson","White","Harris","Martin","Thompson","Garcia","Robinson","Clark","Lewis","Lee"];

const EPS_LIST = ["Sura EPS","Nueva EPS","Sanitas","Compensar","Coomeva","Famisanar"];
const AFP_LIST = ["Porvenir","Protección","Colfondos","Old Mutual"];
const ARL_LIST = ["Sura ARL","Positiva","Colmena","Liberty"];
const CCF_LIST = ["Compensar","Cafam","Comfenalco","Colsubsidio"];
const BLOOD_TYPES = ["O+","O-","A+","A-","B+","B-","AB+","AB-"];
const SHIRT_SIZES = ["XS","S","M","L","XL","XXL"];

function rnd<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function rndInt(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }

// ══════════════════════════════════════════════════════════════════
// PLAYBOOK TEMPLATES (Rich metadata)
// ══════════════════════════════════════════════════════════════════

const PLAYBOOK_TEMPLATES = [
  { name: "US Core Mortgage Origination", type: "CORE", family: "COMMERCIAL", strategy: "B2B", purpose: "Standard mortgage origination workflow for US-based Loan Officers including lead intake, pre-qualification, and closing coordination.", owners: ["Branch Manager","Market Leader"],
    steps: [
      { name: "LEAD INTAKE & CRM ENTRY", activity: "DATA ENTRY", purpose: "Capture lead information from all channels into CRM within 2 hours of receipt", deliverable: "CRM RECORD CREATED", deliverable_desc: "Complete lead profile with contact info, loan type interest, and source tracking", stakeholder: "Loan Officer", sla: "RESPONSE TIME < 2 HOURS", sla_desc: "All inbound leads must be logged within 2 business hours", freq: "DAILY", reps: 1, day: 0 },
      { name: "PRE-QUALIFICATION CALL", activity: "CALL", purpose: "Conduct initial phone screening to assess borrower eligibility and loan product fit", deliverable: "PRE-QUAL ASSESSMENT", deliverable_desc: "Documented assessment with income range, credit score estimate, and recommended products", stakeholder: "Loan Officer", sla: "COMPLETION WITHIN 24H", sla_desc: "Pre-qual call must happen within 1 business day of lead intake", freq: "DAILY", reps: 1, day: 1 },
      { name: "DOCUMENT COLLECTION", activity: "EMAIL", purpose: "Send document checklist to borrower and track submission status", deliverable: "DOCUMENT PACKAGE", deliverable_desc: "Complete package including W2s, pay stubs, bank statements, and tax returns", stakeholder: "Loan Officer Assistant", sla: "FULL PACKAGE IN 5 DAYS", sla_desc: "All required documents collected within 5 business days", freq: "DAILY", reps: 5, day: 2 },
      { name: "CREDIT PULL & ANALYSIS", activity: "SYSTEM", purpose: "Pull tri-merge credit report and analyze for loan eligibility", deliverable: "CREDIT ANALYSIS REPORT", deliverable_desc: "Tri-merge report with score analysis, tradeline review, and risk flags", stakeholder: "Processor", sla: "SAME DAY TURNAROUND", sla_desc: "Credit analysis completed same business day as document package completion", freq: "WEEKLY", reps: 1, day: 7 },
      { name: "LOAN APPLICATION SUBMISSION", activity: "SYSTEM", purpose: "Submit complete 1003 application to underwriting", deliverable: "1003 APPLICATION", deliverable_desc: "Complete Uniform Residential Loan Application with all supporting documentation", stakeholder: "Processor", sla: "SUBMIT WITHIN 48H", sla_desc: "Application submitted within 2 business days of credit analysis", freq: "WEEKLY", reps: 1, day: 10 },
      { name: "UNDERWRITING REVIEW FOLLOW-UP", activity: "CALL", purpose: "Track underwriting status and resolve conditions", deliverable: "CONDITIONS CLEARED", deliverable_desc: "All underwriting conditions addressed and cleared for closing", stakeholder: "Processor", sla: "CLEAR IN 10 DAYS", sla_desc: "All conditions cleared within 10 business days of submission", freq: "DAILY", reps: 10, day: 15 },
      { name: "CLOSING COORDINATION", activity: "EMAIL", purpose: "Coordinate closing date, title company, and final document review", deliverable: "CLOSING PACKAGE", deliverable_desc: "Complete closing disclosure, title commitment, and settlement statement", stakeholder: "Loan Officer", sla: "CLOSE WITHIN 30 DAYS", sla_desc: "Loan closes within 30 business days of application", freq: "WEEKLY", reps: 2, day: 25 },
      { name: "POST-CLOSE QUALITY CHECK", activity: "REVIEW", purpose: "Verify all post-closing documents are complete and compliant", deliverable: "QC CERTIFICATION", deliverable_desc: "Quality control sign-off confirming regulatory compliance", stakeholder: "Branch Manager", sla: "QC WITHIN 48H POST-CLOSE", sla_desc: "Quality review completed within 2 days after closing", freq: "MONTHLY", reps: 1, day: 30 },
    ]},
  { name: "Realtor Partnership Development", type: "GROWTH", family: "COMMERCIAL", strategy: "B2B", purpose: "Strategic outreach and relationship-building program for developing referral partnerships with real estate agents.", owners: ["Business Developer","Branch Manager"],
    steps: [
      { name: "MARKET RESEARCH & TARGET LIST", activity: "RESEARCH", purpose: "Identify top-producing realtors in target geography", deliverable: "TARGET LIST", deliverable_desc: "Ranked list of 50 realtors by production volume with contact details", stakeholder: "Business Developer", sla: "LIST READY IN 3 DAYS", sla_desc: "Completed target list within 3 business days", freq: "MONTHLY", reps: 1, day: 0 },
      { name: "INITIAL OUTREACH CAMPAIGN", activity: "EMAIL", purpose: "Execute personalized email sequence to target realtors", deliverable: "OUTREACH REPORT", deliverable_desc: "Email campaign metrics: open rates, response rates, meetings booked", stakeholder: "Business Developer", sla: "50 CONTACTS PER WEEK", sla_desc: "Minimum 50 personalized outreach emails sent weekly", freq: "WEEKLY", reps: 4, day: 3 },
      { name: "DISCOVERY MEETING", activity: "MEETING", purpose: "Conduct face-to-face or virtual meeting to understand realtor needs", deliverable: "MEETING NOTES", deliverable_desc: "Documented pain points, current lender relationships, and volume expectations", stakeholder: "Business Developer", sla: "5 MEETINGS PER WEEK", sla_desc: "Minimum 5 discovery meetings scheduled and completed weekly", freq: "WEEKLY", reps: 4, day: 10 },
      { name: "CO-MARKETING PROPOSAL", activity: "PRESENTATION", purpose: "Present co-branded marketing plan and value proposition", deliverable: "PARTNERSHIP DECK", deliverable_desc: "Custom co-marketing proposal with ROI projections", stakeholder: "Market Leader", sla: "PROPOSAL IN 48H", sla_desc: "Custom proposal delivered within 48 hours of discovery meeting", freq: "WEEKLY", reps: 1, day: 20 },
      { name: "PARTNERSHIP ACTIVATION", activity: "SYSTEM", purpose: "Onboard new realtor partner into CRM and set up referral tracking", deliverable: "ACTIVE PARTNERSHIP", deliverable_desc: "CRM profile created, referral link generated, co-marketing materials delivered", stakeholder: "Business Developer", sla: "ACTIVATE IN 5 DAYS", sla_desc: "New partner fully activated within 5 business days of agreement", freq: "MONTHLY", reps: 1, day: 25 },
      { name: "MONTHLY PERFORMANCE REVIEW", activity: "REPORT", purpose: "Review referral volume and partnership health metrics", deliverable: "PARTNER SCORECARD", deliverable_desc: "Monthly scorecard with referral count, conversion rate, and revenue generated", stakeholder: "Branch Manager", sla: "REVIEW BY 5TH OF MONTH", sla_desc: "Monthly review completed by the 5th business day", freq: "MONTHLY", reps: 1, day: 30 },
    ]},
  { name: "Offshore Operations Onboarding", type: "CORE", family: "OPERATIONAL", strategy: "B2B", purpose: "Structured 90-day onboarding for new Colombian operations staff, ensuring cultural alignment and technical readiness.", owners: ["HR Manager","Finance Manager"],
    steps: [
      { name: "HR INTAKE & CONTRACT SIGNING", activity: "MEETING", purpose: "Complete all legal employment documentation and orientation", deliverable: "SIGNED CONTRACT", deliverable_desc: "Employment contract, NDA, benefits enrollment form, and IT access request", stakeholder: "HR Manager", sla: "DAY 1 COMPLETION", sla_desc: "All intake documents signed on first business day", freq: "DAILY", reps: 1, day: 0 },
      { name: "SYSTEMS ACCESS PROVISIONING", activity: "SYSTEM", purpose: "Set up email, CRM, LOS, and internal tool access", deliverable: "ACCESS CREDENTIALS", deliverable_desc: "Active accounts for email, CRM, LOS, Slack, and project management tools", stakeholder: "HR Analyst", sla: "ACCESS IN 24H", sla_desc: "All system access provisioned within 24 hours of contract signing", freq: "DAILY", reps: 1, day: 1 },
      { name: "COMPLIANCE TRAINING MODULE", activity: "TRAINING", purpose: "Complete mandatory compliance and data security training", deliverable: "TRAINING CERTIFICATE", deliverable_desc: "Certificates for HIPAA awareness, data handling, and company policy modules", stakeholder: "HR Analyst", sla: "COMPLETE IN 5 DAYS", sla_desc: "All mandatory training completed within first 5 business days", freq: "DAILY", reps: 5, day: 2 },
      { name: "ROLE-SPECIFIC SHADOWING", activity: "TRAINING", purpose: "Shadow senior team member for hands-on process learning", deliverable: "SHADOW LOG", deliverable_desc: "Documented daily activities observed with mentor sign-off", stakeholder: "Processor", sla: "10 DAY SHADOW PERIOD", sla_desc: "Complete 10 business days of guided shadowing", freq: "DAILY", reps: 10, day: 7 },
      { name: "FIRST SOLO CASE ASSIGNMENT", activity: "TASK", purpose: "Process first independent case under supervisor review", deliverable: "COMPLETED CASE FILE", deliverable_desc: "First independently processed case with supervisor quality review", stakeholder: "Processor", sla: "FIRST CASE BY DAY 20", sla_desc: "First solo case assignment completed by business day 20", freq: "WEEKLY", reps: 1, day: 20 },
      { name: "30-DAY PERFORMANCE CHECK-IN", activity: "REVIEW", purpose: "Formal performance review at 30-day milestone", deliverable: "30-DAY REVIEW", deliverable_desc: "Written performance assessment with KPI baseline and development plan", stakeholder: "HR Manager", sla: "REVIEW ON DAY 30", sla_desc: "Formal review conducted on or before business day 30", freq: "MONTHLY", reps: 1, day: 30 },
      { name: "60-DAY COMPETENCY ASSESSMENT", activity: "REVIEW", purpose: "Evaluate technical competency and process adherence", deliverable: "COMPETENCY SCORECARD", deliverable_desc: "Scored assessment across 8 competency dimensions with pass/fail", stakeholder: "HR Manager", sla: "ASSESSMENT BY DAY 60", sla_desc: "Full competency assessment completed by business day 60", freq: "MONTHLY", reps: 1, day: 60 },
      { name: "90-DAY GRADUATION", activity: "MEETING", purpose: "Final probationary review and full team integration", deliverable: "GRADUATION CERTIFICATE", deliverable_desc: "Official completion of onboarding program with permanent role confirmation", stakeholder: "HR Manager", sla: "GRADUATE BY DAY 90", sla_desc: "Onboarding graduation ceremony by business day 90", freq: "MONTHLY", reps: 1, day: 90 },
    ]},
  { name: "SLA Communication Excellence", type: "CORE", family: "OPERATIONAL", strategy: "B2B", purpose: "Enforce strict communication SLAs across all client-facing roles to maintain HOMESI's Promise of Certainty.", owners: ["Branch Manager","Market Leader"],
    steps: [
      { name: "DAILY PIPELINE STATUS UPDATE", activity: "EMAIL", purpose: "Send proactive status updates to all active borrowers", deliverable: "STATUS EMAIL SENT", deliverable_desc: "Personalized email update for each active loan in pipeline", stakeholder: "Loan Officer", sla: "DAILY BY 4PM EST", sla_desc: "All pipeline updates sent before 4 PM Eastern daily", freq: "DAILY", reps: 20, day: 0 },
      { name: "INBOUND RESPONSE PROTOCOL", activity: "CALL", purpose: "Return all client calls and emails within SLA window", deliverable: "RESPONSE LOG", deliverable_desc: "Logged response to every inbound communication with timestamp", stakeholder: "Loan Officer", sla: "RESPOND IN < 2 HOURS", sla_desc: "Maximum 2-hour response time for all client communications", freq: "DAILY", reps: 20, day: 0 },
      { name: "WEEKLY REALTOR TOUCHPOINT", activity: "CALL", purpose: "Proactive weekly check-in with all active referral partners", deliverable: "TOUCHPOINT LOG", deliverable_desc: "Documented weekly call notes with each active realtor partner", stakeholder: "Loan Officer", sla: "WEEKLY CONTACT", sla_desc: "Every active realtor partner contacted minimum once per week", freq: "WEEKLY", reps: 4, day: 5 },
      { name: "MILESTONE NOTIFICATION", activity: "EMAIL", purpose: "Auto-notify borrower and realtor at each loan milestone", deliverable: "MILESTONE ALERT", deliverable_desc: "Automated notification at submission, approval, clear-to-close, and funding", stakeholder: "Processor", sla: "NOTIFY WITHIN 1 HOUR", sla_desc: "Milestone notifications sent within 1 hour of status change", freq: "WEEKLY", reps: 4, day: 10 },
      { name: "MONTHLY SLA COMPLIANCE REPORT", activity: "REPORT", purpose: "Measure and report on SLA adherence across team", deliverable: "SLA DASHBOARD", deliverable_desc: "Monthly compliance dashboard with per-LO response time metrics", stakeholder: "Branch Manager", sla: "REPORT BY 3RD OF MONTH", sla_desc: "Monthly SLA report published by 3rd business day", freq: "MONTHLY", reps: 1, day: 20 },
    ]},
  { name: "Financial P&L Offshore Control", type: "CORE", family: "OPERATIONAL", strategy: "B2B", purpose: "Monthly financial control cycle ensuring accurate P&L reporting for each offshore business unit.", owners: ["Finance Manager"],
    steps: [
      { name: "PAYROLL DATA CONSOLIDATION", activity: "DATA ENTRY", purpose: "Consolidate all payroll data from Colombian entities", deliverable: "PAYROLL REPORT COP", deliverable_desc: "Consolidated payroll report in COP with all deductions and benefits", stakeholder: "Finance Analyst", sla: "READY BY DAY 5", sla_desc: "Payroll consolidation completed by 5th business day of month", freq: "MONTHLY", reps: 1, day: 5 },
      { name: "FX CONVERSION & REPORTING", activity: "SYSTEM", purpose: "Convert COP costs to USD using month-end rates", deliverable: "USD P&L STATEMENT", deliverable_desc: "P&L statement converted to USD at official month-end exchange rate", stakeholder: "Finance Manager", sla: "CONVERSION BY DAY 7", sla_desc: "FX conversion completed by 7th business day", freq: "MONTHLY", reps: 1, day: 7 },
      { name: "VARIANCE ANALYSIS", activity: "REPORT", purpose: "Analyze budget vs actual variances for each cost center", deliverable: "VARIANCE REPORT", deliverable_desc: "Detailed variance analysis with explanations for deviations > 5%", stakeholder: "Finance Analyst", sla: "ANALYSIS BY DAY 10", sla_desc: "Variance analysis completed by 10th business day", freq: "MONTHLY", reps: 1, day: 10 },
      { name: "EXECUTIVE FINANCIAL REVIEW", activity: "MEETING", purpose: "Present financial results to executive leadership", deliverable: "EXEC FINANCE DECK", deliverable_desc: "Executive presentation with KPIs, margins, and forward projections", stakeholder: "Finance Manager", sla: "REVIEW BY DAY 15", sla_desc: "Executive review meeting held by 15th business day", freq: "MONTHLY", reps: 1, day: 15 },
    ]},
  { name: "Digital Lead Generation Engine", type: "GROWTH", family: "COMMERCIAL", strategy: "B2C", purpose: "Multi-channel digital marketing automation for generating qualified mortgage leads.", owners: ["Business Developer","Market Leader"],
    steps: [
      { name: "CAMPAIGN STRATEGY DESIGN", activity: "MEETING", purpose: "Define monthly campaign themes, audiences, and budgets", deliverable: "CAMPAIGN BRIEF", deliverable_desc: "Complete campaign brief with target personas, channels, and KPI targets", stakeholder: "Business Developer", sla: "BRIEF BY DAY 1", sla_desc: "Campaign brief approved by first business day of month", freq: "MONTHLY", reps: 1, day: 0 },
      { name: "CONTENT CREATION", activity: "TASK", purpose: "Produce ad creatives, landing pages, and email sequences", deliverable: "CREATIVE ASSETS", deliverable_desc: "Complete set of ad creatives, 2 landing pages, and 5-email nurture sequence", stakeholder: "Business Developer", sla: "ASSETS BY DAY 5", sla_desc: "All creative assets produced by 5th business day", freq: "MONTHLY", reps: 1, day: 5 },
      { name: "CAMPAIGN LAUNCH & MONITORING", activity: "SYSTEM", purpose: "Launch campaigns and monitor performance daily", deliverable: "DAILY PERFORMANCE LOG", deliverable_desc: "Daily dashboard with impressions, clicks, CPL, and conversion metrics", stakeholder: "Business Developer", sla: "DAILY MONITORING", sla_desc: "Campaign metrics reviewed and optimized daily", freq: "DAILY", reps: 20, day: 7 },
      { name: "LEAD QUALIFICATION & HANDOFF", activity: "CALL", purpose: "Score and qualify inbound leads before handing to LOs", deliverable: "QUALIFIED LEAD LIST", deliverable_desc: "Scored lead list with qualification notes and assigned Loan Officer", stakeholder: "Loan Officer Assistant", sla: "QUALIFY IN 4 HOURS", sla_desc: "New leads qualified and handed off within 4 business hours", freq: "DAILY", reps: 20, day: 10 },
      { name: "MONTHLY ROI ANALYSIS", activity: "REPORT", purpose: "Calculate campaign ROI and recommend optimizations", deliverable: "ROI REPORT", deliverable_desc: "Channel-by-channel ROI analysis with spend, leads, and revenue attribution", stakeholder: "Market Leader", sla: "REPORT BY DAY 3", sla_desc: "Monthly ROI report delivered by 3rd business day", freq: "MONTHLY", reps: 1, day: 30 },
    ]},
  { name: "HR Talent Acquisition Pipeline", type: "CORE", family: "OPERATIONAL", strategy: "B2B", purpose: "End-to-end recruitment workflow for scaling the offshore operations team with qualified Colombian talent.", owners: ["HR Manager"],
    steps: [
      { name: "REQUISITION APPROVAL", activity: "MEETING", purpose: "Review and approve new headcount requisitions", deliverable: "APPROVED REQUISITION", deliverable_desc: "Signed requisition form with budget approval and role specifications", stakeholder: "HR Manager", sla: "APPROVE IN 48H", sla_desc: "Requisition approved within 2 business days of submission", freq: "WEEKLY", reps: 1, day: 0 },
      { name: "JOB POSTING & SOURCING", activity: "SYSTEM", purpose: "Post job on platforms and activate sourcing channels", deliverable: "ACTIVE JOB POSTING", deliverable_desc: "Published posting on LinkedIn, Computrabajo, and internal referral platform", stakeholder: "HR Analyst", sla: "POST WITHIN 24H", sla_desc: "Job posted within 24 hours of requisition approval", freq: "WEEKLY", reps: 1, day: 2 },
      { name: "RESUME SCREENING", activity: "REVIEW", purpose: "Screen applicants against role requirements", deliverable: "SHORTLIST", deliverable_desc: "Ranked shortlist of top 10 candidates with screening notes", stakeholder: "HR Analyst", sla: "SCREEN IN 5 DAYS", sla_desc: "Initial screening completed within 5 business days of posting", freq: "DAILY", reps: 5, day: 3 },
      { name: "TECHNICAL ASSESSMENT", activity: "SYSTEM", purpose: "Administer role-specific technical evaluation", deliverable: "ASSESSMENT RESULTS", deliverable_desc: "Scored assessment results with competency mapping", stakeholder: "HR Analyst", sla: "ASSESS IN 3 DAYS", sla_desc: "Technical assessments completed within 3 business days", freq: "WEEKLY", reps: 1, day: 8 },
      { name: "FINAL INTERVIEW & OFFER", activity: "MEETING", purpose: "Conduct final interview and extend employment offer", deliverable: "OFFER LETTER", deliverable_desc: "Signed offer letter with compensation details and start date", stakeholder: "HR Manager", sla: "OFFER IN 48H", sla_desc: "Offer extended within 48 hours of final interview", freq: "WEEKLY", reps: 1, day: 12 },
      { name: "ONBOARDING HANDOFF", activity: "SYSTEM", purpose: "Transfer new hire to onboarding workflow", deliverable: "ONBOARDING TICKET", deliverable_desc: "Created onboarding ticket in HR system with all hiring documents attached", stakeholder: "HR Analyst", sla: "HANDOFF IN 24H", sla_desc: "Onboarding handoff completed within 24 hours of offer acceptance", freq: "WEEKLY", reps: 1, day: 15 },
    ]},
  { name: "Compliance Audit Readiness", type: "ELITE", family: "OPERATIONAL", strategy: "B2B", purpose: "Quarterly compliance audit preparation ensuring all regulatory and operational standards are met.", owners: ["HR Manager","Finance Manager"],
    steps: [
      { name: "AUDIT SCOPE DEFINITION", activity: "MEETING", purpose: "Define audit scope, timeline, and responsible parties", deliverable: "AUDIT PLAN", deliverable_desc: "Detailed audit plan with scope areas, timeline, and assigned reviewers", stakeholder: "HR Manager", sla: "PLAN IN 3 DAYS", sla_desc: "Audit plan finalized within 3 business days", freq: "MONTHLY", reps: 1, day: 0 },
      { name: "DOCUMENT COLLECTION", activity: "TASK", purpose: "Collect all required documentation from business units", deliverable: "DOCUMENT REPOSITORY", deliverable_desc: "Complete document repository with all required evidence organized by category", stakeholder: "HR Analyst", sla: "COLLECT IN 10 DAYS", sla_desc: "All documentation collected within 10 business days", freq: "DAILY", reps: 10, day: 3 },
      { name: "INTERNAL PRE-AUDIT REVIEW", activity: "REVIEW", purpose: "Conduct internal pre-audit to identify gaps", deliverable: "GAP ANALYSIS", deliverable_desc: "Pre-audit findings report with risk ratings and remediation recommendations", stakeholder: "Finance Analyst", sla: "REVIEW IN 5 DAYS", sla_desc: "Pre-audit review completed within 5 business days of collection", freq: "WEEKLY", reps: 1, day: 15 },
      { name: "REMEDIATION EXECUTION", activity: "TASK", purpose: "Address all identified gaps before external audit", deliverable: "REMEDIATION LOG", deliverable_desc: "Logged remediation actions with before/after evidence for each finding", stakeholder: "HR Manager", sla: "FIX IN 10 DAYS", sla_desc: "All critical gaps remediated within 10 business days", freq: "DAILY", reps: 10, day: 20 },
      { name: "FINAL AUDIT READINESS CERTIFICATION", activity: "REVIEW", purpose: "Certify organization is ready for external audit", deliverable: "READINESS CERTIFICATE", deliverable_desc: "Signed certification confirming all compliance areas are audit-ready", stakeholder: "Finance Manager", sla: "CERTIFY BY DAY 30", sla_desc: "Readiness certification issued by business day 30", freq: "MONTHLY", reps: 1, day: 30 },
    ]},
  { name: "CRM Data Accuracy Protocol", type: "CORE", family: "OPERATIONAL", strategy: "B2B", purpose: "Systematic CRM hygiene program ensuring 98%+ data accuracy for pipeline reporting and forecasting.", owners: ["Branch Manager","Loan Officer"],
    steps: [
      { name: "DAILY PIPELINE VALIDATION", activity: "SYSTEM", purpose: "Verify all active loans have current status and dates", deliverable: "VALIDATION LOG", deliverable_desc: "Daily CRM audit log showing records reviewed and corrections made", stakeholder: "Loan Officer", sla: "VALIDATE DAILY", sla_desc: "Pipeline validation completed daily before end of business", freq: "DAILY", reps: 20, day: 0 },
      { name: "WEEKLY DUPLICATE SCAN", activity: "SYSTEM", purpose: "Identify and merge duplicate contact records", deliverable: "MERGE REPORT", deliverable_desc: "Weekly report of duplicate records found and merged", stakeholder: "Loan Officer Assistant", sla: "SCAN WEEKLY", sla_desc: "Duplicate scan completed every Friday", freq: "WEEKLY", reps: 4, day: 5 },
      { name: "MONTHLY DATA QUALITY SCORE", activity: "REPORT", purpose: "Calculate and publish CRM data quality metrics", deliverable: "DATA QUALITY SCORECARD", deliverable_desc: "Scorecard with completeness, accuracy, and timeliness metrics per team", stakeholder: "Branch Manager", sla: "SCORE BY DAY 5", sla_desc: "Monthly data quality score published by 5th business day", freq: "MONTHLY", reps: 1, day: 20 },
    ]},
  { name: "Client Experience Excellence", type: "GROWTH", family: "COMMERCIAL", strategy: "B2C", purpose: "Post-close client satisfaction program driving referrals and repeat business through systematic nurturing.", owners: ["Loan Officer","Branch Manager"],
    steps: [
      { name: "POST-CLOSE THANK YOU", activity: "EMAIL", purpose: "Send personalized thank-you with closing gift details", deliverable: "THANK YOU SENT", deliverable_desc: "Personalized thank-you email and closing gift tracking confirmation", stakeholder: "Loan Officer", sla: "SEND WITHIN 24H", sla_desc: "Thank-you communication sent within 24 hours of closing", freq: "WEEKLY", reps: 4, day: 1 },
      { name: "7-DAY SATISFACTION SURVEY", activity: "EMAIL", purpose: "Send NPS survey to capture immediate satisfaction", deliverable: "NPS RESPONSE", deliverable_desc: "Completed NPS survey with score and verbatim feedback captured", stakeholder: "Loan Officer Assistant", sla: "SURVEY BY DAY 7", sla_desc: "Satisfaction survey sent on 7th day post-close", freq: "WEEKLY", reps: 1, day: 7 },
      { name: "30-DAY CHECK-IN CALL", activity: "CALL", purpose: "Personal check-in to ensure smooth first-month homeownership", deliverable: "CHECK-IN NOTES", deliverable_desc: "Documented call notes with any issues flagged for resolution", stakeholder: "Loan Officer", sla: "CALL BY DAY 30", sla_desc: "30-day check-in call completed", freq: "MONTHLY", reps: 1, day: 30 },
      { name: "QUARTERLY MARKET UPDATE", activity: "EMAIL", purpose: "Send personalized market update and rate comparison", deliverable: "MARKET UPDATE SENT", deliverable_desc: "Quarterly email with local market trends and refinance opportunity analysis", stakeholder: "Business Developer", sla: "QUARTERLY SEND", sla_desc: "Market updates sent within first week of each quarter", freq: "MONTHLY", reps: 1, day: 60 },
      { name: "ANNUAL REVIEW & REFERRAL ASK", activity: "CALL", purpose: "Annual mortgage review with refinance analysis and referral request", deliverable: "ANNUAL REVIEW COMPLETE", deliverable_desc: "Completed annual review with equity analysis, rate comparison, and referral request", stakeholder: "Loan Officer", sla: "ANNUAL CONTACT", sla_desc: "Annual review completed within the anniversary month", freq: "YEARLY", reps: 1, day: 90 },
    ]},
];

// ══════════════════════════════════════════════════════════════════
// MAIN EXECUTION
// ══════════════════════════════════════════════════════════════════

async function main() {
  console.log("🔥 SEED TOTAL — Re-Vinculación Completa para TNT-SEED26\n");

  // ─── PHASE 0: CLEAN ────────────────────────────────────────────
  console.log("🧹 PHASE 0: Limpieza total del tenant...");
  for (const table of ['simo_notifications','pmo_tasks','pmo_groups','pmo_boards','bp_playbook_steps','bp_playbooks','dim_role_title','dim_employee','dim_job_title']) {
    const col = ['dim_employee','dim_job_title','dim_role_title'].includes(table) ? 'tenant_id' : 'org_id';
    await supabase.from(table).delete().eq(col, ORG_ID);
  }

  // ─── PHASE 1: FOUNDATION ───────────────────────────────────────
  console.log("🏛️ PHASE 1: Foundation (org + tenant)...");
  await supabase.from('organizations').upsert({ id: ORG_ID, name: "HOMESI Seed Testing 2026", country_code: "US" }, { onConflict: 'id' });
  await supabase.from('dim_tenant').upsert({ tcode: ORG_ID, legal_name: "HOMESI Seed Testing 2026", dba_name: "HOMESI Seed", reporting_currency: "USD", status: true, hq_address: { country: "US" }, pocs: [], account_managers: [] }, { onConflict: 'tcode' });

  // ─── PHASE 2: JOB TITLES ──────────────────────────────────────
  console.log("📋 PHASE 2: Creating 11 Job Titles...");
  const jobTitleMap = new Map<string, string>();
  for (const jt of JOB_TITLES) {
    const id = uuidv4();
    await safe('dim_job_title', { id, tenant_id: ORG_ID, title: jt.title, area: jt.family, status: 'Active' });
    jobTitleMap.set(jt.title, id);
  }

  // ─── PHASE 3: ROLE TITLES (30+) ──────────────────────────────
  console.log("🎖️ PHASE 3: Creating 30+ Role Titles...");
  const roleTitleMap = new Map<string, string[]>();
  for (const [jobTitle, specs] of Object.entries(ROLE_SPECIALIZATIONS)) {
    const jtId = jobTitleMap.get(jobTitle);
    if (!jtId) continue;
    const roleIds: string[] = [];
    for (const spec of specs) {
      const rtId = uuidv4();
      await safe('dim_role_title', { id: rtId, tenant_id: ORG_ID, job_title_id: jtId, role_title: spec, status: 'Active' });
      roleIds.push(rtId);
    }
    roleTitleMap.set(jobTitle, roleIds);
  }

  // ─── PHASE 4: 100 EMPLOYEES in dim_employee ──────────────────
  console.log("👥 PHASE 4: Creating 100 Employees in dim_employee...");
  const allEmployees: { eid: string; title: string }[] = [];
  let eidCounter = 1;

  for (const dist of DISTRIBUTION) {
    const jtId = jobTitleMap.get(dist.title);
    const rtIds = roleTitleMap.get(dist.title) || [];
    const jt = JOB_TITLES.find(j => j.title === dist.title)!;

    for (let i = 0; i < dist.count; i++) {
      const eid = `EID-SEED-${String(eidCounter).padStart(3, '0')}`;
      const first = dist.lat ? rnd(LAT_FIRST) : rnd(US_FIRST);
      const last = dist.lat ? rnd(LAT_LAST) : rnd(US_LAST);
      const last2 = dist.lat ? rnd(LAT_LAST) : rnd(US_LAST);
      const email = `${first.toLowerCase().replace(/[áéíóú]/g, c => ({á:'a',é:'e',í:'i',ó:'o',ú:'u'} as any)[c] || c)}.${last.toLowerCase().replace(/[áéíóú]/g, c => ({á:'a',é:'e',í:'i',ó:'o',ú:'u'} as any)[c] || c)}.${eidCounter}@homesi.seed.com`;
      const salary = dist.lat ? rndInt(3000000, 12000000) : rndInt(4000, 15000);
      const currency = dist.lat ? "COP" : "USD";
      const rtId = rtIds.length > 0 ? rtIds[i % rtIds.length] : null;
      const continent = dist.lat ? "South America" : "North America";
      const country = dist.lat ? "Colombia" : "United States";
      const city = dist.lat ? rnd(["Bogotá","Medellín","Cali","Barranquilla"]) : rnd(["Miami","Dallas","Phoenix","Atlanta","Charlotte"]);
      const dob = `${rndInt(1985, 2000)}-${String(rndInt(1,12)).padStart(2,'0')}-${String(rndInt(1,28)).padStart(2,'0')}`;

      const dimRow: any = {
        eid, tenant_id: ORG_ID,
        numero_identificacion: `${rndInt(10000000, 99999999)}`,
        tipo_documento_id: dist.lat ? "CC" : "PASSPORT",
        primer_nombre: first, otros_nombres: null,
        primer_apellido: last, segundo_apellido: last2,
        fecha_nacimiento: dob, genero: rnd(["M","F"]),
        email_personal: email, municipio_dane: dist.lat ? rnd(["11001","05001","76001","08001"]) : "N/A",
        direccion_residencia: dist.lat ? `Calle ${rndInt(1,150)} #${rndInt(1,80)}-${rndInt(1,99)}` : `${rndInt(100,9999)} ${rnd(["Oak","Pine","Maple","Cedar"])} ${rnd(["St","Ave","Blvd","Dr"])}`,
        foto_url: null, status: "Active",
        email_corporativo: `${first.toLowerCase()}.${last.toLowerCase()}@homesi.com`.replace(/[áéíóú]/g, c => ({á:'a',é:'e',í:'i',ó:'o',ú:'u'} as any)[c] || c),
        fecha_inicio: "2026-01-15", fecha_fin: null,
        tipo_contrato: dist.lat ? "Indefinido" : "At-Will",
        tipo_salario: "Fijo", salario_base: salary,
        procedimiento_renta: 1, area: jt.family, sub_area: jt.family,
        centro_costo: `CC-${jt.family.substring(0,3).toUpperCase()}`,
        nombre_centro_costo: `Centro ${jt.family}`,
        branch: dist.lat ? "COL-HQ" : rnd(["FL-MIAMI","TX-DALLAS","AZ-PHOENIX","GA-ATLANTA"]),
        cliente: "HOMESI Internal", project: null,
        digito_dedicacion: 100, direct_leader: null,
        job_title_id: jtId || null, role_title_id: rtId,
        continent_id: null, country_id: null, city_id: null,
        salary_currency: currency, direct_leader_id: null,
        afiliaciones: dist.lat ? {
          eps_id: "EPS01", eps_nombre: rnd(EPS_LIST),
          afp_id: "AFP01", afp_nombre: rnd(AFP_LIST),
          arl_id: "ARL01", arl_nombre: rnd(ARL_LIST),
          ccf_id: "CCF01", ccf_nombre: rnd(CCF_LIST),
          nivel_riesgo_arl: 1, subtipo_cotizante: "Empleado dependiente",
          entidad_legal: "HOMESI Colombia SAS"
        } : {
          eps_id: "", eps_nombre: "", afp_id: "", afp_nombre: "",
          arl_id: "", arl_nombre: "", ccf_id: "", ccf_nombre: "",
          nivel_riesgo_arl: 0, subtipo_cotizante: "N/A", entidad_legal: "HOMESI LLC"
        },
        sst: {
          talla_camisa: rnd(SHIRT_SIZES), talla_pantalon: String(rndInt(28, 38)),
          talla_calzado: rndInt(36, 45), tipo_sangre: rnd(BLOOD_TYPES),
          contacto_emergencia: `${rnd(dist.lat ? LAT_FIRST : US_FIRST)} ${rnd(dist.lat ? LAT_LAST : US_LAST)}`,
          telefono_emergencia: dist.lat ? `+57 3${rndInt(10,19)} ${rndInt(100,999)} ${rndInt(1000,9999)}` : `+1 ${rndInt(200,999)}-${rndInt(100,999)}-${rndInt(1000,9999)}`
        }
      };

      await safe('dim_employee', dimRow);
      allEmployees.push({ eid, title: dist.title });
      eidCounter++;
    }
  }
  console.log(`   ✅ ${allEmployees.length} employees created in dim_employee`);

  // ─── PHASE 5: PLAYBOOKS with RICH STEPS ───────────────────────
  console.log("📚 PHASE 5: Creating 10 Playbooks with full metadata...");
  const playbookIds: { id: string; steps: any[] }[] = [];

  for (let i = 0; i < PLAYBOOK_TEMPLATES.length; i++) {
    const tmpl = PLAYBOOK_TEMPLATES[i];
    const pbId = uuidv4();

    await safe('bp_playbooks', {
      id: pbId, org_id: ORG_ID, name: tmpl.name,
      type: tmpl.type, family: tmpl.family, strategy: tmpl.strategy,
      purpose: tmpl.purpose, status: "PUBLISHED",
      global_owners: tmpl.owners
    });

    const stepInserts = tmpl.steps.map((s, idx) => ({
      org_id: ORG_ID, playbook_id: pbId,
      uid: `PB${i+1}-S${String(idx+1).padStart(2,'0')}`,
      step_num: String(idx + 1).padStart(2, '0'),
      name: s.name,
      type_of_activity: s.activity,
      purpose: s.purpose,
      activity_description: s.purpose,
      deliverable: s.deliverable,
      deliverable_description: s.deliverable_desc,
      stakeholder: s.stakeholder,
      frequency: s.freq,
      repetitions: s.reps,
      scheduler_value: s.day,
      supporting_task: null,
      counteraction_description: null,
      requested_to: s.stakeholder,
      sla: s.sla,
      sla_description: s.sla_desc,
      is_locked: false, is_repeatable: false,
      position: idx
    }));

    await safe('bp_playbook_steps', stepInserts);
    playbookIds.push({ id: pbId, steps: tmpl.steps });
  }

  // ─── PHASE 6: PMO EXECUTION (WorkdayHelper) ──────────────────
  console.log("⚙️ PHASE 6: PMO Task Generation with WorkdayHelper...");
  const wsId = uuidv4();
  await safe('pmo_workspaces', { id: wsId, org_id: ORG_ID, name: "Seed Operation Workspace" });

  let totalTasks = 0;
  const notificationInserts: any[] = [];

  for (const emp of allEmployees) {
    // Find playbooks relevant to this employee's role
    const relevantPbs = PLAYBOOK_TEMPLATES.filter(pb =>
      pb.steps.some(s => s.stakeholder === emp.title) || pb.owners.includes(emp.title)
    );
    if (relevantPbs.length === 0) continue;

    const pb = relevantPbs[0]; // assign first matching playbook
    const pbIdx = PLAYBOOK_TEMPLATES.indexOf(pb);
    const pbData = playbookIds[pbIdx];

    const boardId = uuidv4();
    await safe('pmo_boards', { id: boardId, org_id: ORG_ID, workspace_id: wsId, title: `Board - ${emp.eid} (${emp.title})` });

    const groupId = uuidv4();
    await safe('pmo_groups', { id: groupId, org_id: ORG_ID, board_id: boardId, title: "Assigned Tasks", position: 1 });

    const startDate = new Date();
    const taskInserts: any[] = [];

    for (const step of pb.steps) {
      const dueDate = addWorkdays(startDate, step.day, "US", "CO", "America/New_York", []);
      const taskId = uuidv4();

      taskInserts.push({
        id: taskId, org_id: ORG_ID, board_id: boardId, group_id: groupId,
        title: step.name,
        description: `[${pb.name}] ${step.purpose}\n\nDeliverable: ${step.deliverable}\nSLA: ${step.sla}`,
        due_date: dueDate.toISOString(),
        priority: step.day <= 5 ? "high" : step.day <= 15 ? "medium" : "low",
        status: "not_started",
        source_playbook_id: pbData.id,
        is_protected: true,
        custom_field_values: {},
        item_height: "simple"
      });

      // Create notification for PENDING approval tasks
      if (step.day <= 10) {
        notificationInserts.push({
          org_id: ORG_ID, user_id: "admin",
          type: "APPROVAL", module: "PMO",
          title: `Approval Required: ${step.name}`,
          summary: `Employee ${emp.eid} needs task approval for "${step.name}" from playbook "${pb.name}". Due: ${dueDate.toISOString().split('T')[0]}`,
          action_url: `/pmo/boards/${boardId}`,
          entity_id: taskId, entity_type: "TASK",
          status: "PENDING",
          priority: step.day <= 3 ? "HIGH" : "NORMAL"
        });
      }
    }

    if (taskInserts.length > 0) {
      await safe('pmo_tasks', taskInserts);
      totalTasks += taskInserts.length;
    }
  }

  // ─── PHASE 7: NOTIFICATIONS ───────────────────────────────────
  console.log(`🔔 PHASE 7: Injecting ${notificationInserts.length} notifications into simo_notifications...`);
  if (notificationInserts.length > 0) {
    // Insert in batches of 50
    for (let i = 0; i < notificationInserts.length; i += 50) {
      const batch = notificationInserts.slice(i, i + 50);
      await safe('simo_notifications', batch);
    }
  }

  // ─── FINAL VERIFICATION ───────────────────────────────────────
  console.log("\n📊 VERIFICATION PHASE:");
  const counts = await Promise.all([
    supabase.from('dim_employee').select('*', { count: 'exact', head: true }).eq('tenant_id', ORG_ID),
    supabase.from('dim_job_title').select('*', { count: 'exact', head: true }).eq('tenant_id', ORG_ID),
    supabase.from('dim_role_title').select('*', { count: 'exact', head: true }).eq('tenant_id', ORG_ID),
    supabase.from('bp_playbooks').select('*', { count: 'exact', head: true }).eq('org_id', ORG_ID),
    supabase.from('bp_playbook_steps').select('*', { count: 'exact', head: true }).eq('org_id', ORG_ID),
    supabase.from('pmo_tasks').select('*', { count: 'exact', head: true }).eq('org_id', ORG_ID),
    supabase.from('simo_notifications').select('*', { count: 'exact', head: true }).eq('org_id', ORG_ID),
  ]);

  console.log(`   ✅ dim_employee:        ${counts[0].count}`);
  console.log(`   ✅ dim_job_title:        ${counts[1].count}`);
  console.log(`   ✅ dim_role_title:       ${counts[2].count}`);
  console.log(`   ✅ bp_playbooks:         ${counts[3].count}`);
  console.log(`   ✅ bp_playbook_steps:    ${counts[4].count}`);
  console.log(`   ✅ pmo_tasks:            ${counts[5].count}`);
  console.log(`   ✅ simo_notifications:   ${counts[6].count}`);

  console.log("\n🏆 SEED TOTAL COMPLETADO EXITOSAMENTE!");
}

main().catch(e => { console.error("❌ FATAL:", e); process.exit(1); });
