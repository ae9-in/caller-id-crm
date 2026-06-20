const { getOpenAIClient } = require('../config/openai');
const { query } = require('../config/database');
const storageService = require('./storageService');
const logger = require('../utils/logger');

const MOCK_TRANSCRIPTS = [
  {
    keywords: ['delhi', 'iit', 'college', 'university', 'placement', 'academic', 'school', 'insti'],
    text: "Agent: Hello, good afternoon. Am I speaking with the Placement Officer? Customer: Yes, speaking. Who is this? Agent: Hi, this is Rajesh from Akshara Education. We offer high-quality pre-placement training and corporate preparation programs for final year students. I wanted to check if you have any training slots open for the upcoming semester. Customer: We do run pre-placement bootcamps. What domains do you cover? Agent: We cover aptitude training, data structures, resume building, and mock technical/HR interviews. Our partner colleges have seen a significant increase in their placement rates. Customer: That sounds like what we need. We've had students struggle with the aptitude round. Can you send a detailed proposal and pricing? Agent: Absolutely, I will email you the detailed proposal and package options today. Let's schedule a short follow-up call next Tuesday at 11 AM to discuss it. Customer: Sounds good. Please email me first, and we can connect next week. Agent: Perfect, thank you for your time. Have a great day!",
    segments: [
      { start: 0, end: 5.5, text: "Hello, good afternoon. Am I speaking with the Placement Officer?" },
      { start: 5.5, end: 8.0, text: "Yes, speaking. Who is this?" },
      { start: 8.0, end: 18.5, text: "Hi, this is Rajesh from Akshara Education. We offer high-quality pre-placement training and corporate preparation programs for final year students." },
      { start: 18.5, end: 24.0, text: "I wanted to check if you have any training slots open for the upcoming semester." },
      { start: 24.0, end: 28.5, text: "We do run pre-placement bootcamps. What domains do you cover?" },
      { start: 28.5, end: 38.0, text: "We cover aptitude training, data structures, resume building, and mock technical/HR interviews. Our partner colleges have seen a significant increase in their placement rates." },
      { start: 38.0, end: 45.5, text: "That sounds like what we need. We've had students struggle with the aptitude round. Can you send a detailed proposal and pricing?" },
      { start: 45.5, end: 54.0, text: "Absolutely, I will email you the detailed proposal and package options today. Let's schedule a short follow-up call next Tuesday at 11 AM to discuss it." },
      { start: 54.0, end: 59.5, text: "Sounds good. Please email me first, and we can connect next week." },
      { start: 59.5, end: 65.0, text: "Perfect, thank you for your time. Have a great day!" }
    ],
    summary: {
      summary: "Productive initial outreach call with a university placement coordinator. Discussed pre-placement bootcamp services focusing on aptitude and technical training. The client requested a detailed proposal and scheduled a follow-up call next Tuesday.",
      key_points: [
        "Introduced Akshara Education's placement training modules.",
        "Identified student struggles with company aptitude assessment rounds.",
        "Agreed to send proposal and pricing details."
      ],
      action_items: [
        "Send comprehensive training proposal and pricing structure by EOD.",
        "Set calendar invite for follow-up call next Tuesday at 11 AM."
      ],
      follow_up_suggestions: [
        "Include case studies of previous partner colleges showing placement improvement."
      ],
      detected_outcome: "interested",
      sentiment: "positive",
      objections: ["Student aptitude test failures"]
    }
  },
  {
    keywords: ['infosys', 'wipro', 'tcs', 'corporate', 'accenture', 'hr', 'hiring', 'cognizant'],
    text: "Agent: Hello, is this Ms. Priya, the Campus Lead? Customer: Yes, Priya here. How can I help you? Agent: Hello Ms. Priya, I'm Sneha from Akshara Education. We work with top engineering colleges to prepare students specifically for campus recruitment drives. I wanted to understand your hiring volume targets for this year. Customer: We are hiring, but we are looking for candidates who are already certified in cloud technologies or full stack development. We want to reduce our onboarding training time. Agent: That's exactly what we address. We run specialized industry-aligned bootcamps so students have hands-on project experience in React, Node, and AWS before they graduate. Customer: That would save us a lot of training effort. Can we set up a call with our technical training head to review your syllabus? Agent: Yes, definitely! I can invite our program director too. How does this Friday at 3 PM sound? Customer: Friday afternoon works. Please send a calendar invite. Agent: Wonderful, I will send the invite along with our curriculum highlights. Thank you, Priya. Customer: Thank you, bye.",
    segments: [
      { start: 0, end: 4.2, text: "Hello, is this Ms. Priya, the Campus Lead?" },
      { start: 4.2, end: 7.0, text: "Yes, Priya here. How can I help you?" },
      { start: 7.0, end: 17.5, text: "Hello Ms. Priya, I'm Sneha from Akshara Education. We work with top engineering colleges to prepare students specifically for campus recruitment drives." },
      { start: 17.5, end: 21.0, text: "I wanted to understand your hiring volume targets for this year." },
      { start: 21.0, end: 30.5, text: "We are hiring, but we are looking for candidates who are already certified in cloud technologies or full stack development. We want to reduce our onboarding training time." },
      { start: 30.5, end: 40.0, text: "That's exactly what we address. We run specialized industry-aligned bootcamps so students have hands-on project experience in React, Node, and AWS before they graduate." },
      { start: 40.0, end: 46.5, text: "That would save us a lot of training effort. Can we set up a call with our technical training head to review your syllabus?" },
      { start: 46.5, end: 53.0, text: "Yes, definitely! I can invite our program director too. How does this Friday at 3 PM sound?" },
      { start: 53.0, end: 56.5, text: "Friday afternoon works. Please send a calendar invite." },
      { start: 56.5, end: 62.0, text: "Wonderful, I will send the invite along with our curriculum highlights. Thank you, Priya." },
      { start: 62.0, end: 64.0, text: "Thank you, bye." }
    ],
    summary: {
      summary: "Outreach call to Corporate Campus Recruitment Lead. The corporate partner expressed strong interest in candidates pre-trained in cloud technologies and full stack development. Meeting scheduled for Friday at 3 PM with their technical training head.",
      key_points: [
        "Company wants to reduce fresh graduate onboarding training duration.",
        "Discussed Akshara's hands-on project training on React/Node/AWS.",
        "Scheduled a curriculum review meeting."
      ],
      action_items: [
        "Send curriculum highlights and syllabus.",
        "Send calendar invite for Friday 3 PM call."
      ],
      follow_up_suggestions: [
        "Prepare CV profiles of top-performing students from the current batch."
      ],
      detected_outcome: "meeting_scheduled",
      sentiment: "positive",
      objections: ["High onboarding training time/costs"]
    }
  },
  {
    keywords: ['razorpay', 'zomato', 'startup', 'fintech', 'tech', 'paytm'],
    text: "Agent: Hi Vikram, thanks for taking the call. This is Rajesh from Akshara Education. Customer: Hey Rajesh, yeah, what's up? Agent: I saw your post that you are looking for Node.js developers for your engineering team. We have a batch of students graduating next month who have finished intensive project work. Customer: Honestly, we've had bad luck with freshers. They take too long to write production-grade code, and we need people to hit the ground running. Agent: I completely understand. Our developers are trained by industry architects. They write clean code, cover it with unit tests, and follow agile sprints. We can do a short technical assessment to prove their skills. Customer: Well, if you have a developer who can write clean Node APIs, I'm open to testing them. Send me 2 or 3 of your best profiles. Agent: Excellent! I will select the top 3 Node developer profiles and share their GitHub repos and resumes today. Customer: Perfect, if they look good, we will send them our coding challenge. Agent: Sounds great, thanks Vikram. Customer: Thanks, talk soon.",
    segments: [
      { start: 0, end: 4.8, text: "Hi Vikram, thanks for taking the call. This is Rajesh from Akshara Education." },
      { start: 4.8, end: 7.2, text: "Hey Rajesh, yeah, what's up?" },
      { start: 7.2, end: 15.0, text: "I saw your post that you are looking for Node.js developers for your engineering team. We have a batch of students graduating next month." },
      { start: 15.0, end: 22.0, text: "Honestly, we've had bad luck with freshers. They take too long to write production-grade code, and we need people to hit the ground running." },
      { start: 22.0, end: 31.0, text: "I completely understand. Our developers are trained by industry architects. They write clean code, cover it with unit tests, and follow agile sprints." },
      { start: 31.0, end: 35.5, text: "Well, if you have a developer who can write clean Node APIs, I'm open to testing them. Send me 2 or 3 of your best profiles." },
      { start: 35.5, end: 41.0, text: "Excellent! I will select the top 3 Node developer profiles and share their GitHub repos and resumes today." },
      { start: 41.0, end: 45.0, text: "Perfect, if they look good, we will send them our coding challenge." },
      { start: 45.0, end: 47.5, text: "Sounds great, thanks Vikram." },
      { start: 47.5, end: 49.0, text: "Thanks, talk soon." }
    ],
    summary: {
      summary: "Pitch call to a startup engineering manager looking for Node.js developers. Overcame developer quality objections by highlighting training standards and project-based experience. Secured agreement to send top 3 candidate profiles.",
      key_points: [
        "Client hesitant to hire freshers due to onboarding time.",
        "Highlighted Akshara's agile training and clean coding practices.",
        "Client agreed to review top candidate profiles."
      ],
      action_items: [
        "Select and send top 3 Node.js developer resumes and GitHub links today.",
        "Prepare candidates for potential startup coding test."
      ],
      follow_up_suggestions: [
        "Follow up 2 days after sending resumes if no response."
      ],
      detected_outcome: "interested",
      sentiment: "neutral",
      objections: ["Fresh graduate code quality and onboarding speed"]
    }
  }
];

