-- Seed data from main Coach Connect app's hardcoded content

-- =============================================
-- Practice Personas (from PracticeFloor.jsx)
-- =============================================

INSERT INTO practice_personas (name, age, type, scenario, difficulty, image_url, agent_id, tip, is_active, sort_order) VALUES
('Zoe Chen', 22, 'First-Time Buyer', 'College student browsing for her first luxury bag. She''s been saving up and is nervous about spending this much. Very influenced by TikTok trends.', 'Beginner', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop&crop=face', 'agent_8901kgmmeyptf96tyqky6fm6qy13', 'Focus on making her feel welcome and validated. Reference TikTok trends to build rapport.', true, 0),
('Maya Torres', 34, 'Loyal Customer', 'Returning customer who owns several Coach pieces. Looking for something special for an anniversary. Knows what she likes but open to suggestions.', 'Intermediate', 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=200&h=200&fit=crop&crop=face', 'agent_5201kgmpk85hekj9g3vsss6r7zcg', 'Acknowledge her loyalty and existing collection. Suggest pieces that complement what she already owns.', true, 1),
('Vanessa Liu', 42, 'Luxury Expert', 'High-end shopper who compares Coach to other luxury brands. Very knowledgeable about leather quality and craftsmanship. Will challenge you on price and value.', 'Advanced', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&h=200&fit=crop&crop=face', 'agent_9101kgmprab4ewfaxnvw02ykbs6g', 'Lead with heritage and craftsmanship. Be confident about Coach''s value proposition vs competitors.', true, 2);

-- =============================================
-- Chat Quick Actions (from TabbyChat.jsx)
-- =============================================

INSERT INTO chat_quick_actions (prompt_text, sort_order, is_active) VALUES
('What can you help me with?', 0, true),
('Explain this document', 1, true),
('Summarize key points', 2, true),
('Answer my questions', 3, true);

-- =============================================
-- Today Focus Cards
-- =============================================

INSERT INTO today_focus_cards (badge, title, description, cta_text, cta_action, is_active, sort_order) VALUES
('TODAY''S FOCUS', 'Master the Art of the Upsell', 'Today''s goal: Add a complementary item to every sale. Think charms, scarves, and wallets that complete the look.', 'Start Practice', 'practice', true, 0);

-- =============================================
-- Cultural Moments
-- =============================================

INSERT INTO cultural_moments (name, icon, color_gradient, days_away, action_text, sort_order, is_active) VALUES
('Gift Season', 'Gift', 'from-coach-mahogany to-[#4a2e1f]', 3, 'Prep gift-ready displays and upsell wrapping', 0, true),
('Heritage Week', 'Sparkles', 'from-coach-black to-[#2a2520]', NULL, 'Feature heritage pieces and "since 1941" story', 1, true),
('Earth Day', 'Calendar', 'from-[#8B7355] to-coach-mahogany', 12, 'Highlight Coachtopia and sustainable materials', 2, true);

-- =============================================
-- What's New Items
-- =============================================

INSERT INTO whats_new_items (tag, title, description, icon, icon_bg, icon_color, sort_order, is_active) VALUES
('NEW ARRIVAL', 'Spring Collection Drop', 'Fresh pastel colorways now available in Tabby and Rogue', 'Tag', 'bg-coach-champagne', 'text-coach-mahogany', 0, true),
('RESTOCK', 'Tabby Shoulder Bag Returns', 'The sold-out Cherry colorway is back in limited quantities', 'Package', 'bg-coach-champagne', 'text-coach-mahogany', 1, true),
('TRAINING', 'New Leather Care Module', 'Complete the leather care certification for bonus points', 'GraduationCap', 'bg-coach-champagne', 'text-coach-mahogany', 2, true);

-- =============================================
-- Culture Feed Items (from CultureFeed.jsx)
-- =============================================

INSERT INTO culture_feed_items (type, category, title, description, image_url, engagement_text, is_published, published_at, sort_order) VALUES
('trend', 'TikTok Trend', 'Cherry Red is EVERYWHERE', 'Cherry red accessories are dominating TikTok with 47M views. The Tabby in Cherry is getting massive organic reach. Perfect talking point for customers who want "the color everyone''s wearing."', 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=600&h=900&fit=crop', '47M views', true, now(), 0),
('styling', 'Styling Tip', 'Quiet Luxury Positioning', 'Customers are searching for "quiet luxury" - Coach''s heritage craftsmanship story fits perfectly. Lead with "since 1941" and "New York leather house" rather than logos.', 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=600&h=900&fit=crop', '12K saves', true, now(), 1),
('news', 'Coach News', 'Lil Nas X Campaign Launch', 'New campaign drops next week featuring Lil Nas X. Gen Z customers will be asking about it. The collection features bold colorways and the new Tabby Messenger.', 'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=600&h=900&fit=crop', 'Launching Mon', true, now(), 2),
('trend', 'Customer Insight', 'The "Treat Yourself" Moment', '68% of luxury purchases under $500 are self-purchases. When customers say "just looking," they''re often building courage. Give them permission with "You deserve something special."', 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=600&h=900&fit=crop', '8.2K shares', true, now(), 3),
('styling', 'Outfit Pairing', 'Tabby + Workwear = Perfect', 'The structured Tabby silhouette pairs perfectly with oversized blazers - the #1 workwear trend right now. Show customers how it elevates their 9-5 look.', 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=600&h=900&fit=crop', '23K likes', true, now(), 4),
('trend', 'TikTok Trend', 'Vintage Coach Hunting', 'Thrift TikTok is obsessed with vintage Coach. Use this! "You have great taste - that vintage appreciation? Our new pieces use the same techniques from our archives."', 'https://images.unsplash.com/photo-1566150905458-1bf1fc113f0d?w=600&h=900&fit=crop', '31M views', true, now(), 5),
('news', 'Product Drop', 'Coachtopia Restock Alert', 'Coachtopia circular collection restocking Thursday. Sustainability-focused customers have been waiting. The upcycled leather story resonates strongly with Gen Z.', 'https://images.unsplash.com/photo-1591561954557-26941169b49e?w=600&h=900&fit=crop', 'Thurs 10AM', true, now(), 6),
('styling', 'Color Story', 'Brass Hardware Moment', 'Gold/brass jewelry is back. Coach''s brass hardware creates instant outfit cohesion. "Notice how the brass matches your jewelry? That''s intentional heritage design."', 'https://images.unsplash.com/photo-1617038220319-276d3cfab638?w=600&h=900&fit=crop', '15K saves', true, now(), 7),
('trend', 'Gen Z Insight', 'The "Mom''s Closet" Effect', 'Gen Z loves items that look like "borrowed from mom''s closet." Position heritage pieces as "timeless, not trendy" - they want to keep it forever, not just this season.', 'https://images.unsplash.com/photo-1525507119028-ed4c629a60a3?w=600&h=900&fit=crop', '19K shares', true, now(), 8),
('news', 'Celebrity Spot', 'Jennifer Lopez + Rogue Bag', 'JLo spotted with the Rogue yesterday. Expect customers asking about "the JLo bag." The Rogue in black and cognac will see increased interest.', 'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=600&h=900&fit=crop', '2.1M reach', true, now(), 9);

-- =============================================
-- Community Posts (from Community.jsx)
-- =============================================

INSERT INTO community_posts (author_name, author_avatar, author_role, author_store, content, post_type, status, likes_count, comments_count, saves_count) VALUES
('Sarah Mitchell', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face', 'Top Performer', 'Coach SoHo', 'Game changer: When customers say ''just looking,'' I now respond with ''Perfect! While you explore, the Tabby in Cherry has been flying off shelves - TikTok effect.'' Works 80% of the time to start a real conversation.', 'insight', 'active', 47, 12, 23),
('James Kim', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face', 'Culture Expert', 'Coach Beverly Hills', 'Pro tip for handling price objections: Break it down to cost-per-wear. A $400 bag used 3x/week for 5 years = $0.51 per use. ''Less than your morning coffee for a piece that elevates every outfit.'' Customers LOVE this reframe.', 'insight', 'active', 89, 24, 56),
('Lin Wang', 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face', 'Rising Star', 'Coach San Francisco', 'Discovered that asking ''What brings you in today?'' instead of ''Can I help you?'' gets way better responses. It''s open-ended and feels less salesy. Try it!', 'insight', 'active', 34, 8, 19),
('Devon Parker', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face', 'Senior Associate', 'Coach Chicago', 'Just closed my biggest sale ever! $2,400 - customer came in for a wallet and left with the Rogue, matching wallet, two charms, and a keychain for her daughter. The secret? I asked about her life, not just what she wanted to buy.', 'success', 'active', 124, 31, 0),
('Priya Sharma', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=face', 'New Associate', 'Coach Houston', 'First week on the floor and I converted a ''just browsing'' into a sale! Used the TikTok angle from culture feed - she had NO idea the Tabby was trending and was excited to be ''in the know.'' Thank you Coach Connect!', 'success', 'active', 78, 19, 0),
('Marcus Thompson', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face', 'Top Performer', 'Coach Miami', 'Hit my monthly target in just 3 weeks! The Practice Floor roleplay sessions genuinely helped me handle objections smoother. Vanessa (the tough persona) prepared me for every difficult customer.', 'success', 'active', 156, 42, 0),
('Amy Chen', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop&crop=face', 'New Associate', 'Coach Seattle', 'How do you handle customers who want to price match with outlet stores? Had three today and I wasn''t sure what to say.', 'question', 'active', 0, 2, 0),
('Tyler Brooks', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face', 'Associate', 'Coach Denver', 'What''s the best way to approach a customer who''s been looking at the same bag for 10+ minutes but hasn''t asked for help?', 'question', 'active', 0, 0, 0);

-- =============================================
-- App Users (sample from Profile.jsx)
-- =============================================

INSERT INTO app_users (email, name, title, store, store_number, city, avatar_url, score, rank, streak, sessions_count, role, is_active) VALUES
('sarah.mitchell@coach.com', 'Sarah Mitchell', 'Senior Sales Associate', 'Coach SoHo', '#1247', 'New York, NY', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&crop=face', 94, 'Gold', 7, 12, 'associate', true),
('james.kim@coach.com', 'James Kim', 'Culture Expert', 'Coach Beverly Hills', '#2103', 'Los Angeles, CA', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face', 96, 'Gold', 14, 23, 'associate', true),
('devon.parker@coach.com', 'Devon Parker', 'Senior Associate', 'Coach Chicago', '#1589', 'Chicago, IL', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face', 88, 'Silver', 5, 18, 'associate', true),
('lin.wang@coach.com', 'Lin Wang', 'Rising Star', 'Coach San Francisco', '#1822', 'San Francisco, CA', 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face', 91, 'Gold', 10, 15, 'associate', true),
('marcus.thompson@coach.com', 'Marcus Thompson', 'Top Performer', 'Coach Miami', '#2045', 'Miami, FL', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face', 98, 'Platinum', 21, 34, 'associate', true),
('admin@coach.com', 'Admin User', 'Platform Administrator', 'HQ', '#0001', 'New York, NY', NULL, 0, 'N/A', 0, 0, 'admin', true);

-- =============================================
-- Achievements
-- =============================================

INSERT INTO achievements (name, description, icon, color, criteria) VALUES
('Top Performer', 'Ranked in the top 10% of all associates', 'Trophy', 'text-coach-gold', 'top_10_percent'),
('Culture Champion', 'Saved 50+ culture feed items', 'Star', 'text-purple-500', '50_culture_saves'),
('Practice Pro', 'Completed 25+ practice sessions', 'Target', 'text-emerald-500', '25_sessions'),
('Streak Master', 'Maintained a 30-day activity streak', 'Flame', 'text-orange-500', '30_day_streak'),
('Rising Star', 'Most improved score this month', 'TrendingUp', 'text-blue-500', 'most_improved');
