// Static suggestion lists for profile fields.
// All filtering is done server-side; clients never receive the full lists.

export const ROLES = [
  // Software Engineering
  "Software Engineer", "Senior Software Engineer", "Staff Software Engineer",
  "Principal Software Engineer", "Software Architect", "Lead Engineer",
  "Engineering Manager", "VP of Engineering", "CTO", "Head of Engineering",
  "Frontend Engineer", "Backend Engineer", "Full Stack Engineer",
  "Mobile Engineer", "iOS Engineer", "Android Engineer",
  "Platform Engineer", "Infrastructure Engineer", "Site Reliability Engineer",
  "DevOps Engineer", "Cloud Engineer", "MLOps Engineer",
  // Data & AI
  "Data Engineer", "Data Scientist", "Data Analyst", "Analytics Engineer",
  "Machine Learning Engineer", "AI Engineer", "Research Scientist",
  "Business Intelligence Analyst", "BI Developer",
  // Product & Design
  "Product Manager", "Senior Product Manager", "Principal Product Manager",
  "Group Product Manager", "VP of Product", "Chief Product Officer",
  "UX Designer", "UI Designer", "Product Designer", "UX Researcher",
  "Design Lead", "Head of Design",
  // QA & Security
  "QA Engineer", "SDET", "Automation Engineer", "Security Engineer",
  "Application Security Engineer", "Penetration Tester",
  // Specialized Tech
  "Blockchain Developer", "Smart Contract Developer", "Web3 Engineer",
  "Embedded Systems Engineer", "Firmware Engineer", "Systems Engineer",
  "Game Developer", "Graphics Engineer", "Computer Vision Engineer",
  "NLP Engineer", "Robotics Engineer",
  // Tech Management
  "Technical Program Manager", "Program Manager", "Delivery Manager",
  "Scrum Master", "Agile Coach", "IT Manager",
  // Tech Business
  "Solutions Architect", "Pre-Sales Engineer", "Sales Engineer",
  "Customer Success Engineer", "Developer Advocate", "Technical Writer",
  "Consultant", "Technology Consultant",
  // Finance & Accounting
  "Financial Analyst", "Senior Financial Analyst", "Investment Banker",
  "Accountant", "Chartered Accountant", "CFO", "Controller",
  "Auditor", "Tax Consultant", "Risk Analyst", "Treasury Analyst",
  "Equity Research Analyst", "Portfolio Manager", "Wealth Manager",
  "Actuarial Analyst", "Credit Analyst", "Compliance Analyst",
  // Marketing & Growth
  "Marketing Manager", "Brand Manager", "Digital Marketing Specialist",
  "SEO Specialist", "Content Strategist", "Growth Manager", "CMO",
  "Performance Marketing Manager", "Social Media Manager",
  "Email Marketing Specialist", "Marketing Analyst", "VP of Marketing",
  // Sales & Business Development
  "Sales Manager", "Account Executive", "Business Development Manager",
  "VP of Sales", "Regional Sales Manager", "Key Account Manager",
  "Inside Sales Representative", "Enterprise Account Executive",
  "Channel Partner Manager", "Revenue Operations Manager",
  // Human Resources
  "HR Manager", "Recruiter", "Talent Acquisition Specialist", "CHRO",
  "HR Business Partner", "Compensation Analyst", "L&D Manager",
  "People Operations Manager", "Organizational Development Consultant",
  "Employee Relations Manager", "Benefits Administrator",
  // Healthcare & Medical
  "Doctor", "Surgeon", "Nurse", "Pharmacist", "Dentist",
  "Clinical Research Associate", "Biomedical Engineer",
  "Healthcare Administrator", "Medical Lab Technician",
  "Physiotherapist", "Radiologist", "Pathologist",
  "Hospital Administrator", "Public Health Specialist",
  // Legal
  "Lawyer", "Advocate", "Legal Counsel", "General Counsel",
  "Compliance Officer", "Paralegal", "Contract Specialist",
  "Corporate Lawyer", "IP Lawyer", "Litigation Associate",
  "Company Secretary",
  // Creative & Media
  "Graphic Designer", "Art Director", "Creative Director",
  "Copywriter", "Video Editor", "Animator", "Motion Graphics Designer",
  "Content Creator", "Photographer", "Illustrator",
  "Sound Engineer", "Film Director", "Journalist", "Editor",
  // Education & Training
  "Teacher", "Professor", "Lecturer", "Curriculum Designer",
  "Academic Counselor", "Principal", "Education Consultant",
  "Corporate Trainer", "Instructional Designer",
  // Operations & Supply Chain
  "Operations Manager", "Supply Chain Manager", "Logistics Manager",
  "COO", "Procurement Manager", "Warehouse Manager",
  "Inventory Analyst", "Demand Planner", "Fleet Manager",
  // Non-Software Engineering
  "Civil Engineer", "Mechanical Engineer", "Electrical Engineer",
  "Chemical Engineer", "Electronics Engineer", "Aerospace Engineer",
  "Structural Engineer", "Environmental Engineer", "Industrial Engineer",
  "Production Engineer", "Quality Engineer", "Safety Engineer",
  "Mining Engineer", "Petroleum Engineer", "Textile Engineer",
  // Architecture & Construction
  "Architect", "Interior Designer", "Urban Planner",
  "Construction Manager", "Site Engineer", "Project Engineer",
  "Quantity Surveyor", "Structural Designer",
  // Government & Public Sector
  "IAS Officer", "IPS Officer", "Civil Servant",
  "Public Policy Analyst", "Government Relations Manager",
  // Hospitality & Tourism
  "Hotel Manager", "Chef", "Event Manager", "Travel Consultant",
  "Restaurant Manager", "Concierge",
  // Real Estate
  "Real Estate Agent", "Property Manager", "Real Estate Analyst",
  "Leasing Manager",
  // Research & Academia
  "Research Associate", "Postdoctoral Fellow", "Lab Manager",
  "Scientific Officer", "Research Director",
  // General Management
  "CEO", "Managing Director", "General Manager", "Business Analyst",
  "Management Consultant", "Strategy Consultant", "Project Manager",
  "Chief of Staff", "Entrepreneur", "Founder",
];

