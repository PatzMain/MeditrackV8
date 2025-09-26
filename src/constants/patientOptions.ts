// Patient form options and constants
// These can be easily modified to add or remove options

export const COURSE_OPTIONS = [
  // College of Engineering and Information Technology
  'Civil Engineering',
  'Computer Engineering',
  'Electrical Engineering',
  'Electronics and Communications Engineering',
  'Industrial Engineering',
  'Mechanical Engineering',
  'Computer Science',
  'Information Technology',
  'Information Systems',

  // College of Arts and Sciences
  'Biology',
  'Chemistry',
  'Mathematics',
  'Physics',
  'Psychology',
  'Social Sciences',
  'English Language',
  'Filipino',
  'History',
  'Political Science',
  'Arts and Letters',
  'Philosophy',

  // College of Agriculture and Food Science
  'Agriculture',
  'Agricultural Engineering',
  'Food Science and Technology',
  'Veterinary Medicine',
  'Animal Science',
  'Plant Science',
  'Soil Science',

  // College of Education
  'Elementary Education',
  'Secondary Education',
  'Physical Education',
  'Special Education',
  'Educational Management',

  // College of Economics, Management and Development Studies
  'Business Administration',
  'Economics',
  'Entrepreneurship',
  'Hotel and Restaurant Management',
  'Tourism Management',
  'Public Administration',

  // College of Nursing and Allied Health Sciences
  'Nursing',
  'Medical Technology',
  'Pharmacy',
  'Physical Therapy',
  'Occupational Therapy',
  'Radiologic Technology',
  'Respiratory Therapy',

  // College of Sports, Physical Education and Recreation
  'Sports Science',
  'Physical Education',
  'Recreation and Leisure Studies',

  // High School Programs
  'Science and Technology',
  'Humanities and Social Sciences',
  'General Academic Strand',
  'Accountancy, Business and Management',
  'Technical-Vocational-Livelihood',

  // Other/Custom (allows free text input)
  'Other'
];

export const DEPARTMENT_OPTIONS = [
  // Academic Colleges
  'College of Engineering and Information Technology',
  'College of Arts and Sciences',
  'College of Agriculture and Food Science',
  'College of Education',
  'College of Economics, Management and Development Studies',
  'College of Nursing and Allied Health Sciences',
  'College of Sports, Physical Education and Recreation',

  // Administrative Departments
  'Office of the President',
  'Vice President for Academic Affairs',
  'Vice President for Administration and Finance',
  'Vice President for Research and Extension',
  'Registrar Office',
  'Student Affairs and Services',
  'Human Resources',
  'Finance Office',
  'Library Services',
  'Information Technology Services',
  'Campus Safety and Security',
  'Physical Plant and Facilities',
  'Medical Services',
  'Dental Services',
  'Guidance and Counseling',

  // Support Services
  'Maintenance and General Services',
  'Food Services',
  'Transportation Services',
  'Procurement Office',
  'Legal Affairs',
  'Public Relations',
  'Alumni Relations',

  // Research and Extension
  'Research and Development Office',
  'Community Extension Services',
  'Technology Transfer Office',

  // High School Department
  'Senior High School Department',
  'Basic Education Department',

  // Other/Custom (allows free text input)
  'Other'
];

export const STUDENT_LEVEL_OPTIONS = [
  { value: 'highschool', label: 'High School' },
  { value: 'college', label: 'College' }
];

export const YEAR_LEVEL_OPTIONS = {
  highschool: [
    { value: 7, label: 'Grade 7' },
    { value: 8, label: 'Grade 8' },
    { value: 9, label: 'Grade 9' },
    { value: 10, label: 'Grade 10' },
    { value: 11, label: 'Grade 11' },
    { value: 12, label: 'Grade 12' }
  ],
  college: [
    { value: 1, label: '1st Year' },
    { value: 2, label: '2nd Year' },
    { value: 3, label: '3rd Year' },
    { value: 4, label: '4th Year' },
    { value: 5, label: '5th Year' },
    { value: 6, label: '6th Year' }
  ]
};

export const PATIENT_TYPE_OPTIONS = [
  { value: 'Student', label: 'Student' },
  { value: 'Employee', label: 'Employee' },
  { value: 'Dependent', label: 'Dependent' },
  { value: 'OPD', label: 'OPD (Outpatient Department)' }
];

export const SEX_OPTIONS = [
  { value: 'Male', label: 'Male' },
  { value: 'Female', label: 'Female' }
];

export const CIVIL_STATUS_OPTIONS = [
  { value: 'Single', label: 'Single' },
  { value: 'Married', label: 'Married' },
  { value: 'Divorced', label: 'Divorced' },
  { value: 'Widowed', label: 'Widowed' }
];

// Helper function to filter options based on search
export const filterOptions = (options: string[], searchTerm: string): string[] => {
  if (!searchTerm) return options;

  return options.filter(option =>
    option.toLowerCase().includes(searchTerm.toLowerCase())
  );
};

// Helper function to check if an option is in the predefined list
export const isCustomOption = (options: string[], value: string): boolean => {
  return !options.includes(value) && value !== '';
};