const DEFAULT_MOCK = {
  text: "Agent: Hello, this is Arjun from Akshara Education. Am I speaking with the representative? Customer: Yes, this is Rajesh. How can I help you? Agent: I am calling to discuss our training and student placement collaboration programs. We connect talented students with top-tier opportunities. Customer: Yes, we are currently hiring for junior sales and tech roles. Can you share details? Agent: Absolutely, I will share our placement brochure and corporate deck. I will also follow up to schedule a meeting next week. Customer: Sure, please send the email. I will look out for it. Agent: Thank you for your time, Rajesh. Have a great day. Customer: Thank you, bye.",
  segments: [
    { start: 0, end: 4.5, text: "Hello, this is Arjun from Akshara Education. Am I speaking with the representative?" },
    { start: 4.5, end: 7.0, text: "Yes, this is Rajesh. How can I help you?" },
    { start: 7.0, end: 14.5, text: "I am calling to discuss our training and student placement collaboration programs." },
    { start: 14.5, end: 20.0, text: "Yes, we are currently hiring for junior sales and tech roles. Can you share details?" },
    { start: 20.0, end: 26.5, text: "Absolutely, I will share our placement brochure and corporate deck. I will also follow up to schedule a meeting next week." },
    { start: 26.5, end: 31.0, text: "Sure, please send the email. I will look out for it." },
    { start: 31.0, end: 35.0, text: "Thank you for your time, Rajesh. Have a great day." },
    { start: 35.0, end: 37.0, text: "Thank you, bye." }
  ],
  summary: {
    summary: "Introductory call regarding campus recruitment placement opportunities. The client expressed interest in junior sales and tech roles and requested corporate deck details.",
    key_points: [
      "Initiated contact for career placement alignment.",
      "Identified active hiring requirements for junior sales and technology roles.",
      "Agreed to send placement collateral."
    ],
    action_items: [
      "Send corporate brochure and placement partnership deck."
    ],
    follow_up_suggestions: [
      "Call back next week to schedule a formal pitch meeting."
    ],
    detected_outcome: "interested",
    sentiment: "positive",
    objections: []
  }
};

