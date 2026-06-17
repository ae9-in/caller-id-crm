-- ============================================================
-- Call Intelligence CRM - Seed Data
-- Realistic placement/education sector data
-- ============================================================

-- ROLES
INSERT INTO roles (id, name, description, permissions) VALUES
  ('a1000000-0000-0000-0000-000000000001', 'admin', 'Full system access', '{"all": true}'),
  ('a1000000-0000-0000-0000-000000000002', 'manager', 'Team management access', '{"analytics": true, "recordings": true, "followups": true, "businesses": true}'),
  ('a1000000-0000-0000-0000-000000000003', 'agent', 'Agent level access', '{"recordings": ["upload","own"], "businesses": ["assigned"], "followups": ["own"]}')
ON CONFLICT (name) DO NOTHING;

-- USERS (password: Admin@123 for admin, Manager@123, Agent@123)
INSERT INTO users (id, email, password_hash, first_name, last_name, phone, role_id, is_active) VALUES
  ('b1000000-0000-0000-0000-000000000001', 'admin@callcrm.com', '$2a$10$JYfAiU1FSBHFWc9or9JFbuQAwyUfMJ7gnde4ebSyketeFXO7evjp6', 'Rajesh', 'Sharma', '+91-9876543210', 'a1000000-0000-0000-0000-000000000001', TRUE),
  ('b1000000-0000-0000-0000-000000000002', 'manager@callcrm.com', '$2a$10$JYfAiU1FSBHFWc9or9JFbuQAwyUfMJ7gnde4ebSyketeFXO7evjp6', 'Priya', 'Mehta', '+91-9876543211', 'a1000000-0000-0000-0000-000000000002', TRUE),
  ('b1000000-0000-0000-0000-000000000003', 'agent1@callcrm.com', '$2a$10$JYfAiU1FSBHFWc9or9JFbuQAwyUfMJ7gnde4ebSyketeFXO7evjp6', 'Arjun', 'Patel', '+91-9876543212', 'a1000000-0000-0000-0000-000000000003', TRUE),
  ('b1000000-0000-0000-0000-000000000004', 'agent2@callcrm.com', '$2a$10$JYfAiU1FSBHFWc9or9JFbuQAwyUfMJ7gnde4ebSyketeFXO7evjp6', 'Sneha', 'Gupta', '+91-9876543213', 'a1000000-0000-0000-0000-000000000003', TRUE),
  ('b1000000-0000-0000-0000-000000000005', 'agent3@callcrm.com', '$2a$10$JYfAiU1FSBHFWc9or9JFbuQAwyUfMJ7gnde4ebSyketeFXO7evjp6', 'Vikram', 'Singh', '+91-9876543214', 'a1000000-0000-0000-0000-000000000003', TRUE)
ON CONFLICT (email) DO NOTHING;

-- TAGS
INSERT INTO tags (id, name, color) VALUES
  ('c1000000-0000-0000-0000-000000000001', 'College', '#6366f1'),
  ('c1000000-0000-0000-0000-000000000002', 'School', '#8b5cf6'),
  ('c1000000-0000-0000-0000-000000000003', 'Placement Cell', '#ec4899'),
  ('c1000000-0000-0000-0000-000000000004', 'HR', '#f59e0b'),
  ('c1000000-0000-0000-0000-000000000005', 'Startup', '#10b981'),
  ('c1000000-0000-0000-0000-000000000006', 'Corporate', '#3b82f6'),
  ('c1000000-0000-0000-0000-000000000007', 'High Priority', '#ef4444'),
  ('c1000000-0000-0000-0000-000000000008', 'Lead', '#f97316'),
  ('c1000000-0000-0000-0000-000000000009', 'University', '#14b8a6'),
  ('c1000000-0000-0000-0000-000000000010', 'Polytechnic', '#a855f7')
ON CONFLICT (name) DO NOTHING;

