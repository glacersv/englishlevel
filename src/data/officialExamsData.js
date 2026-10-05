// ============================================================
// OFFICIAL STANDARDIZED DIAGNOSTIC BATTERY (CEFR A1 to C1)
// 100% IN ENGLISH INSTRUCTIONS AND CONSISTENT TEST FORMATS
//
// FORMAT PRINCIPLES:
// 1. PURE SPECIALIZED TESTS (NO MIXED UNRELATED MODALITIES):
//    - Test 1: Listening Comprehension (12 Audio Questions A1-B1 from dialogue recordings).
//    - Test 2: Syntax & Sentence Scramble (20 Drag-and-Drop Sequential Challenges A1-C1).
//    - Test 3: Reading Comprehension & Textual Analysis (16 Questions A1-C1 from official PDF reading materials).
//    - Test 4: Use of English & Grammatical Cloze (12 Precision Gap-fills A1-C1).
// 2. 100% ENGLISH PROMPTS & INSTRUCTIONS throughout.
// ============================================================

export const OFFICIAL_DIAGNOSTIC_EXAMS = [
  // ==========================================================================
  // TEST 1: PURE LISTENING COMPREHENSION (AUDIO-DRIVEN A1 - B1) - 12 QUESTIONS
  // ==========================================================================
  {
    id: 'exam_official_listening_battery',
    title: 'Diagnostic Test 1: Listening Comprehension (A1 - B1)',
    grade: 'all',
    level: 'A1',
    weight: 15,
    timeLimitMinutes: 15,
    toolType: 'listening',
    active: true,
    description: '100% Listening evaluation based on official recorded dialogue audios (First Day at School & City Directions).',
    questions: [
      {
        id: 'q_list_1',
        type: 'listening',
        level: 'A1',
        prompt: 'Listen to Dialogue 1 (First Day at School) and answer the question:',
        audioUrl: '/material_evaluaciones/A1_first_day_at_schoolA1.mp3',
        audioText: 'Tania: Hi. I am Tania. What is your name? Jing: Hello. My name is Jing. Tania: Nice to meet you, Jing. What class are you in? Jing: I am in class 1B. And you? Tania: Me too. I am in Class 1B too.',
        question: 'What class are Tania and Jing assigned to?',
        options: ['Class 1B', 'Class 2A', 'Class 3C', 'Classroom 4D'],
        correctIndex: 0,
        explanation: 'Both Jing and Tania confirm they are in Class 1B.'
      },
      {
        id: 'q_list_2',
        type: 'listening',
        level: 'A1',
        prompt: 'Listen to the inquiry about the classroom teacher in Dialogue 1:',
        audioUrl: '/material_evaluaciones/A1_first_day_at_schoolA1.mp3',
        audioText: 'Jing: Who is our teacher? Tania: Mr Smith. Jing: And where is our classroom? Tania: This way. Come with me. Jing: OK. Great.',
        question: 'Who is the teacher assigned to Class 1B?',
        options: ['Mr Smith', 'Mr Brown', 'Mrs Johnson', 'Professor Davis'],
        correctIndex: 0,
        explanation: 'Tania explicitly tells Jing: "Mr Smith."'
      },
      {
        id: 'q_list_3',
        type: 'listening',
        level: 'A1',
        prompt: 'Listen to the introductory greeting in Dialogue 1:',
        audioUrl: '/material_evaluaciones/A1_first_day_at_schoolA1.mp3',
        audioText: 'Tania: Hi. I am Tania. What is your name? Jing: Hello. My name is Jing. Tania: Nice to meet you, Jing.',
        question: 'What is the speaker polite greeting upon meeting a new student?',
        options: ['Nice to meet you', 'Goodbye for now', 'See you tomorrow', 'Have a safe journey'],
        correctIndex: 0,
        explanation: 'Tania welcomes Jing by saying "Nice to meet you, Jing."'
      },
      {
        id: 'q_list_4',
        type: 'listening',
        level: 'A1',
        prompt: 'Listen to how Tania directs Jing to their classroom:',
        audioUrl: '/material_evaluaciones/A1_first_day_at_schoolA1.mp3',
        audioText: 'Jing: And where is our classroom? Tania: This way. Come with me. Jing: OK. Great.',
        question: 'What does Tania offer to do for Jing?',
        options: [
          'Guide him directly to the classroom',
          'Give him a printed campus map',
          'Tell him to visit the library first',
          'Call the school principal'
        ],
        correctIndex: 0,
        explanation: 'Tania says "This way. Come with me," actively guiding him.'
      },
      {
        id: 'q_list_5',
        type: 'listening',
        level: 'A2',
        prompt: 'Listen to Direction Speaker A (City Directions):',
        audioUrl: '/material_evaluaciones/A2_giving_directionsA2.mp3',
        audioText: 'Speaker A: Go straight on. Then take the first left on to Green Street. Walk past the library and it is the building next to the library on the left.',
        question: 'Which turn must the pedestrian take to reach Green Street?',
        options: ['The first left', 'The second right', 'The roundabout exit', 'The third intersection'],
        correctIndex: 0,
        explanation: 'Speaker A instructs: "Then take the first left on to Green Street."'
      },
      {
        id: 'q_list_6',
        type: 'listening',
        level: 'A2',
        prompt: 'Listen to the destination description in Speaker A:',
        audioUrl: '/material_evaluaciones/A2_giving_directionsA2.mp3',
        audioText: 'Walk past the library and it is the building next to the library on the left (the Post Office).',
        question: 'Where is the destination located in relation to the library?',
        options: [
          'Next to the library on the left',
          'Directly opposite the supermarket',
          'Behind the train station',
          'Two kilometers down the hill'
        ],
        correctIndex: 0,
        explanation: 'The speaker states: "it is the building next to the library on the left."'
      },
      {
        id: 'q_list_7',
        type: 'listening',
        level: 'A2',
        prompt: 'Listen to Direction Speaker B:',
        audioUrl: '/material_evaluaciones/A2_giving_directionsA2.mp3',
        audioText: 'Speaker B: Go straight on. Go past the traffic lights. You will see a shop on the right. Go past that and it is on the right next to the shop (the Underground Station).',
        question: 'What prominent landmark does Speaker B mention passing first?',
        options: ['The traffic lights', 'A sports stadium', 'A high school', 'A central bridge'],
        correctIndex: 0,
        explanation: 'Speaker B says: "Go past the traffic lights."'
      },
      {
        id: 'q_list_8',
        type: 'listening',
        level: 'A2',
        prompt: 'Listen to the final location of the building in Speaker B:',
        audioUrl: '/material_evaluaciones/A2_giving_directionsA2.mp3',
        audioText: 'You will see a shop on the right. Go past that and it is on the right next to the shop.',
        question: 'On which side of the street is the underground station found?',
        options: ['On the right next to the shop', 'On the left side opposite the park', 'At the end of a dead-end alley', 'Behind the police station'],
        correctIndex: 0,
        explanation: 'Speaker B explains: "it is on the right next to the shop."'
      },
      {
        id: 'q_list_9',
        type: 'listening',
        level: 'B1',
        prompt: 'Listen to Direction Speaker C:',
        audioUrl: '/material_evaluaciones/A2_giving_directionsA2.mp3',
        audioText: 'Speaker C: Go straight on. Go past the traffic lights and go straight on until you get to the roundabout. At the roundabout turn left. Go past the theatre. It is the building next to the theatre, opposite the hospital (the Cinema).',
        question: 'What action should the traveler take upon reaching the roundabout?',
        options: ['Turn left at the roundabout', 'Turn right immediately', 'Continue across the bridge', 'Stop and turn back'],
        correctIndex: 0,
        explanation: 'Speaker C clearly states: "At the roundabout turn left."'
      },
      {
        id: 'q_list_10',
        type: 'listening',
        level: 'B1',
        prompt: 'Listen to the building relationships in Speaker C:',
        audioUrl: '/material_evaluaciones/A2_giving_directionsA2.mp3',
        audioText: 'It is the building next to the theatre, opposite the hospital.',
        question: 'What facility is situated directly opposite the destination in Speaker C?',
        options: ['The hospital', 'The university', 'The post office', 'The museum'],
        correctIndex: 0,
        explanation: 'Speaker C specifies: "...opposite the hospital."'
      },
      {
        id: 'q_list_11',
        type: 'listening',
        level: 'B1',
        prompt: 'Listen to Direction Speaker D:',
        audioUrl: '/material_evaluaciones/A2_giving_directionsA2.mp3',
        audioText: 'Speaker D: Go straight on. Go past the traffic lights and take the second right on to King is Road. Go past the bookshop. It is the building next to the bookshop opposite the cafe (the Bus Station).',
        question: 'Which street turn is instructed in Speaker D?',
        options: [
          'The second right on to King is Road',
          'The first left on to Queen Street',
          'The third exit on Church Road',
          'The first right past the canal'
        ],
        correctIndex: 0,
        explanation: 'Speaker D specifies: "take the second right on to King is Road."'
      },
      {
        id: 'q_list_12',
        type: 'listening',
        level: 'B1',
        prompt: 'Listen to the landmark opposite the destination in Speaker D:',
        audioUrl: '/material_evaluaciones/A2_giving_directionsA2.mp3',
        audioText: 'It is the building next to the bookshop opposite the cafe.',
        question: 'What establishment is located directly opposite the bus station?',
        options: ['The cafe', 'The bookshop', 'The library', 'The underground entrance'],
        correctIndex: 0,
        explanation: 'The speaker concludes: "...opposite the cafe."'
      }
    ]
  },

  // ==========================================================================
  // TEST 2: PURE SENTENCE SCRAMBLE BATTERY (DRAG & DROP 20 ITEMS A1 - C1)
  // ==========================================================================
  {
    id: 'exam_official_scramble_20',
    title: 'Diagnostic Test 2: Syntax & Sentence Scramble (20 Items)',
    grade: 'all',
    level: 'A1',
    weight: 15,
    timeLimitMinutes: 20,
    toolType: 'orderSentence',
    active: true,
    description: '100% Sentence Scramble assessment consisting of 20 calibrated grammatical sentences derived from Macmillan Get Involved Books 1 to 5.',
    questions: [
      {
        id: 'scramble_1',
        type: 'orderSentence',
        level: 'A1',
        prompt: 'Item 1 of 20: Put the words in the correct order to form the introduction:',
        words: ['My', 'name', 'is', 'Jing', 'Wang'],
        correctSentence: 'My name is Jing Wang'
      },
      {
        id: 'scramble_2',
        type: 'orderSentence',
        level: 'A1',
        prompt: 'Item 2 of 20: Put the words in order to state your daily schedule:',
        words: ['I', 'wake', 'up', 'at', 'seven', 'every', 'morning'],
        correctSentence: 'I wake up at seven every morning'
      },
      {
        id: 'scramble_3',
        type: 'orderSentence',
        level: 'A1',
        prompt: 'Item 3 of 20: Put the words in order to form the food preference question:',
        words: ['Do', 'you', 'like', 'eating', 'ice', 'cream'],
        correctSentence: 'Do you like eating ice cream'
      },
      {
        id: 'scramble_4',
        type: 'orderSentence',
        level: 'A1',
        prompt: 'Item 4 of 20: Put the words in order to form the inquiry about city residence:',
        words: ['Where', 'do', 'you', 'live', 'with', 'your', 'family'],
        correctSentence: 'Where do you live with your family'
      },
      {
        id: 'scramble_5',
        type: 'orderSentence',
        level: 'A1',
        prompt: 'Item 5 of 20: Put the words in order to describe the classroom setting:',
        words: ['There', 'are', 'twenty', 'students', 'in', 'this', 'classroom'],
        correctSentence: 'There are twenty students in this classroom'
      },
      {
        id: 'scramble_6',
        type: 'orderSentence',
        level: 'A2',
        prompt: 'Item 6 of 20: Put the words in order to express past activities with "used to":',
        words: ['I', 'used', 'to', 'play', 'football', 'after', 'school'],
        correctSentence: 'I used to play football after school'
      },
      {
        id: 'scramble_7',
        type: 'orderSentence',
        level: 'A2',
        prompt: 'Item 7 of 20: Put the words in order to describe a past continuous interruption:',
        words: ['She', 'was', 'studying', 'when', 'the', 'telephone', 'rang'],
        correctSentence: 'She was studying when the telephone rang'
      },
      {
        id: 'scramble_8',
        type: 'orderSentence',
        level: 'A2',
        prompt: 'Item 8 of 20: Put the words in order to express a comparative evaluation:',
        words: ['Studying', 'at', 'school', 'is', 'more', 'interesting', 'than', 'home'],
        correctSentence: 'Studying at school is more interesting than home'
      },
      {
        id: 'scramble_9',
        type: 'orderSentence',
        level: 'A2',
        prompt: 'Item 9 of 20: Put the words in order to ask a present perfect life experience question:',
        words: ['Have', 'you', 'ever', 'traveled', 'to', 'another', 'country'],
        correctSentence: 'Have you ever traveled to another country'
      },
      {
        id: 'scramble_10',
        type: 'orderSentence',
        level: 'B1',
        prompt: 'Item 10 of 20: Put the words in order to construct a first conditional sentence:',
        words: ['If', 'it', 'rains', 'tomorrow', 'we', 'will', 'stay', 'inside'],
        correctSentence: 'If it rains tomorrow we will stay inside'
      },
      {
        id: 'scramble_11',
        type: 'orderSentence',
        level: 'B1',
        prompt: 'Item 11 of 20: Put the words in order to form a present perfect continuous sentence:',
        words: ['How', 'long', 'have', 'you', 'been', 'studying', 'English'],
        correctSentence: 'How long have you been studying English'
      },
      {
        id: 'scramble_12',
        type: 'orderSentence',
        level: 'B1',
        prompt: 'Item 12 of 20: Put the words in order to form a passive voice description:',
        words: ['This', 'ancient', 'castle', 'was', 'built', 'in', 'the', 'twelfth', 'century'],
        correctSentence: 'This ancient castle was built in the twelfth century'
      },
      {
        id: 'scramble_13',
        type: 'orderSentence',
        level: 'B1',
        prompt: 'Item 13 of 20: Put the words in order to construct a past perfect sequence:',
        words: ['The', 'train', 'had', 'already', 'left', 'before', 'we', 'arrived'],
        correctSentence: 'The train had already left before we arrived'
      },
      {
        id: 'scramble_14',
        type: 'orderSentence',
        level: 'B2',
        prompt: 'Item 14 of 20: Put the words in order to construct a hypothetical second conditional:',
        words: ['What', 'would', 'you', 'do', 'if', 'you', 'won', 'a', 'scholarship'],
        correctSentence: 'What would you do if you won a scholarship'
      },
      {
        id: 'scramble_15',
        type: 'orderSentence',
        level: 'B2',
        prompt: 'Item 15 of 20: Put the words in order to express a past modal of deduction:',
        words: ['He', 'must', 'have', 'forgotten', 'his', 'keys', 'at', 'home'],
        correctSentence: 'He must have forgotten his keys at home'
      },
      {
        id: 'scramble_16',
        type: 'orderSentence',
        level: 'B2',
        prompt: 'Item 16 of 20: Put the words in order to construct a future perfect projection:',
        words: ['By', 'next', 'year', 'I', 'will', 'have', 'graduated', 'from', 'high', 'school'],
        correctSentence: 'By next year I will have graduated from high school'
      },
      {
        id: 'scramble_17',
        type: 'orderSentence',
        level: 'B2',
        prompt: 'Item 17 of 20: Put the words in order to form a regret with "I wish":',
        words: ['I', 'wish', 'I', 'had', 'spent', 'more', 'time', 'practising'],
        correctSentence: 'I wish I had spent more time practising'
      },
      {
        id: 'scramble_18',
        type: 'orderSentence',
        level: 'C1',
        prompt: 'Item 18 of 20: Put the words in order to form an inverted negative sentence:',
        words: ['Rarely', 'have', 'I', 'witnessed', 'such', 'dedication', 'to', 'academic', 'excellence'],
        correctSentence: 'Rarely have I witnessed such dedication to academic excellence'
      },
      {
        id: 'scramble_19',
        type: 'orderSentence',
        level: 'C1',
        prompt: 'Item 19 of 20: Put the words in order to construct a restrictive inversion:',
        words: ['Not', 'only', 'did', 'she', 'pass', 'the', 'exam', 'but', 'she', 'triumphed'],
        correctSentence: 'Not only did she pass the exam but she triumphed'
      },
      {
        id: 'scramble_20',
        type: 'orderSentence',
        level: 'C1',
        prompt: 'Item 20 of 20: Put the words in order to construct a third conditional inversion:',
        words: ['Had', 'they', 'analysed', 'the', 'data', 'earlier', 'they', 'would', 'have', 'succeeded'],
        correctSentence: 'Had they analysed the data earlier they would have succeeded'
      }
    ]
  },

  // ==========================================================================
  // TEST 3: PURE READING COMPREHENSION & TEXT ANALYSIS (A1 - C1) - 16 QUESTIONS
  // ==========================================================================
  {
    id: 'exam_official_reading_battery',
    title: 'Diagnostic Test 3: Reading Comprehension & Textual Analysis',
    grade: 'all',
    level: 'A2',
    weight: 15,
    timeLimitMinutes: 20,
    toolType: 'reading',
    active: true,
    description: '100% Reading comprehension evaluation based on the official texts: The School Library (A1), Jennifer Lawrence Biography (A2), California Travel Guide (B1), FOMO (B2), and Growth Mindset (C1).',
    questions: [
      // Passages 1: The Maine School Library (A1)
      {
        id: 'read_1',
        type: 'trueFalse',
        level: 'A1',
        prompt: 'Read the School Library Poster Rules and decide True or False:',
        readingContext: 'THE MAINE SCHOOL LIBRARY - READING FOR THE FUTURE\nOpening Hours:\nMonday - Thursday: 09:00 - 17:00\nFriday: 08:00 - 15:00\nSaturday: 09:00 - 12:00\nSunday: CLOSED\n\nLibrary Rules:\n- All students must have a library card.\n- Computers are for schoolwork only.\n- No food or drink in the library.\n- No running or shouting in the library.\n- Mobile phones must be off.\n- Students can borrow 3 books at one time.',
        statement: 'You can use Facebook or play entertainment games on the library computers.',
        isTrue: false,
        explanation: 'The library rules state: "Computers are for schoolwork only."'
      },
      {
        id: 'read_2',
        type: 'trueFalse',
        level: 'A1',
        prompt: 'Check the Library Opening Hours and decide True or False:',
        readingContext: 'Opening Hours:\nMonday - Thursday: 09:00 - 17:00\nFriday: 08:00 - 15:00\nSaturday: 09:00 - 12:00\nSunday: CLOSED',
        statement: 'The school library is open on Saturday afternoon.',
        isTrue: false,
        explanation: 'On Saturday the library closes at 12:00 PM (noon), so it is closed in the afternoon.'
      },
      {
        id: 'read_3',
        type: 'multipleChoice',
        level: 'A1',
        prompt: 'According to the Library Notice, how many books can a student borrow simultaneously?',
        readingContext: 'Library Rules:\n- All students must have a library card.\n- Students can borrow 3 books at one time.',
        options: ['Up to 3 books', 'Only 1 book', 'Up to 5 books', 'Unlimited books'],
        correctIndex: 0,
        explanation: 'The notice confirms: "Students can borrow 3 books at one time."'
      },
      {
        id: 'read_4',
        type: 'multipleChoice',
        level: 'A1',
        prompt: 'What must all students possess before borrowing materials in the library?',
        readingContext: 'Library Rules:\n- All students must have a library card.\n- Mobile phones must be off.',
        options: ['A library card', 'A personal laptop', 'A written parent letter', 'A cash deposit'],
        correctIndex: 0,
        explanation: 'Rule 1 clearly specifies: "All students must have a library card."'
      },

      // Passages 2: Jennifer Lawrence Profile (A2)
      {
        id: 'read_5',
        type: 'trueFalse',
        level: 'A2',
        prompt: 'Read the Jennifer Lawrence Celebrity Profile and decide True or False:',
        readingContext: 'JENNIFER LAWRENCE - CELEBRITY PROFILE\nFast Facts:\nPlace of birth: Kentucky, USA. Date of birth: August 15, 1990.\nFamily: Mother Karen, Father Gary, Brothers Ben and Blaine.\nDid you know? Jennifer has never had acting classes!\nWhen she was a child, Jennifer liked sports and played hockey and basketball for an all-boys team. She also worked as a model. At age 14, she went to New York City to look for work. She appeared in advertisements for MTV and H&M and got work as an actress on TV. Her family moved to Los Angeles so she could act in films. In 2010 she acted in Winter is Bone and was nominated for an Oscar. In 2012 she starred as Katniss Everdeen in The Hunger Games.',
        statement: 'Jennifer Lawrence took professional acting classes before going to New York.',
        isTrue: false,
        explanation: 'The profile specifically states: "Did you know? Jennifer has never had acting classes."'
      },
      {
        id: 'read_6',
        type: 'trueFalse',
        level: 'A2',
        prompt: 'Read about Jennifer family life and decide True or False:',
        readingContext: 'Family: Mother Karen Lawrence, Father Gary Lawrence, Brothers: Ben and Blaine Lawrence.\nHer family moved to Los Angeles so that Jennifer could work on TV and in films.',
        statement: 'Jennifer family supported her ambitions by relocating to Los Angeles.',
        isTrue: true,
        explanation: 'The text verifies: "Her family moved to Los Angeles so that Jennifer could work on TV and in films."'
      },
      {
        id: 'read_7',
        type: 'multipleChoice',
        level: 'A2',
        prompt: 'Which breakthrough movie role in 2010 earned Jennifer Lawrence her first Oscar nomination?',
        readingContext: 'In 2010 she acted in the film Winter is Bone and she was nominated for many awards including an Oscar.',
        options: ['Winter is Bone', 'The Hunger Games', 'Silver Linings Playbook', 'X-Men'],
        correctIndex: 0,
        explanation: 'She received her critical Oscar nomination for Winter is Bone in 2010.'
      },

      // Passages 3: California Travel Guide (B1)
      {
        id: 'read_8',
        type: 'trueFalse',
        level: 'B1',
        prompt: 'Read the California Travel Guide and decide True or False:',
        readingContext: 'DISCOVER AMERICA: CALIFORNIA\n1. San Francisco: Fisherman is Wharf is a historic marketplace with seafood and street performers. Visit Ghirardelli Square and Pier 39.\n2. Golden Gate Bridge: The largest suspension bridge in the world and one of the most famous landmarks, connecting SF and Marin County.\n3. Alcatraz Island: Once a high-security prison, now one of the Bay Area is most interesting tourist attractions. Take the ferry from Pier 41 to visit the dark cell blocks that were home to America is most wanted criminals.\n4. Venice Beach: Famous skate park right on the beach and Muscle Beach Gym where Arnold Schwarzenegger started his bodybuilding career.',
        statement: 'Alcatraz Island currently operates as an active high-security prison for criminals.',
        isTrue: false,
        explanation: 'The text notes: "Once a high-security prison, Alcatraz Island is now one of the Bay Area is most interesting tourist attractions."'
      },
      {
        id: 'read_9',
        type: 'multipleChoice',
        level: 'B1',
        prompt: 'Where did actor Arnold Schwarzenegger begin his bodybuilding career according to the guide?',
        readingContext: 'Venice Beach: Also watch the bodybuilders at Muscle Beach Gym, which is where Arnold Schwarzenegger started his career.',
        options: ['Muscle Beach Gym in Venice Beach', 'Disneyland Park', 'Santa Cruz Surfing Museum', 'Grauman Chinese Theatre'],
        correctIndex: 0,
        explanation: 'The text specifies Muscle Beach Gym in Venice Beach.'
      },
      {
        id: 'read_10',
        type: 'multipleChoice',
        level: 'B1',
        prompt: 'From which location can tourists board a ferry to visit Alcatraz Island?',
        readingContext: 'Take the ferry from Pier 41 and visit the dark cell blocks that were home to America is most wanted criminals.',
        options: ['Pier 41', 'Ghirardelli Square', 'Golden Gate Vista Point', 'Hollywood Boulevard'],
        correctIndex: 0,
        explanation: 'The guide advises: "Take the ferry from Pier 41."'
      },

      // Passages 4: FOMO Research (B2)
      {
        id: 'read_11',
        type: 'trueFalse',
        level: 'B2',
        prompt: 'Read the FOMO blog post and research study and decide True or False:',
        readingContext: 'FOMO: FEAR OF MISSING OUT\nPosted by Mr Braddock, Sixth Form teacher.\nEverybody knows how important it is for students to get a good night is sleep. Most experts agree that the optimum number of hours is eight. In a recent study of 848 students in Wales, results showed that teenagers are waking up in the middle of the night because of FOMO: Fear Of Missing Out!\nStatistics reveal:\n- 23% of 12 to 15-year-olds wake up nearly every night to use social media. Another 15% wake up once a week.\n- One in three students are constantly tired and unable to function to full capacity.\n- Students who use social media during the night are more likely to suffer from depression and anxiety.',
        statement: 'The research shows that almost a quarter (23%) of 12 to 15-year-olds wake up nearly every night to check social media.',
        isTrue: true,
        explanation: 'The study reports: "23% of 12 to 15-year-olds wake up nearly every night to use social media."'
      },
      {
        id: 'read_12',
        type: 'multipleChoice',
        level: 'B2',
        prompt: 'According to sleep experts cited by Mr Braddock, what is the optimum sleep duration for adolescents?',
        readingContext: 'Most experts agree that the optimum number of hours is eight.',
        options: ['Eight hours', 'Four hours', 'Six hours', 'Ten to twelve hours'],
        correctIndex: 0,
        explanation: 'The article explicitly states: "the optimum number of hours is eight."'
      },
      {
        id: 'read_13',
        type: 'multipleChoice',
        level: 'B2',
        prompt: 'What negative psychological consequences are correlated with nighttime social media usage?',
        readingContext: 'Students who use social media during the night are more likely to suffer from depression and anxiety.',
        options: [
          'Higher incidence of depression and anxiety',
          'Immediate loss of mathematical comprehension',
          'Increased athletic stamina',
          'Better time management skills'
        ],
        correctIndex: 0,
        explanation: 'The research found higher rates of depression and anxiety among night users.'
      },

      // Passages 5: Growth Mindset (C1)
      {
        id: 'read_14',
        type: 'trueFalse',
        level: 'C1',
        prompt: 'Read the Growth Mindset text and decide True, False, or Not Given:',
        readingContext: 'DO YOU HAVE THE RIGHT MINDSET?\nEarly in her career, psychologist Carol Dweck of Stanford University gave ten-year-old students problems that were slightly too hard for them. One group reacted positively, said they loved challenge, and understood abilities could be developed. They had a "growth mindset". Another group felt their intelligence was being judged and had failed. They had a "fixed mindset" and were unable to imagine improving; some looked for peers who had done worse to boost self-esteem.\nProfessor Dweck believes praising children for their intelligence makes them vulnerable to failure and performance-oriented. The solution is to praise the process: effort, learning strategies, persevering, and improving.',
        statement: 'Carol Dweck concluded that praising children for innate intelligence promotes long-term academic resilience.',
        isTrue: false,
        explanation: 'She found the opposite: praising intelligence makes children vulnerable to failure and afraid of challenges.'
      },
      {
        id: 'read_15',
        type: 'trueFalse',
        level: 'C1',
        prompt: 'Read about the neurological findings in paragraph 4 and decide True or False:',
        readingContext: 'Psychologists have been testing these theories. Students were taught that if they left their comfort zone and learned something new and difficult, the neurons in their brains would form stronger connections, making them more intelligent. These students made faster progress than a control group.',
        statement: 'Scientific trials demonstrated that learning challenging skills prompts neurons to forge stronger connections.',
        isTrue: true,
        explanation: 'The text confirms neurons form stronger connections when students tackle difficult material outside their comfort zones.'
      },
      {
        id: 'read_16',
        type: 'multipleChoice',
        level: 'C1',
        prompt: 'According to Professor Dweck, what pedagogical focus fosters a true "mastery-oriented" mindset in students?',
        readingContext: 'The solution is to praise the process that children are engaged in: making an effort, using learning strategies, persevering and improving.',
        options: [
          'Praising the process, effort, strategies, and perseverance',
          'Praising high innate test scores and genetic talent',
          'Encouraging students to compare scores with lower peers',
          'Eliminating all challenging tasks from the syllabus'
        ],
        correctIndex: 0,
        explanation: 'Dweck highlights praising the process: effort, strategy, and perseverance.'
      }
    ]
  },

  // ==========================================================================
  // TEST 4: PURE USE OF ENGLISH & CLOZE GAP FILL (A1 - C1) - 12 QUESTIONS
  // ==========================================================================
  {
    id: 'exam_official_cloze_battery',
    title: 'Diagnostic Test 4: Use of English & Grammatical Cloze (A1 - C1)',
    grade: 'all',
    level: 'B1',
    weight: 15,
    timeLimitMinutes: 18,
    toolType: 'fillParagraph',
    active: true,
    description: '100% Use of English gap-fill evaluation assessing grammatical precision across tenses, modals, conditionals, and passive voice.',
    questions: [
      {
        id: 'cloze_1',
        type: 'fillParagraph',
        level: 'A1',
        prompt: 'Item 1 of 12: Complete the greeting with the appropriate forms of "to be":',
        textWithBlanks: 'Hello! I {{0}} a student at Salesiano San Jose. My brother {{1}} study here too.',
        blanks: [
          { answer: 'am', options: ['am', 'is', 'are'] },
          { answer: 'does', options: ['does', 'do', 'doing'] }
        ]
      },
      {
        id: 'cloze_2',
        type: 'fillParagraph',
        level: 'A1',
        prompt: 'Item 2 of 12: Complete the library dialogue with modal and frequency items:',
        textWithBlanks: 'Students {{0}} borrow three books at one time. You {{1}} speak loudly inside the quiet study room.',
        blanks: [
          { answer: 'can', options: ['can', 'must to', 'are'] },
          { answer: 'must not', options: ['must not', 'can', 'don\'t have to'] }
        ]
      },
      {
        id: 'cloze_3',
        type: 'fillParagraph',
        level: 'A2',
        prompt: 'Item 3 of 12: Complete the narrative with correct past simple forms:',
        textWithBlanks: 'Yesterday Jennifer {{0}} her homework early and then {{1}} to basketball practice with her teammates.',
        blanks: [
          { answer: 'finished', options: ['finished', 'finish', 'finishing'] },
          { answer: 'went', options: ['went', 'go', 'gone'] }
        ]
      },
      {
        id: 'cloze_4',
        type: 'fillParagraph',
        level: 'A2',
        prompt: 'Item 4 of 12: Complete with past progressive and interrupted action:',
        textWithBlanks: 'The tourist {{0}} down Market Street when he suddenly {{1}} the famous streetcar.',
        blanks: [
          { answer: 'was walking', options: ['was walking', 'walked', 'walks'] },
          { answer: 'saw', options: ['saw', 'see', 'seen'] }
        ]
      },
      {
        id: 'cloze_5',
        type: 'fillParagraph',
        level: 'B1',
        prompt: 'Item 5 of 12: Complete the conditional sentence with accurate modal structures:',
        textWithBlanks: 'If the weather {{0}} pleasant tomorrow, we will take the ferry to Alcatraz. You {{1}} bring warm clothes.',
        blanks: [
          { answer: 'is', options: ['is', 'will be', 'was'] },
          { answer: 'should', options: ['should', 'ought', 'must to'] }
        ]
      },
      {
        id: 'cloze_6',
        type: 'fillParagraph',
        level: 'B1',
        prompt: 'Item 6 of 12: Complete the historic description with correct passive voice:',
        textWithBlanks: 'The iconic suspension bridge {{0}} by millions of tourists annually. It was {{1}} in nineteen thirty-seven.',
        blanks: [
          { answer: 'is visited', options: ['is visited', 'visits', 'visiting'] },
          { answer: 'completed', options: ['completed', 'complete', 'completing'] }
        ]
      },
      {
        id: 'cloze_7',
        type: 'fillParagraph',
        level: 'B1',
        prompt: 'Item 7 of 12: Complete with present perfect and duration prepositions:',
        textWithBlanks: 'How long have you {{0}} English? I have studied here {{1}} three consecutive years.',
        blanks: [
          { answer: 'been studying', options: ['been studying', 'study', 'studied'] },
          { answer: 'for', options: ['for', 'since', 'during'] }
        ]
      },
      {
        id: 'cloze_8',
        type: 'fillParagraph',
        level: 'B2',
        prompt: 'Item 8 of 12: Complete the psychological study with gerund and infinitive forms:',
        textWithBlanks: 'Psychologists recommend {{0}} notifications at bedtime in order to {{1}} deeper sleep cycles.',
        blanks: [
          { answer: 'disabling', options: ['disabling', 'to disable', 'disabled'] },
          { answer: 'promote', options: ['promote', 'promoting', 'promoted'] }
        ]
      },
      {
        id: 'cloze_9',
        type: 'fillParagraph',
        level: 'B2',
        prompt: 'Item 9 of 12: Complete with past modal of deduction and consequence:',
        textWithBlanks: 'The student looks exhausted this morning; he {{0}} up late checking social media. He {{1}} turned off his phone.',
        blanks: [
          { answer: 'must have stayed', options: ['must have stayed', 'should stay', 'can stay'] },
          { answer: 'ought to have', options: ['ought to have', 'must', 'might to'] }
        ]
      },
      {
        id: 'cloze_10',
        type: 'fillParagraph',
        level: 'B2',
        prompt: 'Item 10 of 12: Complete with future perfect time perspective:',
        textWithBlanks: 'By the time high school seniors celebrate graduation, they {{0}} all diagnostic competencies and {{1}} their CEFR certificates.',
        blanks: [
          { answer: 'will have completed', options: ['will have completed', 'completed', 'complete'] },
          { answer: 'earned', options: ['earned', 'earning', 'earn'] }
        ]
      },
      {
        id: 'cloze_11',
        type: 'fillParagraph',
        level: 'C1',
        prompt: 'Item 11 of 12: Complete with negative inversion syntax:',
        textWithBlanks: 'Rarely {{0}} researchers encountered such striking cognitive gains. Only through rigorous persistence {{1}} students achieve mastery.',
        blanks: [
          { answer: 'have', options: ['have', 'did', 'are'] },
          { answer: 'can', options: ['can', 'they can', 'will they have'] }
        ]
      },
      {
        id: 'cloze_12',
        type: 'fillParagraph',
        level: 'C1',
        prompt: 'Item 12 of 12: Complete with inverted conditional subjunctive:',
        textWithBlanks: 'Had educators {{0}} Carol Dweck mindset framework earlier, many pupils {{1}} greater academic confidence.',
        blanks: [
          { answer: 'embraced', options: ['embraced', 'embrace', 'embracing'] },
          { answer: 'would have developed', options: ['would have developed', 'will develop', 'develop'] }
        ]
      }
    ]
  },

  // ==========================================================================
  // TEST 5: INTERMEDIATE LISTENING: THE WEEKEND & PLANS (CEFR B1)
  // Audio: /material_evaluaciones/B1_the_weekendB1.mp3
  // ==========================================================================
  {
    id: 'exam_official_b1_weekend_listening',
    title: 'Diagnostic Test 5: Intermediate Listening - The Weekend & Plans (B1)',
    grade: 'all',
    level: 'B1',
    weight: 20,
    timeLimitMinutes: 15,
    toolType: 'listening',
    active: true,
    description: 'Specialized B1 listening test evaluating weekend plans, outdoor activities, travel suggestions, and casual dialogue.',
    questions: [
      {
        id: 'q_b1_wk_1',
        type: 'listening',
        level: 'B1',
        prompt: 'Listen to the weekend discussion audio and answer the question:',
        audioUrl: '/material_evaluaciones/B1_the_weekendB1.mp3',
        audioText: 'Speaker A: So, what are your plans for this weekend? Speaker B: Well, if the weather stays sunny, I am planning to go mountain biking with my brother up in the hills. We usually leave early around 7:30 AM.',
        question: 'What outdoor activity is planned if the weather conditions remain good?',
        options: ['Mountain biking in the hills', 'Camping near the lake', 'Going to a water park', 'Playing indoor tennis'],
        correctIndex: 0,
        explanation: 'Speaker B mentions: "I am planning to go mountain biking with my brother up in the hills."'
      },
      {
        id: 'q_b1_wk_2',
        type: 'listening',
        level: 'B1',
        prompt: 'Listen to the departure schedule details:',
        audioUrl: '/material_evaluaciones/B1_the_weekendB1.mp3',
        audioText: 'Speaker B: We usually leave early around 7:30 AM so we can avoid the noon heat. My brother is bringing the water bottles and I am taking the first-aid kit.',
        question: 'Why do the speakers prefer to set off early at 7:30 AM?',
        options: ['To avoid the noon heat', 'To catch the morning train', 'Because the park closes at noon', 'To meet their friends for breakfast'],
        correctIndex: 0,
        explanation: 'The speaker explicitly states: "so we can avoid the noon heat."'
      },
      {
        id: 'q_b1_wk_3',
        type: 'listening',
        level: 'B1',
        prompt: 'Listen to the alternative plan if it rains:',
        audioUrl: '/material_evaluaciones/B1_the_weekendB1.mp3',
        audioText: 'Speaker A: And what if it rains? Speaker B: In that case, we will probably stay indoors, stream a documentary series, and finish our science project.',
        question: 'What is the alternative contingency plan if weather conditions turn rainy?',
        options: ['Stay indoors, stream documentaries, and work on a science project', 'Go to the cinema downtown', 'Visit their grandparents in the countryside', 'Postpone the project and sleep'],
        correctIndex: 0,
        explanation: 'Speaker B clarifies: "we will probably stay indoors, stream a documentary series, and finish our science project."'
      },
      {
        id: 'q_b1_wk_4',
        type: 'listening',
        level: 'B1',
        prompt: 'Listen to the travel recommendation discussion:',
        audioUrl: '/material_evaluaciones/B1_the_weekendB1.mp3',
        audioText: 'Speaker A: Sounds like a solid plan. Make sure to wear your helmets and pack some energy bars. Speaker B: Definitely, safety comes first.',
        question: 'What crucial safety advice does Speaker A emphasize?',
        options: ['Wearing safety helmets and packing energy bars', 'Staying on paved highways only', 'Returning before sunset', 'Hiring a professional tour guide'],
        correctIndex: 0,
        explanation: 'Speaker A highlights: "Make sure to wear your helmets and pack some energy bars."'
      }
    ]
  },

  // ==========================================================================
  // TEST 6: ADVANCED LISTENING: INVENTIONS & SOCIAL ACTION (CEFR B2 - C1)
  // Audios: /material_evaluaciones/B2_new_inventions.mp3 & C1_help_others_help_yourself.mp3
  // ==========================================================================
  {
    id: 'exam_official_advanced_listening_b2_c1',
    title: 'Diagnostic Test 6: Advanced Listening - Tech Inventions & Social Impact (B2 - C1)',
    grade: 'all',
    level: 'B2',
    weight: 20,
    timeLimitMinutes: 20,
    toolType: 'listening',
    active: true,
    description: 'Advanced listening comprehension focusing on technological innovation (B2 New Inventions) and community psychology (C1 Help Others, Help Yourself).',
    questions: [
      {
        id: 'q_adv_list_1',
        type: 'listening',
        level: 'B2',
        prompt: 'Listen to the science correspondent discussing novel engineering prototypes:',
        audioUrl: '/material_evaluaciones/B2_new_inventions.mp3',
        audioText: 'Host: Welcome to Science and Engineering Today. Our correspondent Jed is here to showcase three remarkable sustainable inventions. Jed: Thanks! First up is a biodegradable packaging material synthesized entirely from seaweed and agricultural waste.',
        question: 'What is the primary organic source material used to synthesize the new packaging invention?',
        options: ['Seaweed and agricultural waste', 'Recycled petroleum plastics', 'Synthetic carbon polymers', 'Industrial wood pulp'],
        correctIndex: 0,
        explanation: 'Jed explains that the material is synthesized entirely from seaweed and agricultural waste.'
      },
      {
        id: 'q_adv_list_2',
        type: 'listening',
        level: 'B2',
        prompt: 'Listen to the environmental efficiency analysis:',
        audioUrl: '/material_evaluaciones/B2_new_inventions.mp3',
        audioText: 'Jed: Unlike traditional single-use polymers that persist in oceans for centuries, this prototype decomposes in soil within four to six weeks without toxic residue.',
        question: 'How quickly does the biodegradable prototype break down naturally in soil?',
        options: ['Within 4 to 6 weeks', 'In approximately 6 months', 'After 1 to 2 years', 'In less than 24 hours'],
        correctIndex: 0,
        explanation: 'Jed states that it decomposes in soil within four to six weeks.'
      },
      {
        id: 'q_adv_list_3',
        type: 'listening',
        level: 'C1',
        prompt: 'Listen to the interview on volunteer initiatives and personal development in Dialogue C1:',
        audioUrl: '/material_evaluaciones/C1_help_others_help_yourself.mp3',
        audioText: 'Host: Today we discuss altruism and emotional wellbeing. Debbie, who spent two years leading youth mentoring groups, shares how helping others transformed her career trajectory.',
        question: 'What was Debbie volunteer role before she transitioned into professional community management?',
        options: ['Leading youth mentoring groups for two years', 'Organizing international medical fundraisers', 'Teaching elementary school mathematics', 'Managing corporate public relations'],
        correctIndex: 0,
        explanation: 'The host introduces Debbie as someone who spent two years leading youth mentoring groups.'
      },
      {
        id: 'q_adv_list_4',
        type: 'listening',
        level: 'C1',
        prompt: 'Listen to the psychological benefits of community involvement:',
        audioUrl: '/material_evaluaciones/C1_help_others_help_yourself.mp3',
        audioText: 'Debbie: Engaging in grassroots community support does not merely benefit recipients; neurochemical studies show it actively reinforces resilience and mitigates chronic stress in volunteers.',
        question: 'According to neurochemical studies discussed, what key personal benefit do volunteers experience?',
        options: ['Reinforced psychological resilience and lower chronic stress', 'Immediate guaranteed career promotions', 'Complete immunity to fatigue', 'Higher economic compensation'],
        correctIndex: 0,
        explanation: 'Debbie points out that it actively reinforces resilience and mitigates chronic stress.'
      }
    ]
  }
]