export const LOCATIONS = [
  // Indian metros
  "Bangalore, Karnataka", "Mumbai, Maharashtra", "Delhi, NCR",
  "Hyderabad, Telangana", "Chennai, Tamil Nadu", "Pune, Maharashtra",
  "Kolkata, West Bengal", "Ahmedabad, Gujarat", "Noida, UP", "Gurgaon, Haryana",
  // Indian tier-2
  "Jaipur, Rajasthan", "Indore, MP", "Chandigarh", "Kochi, Kerala",
  "Coimbatore, Tamil Nadu", "Surat, Gujarat", "Vadodara, Gujarat",
  "Nagpur, Maharashtra", "Lucknow, UP", "Bhopal, MP", "Vizag, AP",
  "Mysore, Karnataka", "Mangalore, Karnataka", "Thiruvananthapuram, Kerala",
  "Bhubaneswar, Odisha", "Dehradun, Uttarakhand", "Ranchi, Jharkhand",
  "Patna, Bihar", "Guwahati, Assam",
  // Global
  "Remote", "Remote (India)", "Remote (US)", "Remote (Europe)",
  "San Francisco, CA", "New York, NY", "Seattle, WA", "Austin, TX",
  "Boston, MA", "Chicago, IL", "Los Angeles, CA", "Denver, CO",
  "London, UK", "Berlin, Germany", "Amsterdam, Netherlands",
  "Toronto, Canada", "Vancouver, Canada",
  "Singapore", "Dubai, UAE", "Sydney, Australia",
  "Tokyo, Japan", "Hong Kong",
];