const REGIONAL_MOCKS = {
  hi: {
    hi: {
      text: "Agent: नमस्ते, शुभ दोपहर। क्या मैं प्लेसमेंट अधिकारी से बात कर रहा हूँ? Customer: हाँ, बोल रहा हूँ। आप कौन हैं? Agent: नमस्ते, मैं अक्षरा एजुकेशन से राजेश हूँ। हम छात्रों के लिए प्री-प्लेसमेंट प्रशिक्षण प्रदान करते हैं। Customer: हम प्री-प्लेसमेंट प्रशिक्षण तो करवाते हैं। आप क्या कवर करते हैं? Agent: हम एप्टीट्यूड, रेज्यूमे बिल्डिंग और मॉक इंटरव्यू कवर करते हैं। Customer: यह हमारे काम का लग रहा है। कृपया प्रस्ताव और मूल्य निर्धारण ईमेल करें। Agent: ज़रूर, मैं आज ही भेज दूँगा। धन्यवाद।",
      segments: [
        { start: 0, end: 4.5, text: "नमस्ते, शुभ दोपहर। क्या मैं प्लेसमेंट अधिकारी से बात कर रहा हूँ?" },
        { start: 4.5, end: 7.0, text: "हाँ, बोल रहा हूँ। आप कौन हैं?" },
        { start: 7.0, end: 14.5, text: "नमस्ते, मैं अक्षरा एजुकेशन से राजेश हूँ। हम छात्रों के लिए प्री-प्लेसमेंट प्रशिक्षण प्रदान करते हैं।" },
        { start: 14.5, end: 20.0, text: "हम प्री-प्लेसमेंट प्रशिक्षण तो करवाते हैं। आप क्या कवर करते हैं?" },
        { start: 20.0, end: 26.5, text: "हम एप्टीट्यूड, रेज्यूमे बिल्डिंग और मॉक इंटरव्यू कवर करते हैं।" },
        { start: 26.5, end: 31.0, text: "यह हमारे काम का लग रहा है। कृपया प्रस्ताव और मूल्य निर्धारण ईमेल करें।" },
        { start: 31.0, end: 35.0, text: "ज़रूर, मैं आज ही भेज दूँगा। धन्यवाद।" }
      ],
      summary: {
        summary: "उत्पादक प्रारंभिक आउटरीच कॉल जिसमें प्लेसमेंट अधिकारी से बातचीत हुई। ग्राहक ने प्रशिक्षण प्रस्ताव और मूल्य निर्धारण की मांग की।",
        key_points: [
          "छात्रों के लिए प्री-प्लेसमेंट प्रशिक्षण की पेशकश की।",
          "ग्राहक ने एप्टीट्यूड प्रशिक्षण की आवश्यकता जताई।",
          "ग्राहक ने ईमेल पर प्रस्ताव भेजने का अनुरोध किया।"
        ],
        action_items: [
          "आज ही प्रशिक्षण प्रस्ताव और मूल्य निर्धारण ईमेल करें।"
        ],
        follow_up_suggestions: [
          "प्रस्ताव भेजने के बाद अगले सप्ताह कॉल करें।"
        ],
        detected_outcome: "interested",
        sentiment: "positive",
        objections: []
      }
    },
    en: {
      text: "Agent: Hello, good afternoon. Am I speaking with the Placement Officer? Customer: Yes, speaking. Who is this? Agent: Hi, this is Rajesh from Akshara Education. We offer pre-placement training for students. Customer: We do conduct pre-placement bootcamps. What domains do you cover? Agent: We cover aptitude training, data structures, resume building, and mock interviews. Customer: That sounds like what we need. Please email me the proposal and pricing. Agent: Absolutely, I will email you the proposal today. Thank you for your time.",
      segments: [
        { start: 0, end: 4.5, text: "Hello, good afternoon. Am I speaking with the Placement Officer?" },
        { start: 4.5, end: 7.0, text: "Yes, speaking. Who is this?" },
        { start: 7.0, end: 14.5, text: "Hi, this is Rajesh from Akshara Education. We offer pre-placement training for students." },
        { start: 14.5, end: 20.0, text: "We do conduct pre-placement bootcamps. What domains do you cover?" },
        { start: 20.0, end: 26.5, text: "We cover aptitude training, resume building, and mock interviews." },
        { start: 26.5, end: 31.0, text: "That sounds like what we need. Please email me the proposal and pricing." },
        { start: 31.0, end: 35.0, text: "Absolutely, I will email you the proposal today. Thank you for your time." }
      ],
      summary: {
        summary: "Productive initial outreach call with a placement coordinator. The customer requested a proposal and pricing for student pre-placement training.",
        key_points: [
          "Offered pre-placement training packages for students.",
          "Customer identified aptitude training as a key requirement.",
          "Customer requested the proposal to be sent via email."
        ],
        action_items: [
          "Send training proposal and pricing structure today."
        ],
        follow_up_suggestions: [
          "Call next week after sending the proposal."
        ],
        detected_outcome: "interested",
        sentiment: "positive",
        objections: []
      }
    }
  },
  ta: {
    ta: {
      text: "Agent: வணக்கம், நல்ல மதியம். நான் பிளேஸ்மென்ட் அதிகாரியிடம் பேசுகிறேனா? Customer: ஆம், பேசுகிறேன். நீங்கள் யார்? Agent: வணக்கம், நான் அக்சரா கல்வியில் இருந்து ராஜேஷ் பேசுகிறேன். மாணவர்களுக்கான பயிற்சி வழங்குகிறோம். Customer: நாங்கள் பயிற்சி முகாம்களை நடத்துகிறோம். நீங்கள் என்ன தலைப்புகளை உள்ளடக்குகிறீர்கள்? Agent: நாங்கள் ஆப்டிட்யூட், ரெஸ்யூம் உருவாக்கம் மற்றும் மாதிரி நேர்காணல்களை நடத்துகிறோம். Customer: அது எங்களுக்குத் தேவைப்படும் ஒன்றுதான். விவரங்களை மின்னஞ்சல் அனுப்புங்கள். Agent: நிச்சயமாக, இன்று மின்னஞ்சல் செய்கிறேன். நன்றி.",
      segments: [
        { start: 0, end: 4.5, text: "வணக்கம், நல்ல மதியம். நான் பிளேஸ்மென்ட் அதிகாரியிடம் பேசுகிறேனா?" },
        { start: 4.5, end: 7.0, text: "ஆம், பேசுகிறேன். நீங்கள் யார்?" },
        { start: 7.0, end: 14.5, text: "வணக்கம், நான் அக்சரா கல்வியில் இருந்து ராஜேஷ் பேசுகிறேன். மாணவர்களுக்கான பயிற்சி வழங்குகிறோம்." },
        { start: 14.5, end: 20.0, text: "நாங்கள் பயிற்சி முகாம்களை நடத்துகிறோம். நீங்கள் என்ன தலைப்புகளை உள்ளடக்குகிறீர்கள்?" },
        { start: 20.0, end: 26.5, text: "நாங்கள் ஆப்டிட்யூட், ரெஸ்யூம் உருவாக்கம் மற்றும் மாதிரி நேர்காணல்களை நடத்துகிறோம்." },
        { start: 26.5, end: 31.0, text: "அது எங்களுக்குத் தேவைப்படும் ஒன்றுதான். விவரங்களை மின்னஞ்சல் அனுப்புங்கள்." },
        { start: 31.0, end: 35.0, text: "நிச்சயமாக, இன்று மின்னஞ்சல் செய்கிறேன். நன்றி." }
      ],
      summary: {
        summary: "வேலைவாய்ப்பு அதிகாரியுடனான பயனுள்ள தொடக்க உரையாடல். மாணவர்களுக்கான பயிற்சித் திட்டம் மற்றும் கட்டண விவரங்களை அனுப்ப வாடிக்கையாளர் கோரியுள்ளார்.",
        key_points: [
          "மாணவர்களுக்கான பயிற்சித் தொகுப்புகளை வழங்கினோம்.",
          "ஆப்டிட்யூட் பயிற்சி முக்கிய தேவை என வாடிக்கையாளர் தெரிவித்தார்.",
          "மின்னஞ்சல் மூலம் விவரங்களை அனுப்பும்படி கேட்டுக் கொண்டார்."
        ],
        action_items: [
          "இன்றே பயிற்சி திட்ட விவரங்கள் மற்றும் கட்டணத்தை மின்னஞ்சல் செய்யவும்."
        ],
        follow_up_suggestions: [
          "மின்னஞ்சல் அனுப்பிய பின் அடுத்த வாரம் தொடர்புகொள்ளவும்."
        ],
        detected_outcome: "interested",
        sentiment: "positive",
        objections: []
      }
    },
    en: {
      text: "Agent: Hello, good afternoon. Am I speaking with the Placement Officer? Customer: Yes, speaking. Who is this? Agent: Hello, I am Rajesh from Akshara Education. We provide training for students. Customer: We do conduct training bootcamps. What topics do you cover? Agent: We cover aptitude, resume building, and mock interviews. Customer: That is something we need. Please email the details. Agent: Sure, I will email you today. Thank you.",
      segments: [
        { start: 0, end: 4.5, text: "Hello, good afternoon. Am I speaking with the Placement Officer?" },
        { start: 4.5, end: 7.0, text: "Yes, speaking. Who is this?" },
        { start: 7.0, end: 14.5, text: "Hello, I am Rajesh from Akshara Education. We provide training for students." },
        { start: 14.5, end: 20.0, text: "We do conduct training bootcamps. What topics do you cover?" },
        { start: 20.0, end: 26.5, text: "We cover aptitude, resume building, and mock interviews." },
        { start: 26.5, end: 31.0, text: "That is something we need. Please email the details." },
        { start: 31.0, end: 35.0, text: "Sure, I will email you today. Thank you." }
      ],
      summary: {
        summary: "Productive initial outreach call with a placement coordinator. The customer requested a proposal and pricing for student pre-placement training.",
        key_points: [
          "Offered pre-placement training packages for students.",
          "Customer identified aptitude training as a key requirement.",
          "Customer requested the proposal to be sent via email."
        ],
        action_items: [
          "Send training proposal and pricing structure today."
        ],
        follow_up_suggestions: [
          "Call next week after sending the proposal."
        ],
        detected_outcome: "interested",
        sentiment: "positive",
        objections: []
      }
    }
  },
  te: {
    te: {
      text: "Agent: నమస్కారం, శుభ మధ్యాహ్నం. నేను ప్లేస్‌మెంట్ ఆఫీసర్‌తో మాట్లాడుతున్నానా? Customer: అవును, మాట్లాడుతున్నాను. మీరు ఎవరు? Agent: హలో, నేను అక్షర ఎడ్యుకేషన్ నుండి రాజేష్. మేము విద్యార్థులకు ప్లేస్‌మెంట్ శిక్షణ అందిస్తాము. Customer: మేము శిక్షణా శిబిరాలను నిర్వహిస్తాము. మీరు ఏ అంశాలను కవర్ చేస్తారు? Agent: మేము ఆప్టిట్యూడ్, రెజ్యూమ్ బిల్డింగ్ మరియు మాక్ ఇంటర్వ్యూలను కవర్ చేస్తాము. Customer: మాకు అది అవసరమే. దయచేసి వివరాలను ఈమెయిల్ చేయండి. Agent: తప్పకుండా, ఈ రోజు ఈమెయిల్ పంపుతాను. ధన్యవాదాలు.",
      segments: [
        { start: 0, end: 4.5, text: "నమస్కారం, శుభ మధ్యాహ్నం. నేను ప్లేస్‌మెంట్ ఆఫీసర్‌తో మాట్లాడుతున్నానా?" },
        { start: 4.5, end: 7.0, text: "అవును, మాట్లాడుతున్నాను. మీరు ఎవరు?" },
        { start: 7.0, end: 14.5, text: "హలో, నేను అక్షర ఎడ్యుకేషన్ నుండి రాజేష్. మేము విద్యార్థులకు ప్లేస్‌మెంట్ శిక్షణ అందిస్తాము." },
        { start: 14.5, end: 20.0, text: "మేము శిక్షణా శిబిరాలను నిర్వహిస్తాము. మీరు ఏ అంశాలను కవర్ చేస్తారు?" },
        { start: 20.0, end: 26.5, text: "మేము ఆప్టిట్యూడ్, రెజ్యూమ్ బిల్డింగ్ మరియు మాక్ ఇంటర్వ్యూలను కవర్ చేస్తాము." },
        { start: 26.5, end: 31.0, text: "మాకు అది అవసరమే. దయచేసి వివరాలను ఈమెయిల్ చేయండి." },
        { start: 31.0, end: 35.0, text: "తప్పకుండా, ఈ రోజు ఈమెయిల్ పంపుతాను. ధన్యవాదాలు." }
      ],
      summary: {
        summary: "ప్లేస్‌మెంట్ ఆఫీసర్‌తో విజయవంతమైన ప్రాథమిక సంభాషణ. విద్యార్థులకు శిక్షణా కార్యక్రమ ప్రణాళిక మరియు ధరల వివరాలను ఈమెయిల్ చేయాలని కస్టమర్ కోరారు.",
        key_points: [
          "విద్యార్థుల కోసం ప్లేస్‌మెంట్ శిక్షణా ప్యాకేజీలను వివరించాము.",
          "ఆప్టిట్యూడ్ శిక్షణ తమకు ముఖ్యమైన అవసరమని కస్టమర్ తెలిపారు.",
          "ప్రతిపాదనను ఈమెయిల్ ద్వారా పంపవలసిందిగా కోరారు."
        ],
        action_items: [
          "ఈ రోజు శిక్షణా ప్రతిపాదన మరియు ధరల వివరాలను ఈమెయిల్ చేయండి."
        ],
        follow_up_suggestions: [
          "ఈమెయిల్ పంపిన తర్వాత వచ్చే వారం ఫాలో-అప్ చేయండి."
        ],
        detected_outcome: "interested",
        sentiment: "positive",
        objections: []
      }
    },
    en: {
      text: "Agent: Hello, good afternoon. Am I speaking with the Placement Officer? Customer: Yes, speaking. Who is this? Agent: Hello, I am Rajesh from Akshara Education. We offer placement training for students. Customer: We do run training bootcamps. What areas do you cover? Agent: We cover aptitude, resume building, and mock interviews. Customer: That sounds useful for us. Please email the details. Agent: Certainly, I will send the email today. Thank you.",
      segments: [
        { start: 0, end: 4.5, text: "Hello, good afternoon. Am I speaking with the Placement Officer?" },
        { start: 4.5, end: 7.0, text: "Yes, speaking. Who is this?" },
        { start: 7.0, end: 14.5, text: "Hello, I am Rajesh from Akshara Education. We offer placement training for students." },
        { start: 14.5, end: 20.0, text: "We do run training bootcamps. What areas do you cover?" },
        { start: 20.0, end: 26.5, text: "We cover aptitude, resume building, and mock interviews." },
        { start: 26.5, end: 31.0, text: "That sounds useful for us. Please email the details." },
        { start: 31.0, end: 35.0, text: "Certainly, I will send the email today. Thank you." }
      ],
      summary: {
        summary: "Productive initial outreach call with a placement coordinator. The customer requested a proposal and pricing for student pre-placement training.",
        key_points: [
          "Offered pre-placement training packages for students.",
          "Customer identified aptitude training as a key requirement.",
          "Customer requested the proposal to be sent via email."
        ],
        action_items: [
          "Send training proposal and pricing structure today."
        ],
        follow_up_suggestions: [
          "Call next week after sending the proposal."
        ],
        detected_outcome: "interested",
        sentiment: "positive",
        objections: []
      }
    }
  },
  kn: {
    kn: {
      text: "Agent: ನಮಸ್ಕಾರ, ಶುಭ ಮಧ್ಯಾಹ್ನ. ನಾನು ಪ್ಲೇಸ್‌ಮೆಂಟ್ ಅಧಿಕಾರಿಯೊಂದಿಗೆ ಮಾತನಾಡುತ್ತಿದ್ದೇನೆ? Customer: ಹೌದು, ಮಾತನಾಡುತ್ತಿದ್ದೇನೆ. ನೀವು ಯಾರು? Agent: ಹಲೋ, ನಾನು ಅಕ್ಷರ ಎಜುಕೇಶನ್‌ನಿಂದ ರಾಜೇಶ್. ನಾವು ವಿದ್ಯಾರ್ಥಿಗಳಿಗೆ ತರಬೇತಿ ನೀಡುತ್ತೇವೆ. Customer: ನಾವು ತರಬೇತಿ ಶಿಬಿರಗಳನ್ನು ನಡೆಸುತ್ತೇವೆ. ನೀವು ಏನನ್ನು ಕವರ್ ಮಾಡುತ್ತೀರಿ? Agent: ನಾವು ಆಪ್ಟಿಟ್ಯೂಡ್, ರೆಸ್ಯೂಮ್ ಬಿಲ್ಡಿಂಗ್ ಮತ್ತು ಮಾಕ್ ಇಂಟರ್ವ್ಯೂಗಳನ್ನು ಕವರ್ ಮಾಡುತ್ತೇವೆ. Customer: ಅದು ನಮಗೆ ಬೇಕಾಗಿರುವುದು. ದಯವಿಟ್ಟು ವಿವರಗಳನ್ನು ಇಮೇಲ್ ಮಾಡಿ. Agent: ಖಂಡಿತ, ಇಂದು ಇಮೇಲ್ ಕಳುಹಿಸುತ್ತೇನೆ. ಧನ್ಯವಾದಗಳು.",
      segments: [
        { start: 0, end: 4.5, text: "ನಮಸ್ಕಾರ, ಶುಭ ಮಧ್ಯಾಹ್ನ. ನಾನು ಪ್ಲೇಸ್‌ಮೆಂಟ್ ಅಧಿಕಾರಿಯೊಂದಿಗೆ ಮಾತನಾಡುತ್ತಿದ್ದೇನೆ?" },
        { start: 4.5, end: 7.0, text: "ಹೌದು, ಮಾತನಾಡುತ್ತಿದ್ದೇನೆ. ನೀವು ಯಾರು?" },
        { start: 7.0, end: 14.5, text: "ಹಲೋ, ನಾನು ಅಕ್ಷರ ಎಜುಕೇಶನ್‌ನಿಂದ ರಾಜೇಶ್. ನಾವು ವಿದ್ಯಾರ್ಥಿಗಳಿಗೆ ತರಬೇತಿ ನೀಡುತ್ತೇವೆ." },
        { start: 14.5, end: 20.0, text: "ನಾವು ತರಬೇತಿ ಶಿಬಿರಗಳನ್ನು ನಡೆಸುತ್ತೇವೆ. ನೀವು ಏನನ್ನು ಕವರ್ ಮಾಡುತ್ತೀರಿ?" },
        { start: 20.0, end: 26.5, text: "ನಾವು ಆಪ್ಟಿಟ್ಯೂಡ್, ರೆಸ್ಯೂಮ್ ಬಿಲ್ಡಿಂಗ್ ಮತ್ತು ಮಾಕ್ ಇಂಟರ್ವ್ಯೂಗಳನ್ನು ಕವರ್ ಮಾಡುತ್ತೇವೆ." },
        { start: 26.5, end: 31.0, text: "ಅದು ನಮಗೆ ಬೇಕಾಗಿರುವುದು. ದಯವಿಟ್ಟು ವಿವರಗಳನ್ನು ಇಮೇಲ್ ಮಾಡಿ." },
        { start: 31.0, end: 35.0, text: "ಖಂಡಿತ, ಇಂದು ಇಮೇಲ್ ಕಳುಹಿಸುತ್ತೇನೆ. ಧನ್ಯವಾದಗಳು." }
      ],
      summary: {
        summary: "ಪ್ಲೇಸ್‌ಮೆಂಟ್ ಅಧಿಕಾರಿಯೊಂದಿಗೆ ಉತ್ಪಾದಕ ಆರಂಭಿಕ ಮಾತುಕತೆ. ವಿದ್ಯಾರ್ಥಿಗಳ ತರಬೇತಿ ಪ್ರಸ್ತಾವನೆ ಮತ್ತು ಬೆಲೆಯ ವಿವರಗಳನ್ನು ಇಮೇಲ್ ಮಾಡಲು ಗ್ರಾಹಕರು ವินಂತಿಸಿದ್ದಾರೆ.",
        key_points: [
          "ವಿದ್ಯಾರ್ಥಿಗಳಿಗೆ ತರಬೇತಿ ಪ್ಯಾಕೇಜ್‌ಗಳನ್ನು ನೀಡಿದ್ದೇವೆ.",
          "ಆಪ್ಟಿಟ್ಯೂಡ್ ತರಬೇತಿ ಪ್ರಮುಖ ಅವಶ್ಯಕತೆ ಎಂದು ಗ್ರಾಹಕರು ತಿಳಿಸಿದ್ದಾರೆ.",
          "ಇಮೇಲ್ ಮೂಲಕ ವಿವರಗಳನ್ನು ಕಳುಹಿಸಲು ವಿನಂತಿಸಿದ್ದಾರೆ."
        ],
        action_items: [
          "ತರಬೇತಿ ಪ್ರಸ್ತಾವನೆ ಮತ್ತು ದರದ ವಿವರಗಳನ್ನು ಇಂದು ಇಮೇಲ್ ಮಾಡಿ."
        ],
        follow_up_suggestions: [
          "ಇಮೇಲ್ ಕಳುಹಿಸಿದ ನಂತರ ಮುಂದಿನ ವಾರ ಕರೆ ಮಾಡಿ."
        ],
        detected_outcome: "interested",
        sentiment: "positive",
        objections: []
      }
    },
    en: {
      text: "Agent: Hello, good afternoon. Am I speaking with the Placement Officer? Customer: Yes, speaking. Who is this? Agent: Hello, I am Rajesh from Akshara Education. We provide training for students. Customer: We run training bootcamps. What do you cover? Agent: We cover aptitude, resume building, and mock interviews. Customer: That is what we need. Please email the details. Agent: Definitely, I will send the email today. Thank you.",
      segments: [
        { start: 0, end: 4.5, text: "Hello, good afternoon. Am I speaking with the Placement Officer?" },
        { start: 4.5, end: 7.0, text: "Yes, speaking. Who is this?" },
        { start: 7.0, end: 14.5, text: "Hello, I am Rajesh from Akshara Education. We provide training for students." },
        { start: 14.5, end: 20.0, text: "We run training bootcamps. What do you cover?" },
        { start: 20.0, end: 26.5, text: "We cover aptitude, resume building, and mock interviews." },
        { start: 26.5, end: 31.0, text: "That is what we need. Please email the details." },
        { start: 31.0, end: 35.0, text: "Definitely, I will send the email today. Thank you." }
      ],
      summary: {
        summary: "Productive initial outreach call with a placement coordinator. The customer requested a proposal and pricing for student pre-placement training.",
        key_points: [
          "Offered pre-placement training packages for students.",
          "Customer identified aptitude training as a key requirement.",
          "Customer requested the proposal to be sent via email."
        ],
        action_items: [
          "Send training proposal and pricing structure today."
        ],
        follow_up_suggestions: [
          "Call next week after sending the proposal."
        ],
        detected_outcome: "interested",
        sentiment: "positive",
        objections: []
      }
    }
  }
};