-- BUSINESSES
INSERT INTO businesses (id, name, category, industry, contact_person, phone, email, website, address, city, state, status, priority, assigned_user_id, created_by) VALUES
  ('d1000000-0000-0000-0000-000000000001', 'IIT Delhi Placement Cell', 'Education', 'Higher Education', 'Prof. Anand Kumar', '+91-11-26591715', 'placement@iitd.ac.in', 'https://placement.iitd.ac.in', 'Hauz Khas, New Delhi', 'New Delhi', 'Delhi', 'meeting_scheduled', 'high', 'b1000000-0000-0000-0000-000000000003', 'b1000000-0000-0000-0000-000000000001'),
  ('d1000000-0000-0000-0000-000000000002', 'Infosys HR Department', 'Corporate', 'Information Technology', 'Ms. Kavitha Reddy', '+91-80-28520261', 'hr.campus@infosys.com', 'https://infosys.com', 'Electronics City, Phase II', 'Bangalore', 'Karnataka', 'interested', 'urgent', 'b1000000-0000-0000-0000-000000000003', 'b1000000-0000-0000-0000-000000000001'),
  ('d1000000-0000-0000-0000-000000000003', 'VJTI Mumbai', 'Education', 'Technical Education', 'Dr. Ramesh Nair', '+91-22-24198401', 'tpo@vjti.ac.in', 'https://vjti.ac.in', 'H.R. Mahajani Road, Matunga', 'Mumbai', 'Maharashtra', 'contacted', 'medium', 'b1000000-0000-0000-0000-000000000004', 'b1000000-0000-0000-0000-000000000002'),
  ('d1000000-0000-0000-0000-000000000004', 'TCS Campus Connect', 'Corporate', 'Information Technology', 'Mr. Suresh Pillai', '+91-22-67789999', 'campusconnect@tcs.com', 'https://tcs.com', 'TCS House, Raveline Street', 'Mumbai', 'Maharashtra', 'follow_up_required', 'high', 'b1000000-0000-0000-0000-000000000004', 'b1000000-0000-0000-0000-000000000002'),
  ('d1000000-0000-0000-0000-000000000005', 'SRM University TPO', 'Education', 'Higher Education', 'Dr. Lakshmi Narayanan', '+91-44-27417777', 'tpo@srmist.edu.in', 'https://srmist.edu.in', 'SRM Nagar, Kattankulathur', 'Chennai', 'Tamil Nadu', 'converted', 'high', 'b1000000-0000-0000-0000-000000000003', 'b1000000-0000-0000-0000-000000000001'),
  ('d1000000-0000-0000-0000-000000000006', 'Wipro Talent Acquisition', 'Corporate', 'Information Technology', 'Ms. Pooja Iyer', '+91-80-28440011', 'campus.recruit@wipro.com', 'https://wipro.com', 'Sarjapur Road', 'Bangalore', 'Karnataka', 'new_lead', 'medium', 'b1000000-0000-0000-0000-000000000005', 'b1000000-0000-0000-0000-000000000002'),
  ('d1000000-0000-0000-0000-000000000007', 'NIT Trichy Placement', 'Education', 'Technical Education', 'Prof. Chakravarti', '+91-431-2503020', 'placement@nitt.edu', 'https://nitt.edu', 'Tanjore Main Road', 'Tiruchirappalli', 'Tamil Nadu', 'interested', 'high', 'b1000000-0000-0000-0000-000000000005', 'b1000000-0000-0000-0000-000000000001'),
  ('d1000000-0000-0000-0000-000000000008', 'Razorpay Startup HR', 'Startup', 'FinTech', 'Mr. Aakash Mehta', '+91-80-61400000', 'talent@razorpay.com', 'https://razorpay.com', 'SJR Cyber, Laskar Hosur Road', 'Bangalore', 'Karnataka', 'meeting_scheduled', 'urgent', 'b1000000-0000-0000-0000-000000000003', 'b1000000-0000-0000-0000-000000000001'),
  ('d1000000-0000-0000-0000-000000000009', 'Delhi University Placement', 'Education', 'Higher Education', 'Dr. Sunita Arora', '+91-11-27666626', 'placement@du.ac.in', 'https://du.ac.in', 'University Road, North Campus', 'New Delhi', 'Delhi', 'follow_up_required', 'medium', 'b1000000-0000-0000-0000-000000000004', 'b1000000-0000-0000-0000-000000000002'),
  ('d1000000-0000-0000-0000-000000000010', 'Zomato Talent Team', 'Startup', 'Food Tech', 'Ms. Ritika Joshi', '+91-11-47174000', 'talent@zomato.com', 'https://zomato.com', 'Ground Floor, 12A, 94 Meghdoot', 'Gurugram', 'Haryana', 'contacted', 'medium', 'b1000000-0000-0000-0000-000000000005', 'b1000000-0000-0000-0000-000000000002'),
  ('d1000000-0000-0000-0000-000000000011', 'BITS Pilani Placement', 'Education', 'Technical Education', 'Prof. Mahesh Babu', '+91-1596-242192', 'td@bits-pilani.ac.in', 'https://bits-pilani.ac.in', 'Vidya Vihar', 'Pilani', 'Rajasthan', 'new_lead', 'high', 'b1000000-0000-0000-0000-000000000003', 'b1000000-0000-0000-0000-000000000001'),
  ('d1000000-0000-0000-0000-000000000012', 'Accenture Campus HR', 'Corporate', 'Consulting', 'Mr. Thomas George', '+91-80-22244444', 'campus.in@accenture.com', 'https://accenture.com', 'Embassy Golf Links', 'Bangalore', 'Karnataka', 'closed', 'low', 'b1000000-0000-0000-0000-000000000004', 'b1000000-0000-0000-0000-000000000002')