export const COLLEGES = [
  // IITs
  "IIT Bombay", "IIT Delhi", "IIT Madras", "IIT Kanpur", "IIT Kharagpur",
  "IIT Roorkee", "IIT Guwahati", "IIT Hyderabad", "IIT BHU", "IIT Indore",
  "IIT Gandhinagar", "IIT Jodhpur", "IIT Patna", "IIT Bhubaneswar",
  "IIT Mandi", "IIT Ropar", "IIT Tirupati", "IIT Palakkad",
  "IIT Dhanbad", "IIT Dharwad", "IIT Goa", "IIT Jammu", "IIT Bhilai",
  // NITs
  "NIT Trichy", "NIT Warangal", "NIT Surathkal", "NIT Calicut",
  "NIT Rourkela", "NIT Allahabad", "NIT Bhopal", "NIT Jaipur",
  "NIT Nagpur", "NIT Durgapur", "NIT Srinagar", "NIT Silchar",
  "NIT Karnataka", "NIT Hamirpur", "NIT Kurukshetra",
  // IIITs
  "IIIT Hyderabad", "IIIT Bangalore", "IIIT Delhi", "IIIT Allahabad",
  "IIIT Pune", "IIIT Lucknow", "IIIT Kancheepuram",
  // IIMs
  "IIM Ahmedabad", "IIM Bangalore", "IIM Calcutta", "IIM Lucknow",
  "IIM Kozhikode", "IIM Indore", "IIM Shillong", "IIM Ranchi",
  "IIM Rohtak", "IIM Kashipur", "IIM Tiruchirappalli",
  // Top private engineering
  "BITS Pilani", "BITS Goa", "BITS Hyderabad",
  "VIT Vellore", "VIT Chennai", "Manipal Institute of Technology",
  "SRM Institute of Science and Technology",
  "Amity University", "Thapar Institute of Engineering",
  "PSG College of Technology", "SSN College of Engineering",
  "RV College of Engineering", "PES University", "BMSCE",
  "Dayananda Sagar College of Engineering",
  "KIIT Bhubaneswar", "LPU Phagwara", "Symbiosis Pune",
  "Christ University Bangalore", "Shiv Nadar University",
  // Central & state universities
  "Delhi University", "Jadavpur University", "BHU Varanasi",
  "Hyderabad University", "IISER Pune", "IISER Kolkata",
  "Anna University Chennai", "Mumbai University", "Pune University",
  "Calcutta University", "Osmania University", "Madras University",
  "JNU Delhi", "Aligarh Muslim University", "Jamia Millia Islamia",
  // Top MBA
  "XLRI Jamshedpur", "MDI Gurgaon", "FMS Delhi", "SPJIMR Mumbai",
  "ISB Hyderabad", "NMIMS Mumbai", "Great Lakes Chennai",
  "IBS Hyderabad", "TAPMI Manipal",
  // Medical
  "AIIMS Delhi", "AIIMS Rishikesh", "CMC Vellore", "JIPMER Puducherry",
  "Maulana Azad Medical College", "Grant Medical College Mumbai",
  "KEM Hospital Mumbai", "AFMC Pune",
  // Law
  "NLSIU Bangalore", "NALSAR Hyderabad", "NLU Delhi", "NLU Jodhpur",
  "NUJS Kolkata", "GNLU Gujarat",
  // Design
  "NID Ahmedabad", "NIFT Delhi", "Srishti Bangalore", "IDC IIT Bombay",
  // Global top
  "MIT", "Stanford University", "Harvard University", "Caltech",
  "University of Cambridge", "University of Oxford",
  "Carnegie Mellon University", "UC Berkeley",
  "Georgia Tech", "University of Michigan",
  "ETH Zurich", "Imperial College London",
  "University of Toronto", "University of Waterloo",
  "NUS Singapore", "NTU Singapore",
];

export const COMPANIES = [
  // Indian tech product
  "Flipkart", "Swiggy", "Zomato", "Ola", "Paytm", "PhonePe", "Razorpay",
  "CRED", "Meesho", "Dream11", "ShareChat", "Unacademy", "Byju's",
  "Freshworks", "Zoho", "Chargebee", "Postman", "BrowserStack",
  "Juspay", "Groww", "Zerodha", "Angel One", "PolicyBazaar",
  "Urban Company", "Nykaa", "Lenskart", "MakeMyTrip", "Yatra",
  "Dunzo", "Rapido", "Porter", "Delhivery", "Shiprocket",
  "Ather Energy", "Licious", "Jupiter", "Slice", "Fi Money",
  // Indian IT services
  "TCS", "Infosys", "Wipro", "HCL Technologies", "Tech Mahindra",
  "L&T Technology Services", "Mphasis", "Hexaware", "Persistent Systems",
  "Mindtree", "NIIT Technologies", "Zensar Technologies", "Cyient",
  // MNC India offices
  "Google India", "Microsoft India", "Amazon India", "Meta India",
  "Apple India", "Adobe India", "Salesforce India", "Oracle India",
  "SAP Labs India", "Cisco India", "VMware India", "Dell India",
  "IBM India", "Accenture India", "Capgemini India", "Cognizant",
  "Deloitte India", "EY India", "KPMG India", "PwC India",
  "McKinsey India", "BCG India", "Bain India",
  // Global
  "Google", "Microsoft", "Amazon", "Meta", "Apple", "Netflix",
  "Uber", "Airbnb", "Stripe", "Shopify", "Atlassian", "Twilio",
  "Databricks", "Snowflake", "MongoDB", "HashiCorp",
  "OpenAI", "Anthropic", "Tesla", "SpaceX",
];

