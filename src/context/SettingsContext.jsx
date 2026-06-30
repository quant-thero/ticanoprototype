import React, { createContext, useContext, useState, useEffect } from 'react';

// Setswana translations for UI strings. Falls back to the English key if a
// translation is missing, so partially-wrapped screens degrade gracefully.
// Keys are the exact English source strings; wrap a string in t('...') in a
// component for it to translate. Sourced from the Ticano EN↔Setswana glossary.
const TRANSLATIONS = {
  en: {},
  tn: {
    // ---- Greetings / welcome ----
    'Welcome': 'O amogetswe',
    'Welcome back': 'O amogetswe gape',
    'Welcome Back': 'O Amogetswe Gape',
    'Welcome to Ticano': 'O amogetswe kwa Ticano',
    'Welcome to Ticano Financial Solutions': 'O amogetswe kwa Ticano Financial Solutions',
    'Hello': 'Dumela',
    'Good Morning': 'Dumela',
    'Good Afternoon': 'Dumela',
    'Good Evening': 'Maitseboa a a Molemo',
    "Here's your account overview": 'Kakaretso ya akhaonto ya gago ke e',

    // ---- Top navigation ----
    'Home': 'Gae',
    'About': 'Ka Rona',
    'About Us': 'Ka ga Rona',
    'Services': 'Ditirelo',
    'Documents': 'Dikwalo',
    'Funding': 'Tshegetso ya Madi',
    'Branches': 'Makala',
    'Branch': 'Lekala',
    'Blog': 'Baebele ya Dikgang',
    'Careers': 'Ditiro',
    'Tenders': 'Dikopo tsa Dithendara',
    'Contact': 'Ikgolaganye le Rona',
    'Contact Us': 'Ikgolaganye le Rona',
    'Login': 'Tsena',
    'Register': 'Ikwadise',

    // ---- Accessibility / settings ----
    'Accessibility': 'Tshegetso',
    'Settings': 'Dipeakanyo',
    'Language': 'Puo',
    'English': 'Sekgowa',
    'Setswana': 'Setswana',
    'Large Text': 'Mokwalo o Mogolo',
    'High Contrast': 'Bofarologo jo Bogolo',
    'Dark Mode': 'Mokgwa wa Lefifi',
    'Light Mode': 'Mokgwa wa Lesedi',

    // ---- Hero ----
    'Financial solutions that put you first': 'Ditharabololo tsa madi tse di beang wena kwa pele',
    'As Your Business Grows, We Deliver The Funds.': 'Ha Kgwebo ya Gago e Gola, Re Abela Madi.',
    'Get Started': 'Simolola',
    'Learn More': 'Ithute Go Oketsega',
    'Learn more': 'Ithuta go feta',

    // ---- Services ----
    'Our Services': 'Ditirelo tsa Rona',
    'What We Offer': 'Se Re Itseng Sona',
    'Personal Loans': 'Dikadimo tsa Batho',
    'Business Loans': 'Dikadimo tsa Dikgwebo',
    'Financial Advice': 'Kgakololo ya Ditšhelete',
    'Investment Solutions': 'Ditharabololo tsa Peeletso',
    'Insurance': 'Inshorense',
    'View More': 'Bona Tse Dingwe',
    'Flexible, fast, and fair trade finance solutions designed for the Botswana market.': 'Ditharabololo tse di sa thibelweng, tse di potlakang, le tse di siamang tsa madi a kgwebo go baakantsweng go bua le lefelo la Botswana.',

    // ---- Statistics ----
    'Happy Clients': 'Bareki ba ba Kgotsofetseng',
    'Years of Experience': 'Dingwaga tsa Maitemogelo',
    'Branches Nationwide': 'Makala mo Nageng yotlhe',
    'Success Stories': 'Dipale tsa Katlego',

    // ---- About / mission ----
    'About Our Company': 'Ka Kgampany ya Rona',
    'Open Account': 'Bula Akhaonto',
    'Our Mission': 'Maikaelelo a Rona',
    'Our Vision': 'Temoso ya Rona',
    'Why Choose Us': 'Ke Baka Lang o Kgetha Rona',
    'The Ticano Difference': 'Pharologano ya Ticano',

    // ---- How it works ----
    'How It Works': 'Go Dira Jang',
    'Purchase Order Funding Cycle': 'Mokgwa wa Tshegetso ya Tolamente',
    "From purchase order to profit - here's how Ticano makes it happen.": 'Go tswa go tolamente go ya go poelo - ke fa Ticano e dira jalo.',
    'Ticano Pays Supplier': 'Ticano e Lefa Moabedi',
    'Ticano Pays the supplier on behalf of the client.': 'Ticano e lefa moabedi ka lehelo la moreki.',
    'Client Delivers': 'Moreki o Abela',
    'Ticano Receives Payment': 'Ticano e Amogela Tuelo',
    'Get Funded': 'Bona Madi',
    'Get Directions': 'Bona Tsela',
    'Walk In': 'Tsena',
    'Required Documents': 'Dikwalo tse di Hlokegang',

    // ---- Careers ----
    'Join Our Team': 'Tla o Dire le Rona',
    'Apply Now': 'Dira Kopo Jaanong',
    'No vacancies available': 'Ga go na ditiro tse di bulegileng jaanong',

    // ---- Blog ----
    'Latest News': 'Dikgang tsa Moragonyana',
    'Read More': 'Bala Go Oketsega',
    'Published': 'E Gatisitswe',
    'Draft': 'Kwalololo',

    // ---- Contact ----
    'Phone': 'Mogala',
    'Email': 'Imeile',
    'Address': 'Aterese',
    'Send Message': 'Romela Molaetsa',

    // ---- Footer ----
    'Quick Links': 'Dikgolagano tse di potlakang',
    'Follow Us': 'Re Latele',
    'All Rights Reserved': 'Ditshwanelo Tsotlhe di Sireleditswe',
    'All rights reserved.': 'Ditshwanelo tsotlhe di bolokiwa.',
    'Privacy Policy': 'Pholisi ya Sephiri',
    'Terms & Conditions': 'Melao le Dipehelo',
    'Terms of Service': 'Maemo a Tirelo',
    'Cookie Policy': 'Pholisi ya Cookie',

    // ---- Login page ----
    'Sign in to your account': 'Tsena mo akhaontong ya gago',
    'Email Address': 'Aterese ya Imeile',
    'Password': 'Lefoko la Sephiri',
    'Remember Me': 'Nkgopole',
    'Forgot Password?': 'O Lebetse Lefoko la Sephiri?',
    'Sign In': 'Tsena',
    'Continue': 'Tswelela',
    'Cancel': 'Khansela',
    'Send Reset Link': 'Romela Kgokagano ya go Fetola Lefoko la Sephiri',

    // ---- Demo accounts / roles ----
    'Client': 'Moreki',
    'Portfolio Manager': 'Molaodi wa Potefolio',
    'Service Manager': 'Molaodi wa Ditirelo',
    'Director': 'Mokaedi',
    'Marketing': 'Lefapha la Papatso',
    'Administrator': 'Motsamaisi',
    'Access your complaints & feedback': 'Bona dingongorego le dikakgelo tsa gago',
    'Manage your client cases': 'Laola dikgang tsa bareki',
    'Branch oversight & staff': 'Laola lekala le badiri',
    'Executive intelligence view': 'Ponelopele ya botsamaisi',
    'Analytics & lead insights': 'Tshekatsheko ya kgwebo',
    'Full system administration': 'Taolo ya tsamaiso yotlhe',

    // ---- Password reset ----
    'Forgot your password?': 'O lebetse lefoko la sephiri?',
    'Enter your email address': 'Tsenya aterese ya gago ya imeile',
    'Check your email': 'Tlhola imeile ya gago',
    'Password reset email sent': 'Imeile ya go fetola lefoko la sephiri e rometswe',

    // ---- Auth errors ----
    'Invalid email or password': 'Imeile kgotsa lefoko la sephiri ga di a siama',
    'Login failed': 'Go tsena go paletswe',
    'Network error': 'Bothata jwa kgokagano',
    'Please fill in all fields': 'Tsweetswee tlatsa mafelo otlhe',

    // ---- Register page ----
    'Create Your Account': 'Tlhama Akhaonto ya Gago',
    'Full Name': 'Maina Otlhe',
    'WhatsApp Number': 'Nomoro ya WhatsApp',
    'Confirm Password': 'Netefatsa Lefoko la Sephiri',
    'Base Location': 'Lefelo la Gago',
    'Preferred Branch': 'Lekala le o Le Ratang',
    'How did you hear about us?': 'O utlwile ka rona jang?',
    'Other': 'Tse Dingwe',
    'Receive Birthday Messages': 'Amogela melaetsa ya letsatsi la matsalo',
    'Birthday': 'Letsatsi la Matsalo',
    'Share my location': 'Abelana ka lefelo la me',
    'Receive tender notifications': 'Amogela dikitsiso tsa dithendara',
    'Receive promotional messages': 'Amogela melaetsa ya papatso',
    'Create Account': 'Tlhama Akhaonto',
    'Already have an account?': 'O setse o na le akhaonto?',
    'Passwords do not match': 'Mafoko a sephiri ga a tshwane',
    'Email already exists': 'Imeile eno e setse e dirisiwa',
    'Registration successful': 'Go ikwadisa go atlegile',
    'Registration failed': 'Go ikwadisa go paletswe',
    'Please complete all required fields': 'Tsweetswee tlatsa mafelo otlhe a a tlhokegang',

    // ---- Client dashboard ----
    'Dashboard': 'Letlapa la Taolo',
    'Overview': 'Kakaretso',
    "Today's Summary": 'Kakaretso ya Gompieno',
    'Branch Performance': 'Tiragatso ya Lekala',
    'Profile': 'Moporofaele',
    'Feedback': 'Dikakgelo',
    'Complaints': 'Dingongorego',
    'My Complaints': 'Dingongorego tsa me',
    'Notifications': 'Dikitsiso',
    'Branch Locator': 'Batla Lekala',
    'Logout': 'Tswa',
    'Submit Complaint': 'Romela Ngongorego',
    'Submit a Complaint': 'Romela Ngongorego',
    'Submit Feedback': 'Romela Dikakgelo',
    'Find a Branch': 'Batla Lekala',
    'Contact Support': 'Ikgolaganye le Thuso',
    'View Profile': 'Bona Moporofaele',
    'Update Details': 'Baakanya Tshedimosetso',
    'Improve Ticano': 'Tokafatsa Ticano',
    'Feedback History': 'Histori ya Maikutlo',
    'Your Portfolio Manager': 'Motsamaisi wa Lenaneo la gago',

    // ---- Complaint status ----
    'Complaint Status': 'Maemo a Ngongorego',
    'New': 'E Ntšha',
    'Open': 'E Bulegile',
    'Pending': 'E Santse e Letetswe',
    'Under Review': 'E Santse e Sekasekiwa',
    'In Progress': 'E Santse e Dirwa',
    'Assigned': 'E Abetswe',
    'Escalated': 'E Isitswe Godimo',
    'Resolved': 'E Rarabolotswe',
    'Closed': 'E Tswetswe',
    'Created': 'E thakgotse',
    'Open Complaints': 'Dingongorego tse di Bulegileng',
    'No complaints yet': 'Ga go na dingongorego',

    // ---- Client stats ----
    'Total Complaints': 'Palogotlhe ya Dingongorego',
    'Feedback Submitted': 'Dikakgelo Tse di Rometsweng',
    'Active Cases': 'Dikgang Tse di Tsweletseng',
    'Messages': 'Melaetsa',
    'No Notifications': 'Ga go na Dikitsiso',
    'Mark as Read': 'Tshwaya e le e Badilweng',
    'View All': 'Bona Tsotlhe',
    'Clear All': 'Tlosa Tsotlhe',

    // ---- Feedback form ----
    'Feedback Form': 'Foromo ya Dikakgelo',
    'We value your opinion': 'Re tsaya maikutlo a gago a le botlhokwa',
    'Tell us about your experience': 'Re bolelele maitemogelo a gago',
    'Overall Rating': 'Kelo ya Kakaretso',
    'Excellent': 'E Siameng Thata',
    'Very Good': 'E Molemo Thata',
    'Good': 'E Molemo',
    'Fair': 'E Lekalekanetse',
    'Poor': 'Ga e Kgotsofatse',
    'Was our staff helpful?': 'A badiri ba rona ba go thusitse?',
    'Were you satisfied with the service?': 'A o kgotsofetse ka tirelo?',
    'Would you recommend us?': 'A o ka re akantsha mo go ba bangwe?',
    'Additional Comments': 'Maikutlo a Mangwe',
    'Suggestions for Improvement': 'Dikakantsho tsa Tokafatso',
    'Tell us how we can improve': 'Re bolelele gore re ka tokafatsa jang ditirelo tsa rona',
    'Clear Form': 'Phimola Foromo',
    'Please select a rating': 'Tsweetswee tlhopha maduo',
    'Please enter your comments': 'Tsweetswee kwala maikutlo a gago',
    'Feedback submitted successfully': 'Dikakgelo di rometswe ka katlego',
    'Failed to submit feedback': 'Go romela dikakgelo go paletswe',
    'Thank you for your feedback': 'Re a leboga ka dikakgelo tsa gago',
    'Thank You!': 'Re a Leboga!',
    'Your feedback has been received': 'Dikakgelo tsa gago di amogetswe',
    'Return Home': 'Boela Gae',
    'Submit Another Response': 'Romela Tse Dingwe',

    // ---- Profile page ----
    'My Profile': 'Moporofaele wa Me',
    'Personal Information': 'Tshedimosetso ya Botho',
    'Account Settings': 'Dipeakanyo tsa Akhaonto',
    'Phone Number': 'Nomoro ya Mogala',
    'Date of Birth': 'Letsatsi la Matsalo',
    'Profile Picture': 'Setshwantsho sa Moporofaele',
    'Upload Picture': 'Tsenya Setshwantsho',
    'Remove Picture': 'Tlosa Setshwantsho',
    'Change Picture': 'Fetola Setshwantsho',
    'Edit Profile': 'Baakanya Moporofaele',
    'Save Changes': 'Boloka Diphetogo',
    'Cancel Changes': 'Khansela Diphetogo',
    'Discard Changes': 'Tlogela Diphetogo',
    'Change Password': 'Fetola Lefoko la Sephiri',
    'Current Password': 'Lefoko la Sephiri la Gona Jaanong',
    'New Password': 'Lefoko la Sephiri le Lesha',
    'Confirm New Password': 'Netefatsa Lefoko la Sephiri le Lesha',
    'Password updated successfully': 'Lefoko la sephiri le fetotswe ka katlego',
    'Current password is incorrect': 'Lefoko la sephiri la jaanong ga le a siama',
    'New passwords do not match': 'Mafoko a sephiri a masha ga a tshwane',
    'Password must be at least 8 characters': 'Lefoko la sephiri le tshwanetse go nna le ditlhaka di le 8 kgotsa go feta',
    'Notification Preferences': 'Dipeakanyo tsa Dikitsiso',
    'Email Notifications': 'Dikitsiso ka Imeile',
    'WhatsApp Notifications': 'Dikitsiso ka WhatsApp',
    'SMS Notifications': 'Dikitsiso ka SMS',
    'Receive Marketing Messages': 'Amogela Melaetsa ya Papatso',
    'Profile updated successfully': 'Moporofaele o baakantswe ka katlego',
    'Changes saved': 'Diphetogo di bolokilwe',
    'Profile picture updated': 'Setshwantsho sa moporofaele se baakantswe',
    'Changes cancelled': 'Diphetogo di khansetswe',

    // ---- Staff dashboards: navigation & complaint mgmt ----
    'Improvement Feedback': 'Dikakantsho tsa Tokafatso',
    'Knowledge Base': 'Bobolokelo jwa Kitso',
    'Reports': 'Dipego',
    'Analytics': 'Tshekatsheko',
    'Leads': 'Bareki ba ba Ka Nnang Teng',
    'Applications': 'Dikopo',
    'Complaint Queue': 'Lenaane la Dingongorego',
    'Complaint Details': 'Dintlha tsa Ngongorego',
    'Complaint ID': 'Nomoro ya Ngongorego',
    'Assigned To': 'E Abetswe',
    'Client Name': 'Leina la Moreki',
    'Date Submitted': 'Letsatsi la go Romelwa',
    'Category': 'Setlhopha',
    'Priority': 'Botlhokwa',
    'Status': 'Maemo',

    // ---- Priority levels ----
    'Low': 'Tlase',
    'Medium': 'Magareng',
    'High': 'Godimo',
    'Urgent': 'Potlako',

    // ---- Complaint actions ----
    'Assign': 'Aba',
    'Reassign': 'Aba Gape',
    'Escalate': 'Isa Godimo',
    'Resolve': 'Rarabolola',
    'Close Case': 'Tswala Kgang',
    'Reopen': 'Bula Gape',
    'Add Notes': 'Tsenya Dintlha',
    'Contact Client': 'Ikgolaganye le Moreki',

    // ---- Filters ----
    'Search': 'Batla',
    'Filter': 'Sefa',
    'Sort By': 'Rulaganya ka',
    'Date Range': 'Lobaka lwa Matsatsi',
    'Assigned Staff': 'Modiri yo o Abetsweng',

    // ---- Complaint analytics ----
    'Complaints This Month': 'Dingongorego tsa Kgwedi Eno',
    'Average Resolution Time': 'Palogare ya Nako ya go Rarabolola',
    'Customer Satisfaction': 'Kgotsofalo ya Bareki',
    'Open Cases': 'Dikgang Tse di Bulegileng',
    'Closed Cases': 'Dikgang Tse di Tswetsweng',
    'Escalated Cases': 'Dikgang Tse di Isitsweng Godimo',

    // ---- Reports ----
    'Daily Report': 'Pego ya Letsatsi',
    'Weekly Report': 'Pego ya Beke',
    'Monthly Report': 'Pego ya Kgwedi',
    'Export PDF': 'Romela e le PDF',
    'Export Excel': 'Romela e le Excel',
    'Download Report': 'Gaisa Pego',
    'Generate Report': 'Tlhagisa Pego',

    // ---- Knowledge base ----
    'Search Articles': 'Batla Ditlhogo',
    'Create Article': 'Tlhama Setlhogo',
    'Edit Article': 'Baakanya Setlhogo',
    'Delete Article': 'Phimola Setlhogo',

    // ---- Leads ----
    'New Leads': 'Bareki ba Basha',
    'Contact Lead': 'Ikgolaganye le Moreki',
    'Converted': 'E Fetogile go nna Moreki',
    'Lost': 'E Latlhegile',
    'Follow Up': 'Tswelela ka Puisano',

    // ---- Generic success ----
    'Complaint assigned successfully': 'Ngongorego e abilwe ka katlego',
    'Complaint updated': 'Ngongorego e baakantswe',
    'Report generated': 'Pego e tlhagisitswe',
    'Notes saved': 'Dintlha di bolokilwe',

    // ---- Portfolio Manager dashboard ----
    'Portfolio Dashboard': 'Letlapa la Taolo la Potefolio',
    'Client Portfolio': 'Potefolio ya Bareki',
    'Assigned Clients': 'Bareki ba o ba Abetsweng',
    'Performance Overview': 'Kakaretso ya Tiragatso',
    'Clients': 'Bareki',
    'Calendar': 'Khalendara',
    'Tasks': 'Ditiro',
    'Client Number': 'Nomoro ya Moreki',
    'Contact Details': 'Tshedimosetso ya go Ikgolaganya',
    'Loan Status': 'Maemo a Kadimo',
    'Last Contact': 'Puisano ya Bofelo',
    'Assigned Date': 'Letsatsi la Kabo',
    'New Application': 'Kopo e Ntšha',
    'Pending Approval': 'E Letetse Tetla',
    'Approved': 'E Amogetswe',
    'Rejected': 'E Gannwe',
    'View Client': 'Bona Moreki',
    'Update Client': 'Baakanya Moreki',
    'Schedule Meeting': 'Rulaganya Kopano',
    'Send Email': 'Romela Imeile',
    'Send WhatsApp': 'Romela WhatsApp',
    'Call Client': 'Letsetsa Moreki',
    "Today's Tasks": 'Ditiro tsa Gompieno',
    'Upcoming Tasks': 'Ditiro Tse di Tlang',
    'Completed Tasks': 'Ditiro Tse di Fedileng',
    'Overdue Tasks': 'Ditiro Tse di Fetileng Nako',
    'Schedule': 'Lenaneo',
    'Meeting': 'Kopano',
    'Appointment': 'Kopano',
    'Reminder': 'Segopotso',
    'Active Clients': 'Bareki ba ba Dirang',
    'New Clients': 'Bareki ba Basha',
    'Monthly Target': 'Maikaelelo a Kgwedi',
    'Target Achieved': 'Maikaelelo a Fitlheletswe',
    'Success Rate': 'Sekgahla sa Katlego',
    'Portfolio Report': 'Pego ya Potefolio',
    'Client Report': 'Pego ya Bareki',
    'Performance Report': 'Pego ya Tiragatso',
    'New client assigned': 'O abilwe moreki yo mosha',
    'Meeting reminder': 'Segopotso sa kopano',
    'Application approved': 'Kopo e amogetswe',
    'Complaint received': 'Ngongorego e amogetswe',

    // ---- Common system messages / buttons ----
    'Submit': 'Romela',
    'Save': 'Boloka',
    'Back': 'Morago',
    'Next': 'Tla pele',
    'Close': 'Tswala',
    'Edit': 'Fetola',
    'Delete': 'Phimola',
    'View': 'Lebelela',
    'Send': 'Romela',
    'Update': 'Ntšhafatsa',
    'Confirm': 'Tlhomamisa',
    'Yes': 'Ee',
    'No': 'Nnyaa',
    'Ticket': 'Tekete',
    'Customer': 'Moreki',
    'Description': 'Tlhaloso',
    'Severity': 'Botho',
    'Saving...': 'E a bolokwa...',
    'Submitting...': 'Go a romelwa...',
    'Loading...': 'E a laisa...',
    'Please wait...': 'Tsweetswee leta...',
    'Operation completed successfully': 'Tiragatso e weditswe ka katlego',
    'An unexpected error occurred': 'Go nnile le phoso e e sa lebelelwang',
    'Retry': 'Leka Gape',
    'Refresh': 'Lapolosa',

    // ---- Feedback prompts (banners) ----
    'How did we do?': 'Re dirile jang?',
    'Help us improve by sharing your experience.': 'Re thuse go tokafatsa ka go arolelana boitemogelo jwa gago.',
    'How can we improve your experience with Ticano?': 'Re ka tokafatsa boitemogelo jwa gago jang le Ticano?',
    'Feedback shared': 'Maikutlo a abeditswe',
    'Tell us what went wrong': 'Re bolelele se se fositseng',
    'Latest complaint': 'Ngongorego ya bofelo',
    'Quick view of your most recent ticket': 'Tebelelo e potlana ya tekete ya gago ya bofelo',
  },
};