ON CONFLICT DO NOTHING;

-- BUSINESS TAGS
INSERT INTO business_tags (business_id, tag_id) VALUES
  ('d1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001'),
  ('d1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000003'),
  ('d1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000007'),
  ('d1000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000004'),
  ('d1000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000006'),
  ('d1000000-0000-0000-0000-000000000003', 'c1000000-0000-0000-0000-000000000001'),
  ('d1000000-0000-0000-0000-000000000004', 'c1000000-0000-0000-0000-000000000006'),
  ('d1000000-0000-0000-0000-000000000005', 'c1000000-0000-0000-0000-000000000009'),
  ('d1000000-0000-0000-0000-000000000006', 'c1000000-0000-0000-0000-000000000006'),
  ('d1000000-0000-0000-0000-000000000007', 'c1000000-0000-0000-0000-000000000001'),
  ('d1000000-0000-0000-0000-000000000008', 'c1000000-0000-0000-0000-000000000005'),
  ('d1000000-0000-0000-0000-000000000009', 'c1000000-0000-0000-0000-000000000009'),
  ('d1000000-0000-0000-0000-000000000010', 'c1000000-0000-0000-0000-000000000005'),
  ('d1000000-0000-0000-0000-000000000011', 'c1000000-0000-0000-0000-000000000001'),
  ('d1000000-0000-0000-0000-000000000012', 'c1000000-0000-0000-0000-000000000006')
ON CONFLICT DO NOTHING;

