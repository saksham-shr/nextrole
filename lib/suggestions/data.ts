// Static suggestion lists for profile fields.
// All filtering is done server-side; clients never receive the full lists.

export const ROLES = [
  // Engineering
  "Software Engineer", "Senior Software Engineer", "Staff Software Engineer",
  "Principal Software Engineer", "Software Architect", "Lead Engineer",
  "Engineering Manager", "VP of Engineering", "CTO", "Head of Engineering",
  "Frontend Engineer", "Backend Engineer", "Full Stack Engineer",
  "Mobile Engineer", "iOS Engineer", "Android Engineer",
  "Platform Engineer", "Infrastructure Engineer", "Site Reliability Engineer",
  "DevOps Engineer", "Cloud Engineer", "MLOps Engineer",
  // Data
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
  // Specialized
  "Blockchain Developer", "Smart Contract Developer", "Web3 Engineer",
  "Embedded Systems Engineer", "Firmware Engineer", "Systems Engineer",
  "Game Developer", "Graphics Engineer", "Computer Vision Engineer",
  "NLP Engineer", "Robotics Engineer",
  // Management & Leadership
  "Technical Program Manager", "Program Manager", "Delivery Manager",
  "Scrum Master", "Agile Coach", "IT Manager",
  // Business
  "Solutions Architect", "Pre-Sales Engineer", "Sales Engineer",
  "Customer Success Engineer", "Developer Advocate", "Technical Writer",
  "Consultant", "Technology Consultant",
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
  "Mysore, Karnataka", "Mangalore, Karnataka",
  // Global
  "Remote", "Remote (India)", "Remote (US)", "Remote (Europe)",
  "San Francisco, CA", "New York, NY", "Seattle, WA", "Austin, TX",
  "Boston, MA", "Chicago, IL", "Los Angeles, CA", "Denver, CO",
  "London, UK", "Berlin, Germany", "Amsterdam, Netherlands",
  "Toronto, Canada", "Vancouver, Canada",
  "Singapore", "Dubai, UAE", "Sydney, Australia",
];

export const COLLEGES = [
  // IITs
  "IIT Bombay", "IIT Delhi", "IIT Madras", "IIT Kanpur", "IIT Kharagpur",
  "IIT Roorkee", "IIT Guwahati", "IIT Hyderabad", "IIT BHU", "IIT Indore",
  "IIT Gandhinagar", "IIT Jodhpur", "IIT Patna", "IIT Bhubaneswar",
  "IIT Mandi", "IIT Ropar", "IIT Tirupati", "IIT Palakkad",
  // NITs
  "NIT Trichy", "NIT Warangal", "NIT Surathkal", "NIT Calicut",
  "NIT Rourkela", "NIT Allahabad", "NIT Bhopal", "NIT Jaipur",
  "NIT Nagpur", "NIT Durgapur", "NIT Srinagar", "NIT Silchar",
  // IIITs
  "IIIT Hyderabad", "IIIT Bangalore", "IIIT Delhi", "IIIT Allahabad",
  "IIIT Pune", "IIIT Lucknow",
  // IIMs
  "IIM Ahmedabad", "IIM Bangalore", "IIM Calcutta", "IIM Lucknow",
  "IIM Kozhikode", "IIM Indore", "IIM Shillong",
  // Top private engineering
  "BITS Pilani", "BITS Goa", "BITS Hyderabad",
  "VIT Vellore", "VIT Chennai", "Manipal Institute of Technology",
  "SRM Institute of Science and Technology",
  "Amity University", "Thapar Institute of Engineering",
  "PSG College of Technology", "SSN College of Engineering",
  "RV College of Engineering", "PES University", "BMSCE",
  "Dayananda Sagar College of Engineering",
  // Central universities
  "Delhi University", "Jadavpur University", "BHU Varanasi",
  "Hyderabad University", "IISER Pune", "IISER Kolkata",
  // Top MBA
  "XLRI Jamshedpur", "MDI Gurgaon", "FMS Delhi", "SPJIMR Mumbai",
  "ISB Hyderabad",
];

export const COMPANIES = [
  // Indian tech product
  "Flipkart", "Swiggy", "Zomato", "Ola", "Paytm", "PhonePe", "Razorpay",
  "CRED", "Meesho", "Dream11", "ShareChat", "Unacademy", "Byju's",
  "Freshworks", "Zoho", "Chargebee", "Postman", "BrowserStack",
  "Juspay", "Groww", "Zerodha", "Angel One", "PolicyBazaar",
  "Urban Company", "Nykaa", "Lenskart", "MakeMyTrip", "Yatra",
  "Dunzo", "Rapido", "Porter", "Delhivery", "Shiprocket",
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
  // Global
  "Google", "Microsoft", "Amazon", "Meta", "Apple", "Netflix",
  "Uber", "Airbnb", "Stripe", "Shopify", "Atlassian", "Twilio",
  "Databricks", "Snowflake", "MongoDB", "HashiCorp",
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
  // Other
  "Git", "Linux", "REST APIs", "gRPC", "WebSockets",
  "System Design", "Microservices", "CI/CD",
];

export type SuggestionField = "role" | "location" | "college" | "company" | "skill";

const FIELD_DATA: Record<SuggestionField, string[]> = {
  role:     ROLES,
  location: LOCATIONS,
  college:  COLLEGES,
  company:  COMPANIES,
  skill:    SKILLS,
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