export const SKILLS = [
  // Languages
  "JavaScript", "TypeScript", "Python", "Java", "Go", "Rust", "C++", "C#",
  "Ruby", "Swift", "Kotlin", "Scala", "PHP", "R", "Dart", "Elixir",
  // Frontend
  "React", "Next.js", "Vue.js", "Angular", "Svelte", "Remix",
  "HTML", "CSS", "Tailwind CSS", "Sass", "GraphQL",
  // Backend
  "Node.js", "Express.js", "FastAPI", "Django", "Flask", "Spring Boot",
  "Rails", "NestJS", "Hono", "tRPC",
  // Mobile
  "React Native", "Flutter", "SwiftUI", "Jetpack Compose",
  // Data & ML
  "PyTorch", "TensorFlow", "Scikit-learn", "Pandas", "NumPy",
  "Spark", "Kafka", "Airflow", "dbt", "Hadoop",
  "LangChain", "OpenAI API", "Hugging Face",
  // Cloud & DevOps
  "AWS", "Google Cloud", "Azure", "Kubernetes", "Docker",
  "Terraform", "Ansible", "GitHub Actions", "Jenkins", "ArgoCD",
  "Prometheus", "Grafana", "Datadog", "New Relic",
  // Databases
  "PostgreSQL", "MySQL", "MongoDB", "Redis", "Elasticsearch",
  "Cassandra", "DynamoDB", "Supabase", "Firebase",
  // Other tech
  "Git", "Linux", "REST APIs", "gRPC", "WebSockets",
  "System Design", "Microservices", "CI/CD",
  // Non-tech / universal skills
  "Project Management", "Agile", "Scrum", "Six Sigma", "Lean",
  "Microsoft Excel", "Power BI", "Tableau", "Google Analytics",
  "SAP", "Salesforce CRM", "HubSpot", "Figma", "Adobe Creative Suite",
  "AutoCAD", "SolidWorks", "MATLAB", "SPSS", "Stata",
  "Financial Modeling", "Valuation", "Tally", "QuickBooks",
  "Public Speaking", "Negotiation", "Leadership",
  "Content Writing", "SEO", "Google Ads", "Meta Ads",
];

export const DEGREES = [
  // Indian undergraduate
  "B.Tech", "B.E.", "B.Sc", "BBA", "B.Com", "BCA", "BA", "B.Des",
  "B.Arch", "BMS", "B.Pharm", "BHMS", "BAMS", "BDS", "MBBS", "LLB",
  "B.Ed", "BHM", "BFA", "B.Voc",
  // Indian postgraduate
  "M.Tech", "M.E.", "M.Sc", "MBA", "MCA", "M.Com", "MA", "M.Des",
  "M.Arch", "M.Pharm", "MD", "MS (Surgery)", "LLM", "M.Ed", "MFA",
  "PGDM", "PGDBA",
  // Doctoral
  "Ph.D", "D.Sc", "DM", "MCh",
  // Global
  "BS", "BA (Hons)", "BEng", "BSc (Hons)",
  "MS", "MSc", "MEng", "MPhil", "JD", "MD (US)",
  "MBA (Executive)", "EMBA",
  // Pre-university
  "Class XII", "Class X", "Higher Secondary", "Senior Secondary",
  "Diploma", "Polytechnic Diploma", "ITI",
  // Professional
  "CA", "CS", "CMA", "CFA", "ACCA",
];