-- CALLS (sample metadata; no actual audio files)
INSERT INTO calls (id, title, business_id, user_id, file_name, file_url, file_size, file_hash, mime_type, duration_seconds, status, is_pitched, call_outcome, call_date, agent_talk_time, customer_talk_time) VALUES
  ('e1000000-0000-0000-0000-000000000001', 'Initial outreach - IIT Delhi', 'd1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000003', 'iit_delhi_call_001.mp3', NULL, 2457600, 'abc123def456', 'audio/mpeg', 245, 'transcribed', TRUE, 'interested', NOW() - INTERVAL '5 days', 175, 70),
  ('e1000000-0000-0000-0000-000000000002', 'Follow-up call - Infosys HR', 'd1000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000003', 'infosys_call_002.mp3', NULL, 3276800, 'def456ghi789', 'audio/mpeg', 412, 'transcribed', TRUE, 'meeting_scheduled', NOW() - INTERVAL '3 days', 280, 132),
  ('e1000000-0000-0000-0000-000000000003', 'Cold call - VJTI Mumbai', 'd1000000-0000-0000-0000-000000000003', 'b1000000-0000-0000-0000-000000000004', 'vjti_call_001.mp3', NULL, 1228800, 'ghi789jkl012', 'audio/mpeg', 8, 'transcribed', FALSE, 'not_interested', NOW() - INTERVAL '7 days', 8, 0),
  ('e1000000-0000-0000-0000-000000000004', 'Partnership discussion - TCS', 'd1000000-0000-0000-0000-000000000004', 'b1000000-0000-0000-0000-000000000004', 'tcs_call_001.mp3', NULL, 4096000, 'jkl012mno345', 'audio/mpeg', 520, 'transcribed', TRUE, 'follow_up_needed', NOW() - INTERVAL '2 days', 350, 170),
  ('e1000000-0000-0000-0000-000000000005', 'Conversion call - SRM Univ', 'd1000000-0000-0000-0000-000000000005', 'b1000000-0000-0000-0000-000000000003', 'srm_call_003.mp3', NULL, 5120000, 'mno345pqr678', 'audio/mpeg', 680, 'transcribed', TRUE, 'interested', NOW() - INTERVAL '1 day', 480, 200),
  ('e1000000-0000-0000-0000-000000000006', 'Cold call - Wipro', 'd1000000-0000-0000-0000-000000000006', 'b1000000-0000-0000-0000-000000000005', 'wipro_call_001.mp3', NULL, 1638400, 'pqr678stu901', 'audio/mpeg', 195, 'transcribed', TRUE, 'call_back_later', NOW() - INTERVAL '4 days', 130, 65),
  ('e1000000-0000-0000-0000-000000000007', 'Placement briefing - NIT Trichy', 'd1000000-0000-0000-0000-000000000007', 'b1000000-0000-0000-0000-000000000005', 'nit_trichy_call_001.mp3', NULL, 3686400, 'stu901vwx234', 'audio/mpeg', 460, 'transcribed', TRUE, 'interested', NOW() - INTERVAL '6 days', 310, 150),
  ('e1000000-0000-0000-0000-000000000008', 'Startup pitch - Razorpay', 'd1000000-0000-0000-0000-000000000008', 'b1000000-0000-0000-0000-000000000003', 'razorpay_call_001.mp3', NULL, 2867200, 'vwx234yza567', 'audio/mpeg', 358, 'transcribed', TRUE, 'meeting_scheduled', NOW() - INTERVAL '1 day', 240, 118),
  ('e1000000-0000-0000-0000-000000000009', 'Wrong number - Delhi Univ', 'd1000000-0000-0000-0000-000000000009', 'b1000000-0000-0000-0000-000000000004', 'du_call_001.mp3', NULL, 409600, 'yza567bcd890', 'audio/mpeg', 5, 'transcribed', FALSE, 'wrong_number', NOW() - INTERVAL '8 days', 5, 0),
  ('e1000000-0000-0000-0000-000000000010', 'Discovery call - Zomato', 'd1000000-0000-0000-0000-000000000010', 'b1000000-0000-0000-0000-000000000005', 'zomato_call_001.mp3', NULL, 2252800, 'bcd890efg123', 'audio/mpeg', 280, 'transcribed', TRUE, 'follow_up_needed', NOW() - INTERVAL '3 days', 190, 90)
ON CONFLICT DO NOTHING;