const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem('ticano_lang') || 'en');
  const [highContrast, setHighContrast] = useState(() => localStorage.getItem('ticano_high_contrast') === '1');
  const [largeText, setLargeText] = useState(() => localStorage.getItem('ticano_large_text') === '1');

  useEffect(() => {
    localStorage.setItem('ticano_lang', lang);
    document.documentElement.lang = lang === 'tn' ? 'tn' : 'en';
  }, [lang]);

  useEffect(() => {
    localStorage.setItem('ticano_high_contrast', highContrast ? '1' : '0');
    if (highContrast) document.documentElement.classList.add('high-contrast');
    else document.documentElement.classList.remove('high-contrast');
  }, [highContrast]);

  useEffect(() => {
    localStorage.setItem('ticano_large_text', largeText ? '1' : '0');
    if (largeText) document.documentElement.classList.add('large-text');
    else document.documentElement.classList.remove('large-text');
  }, [largeText]);

  // Translate a key, falling back to the key itself if missing.
  const t = (key) => {
    if (lang === 'en') return key;
    return TRANSLATIONS[lang]?.[key] || key;
  };

  return (
    <SettingsContext.Provider value={{
      lang, setLang,
      highContrast, setHighContrast,
      largeText, setLargeText,
      t,
    }}>
      {children}
    </SettingsContext.Provider>
  );
}

export const useSettings = () => useContext(SettingsContext);