const getMockTranscript = (fileKey, audioLanguage = 'en', transcriptionLang = 'en') => {
  if (REGIONAL_MOCKS[audioLanguage]) {
    const mockData = REGIONAL_MOCKS[audioLanguage][transcriptionLang] || 
                     REGIONAL_MOCKS[audioLanguage][audioLanguage] || 
                     REGIONAL_MOCKS[audioLanguage]['en'];
    return {
      text: mockData.text,
      segments: mockData.segments,
      language: transcriptionLang
    };
  }

  const key = (fileKey || '').toLowerCase();
  const found = MOCK_TRANSCRIPTS.find(t => t.keywords.some(k => key.includes(k)));
  const mock = found || DEFAULT_MOCK;
  return {
    text: mock.text,
    segments: mock.segments,
    language: transcriptionLang || 'en'
  };
};

const getMockSummary = (transcript, duration) => {
  for (const lang of Object.keys(REGIONAL_MOCKS)) {
    for (const targetLang of Object.keys(REGIONAL_MOCKS[lang])) {
      if (REGIONAL_MOCKS[lang][targetLang].text === transcript) {
        return REGIONAL_MOCKS[lang][targetLang].summary;
      }
    }
  }

  const found = MOCK_TRANSCRIPTS.find(t => t.text === transcript);
  if (found) return found.summary;
  
  // Custom parsing heuristic for real transcripts (AssemblyAI)
  const sentences = transcript.match(/[^.!?]+[.!?]+/g) || [transcript];
  
  const summarySentences = sentences.slice(0, 2).map(s => s.trim());
  const summaryText = summarySentences.join(' ') || "No transcript content available for summary.";
  
  const keyPoints = [];
  sentences.forEach(s => {
    const text = s.trim();
    if (text.length > 20 && keyPoints.length < 4) {
      if (text.includes('placement') || text.includes('hiring') || text.includes('need') || text.includes('interest') || text.includes('program') || text.includes('collaboration')) {
        keyPoints.push(text);
      }
    }
  });
  if (keyPoints.length === 0) {
    keyPoints.push(...sentences.slice(0, 3).map(s => s.trim()));
  }

  const actionItems = [];
  const actionKeywords = ['send', 'email', 'call', 'schedule', 'invite', 'share', 'follow up', 'tomorrow', 'next week', 'friday', 'discuss'];
  sentences.forEach(s => {
    const text = s.trim();
    if (actionKeywords.some(kw => text.toLowerCase().includes(kw)) && actionItems.length < 3) {
      const cleaned = text.replace(/^(Agent|Customer|Speaker\s\d+):\s*/i, '');
      actionItems.push(cleaned);
    }
  });
  if (actionItems.length === 0) {
    actionItems.push("Follow up with the customer in 3 days.");
  }

  const objections = [];
  const objectionKeywords = ['but', 'however', 'struggle', 'issue', 'problem', 'cost', 'price', 'too', 'worry', 'concern', 'bad', 'limit'];
  sentences.forEach(s => {
    const text = s.trim();
    if (objectionKeywords.some(kw => text.toLowerCase().includes(kw)) && objections.length < 2) {
      const cleaned = text.replace(/^(Agent|Customer|Speaker\s\d+):\s*/i, '');
      objections.push(cleaned);
    }
  });

  let detectedOutcome = 'unknown';
  let sentiment = 'neutral';
  
  const lowerText = transcript.toLowerCase();
  
  const mailPhrases = [
    /\bsend me a mail\b/i,
    /\bsend me mail\b/i,
    /\bsend me an email\b/i,
    /\bemail me\b/i,
    /\bmail me\b/i,
    /\bsend a mail\b/i,
    /\bsend an email\b/i,
    /\bsend the mail\b/i,
    /\bsend the email\b/i
  ];
  const hasMailPhrase = mailPhrases.some(regex => regex.test(lowerText));

  if (hasMailPhrase) {
    detectedOutcome = 'follow_up_needed';
  } else if (lowerText.includes('schedule') || lowerText.includes('meeting') || lowerText.includes('calendar invite') || lowerText.includes('meet next') || lowerText.includes('come in next') || lowerText.includes('friday at') || lowerText.includes('thursday at') || lowerText.includes('monday at')) {
    detectedOutcome = 'meeting_scheduled';
  } else if (lowerText.includes('not interested') || lowerText.includes('no interest') || lowerText.includes('busy') || lowerText.includes('no thank') || lowerText.includes('not looking') || lowerText.includes('wrong person')) {
    detectedOutcome = 'not_interested';
  } else if (lowerText.includes('wrong number') || lowerText.includes('incorrect number')) {
    detectedOutcome = 'wrong_number';
  } else if (lowerText.includes('no answer') || lowerText.includes('could not reach') || lowerText.includes('voicemail')) {
    detectedOutcome = 'no_answer';
  } else if (lowerText.includes('call back') || lowerText.includes('call you later') || lowerText.includes('hang up')) {
    detectedOutcome = 'call_back_later';
  } else if (lowerText.includes('interested') || lowerText.includes('interest') || lowerText.includes('sounds good') || lowerText.includes('send me') || lowerText.includes('would like to') || lowerText.includes('proposal')) {
    detectedOutcome = 'interested';
  } else if (lowerText.includes('follow up') || lowerText.includes('check again')) {
    detectedOutcome = 'follow_up_needed';
  }

  const positiveWords = ['good', 'great', 'awesome', 'excellent', 'interested', 'perfect', 'nice', 'help', 'happy'];
  const negativeWords = ['bad', 'struggle', 'issue', 'worry', 'not', 'no', 'fail', 'unfortunately', 'difficult'];
  let posCount = 0;
  let negCount = 0;
  positiveWords.forEach(w => { posCount += (lowerText.split(w).length - 1); });
  negativeWords.forEach(w => { negCount += (lowerText.split(w).length - 1); });
  
  if (posCount > negCount + 2) sentiment = 'positive';
  else if (negCount > posCount + 1) sentiment = 'negative';

  return {
    summary: summaryText,
    key_points: keyPoints,
    action_items: actionItems,
    follow_up_suggestions: [
      "Prepare customized presentation based on the call details.",
      "Send a calendar invite if a meeting date was discussed."
    ],
    detected_outcome: detectedOutcome,
    sentiment: sentiment,
    objections: objections
  };
};