-- CALL TRANSCRIPTS
INSERT INTO call_transcripts (call_id, full_text, word_count, language, confidence_score) VALUES
  ('e1000000-0000-0000-0000-000000000001', 'Agent: Hello, good morning. Am I speaking with Prof. Anand Kumar from the IIT Delhi Placement Cell? Prof. Kumar: Yes, speaking. Who is this? Agent: Sir, I am Arjun Patel calling from Akshara Education. We specialize in placement training and career readiness programs for engineering students. I wanted to discuss a potential partnership opportunity with IIT Delhi. Prof. Kumar: That sounds interesting. Tell me more about your programs. Agent: We offer comprehensive soft skills training, aptitude preparation, and mock interview sessions. Our placement rate for partner institutions has been consistently above 90%. Prof. Kumar: That is quite impressive. We do have some gaps in our current training program. Can you send us a detailed proposal? Agent: Absolutely, sir. I will send you a detailed proposal by end of day. Can I schedule a call for next week to discuss further? Prof. Kumar: Yes, Thursday works for me. Let us say 11 AM. Agent: Perfect. I will send a calendar invite along with the proposal. Thank you so much, Prof. Kumar. Prof. Kumar: Thank you. Looking forward to it.', 198, 'en', 0.94),
  ('e1000000-0000-0000-0000-000000000002', 'Agent: Hello, Ms. Kavitha. This is Arjun from Akshara Education. I am following up on our previous conversation. Ms. Reddy: Oh yes, Arjun. I have reviewed your proposal. Agent: Great. What are your thoughts? Ms. Reddy: We are definitely interested. Infosys has been looking for quality candidates with strong communication and aptitude scores. Your training modules look well-structured. Agent: Thank you. We can customize the program specifically for Infosys requirements. Ms. Reddy: That would be excellent. Can we schedule a meeting with our L&D team? Agent: Of course. I am available any day this week or next. Ms. Reddy: Let us do Friday 3 PM at our office. Agent: Perfect. I will confirm the details over email. Looking forward to meeting you and the team.', 142, 'en', 0.96),
  ('e1000000-0000-0000-0000-000000000008', 'Agent: Hello, this is Arjun from Akshara Education. Is this Mr. Aakash Mehta from Razorpay? Mr. Mehta: Yes. What is this regarding? Agent: Sir, we offer campus recruitment support and pre-placement training. Many tech startups work with us to get job-ready candidates. Mr. Mehta: We do hire aggressively from campuses. What campuses are you connected with? Agent: We work with over 200 institutions including IITs, NITs, and top private universities. Mr. Mehta: Interesting. What is your candidate placement success rate? Agent: Our partner companies have seen 40% reduction in time-to-hire and 85% retention rate at 1 year. Mr. Mehta: Those are good numbers. Let us set up a proper meeting. Can you come in next Monday? Agent: Yes, absolutely. Monday works perfectly. What time works best? Mr. Mehta: 10 AM. I will have our tech lead and HR join too. Agent: Excellent. I will send a confirmation. Thank you Mr. Mehta.', 160, 'en', 0.93)
ON CONFLICT DO NOTHING;

-- CALL SUMMARIES
INSERT INTO call_summaries (call_id, summary, key_points, action_items, follow_up_suggestions, detected_outcome, sentiment, pitch_score, confidence_score, engagement_score, overall_score) VALUES
  ('e1000000-0000-0000-0000-000000000001', 'Productive initial outreach with IIT Delhi Placement Cell. Prof. Anand Kumar showed strong interest in Akshara Education placement training programs. Meeting scheduled for Thursday 11 AM. Proposal to be sent.',
   '["Prof. Kumar interested in soft skills training", "90%+ placement rate highlighted", "Meeting scheduled for Thursday 11 AM", "Proposal requested by end of day"]',
   '["Send detailed proposal before EOD", "Send calendar invite for Thursday 11 AM", "Prepare customized IIT Delhi program deck"]',
   '["Follow up on Thursday to confirm meeting", "Prepare case studies of similar institution partnerships"]',
   'meeting_scheduled', 'positive', 88, 85, 90, 87),
  ('e1000000-0000-0000-0000-000000000002', 'Follow-up call with Infosys HR resulted in positive outcome. Ms. Kavitha Reddy confirmed interest and scheduled an in-person meeting with L&D team for Friday 3 PM.',
   '["Infosys reviewed and liked the proposal", "L&D team meeting scheduled for Friday", "Customization of program discussed"]',
   '["Send meeting confirmation email", "Prepare L&D team presentation", "Bring sample assessment materials"]',
   '["Confirm meeting logistics", "Prepare ROI data for L&D team"]',
   'meeting_scheduled', 'positive', 92, 88, 94, 91),
  ('e1000000-0000-0000-0000-000000000008', 'Cold outreach to Razorpay resulted in a scheduled on-site meeting. Strong interest shown in campus recruitment support. Meeting set for Monday 10 AM with tech lead and HR.',
   '["Razorpay hires aggressively from campuses", "200+ institution network highlighted", "40% reduction in time-to-hire pitched", "Meeting Monday 10 AM confirmed"]',
   '["Send meeting confirmation with agenda", "Prepare campus network presentation", "Include retention rate data"]',
   '["Research Razorpay tech stack to align candidate profiles", "Prepare startup-specific hiring deck"]',
   'meeting_scheduled', 'positive', 85, 82, 88, 85)
ON CONFLICT DO NOTHING;

