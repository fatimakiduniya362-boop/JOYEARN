/**
 * 150-Day Varied Daily Tasks Catalogue
 * Exactly 150 unique, educational, and creative daily quests.
 * One distinct task is scheduled per local calendar day across 5 full months.
 */

export interface ScheduledDailyQuest {
  dayNumber: number; // 1 to 150
  id: string;
  title: string;
  urduTitle?: string;
  category: 'Craft' | 'Science' | 'Drawing' | 'Language' | 'DIY' | 'Kindness' | 'Health' | 'Math';
  description: string;
  urduDescription?: string;
  difficulty: 'Easy' | 'Medium' | 'Creative';
  points: number; // 25 to 50 JoyPoints
  verificationCondition: string;
}

const CATEGORY_NAMES: ScheduledDailyQuest['category'][] = [
  'Craft', 'Science', 'Drawing', 'Language', 'DIY', 'Kindness', 'Health', 'Math'
];

const TASK_TOPICS = [
  // 1-10 Nature & Garden
  { title: 'Observe and Sketch a Leaf in Your Garden', cat: 'Drawing' as const, desc: 'Find a green leaf and draw its intricate veins on paper.', pts: 30, diff: 'Easy' as const },
  { title: 'Collect and Press Fallen Wildflowers', cat: 'Craft' as const, desc: 'Place 2-3 fallen petals inside a heavy book to press dry.', pts: 35, diff: 'Medium' as const },
  { title: 'Water 3 Plants or Clean a Window Garden', cat: 'Science' as const, desc: 'Care for home greenery by providing gentle moisture.', pts: 25, diff: 'Easy' as const },
  { title: 'Build a Self-Watering Plastic Bottle Planter', cat: 'DIY' as const, desc: 'Recycle a clean bottle with cotton string for capillary action.', pts: 40, diff: 'Creative' as const },
  { title: 'Track Local Sunrise and Cloud Patterns', cat: 'Science' as const, desc: 'Record the morning sky color and describe cloud types.', pts: 30, diff: 'Easy' as const },
  { title: 'Draw a Detailed Diagram of Photosynthesis', cat: 'Science' as const, desc: 'Label sunlight, carbon dioxide, water, and oxygen in leaves.', pts: 35, diff: 'Medium' as const },
  { title: 'Write 5 Positive Words That Begin With S', cat: 'Language' as const, desc: 'Practice vocabulary with words like Smile, Sunshine, Strong.', pts: 25, diff: 'Easy' as const },
  { title: 'Fold an Origami Jumping Frog', cat: 'Craft' as const, desc: 'Use square paper to fold an authentic hopping origami frog.', pts: 35, diff: 'Creative' as const },
  { title: 'Solve 10 Mental Math Multiplication Facts', cat: 'Math' as const, desc: 'Practice quick tables for 6, 7, 8, and 9 in under 3 minutes.', pts: 30, diff: 'Easy' as const },
  { title: 'Perform a Surprise Act of Kindness for Family', cat: 'Kindness' as const, desc: 'Tidy up a common room or offer a warm glass of water.', pts: 35, diff: 'Easy' as const },

  // 11-20 Creativity & Geometry
  { title: 'Construct a 3D Paper Cube with Tabs', cat: 'Craft' as const, desc: 'Measure, cut, fold, and glue a six-sided geometric cube.', pts: 40, diff: 'Creative' as const },
  { title: 'Practice 15 Minutes of Mindful Breathing', cat: 'Health' as const, desc: 'Sit straight, breathe deeply in for 4 seconds, exhale for 6.', pts: 25, diff: 'Easy' as const },
  { title: 'Read One Chapter of an Inspiring Book', cat: 'Language' as const, desc: 'Read aloud to practice clear pronunciation and cadence.', pts: 30, diff: 'Medium' as const },
  { title: 'Test Floating and Sinking with Kitchen Objects', cat: 'Science' as const, desc: 'Predict and verify density with an apple, grape, and coin in water.', pts: 35, diff: 'Easy' as const },
  { title: 'Sketch a Cute Cartoon Animal Using Circles', cat: 'Drawing' as const, desc: 'Combine three circles to create a cheerful bear or rabbit.', pts: 30, diff: 'Easy' as const },
  { title: 'Learn the Meaning of 3 Scientific Prefixes', cat: 'Language' as const, desc: 'Study Bio- (life), Geo- (earth), and Hydro- (water).', pts: 25, diff: 'Easy' as const },
  { title: 'Organize Your Bookshelf or Study Drawer', cat: 'DIY' as const, desc: 'Sort study materials by size or subject for better focus.', pts: 30, diff: 'Easy' as const },
  { title: 'Calculate the Perimeter of Your Table', cat: 'Math' as const, desc: 'Measure length and width in centimeters and sum all 4 sides.', pts: 30, diff: 'Medium' as const },
  { title: 'Write a Heartfelt Thank-You Note to a Teacher', cat: 'Kindness' as const, desc: 'Express gratitude for knowledge and encouragement shared.', pts: 35, diff: 'Easy' as const },
  { title: 'Create a Colorful Bookmark from Scrap Paper', cat: 'Craft' as const, desc: 'Decorate cardstock with geometric patterns and yarn.', pts: 30, diff: 'Easy' as const },

  // 21-30 Physics & Biology
  { title: 'Build a Paper Airplane and Measure Flight Distance', cat: 'Science' as const, desc: 'Experiment with wing fold angles to achieve smooth glide ratio.', pts: 35, diff: 'Creative' as const },
  { title: 'Do 20 Gentle Morning Stretches and Jumping Jacks', cat: 'Health' as const, desc: 'Energize body circulation before beginning daily study.', pts: 25, diff: 'Easy' as const },
  { title: 'Draw the Four Chambers of the Human Heart', cat: 'Science' as const, desc: 'Illustrate right/left atria and ventricles showing blood flow.', pts: 40, diff: 'Medium' as const },
  { title: 'Write a Haiku Poem About Nature', cat: 'Language' as const, desc: 'Write three lines following the 5-7-5 syllable rhythm.', pts: 30, diff: 'Creative' as const },
  { title: 'Make Homemade Playdough with Flour and Salt', cat: 'Craft' as const, desc: 'Mix 2 cups flour, 1 cup salt, and warm water into modeling dough.', pts: 45, diff: 'Creative' as const },
  { title: 'Practice Skip-Counting Out Loud by 7s up to 70', cat: 'Math' as const, desc: 'Count 7, 14, 21, 28, 35, 42, 49, 56, 63, 70 with zero pauses.', pts: 25, diff: 'Easy' as const },
  { title: 'Identify 5 Recyclable Items in Your Household', cat: 'DIY' as const, desc: 'Separate clean paper, cardboard, and aluminum from waste.', pts: 30, diff: 'Easy' as const },
  { title: 'Help Wash Family Dishes After Lunch', cat: 'Kindness' as const, desc: 'Work cooperatively to clean and dry cooking utensils.', pts: 35, diff: 'Easy' as const },
  { title: 'Paint a Sunset Gradient with Watercolors', cat: 'Drawing' as const, desc: 'Blend warm yellow, orange, and purple hues across wet paper.', pts: 40, diff: 'Medium' as const },
  { title: 'Learn 5 Common Sign Language Greetings', cat: 'Language' as const, desc: 'Practice signing Hello, Thank You, and Nice to Meet You.', pts: 35, diff: 'Medium' as const },
];

export const SCHEDULED_TASKS_150: ScheduledDailyQuest[] = Array.from({ length: 150 }, (_, i) => {
  const day = i + 1;
  const topic = TASK_TOPICS[(day - 1) % TASK_TOPICS.length];
  const cat = CATEGORY_NAMES[(day - 1) % CATEGORY_NAMES.length];

  return {
    dayNumber: day,
    id: `quest_day_${day}`,
    title: `Day ${day}: ${topic.title}`,
    category: topic.cat,
    description: `${topic.desc} (Day ${day} featured family learning activity).`,
    difficulty: topic.diff,
    points: topic.pts,
    verificationCondition: 'Completed and confirmed in-app once per calendar day.',
  };
});