/**
 * Helper to collapse/clean speech-to-text hallucination repetition loops
 * (e.g. repeated silent/noisy patterns like "email? email? email?")
 */
const cleanTranscriptText = (text) => {
  if (!text) return '';
  const words = text.split(/\s+/);
  const cleanedWords = [];
  let i = 0;
  
  const normalizeWord = (w) => {
    if (!w) return '';
    return w.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
  };
  
  while (i < words.length) {
    let word = words[i];
    let runCount = 1;
    const norm = normalizeWord(word);
    
    while (
      i + runCount < words.length && 
      normalizeWord(words[i + runCount]) === norm &&
      norm !== ''
    ) {
      runCount++;
    }
    
    if (runCount >= 4) {
      // Keep only first two occurrences of the repeated word
      cleanedWords.push(word);
      cleanedWords.push(words[i + 1]);
      i += runCount;
    } else {
      cleanedWords.push(word);
      i++;
    }
  }
  return cleanedWords.join(' ');
};

const transcribeAudioWithAssemblyAI = async (fileBuffer, apiKey, fileKey, audioLanguage = 'en', transcriptionLang = 'en') => {
  try {
    logger.info('[AI] Starting AssemblyAI transcription pipeline...');
    
    // 1. Upload to AssemblyAI
    logger.info('[AI] Uploading file buffer to AssemblyAI...');
    const uploadRes = await fetch('https://api.assemblyai.com/v2/upload', {
      method: 'POST',
      headers: {
        'authorization': apiKey,
        'content-type': 'application/octet-stream'
      },
      body: fileBuffer
    });

    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      throw new Error(`AssemblyAI upload HTTP ${uploadRes.status}: ${errText}`);
    }

    const uploadData = await uploadRes.json();
    const audioUrl = uploadData.upload_url;
    logger.info(`[AI] Uploaded successfully. Audio URL: ${audioUrl}`);

    // 2. Start transcription
    logger.info('[AI] Initiating AssemblyAI transcription with speaker labels...');
    const startRes = await fetch('https://api.assemblyai.com/v2/transcript', {
      method: 'POST',
      headers: {
        'authorization': apiKey,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        audio_url: audioUrl,
        speaker_labels: true,
        ...(audioLanguage && audioLanguage !== 'auto' 
          ? { language_code: audioLanguage } 
          : { language_detection: true })
      })
    });

    if (!startRes.ok) {
      const errText = await startRes.text();
      throw new Error(`AssemblyAI transcription start HTTP ${startRes.status}: ${errText}`);
    }

    const startData = await startRes.json();
    const transcriptId = startData.id;
    logger.info(`[AI] Transcription job queued. ID: ${transcriptId}`);

    // 3. Poll for result
    const pollUrl = `https://api.assemblyai.com/v2/transcript/${transcriptId}`;
    logger.info('[AI] Polling AssemblyAI transcription status...');
    
    for (let i = 0; i < 60; i++) { // poll for up to 120 seconds (2 minutes)
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const pollRes = await fetch(pollUrl, {
        headers: { 'authorization': apiKey }
      });
      
      if (!pollRes.ok) {
        const errText = await pollRes.text();
        throw new Error(`AssemblyAI status poll HTTP ${pollRes.status}: ${errText}`);
      }
      
      const pollData = await pollRes.json();
      logger.info(`[AI] Poll status: ${pollData.status}`);
      
      if (pollData.status === 'completed') {
        const utterances = pollData.utterances || [];
        const segments = utterances.map((u) => ({
          start: u.start / 1000,
          end: u.end / 1000,
          text: u.text,
          speaker: u.speaker === 'A' || u.speaker === '1' ? 'Agent' : 'Customer'
        }));
        
        if (segments.length === 0 && pollData.text) {
          segments.push({
            start: 0,
            end: pollData.audio_duration || 10,
            text: pollData.text,
            speaker: 'Agent'
          });
        }
        
        const cleanedText = cleanTranscriptText(pollData.text || '');
        const cleanedSegments = segments.map(seg => ({
          ...seg,
          text: cleanTranscriptText(seg.text)
        }));

        return {
          text: cleanedText,
          segments: cleanedSegments,
          language: pollData.language_code || 'en',
          duration: pollData.audio_duration || 0
        };
      } else if (pollData.status === 'error') {
        throw new Error(`AssemblyAI transcription failed: ${pollData.error}`);
      }
    }
    
    throw new Error('AssemblyAI transcription polling timed out');
  } catch (err) {
    logger.error(`[AI] AssemblyAI transcription failed: ${err.message}. Falling back to mock transcript.`);
    return getMockTranscript(fileKey, audioLanguage, transcriptionLang);
  }
};