-- FOLLOW UPS
INSERT INTO followups (id, business_id, call_id, assigned_user_id, created_by, title, notes, due_date, status) VALUES
  ('f1000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000003', 'b1000000-0000-0000-0000-000000000002', 'Send proposal to IIT Delhi', 'Send detailed program proposal with pricing and timeline', NOW() + INTERVAL '1 day', 'pending'),
  ('f1000000-0000-0000-0000-000000000002', 'd1000000-0000-0000-0000-000000000004', 'e1000000-0000-0000-0000-000000000004', 'b1000000-0000-0000-0000-000000000004', 'b1000000-0000-0000-0000-000000000002', 'TCS Follow-up call', 'Discuss partnership terms and pricing', NOW() + INTERVAL '2 days', 'pending'),
  ('f1000000-0000-0000-0000-000000000003', 'd1000000-0000-0000-0000-000000000009', NULL, 'b1000000-0000-0000-0000-000000000004', 'b1000000-0000-0000-0000-000000000002', 'Reconnect with Delhi University', 'Try new contact number or email', NOW() - INTERVAL '2 days', 'overdue'),
  ('f1000000-0000-0000-0000-000000000004', 'd1000000-0000-0000-0000-000000000006', 'e1000000-0000-0000-0000-000000000006', 'b1000000-0000-0000-0000-000000000005', 'b1000000-0000-0000-0000-000000000002', 'Wipro callback', 'Call back as requested. Ask for right person in talent team', NOW() + INTERVAL '3 days', 'pending'),
  ('f1000000-0000-0000-0000-000000000005', 'd1000000-0000-0000-0000-000000000005', NULL, 'b1000000-0000-0000-0000-000000000003', 'b1000000-0000-0000-0000-000000000001', 'SRM Agreement Signing', 'Send agreement document for signing', NOW() - INTERVAL '1 day', 'completed')
ON CONFLICT DO NOTHING;

-- MEETINGS
INSERT INTO meetings (business_id, call_id, organized_by, title, description, scheduled_at, duration_minutes, status) VALUES
  ('d1000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000003', 'Partnership Discussion - IIT Delhi', 'Meeting with Prof. Anand Kumar to discuss placement training partnership', NOW() + INTERVAL '2 days', 60, 'scheduled'),
  ('d1000000-0000-0000-0000-000000000002', 'e1000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000003', 'L&D Team Meeting - Infosys', 'In-person meeting with Infosys L&D team', NOW() + INTERVAL '1 day', 90, 'scheduled'),
  ('d1000000-0000-0000-0000-000000000008', 'e1000000-0000-0000-0000-000000000008', 'b1000000-0000-0000-0000-000000000003', 'Campus Recruitment - Razorpay', 'On-site meeting with Razorpay tech lead and HR', NOW() + INTERVAL '3 days', 60, 'scheduled'),
  ('d1000000-0000-0000-0000-000000000005', NULL, 'b1000000-0000-0000-0000-000000000002', 'Contract Review - SRM University', 'Review and sign placement partnership agreement', NOW() - INTERVAL '3 days', 45, 'completed');

-- ACTIVITIES
INSERT INTO activities (business_id, call_id, user_id, type, title, description) VALUES
  ('d1000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000003', 'call_uploaded', 'Call recording uploaded', 'Initial outreach call with Prof. Anand Kumar recorded and uploaded'),
  ('d1000000-0000-0000-0000-000000000001', NULL, 'b1000000-0000-0000-0000-000000000003', 'follow_up_created', 'Follow-up created', 'Send proposal to IIT Delhi placement cell'),
  ('d1000000-0000-0000-0000-000000000001', NULL, 'b1000000-0000-0000-0000-000000000003', 'meeting_scheduled', 'Meeting scheduled', 'Partnership discussion scheduled for Thursday 11 AM'),
  ('d1000000-0000-0000-0000-000000000002', 'e1000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000003', 'call_uploaded', 'Follow-up call uploaded', 'Follow-up call with Ms. Kavitha Reddy from Infosys HR'),
  ('d1000000-0000-0000-0000-000000000002', NULL, 'b1000000-0000-0000-0000-000000000001', 'status_changed', 'Status changed to Interested', 'Business status updated based on call outcome'),
  ('d1000000-0000-0000-0000-000000000005', NULL, 'b1000000-0000-0000-0000-000000000003', 'status_changed', 'Status changed to Converted', 'SRM University partnership successfully converted'),
  ('d1000000-0000-0000-0000-000000000005', NULL, 'b1000000-0000-0000-0000-000000000002', 'meeting_scheduled', 'Contract review meeting', 'Partnership agreement review meeting scheduled'),
  ('d1000000-0000-0000-0000-000000000008', 'e1000000-0000-0000-0000-000000000008', 'b1000000-0000-0000-0000-000000000003', 'call_uploaded', 'Razorpay outreach call', 'Startup pitch call with Aakash Mehta uploaded');