export const FIELDS_OF_STUDY = [
  // Engineering
  "Computer Science", "Computer Science & Engineering",
  "Information Technology", "Electronics & Communication",
  "Electrical Engineering", "Mechanical Engineering",
  "Civil Engineering", "Chemical Engineering",
  "Aerospace Engineering", "Biotechnology",
  "Industrial Engineering", "Production Engineering",
  "Instrumentation Engineering", "Metallurgical Engineering",
  "Mining Engineering", "Textile Engineering",
  "Environmental Engineering", "Biomedical Engineering",
  // Science
  "Physics", "Chemistry", "Mathematics", "Biology",
  "Statistics", "Geology", "Environmental Science",
  "Biochemistry", "Microbiology", "Zoology", "Botany",
  // Commerce & Business
  "Business Administration", "Commerce", "Finance",
  "Accounting", "Economics", "Marketing",
  "International Business", "Operations Management",
  "Human Resource Management", "Supply Chain Management",
  "Entrepreneurship",
  // Arts & Humanities
  "English Literature", "History", "Political Science",
  "Sociology", "Psychology", "Philosophy",
  "Journalism & Mass Communication", "Public Administration",
  "Social Work", "Linguistics", "Foreign Languages",
  // Law
  "Law", "Corporate Law", "Intellectual Property Law",
  "Criminal Law", "International Law",
  // Medical & Health
  "Medicine", "Surgery", "Dentistry", "Pharmacy",
  "Nursing", "Physiotherapy", "Public Health",
  "Ayurveda", "Homeopathy",
  // Design & Architecture
  "Architecture", "Interior Design", "Fashion Design",
  "Graphic Design", "Product Design", "Interaction Design",
  "Urban Planning",
  // Other
  "Education", "Library Science", "Agriculture",
  "Food Technology", "Hotel Management",
  "Sports Science", "Fine Arts", "Music",
  "Film & Television",
];

export const CERTIFICATIONS = [
  // Cloud
  "AWS Solutions Architect Associate", "AWS Solutions Architect Professional",
  "AWS Developer Associate", "AWS SysOps Administrator",
  "Google Cloud Professional Cloud Architect", "Google Cloud Associate Cloud Engineer",
  "Google Cloud Professional Data Engineer",
  "Azure Fundamentals (AZ-900)", "Azure Administrator (AZ-104)",
  "Azure Solutions Architect (AZ-305)",
  // Project Management
  "PMP (Project Management Professional)", "CAPM",
  "PRINCE2 Foundation", "PRINCE2 Practitioner",
  "Certified Scrum Master (CSM)", "SAFe Agilist",
  "PMI-ACP", "Six Sigma Green Belt", "Six Sigma Black Belt",
  // Security
  "CISSP", "CEH (Certified Ethical Hacker)", "CompTIA Security+",
  "OSCP", "CISM", "CISA",
  // Data & Analytics
  "Google Data Analytics Professional", "IBM Data Science Professional",
  "Tableau Desktop Specialist", "Power BI Data Analyst",
  "Databricks Certified Data Engineer",
  // Finance
  "CFA Level I", "CFA Level II", "CFA Level III",
  "CPA", "FRM (Financial Risk Manager)", "ACCA",
  "CMA (US)", "CMA (India)", "CA (India)",
  // Tech
  "Kubernetes (CKA)", "Kubernetes (CKAD)", "Docker Certified Associate",
  "Terraform Associate", "GitHub Actions Certification",
  "Meta Front-End Developer", "Meta Back-End Developer",
  "Google UX Design Professional",
  // Other
  "ITIL Foundation", "TOGAF", "CCNA", "CCNP",
  "Oracle Certified Professional", "Salesforce Administrator",
  "HubSpot Inbound Marketing", "Google Ads Certification",
];

export type SuggestionField =
  | "role" | "location" | "college" | "company" | "skill"
  | "degree" | "field_of_study" | "certification";

const FIELD_DATA: Record<SuggestionField, string[]> = {
  role:           ROLES,
  location:       LOCATIONS,
  college:        COLLEGES,
  company:        COMPANIES,
  skill:          SKILLS,
  degree:         DEGREES,
  field_of_study: FIELDS_OF_STUDY,
  certification:  CERTIFICATIONS,
};

export function getSuggestions(field: SuggestionField, query: string, limit = 8): string[] {
  const list = FIELD_DATA[field];
  if (!list) return [];
  const q = query.trim().toLowerCase();
  if (!q) return list.slice(0, limit);

  // Exact prefix matches first, then substring matches
  const prefix = list.filter((s) => s.toLowerCase().startsWith(q));
  const rest   = list.filter((s) => !s.toLowerCase().startsWith(q) && s.toLowerCase().includes(q));
  return [...prefix, ...rest].slice(0, limit);
}