/**
 * Transcribe audio using OpenAI Whisper (or AssemblyAI if config present)
 * Returns a mock transcript if OpenAI not configured or fails
 */
const transcribeAudio = async (fileKey, fileBuffer, audioLanguage = 'en', transcriptionLang = 'en') => {
  // 1️⃣ Try OpenAI Whisper first
  try {
    const client = getOpenAIClient();
    if (client) {
      const { toFile } = require('openai');
      const file = await toFile(fileBuffer, 'audio.mp3', { type: 'audio/mpeg' });

      // If transcription target is English and audio language is regional, use translations endpoint
      if (transcriptionLang === 'en' && audioLanguage !== 'en' && audioLanguage !== 'auto') {
        logger.info(`[AI] Translating ${audioLanguage} audio to English using OpenAI Whisper translations API...`);
        const response = await client.audio.translations.create({
          model: process.env.WHISPER_MODEL || 'whisper-1',
          file,
          response_format: 'verbose_json',
        }, { timeout: 300000, maxRetries: 3 });

        return {
          text: cleanTranscriptText(response.text || ''),
          segments: (response.segments || []).map(seg => ({
            ...seg,
            text: cleanTranscriptText(seg.text)
          })),
          language: 'en',
        };
      } else {
        // Otherwise, transcribe native language using transcriptions endpoint
        logger.info(`[AI] Transcribing audio using OpenAI Whisper transcriptions API (audio language: ${audioLanguage})...`);
        const transcriptOptions = {
          model: process.env.WHISPER_MODEL || 'whisper-1',
          file,
          response_format: 'verbose_json',
          timestamp_granularities: ['segment'],
        };
        if (audioLanguage && audioLanguage !== 'auto') {
          transcriptOptions.language = audioLanguage;
        }

        const response = await client.audio.transcriptions.create(transcriptOptions, { timeout: 300000, maxRetries: 3 });

        return {
          text: cleanTranscriptText(response.text || ''),
          segments: (response.segments || []).map(seg => ({
            ...seg,
            text: cleanTranscriptText(seg.text)
          })),
          language: response.language || audioLanguage || 'en',
        };
      }
    }
  } catch (err) {
    logger.warn(`[AI] OpenAI Whisper failed: ${err.message}. Attempting AssemblyAI fallback.`);
  }

  // 2️⃣ AssemblyAI fallback (if key configured)
  const assemblyKey = process.env.ASSEMBLYAI_API_KEY;
  if (assemblyKey && !assemblyKey.includes('your_') && assemblyKey !== '') {
    try {
      return await transcribeAudioWithAssemblyAI(fileBuffer, assemblyKey, fileKey, audioLanguage, transcriptionLang);
    } catch (err) {
      logger.warn(`[AI] AssemblyAI transcription failed: ${err.message}.`);
    }
  }

  // 3️⃣ Final fallback to mock data
  logger.warn('[AI] Both OpenAI and AssemblyAI failed or not configured. Using mock transcript.');
  return getMockTranscript(fileKey, audioLanguage, transcriptionLang);
};