-- NOTIFICATIONS
INSERT INTO notifications (user_id, type, title, message, is_read) VALUES
  ('b1000000-0000-0000-0000-000000000003', 'follow_up_reminder', 'Follow-up Due Tomorrow', 'Reminder: Send proposal to IIT Delhi is due tomorrow', FALSE),
  ('b1000000-0000-0000-0000-000000000004', 'follow_up_reminder', 'Overdue Follow-up', 'Reconnect with Delhi University is overdue by 2 days', FALSE),
  ('b1000000-0000-0000-0000-000000000003', 'meeting_scheduled', 'Meeting Confirmed', 'Your meeting with Infosys L&D team is confirmed for tomorrow', FALSE),
  ('b1000000-0000-0000-0000-000000000001', 'recording_processed', 'AI Analysis Complete', 'Call recording for IIT Delhi has been transcribed and analyzed', TRUE),
  ('b1000000-0000-0000-0000-000000000002', 'business_assigned', 'New Business Assigned', 'BITS Pilani Placement has been added to the system', FALSE);

-- BUSINESS NOTES
INSERT INTO business_notes (business_id, user_id, content, is_ai_generated) VALUES
  ('d1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000003', 'Very receptive to our pitch. Prof. Kumar specifically mentioned need for mock interview training. Key decision maker.', FALSE),
  ('d1000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000003', 'Infosys uses panel interviews heavily. Prepare candidates for that format. HR team approachable.', FALSE),
  ('d1000000-0000-0000-0000-000000000005', 'b1000000-0000-0000-0000-000000000001', 'SRM has 7000+ students graduating annually. Strong partnership potential. Dean is supportive.', FALSE),
  ('d1000000-0000-0000-0000-000000000008', 'b1000000-0000-0000-0000-000000000003', 'Razorpay tech roles need strong DSA + system design. Aakash is the decision maker. Very fast-paced culture.', FALSE);

-- CALL NOTES
INSERT INTO call_notes (call_id, user_id, content, is_ai_generated, timestamp_seconds) VALUES
  ('e1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000003', 'Prof. Kumar mentioned they lose 20% students to companies not aligned with their specialization. Big pain point.', FALSE, 95),
  ('e1000000-0000-0000-0000-000000000001', NULL, 'Key action item: Send proposal by EOD. Follow up Thursday 11 AM confirmed.', TRUE, NULL),
  ('e1000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000003', 'Kavitha is very process oriented. Make sure proposal has clear SLAs and deliverables.', FALSE, 180),
  ('e1000000-0000-0000-0000-000000000008', 'b1000000-0000-0000-0000-000000000003', 'Aakash wants tech-ready candidates. Mentioned they struggled with last two campus hires. Clear opening.', FALSE, 130);

-- AI SETTINGS
INSERT INTO ai_settings (key, value, description) VALUES
  ('pitch_threshold_seconds', '10', 'Minimum call duration in seconds to qualify as pitched'),
  ('whisper_model', 'whisper-1', 'OpenAI Whisper model to use for transcription'),
  ('gpt_model', 'gpt-4o', 'OpenAI GPT model for summarization and analysis'),
  ('auto_transcribe', 'true', 'Automatically transcribe recordings on upload'),
  ('duplicate_detection', 'true', 'Enable duplicate recording detection'),
  ('sentiment_analysis', 'true', 'Enable sentiment analysis on transcripts')
ON CONFLICT (key) DO NOTHING;
