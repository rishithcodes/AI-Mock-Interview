// Domain-specific evaluation rubrics
// Each domain has 3 custom scoring categories instead of the generic ones

const domainRubrics = {
  'Artificial Intelligence': {
    categories: [
      { key: 'mlFundamentals', label: 'ML Fundamentals', weight: 0.4, description: 'Understanding of algorithms, model training, loss functions, overfitting, and evaluation metrics' },
      { key: 'toolsAndFrameworks', label: 'Tools & Frameworks', weight: 0.3, description: 'Proficiency with TensorFlow, PyTorch, scikit-learn, data pipelines, and MLOps' },
      { key: 'problemSolving', label: 'Applied Problem Solving', weight: 0.3, description: 'Ability to select appropriate models, handle edge cases, and design ML systems' },
    ],
  },
  'Web Development': {
    categories: [
      { key: 'frontendSkills', label: 'Frontend Knowledge', weight: 0.35, description: 'HTML/CSS/JS fundamentals, React/Angular, responsive design, accessibility' },
      { key: 'backendSkills', label: 'Backend & APIs', weight: 0.35, description: 'Server-side logic, REST/GraphQL APIs, databases, authentication, deployment' },
      { key: 'systemDesign', label: 'Architecture & Design', weight: 0.3, description: 'System design, performance optimization, security, scalability' },
    ],
  },
  'Data Science': {
    categories: [
      { key: 'statisticalKnowledge', label: 'Statistics & Analysis', weight: 0.35, description: 'Probability, hypothesis testing, regression, statistical modeling' },
      { key: 'dataEngineering', label: 'Data Engineering', weight: 0.3, description: 'Data wrangling, pandas, SQL, ETL pipelines, data cleaning' },
      { key: 'modelingSkills', label: 'Modeling & Visualization', weight: 0.35, description: 'ML modeling, feature engineering, visualization tools, interpreting results' },
    ],
  },
  'Cybersecurity': {
    categories: [
      { key: 'securityFundamentals', label: 'Security Fundamentals', weight: 0.35, description: 'Encryption, authentication, network security, common vulnerabilities (OWASP)' },
      { key: 'offensiveSecurity', label: 'Offensive Security', weight: 0.3, description: 'Penetration testing, vulnerability assessment, exploit knowledge, red teaming' },
      { key: 'defensiveSecurity', label: 'Defensive Security', weight: 0.35, description: 'Incident response, SIEM, threat detection, compliance, hardening' },
    ],
  },
  'Data analytics': {
    categories: [
      { key: 'analyticalSkills', label: 'Analytical Thinking', weight: 0.35, description: 'Data interpretation, trend analysis, metrics definition, business insights' },
      { key: 'toolProficiency', label: 'Tools & SQL', weight: 0.35, description: 'SQL, Excel, Tableau, Power BI, data querying and dashboard creation' },
      { key: 'communication', label: 'Data Storytelling', weight: 0.3, description: 'Presenting findings, creating reports, stakeholder communication' },
    ],
  },
  'Chartered Accountant': {
    categories: [
      { key: 'accountingKnowledge', label: 'Accounting Standards', weight: 0.4, description: 'GAAP/IFRS, financial statements, journal entries, reconciliation' },
      { key: 'taxAndAudit', label: 'Taxation & Audit', weight: 0.35, description: 'Tax laws, audit procedures, compliance, statutory requirements' },
      { key: 'practicalApplication', label: 'Practical Application', weight: 0.25, description: 'Real-world problem solving, client scenarios, financial advisory' },
    ],
  },
  'Sales Executive': {
    categories: [
      { key: 'salesStrategy', label: 'Sales Strategy', weight: 0.35, description: 'Pipeline management, lead qualification, closing techniques, CRM usage' },
      { key: 'communicationSkills', label: 'Communication & Negotiation', weight: 0.35, description: 'Objection handling, rapport building, persuasion, presentation skills' },
      { key: 'businessAcumen', label: 'Business Acumen', weight: 0.3, description: 'Market awareness, revenue thinking, competitor analysis, customer insights' },
    ],
  },
};

// Fallback for any domain not in the list
const defaultRubric = {
  categories: [
    { key: 'technicalSkills', label: 'Technical Mastery', weight: 0.4, description: 'Domain-specific knowledge and terminology' },
    { key: 'softSkills', label: 'Communication', weight: 0.3, description: 'Clarity, professionalism, and articulation' },
    { key: 'problemSolving', label: 'Problem Solving', weight: 0.3, description: 'Analytical thinking and practical experience' },
  ],
};

export function getRubric(domain) {
  return domainRubrics[domain] || defaultRubric;
}

export function computeOverallScore(scores, rubric) {
  return Math.round(
    rubric.categories.reduce((sum, cat) => sum + (scores[cat.key] || 0) * cat.weight, 0)
  );
}