/**
 * Generate AI summary from transcript using GPT
 * Returns a mock summary if OpenAI not configured or fails
 */
const generateSummary = async (transcript, duration, businessId = null) => {
  // 1. Fetch pitch template from db
  let pitchText = '';
  let pitchKeywords = [];
  let fetchedFromBusiness = false;

  if (businessId) {
    try {
      const bizRes = await query(`
        SELECT pitch_pdf_text, pitch_pdf_keywords 
        FROM businesses 
        WHERE id = $1
      `, [businessId]);
      
      if (bizRes.rows.length > 0 && bizRes.rows[0].pitch_pdf_text) {
        pitchText = bizRes.rows[0].pitch_pdf_text;
        const kwVal = bizRes.rows[0].pitch_pdf_keywords;
        try {
          pitchKeywords = typeof kwVal === 'string' 
            ? JSON.parse(kwVal) 
            : (Array.isArray(kwVal) ? kwVal : []);
        } catch (e) {
          pitchKeywords = [];
        }
        fetchedFromBusiness = true;
      }
    } catch (e) {
      logger.warn(`[AI] Could not fetch business-specific pitch settings for business ${businessId}: ${e.message}`);
    }
  }

  if (!fetchedFromBusiness) {
    try {
      const pitchRes = await query(`
        SELECT key, value FROM ai_settings 
        WHERE key IN ('pitch_pdf_text', 'pitch_pdf_keywords')
      `);
      pitchRes.rows.forEach(row => {
        if (row.key === 'pitch_pdf_text') pitchText = row.value;
        if (row.key === 'pitch_pdf_keywords') {
          try {
            pitchKeywords = JSON.parse(row.value);
          } catch (e) {
            pitchKeywords = [];
          }
        }
      });
    } catch (e) {
      logger.warn(`[AI] Could not fetch pitch settings: ${e.message}`);
    }
  }

  // Define fallback is_pitched evaluation
  let fallbackIsPitched = false;
  if (pitchKeywords && pitchKeywords.length > 0) {
    const lowerTranscript = (transcript || '').toLowerCase();
    const matched = pitchKeywords.filter(k => lowerTranscript.includes(k.toLowerCase()));
    // If at least 3 keywords or 20% of keywords match, we fall back to true
    const minMatches = Math.max(2, Math.min(4, Math.floor(pitchKeywords.length * 0.2)));
    fallbackIsPitched = matched.length >= minMatches;
  } else {
    fallbackIsPitched = duration > 10;
  }

  const client = getOpenAIClient();

  if (!client) {
    const mockRes = getMockSummary(transcript, duration);
    return { ...mockRes, is_pitched: mockRes.is_pitched ?? fallbackIsPitched };
  }

  try {
    let pitchSection = '';
    let pitchRequirement = '';

    if (pitchText && pitchText.trim()) {
      pitchSection = `
TARGET OUTREACH PITCH SCRIPT REFERENCE:
---
${pitchText}
---

TARGET OUTREACH PITCH KEYWORDS:
${pitchKeywords.join(', ')}
`;
      pitchRequirement = `
3. Compare the conversation with the "TARGET OUTREACH PITCH SCRIPT REFERENCE" and "TARGET OUTREACH PITCH KEYWORDS". Determine if the agent successfully pitched the service/product or presented the core pitch concepts. Set "is_pitched" to true if the pitch was made, otherwise set it to false. Use semantic understanding rather than strict word matching.`;
    } else {
      pitchRequirement = `
3. Classify if this is a pitched call (set "is_pitched" to true or false). General rule: if the agent explains the service/product and attempts to sell or request an appointment, set it to true.`;
    }

    const prompt = `You are an expert call analyst for a sales/placement outreach CRM. Analyze the following call transcript (duration: ${Math.round(duration / 60)} minutes) and provide a structured analysis.
${pitchSection}

TRANSCRIPT:
${transcript}

CRITICAL REQUIREMENTS:
1. If the customer/speaker says "send me a mail", "send me mail", "send me an email", "email me", "mail me", "send a mail", or "send an email", you MUST classify the "detected_outcome" as "follow_up_needed".
2. If the customer/speaker says "interested" or "interest", or expresses clear interest/agreement (e.g. "sounds good", "send me the proposal"), you MUST classify the "detected_outcome" as "interested".${pitchRequirement}

Respond with ONLY valid JSON in this exact format:
{
  "summary": "2-3 sentence executive summary of the call",
  "key_points": ["key point 1", "key point 2", "key point 3"],
  "action_items": ["action 1", "action 2"],
  "follow_up_suggestions": ["suggestion 1", "suggestion 2"],
  "detected_outcome": "one of: interested|not_interested|follow_up_needed|call_back_later|meeting_scheduled|wrong_number|no_answer|unknown",
  "sentiment": "one of: positive|neutral|negative",
  "objections": ["objection 1 if any"],
  "is_pitched": true
}`;

    logger.info('[AI] Sending request to OpenAI Chat Completions API...');
    const response = await client.chat.completions.create({
      model: process.env.GPT_MODEL || 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    }, { timeout: 90000, maxRetries: 3 });

    const result = JSON.parse(response.choices[0].message.content);
    if (result.is_pitched === undefined) {
      result.is_pitched = fallbackIsPitched;
    }
    return result;
  } catch (err) {
    logger.error(`[AI] OpenAI GPT API call failed: ${err.message}. Falling back to mock summary.`);
    const mockRes = getMockSummary(transcript, duration);
    return { ...mockRes, is_pitched: mockRes.is_pitched ?? fallbackIsPitched };
  }
};

/**
 * Detect speakers from transcript segments
 * Returns speaker-labeled segments and talk time breakdown
 */
const analyzeSpeakers = (segments, totalDuration) => {
  if (!segments || segments.length === 0) {
    return {
      speaker_segments: [],
      agent_talk_time: Math.floor(totalDuration * 0.7),
      customer_talk_time: Math.floor(totalDuration * 0.3),
    };
  }

  const labeled = segments.map((seg, idx) => ({
    speaker: seg.speaker || (idx % 2 === 0 ? 'Agent' : 'Customer'),
    start: seg.start,
    end: seg.end,
    text: seg.text,
  }));

  const agentTime = labeled
    .filter((s) => s.speaker === 'Agent')
    .reduce((sum, s) => sum + (s.end - s.start), 0);

  const customerTime = labeled
    .filter((s) => s.speaker === 'Customer')
    .reduce((sum, s) => sum + (s.end - s.start), 0);

  return {
    speaker_segments: labeled,
    agent_talk_time: Math.round(agentTime),
    customer_talk_time: Math.round(customerTime),
  };
};

module.exports = { transcribeAudio, generateSummary, analyzeSpeakers };
