import { connectToDatabase } from '../lib/db';
import { CategoryGroupModel } from '../models/category-group';
import { CategoryModel } from '../models/category';
import { MediaItemModel } from '../models/media-item';

type MediaType = 'movie' | 'series';
type RawStatus = 'planned' | 'completed' | 'reviewed';
type Marker = '' | 'w' | 'r' | 's1' | 's2';
type ItemSeed = [title: string, marker?: Marker];

type RawEntry = {
  type: MediaType;
  category: string;
  title: string;
  status: RawStatus;
  liked: boolean | null;
  selectionCount: number;
};

type ConsolidatedEntry = RawEntry & {
  rating: number | null;
  categoryNames: string[];
  notes: string | null;
  releaseYear: number | null;
  posterUrl: string | null;
  totalSeasons: number | null;
  totalEpisodes: number | null;
  currentSeason: number | null;
  currentEpisode: number | null;
};

const palette = [
  '#6366f1', '#8b5cf6', '#ec4899', '#06b6d4', '#14b8a6', '#22c55e', '#f59e0b', '#ef4444', '#64748b', '#3b82f6',
  '#f97316', '#10b981', '#a855f7', '#eab308', '#84cc16', '#f43f5e', '#0ea5e9', '#4f46e5', '#16a34a', '#fb7185',
  '#0891b2', '#ca8a04', '#7c3aed', '#ea580c', '#2563eb', '#059669', '#be123c', '#4338ca', '#0f766e',
];

const buildEntries = (type: MediaType, sections: Array<{ category: string; items: ItemSeed[] }>): RawEntry[] =>
  sections.flatMap(({ category, items }) =>
    items.map(([title, marker = '']) => ({
      type,
      category,
      title,
      status: marker === 'w' ? 'completed' : marker === 'r' ? 'reviewed' : 'planned',
      liked: marker === 'w' ? true : marker === 'r' ? false : null,
      selectionCount: marker === 's1' ? 1 : marker === 's2' ? 2 : 0,
    }))
  );

const movieSections = [
  {
    category: 'Music & Performance Stories',
    items: [
      ['Begin Again'], ['Once (2006)'], ['Almost Famous', 'r'], ['Bohemian Rhapsody'], ['Pitch Perfect'],
      ['Lemonade Mouth'], ['La La Land'], ['Whiplash', 'w'], ['Matilda the Musical'],
    ],
  },
  {
    category: 'Love, Romance & Relationships',
    items: [
      ['Flipped', 'w'], ["To All the Boys I've Loved Before", 'w'], ['Eternal Sunshine of the Spotless Mind', 'w'],
      ['Brokeback Mountain', 'r'], ['The Worst Person in the World', 's1'], ['Bones and All'], ['Amelie', 'r'],
      ['Midnight in Paris', 's1'], ['Blue Valentine'], ['Her'], ['Crazy, Stupid, Love'], ['Revolutionary Road'],
      ['The Notebook'], ['We Live in Time'], ['The Theory of Everything'], ['This Is Where I Leave You'],
    ],
  },
  {
    category: 'Period Romance & Literary Adaptations',
    items: [
      ['The Great Gatsby', 's1'], ['Memoirs of a Geisha', 'r'], ['Atonement', 'w'], ['Hamnet', 'w'],
    ],
  },
  {
    category: 'Comedy & Dramedy',
    items: [
      ['Mean Girls', 'r'], ['Easy A', 'w'], ['Game Night'], ['The Other Guys'], ['Going in Style'], ['EuroTrip'],
      ['Burn After Reading'], ['The Nice Guys'], ['Logan Lucky'], ['Chef'], ['Jojo Rabbit'], ['The Naked Gun (2025)'],
    ],
  },
  {
    category: 'Emotional Drama & Human Stories',
    items: [
      ['Big Fish', 's1'], ['50/50'], ['We Bought a Zoo'], ['Slumdog Millionaire'], ['To the Bone'], ['The Life List'],
      ['Better Day'], ['A Beautiful Mind'], ['The Pianist'], ['The Pursuit of Happyness'], ['Seven Pounds'],
      ['Demolition'], ['Green Book'], ['Small Things Like These'],
    ],
  },
  {
    category: 'Psychological & Mind-Bending',
    items: [
      ['Memento', 'w'], ['American Psycho', 'w'], ['Donnie Brasco', 'r'], ['The Machinist', 'w'], ['Shutter Island', 'w'],
      ['Prisoners', 'w'], ['Joker', 'w'], ['The Prestige', 'w'], ['Gone Girl', 'w'], ['Everything Everywhere All at Once', 'w'],
      ['The Menu'], ["It's What's Inside"], ['Tenet', 'w'], ['The Substance', 'w'], ['Children of Men', 's1'],
    ],
  },
  {
    category: 'Dark Thrillers & Horror',
    items: [
      ['Ready or Not'], ['Midsommar', 's1'], ["The Shadow's Edge"], ['Fracture'], ['No Country for Old Men'], ['Sicario'],
      ['Boiling Point'], ['The Killer'], ['The Companion'], ['The Housemaid'],
    ],
  },  {
    category: 'Adventure, Survival & Self-Discovery',
    items: [['Into the Wild', 's1'], ['The Revenant'], ['The Road'], ['Finch']],
  },
  {
    category: 'Coming-of-Age & Youth Stories',
    items: [['Nerve'], ['The Perks of Being a Wallflower', 's1'], ['The Hunger Games', 'w'], ['Catching Fire', 'w'], ['Mockingjay Part 1'], ['Mockingjay Part 2']],
  },
  {
    category: 'Sci-Fi, Fantasy & Speculative Worlds',
    items: [['Harry Potter (all films)', 'w'], ['Inception', 'w'], ['Interstellar', 'w'], ['Minority Report', 'w'], ['Edge of Tomorrow', 'w'], ['Maleficent', 'w']],
  },
  {
    category: 'Crime, Gangsters & Heists',
    items: [["Ocean's Eleven"], ['The Departed'], ['Public Enemies'], ['Black Mass'], ['American Hustle'], ['The Gentlemen'], ['Knives Out'], ['Glass Onion']],
  },
  {
    category: 'Power, Greed & Financial Drama',
    items: [['The Wolf of Wall Street', 'w'], ['The Big Short'], ['Vice'], ['War Dogs']],
  },
  {
    category: 'Sports, Competition & Racing',
    items: [['Gran Turismo'], ['Warrior', 'r'], ['Ford v Ferrari', 's1']],
  },
  {
    category: 'War, Politics & Historical Conflict',
    items: [['Gladiator'], ['Downfall'], ['The Last Samurai'], ['Fury'], ['Hacksaw Ridge'], ['1917'], ['All Quiet on the Western Front'], ['Oppenheimer'], ['Civil War']],
  },
  {
    category: 'Action, Spy & Blockbusters',
    items: [['The Bourne Identity'], ['Casino Royale', 'r'], ['Quantum of Solace'], ['Skyfall'], ['Spectre'], ['Batman Begins'], ['The Dark Knight'], ['The Dark Knight Rises'], ['Top Gun: Maverick'], ['Nobody'], ['Nobody 2'], ['Bullet Train'], ['The Fall Guy'], ['The Grey Man'], ['Baby Driver']],
  },
  {
    category: 'Mystery, Detective & Whodunits',
    items: [['Enola Holmes'], ['Juror #2', 's2'], ['Last Looks', 'r']],
  },
] satisfies Array<{ category: string; items: ItemSeed[] }>;

const seriesSections = [
  {
    category: 'Love, Romance & Relationships',
    items: [['Outlander', 'w'], ['Bridgerton', 'w'], ['Downton Abbey', 'w'], ['Maxton Hall: The World Between Us', 's1'], ['The Summer I Turned Pretty'], ['Never Have I Ever', 'w'], ['Ginny & Georgia'], ['Anne with an E'], ['Gilmore Girls'], ['One Day', 's1'], ['Riverdale', 's1'], ['Queen Charlotte: A Bridgerton Story', 'w'], ['Gossip Girl']],
  },
  {
    category: 'Period Romance & Historical Drama',
    items: [['Hispania, la leyenda', 'r'], ['The Crown', 'w'], ['1883'], ['Daisy Jones & The Six']],
  },
  {
    category: 'Comedy, Sitcoms & Dramedy',
    items: [['The Office', 'r'], ['Friends', 'r'], ['Fleabag', 'r'], ['The Big Bang Theory', 's2'], ['The IT Crowd', 'r'], ['Insatiable'], ['Everything Sucks'], ['I Think You Should Leave'], ['Young Sheldon'], ['Modern Family']],
  },
  {
    category: 'Emotional Drama & Human Stories',
    items: [['All American', 's1'], ['Desperate Housewives'], ['The White Lotus', 's2'], ['High Potential'], ['This Is Us', 'w'], ['Remains 2013'], ['The Head', 'w'], ['The Pitt']],
  },
  {
    category: 'Psychological & Mind-Bending',
    items: [['Behind Her Eyes'], ['Dark Matter'], ['Manifest'], ['Russian Doll', 'w'], ['Severance'], ['Zero Day'], ['Adolescence']],
  },
  {
    category: 'Dark Thrillers, Crime & Suspense',
    items: [['Luther', 's2'], ['Broadchurch'], ['Line of Duty', 'r'], ['Bodyguard'], ['Red Rose'], ['From'], ['The Day of the Jackal'], ['Tusla King', 's2'], ['Slow Horses', 's2'], ['The Night of', 'r'], ["The Devil's Hour"], ['The Fall of the House of Usher', 'w'], ['Banshee', 'w'], ['The Night Manager', 'w'], ['Fall Out'], ['Paradise']],
  },
  {
    category: 'Crime, Power & Underworld Stories',
    items: [['Narcos', 'r'], ['Top Boy'], ['Power'], ['Bandidos'], ['Sons of Anarchy'], ['The Blacklist'], ['Yellowstone'], ['The Wire']],
  },
  {
    category: 'Anthology Crime & Offbeat Mystery',
    items: [['Fargo']],
  },
  {
    category: 'Fantasy, Sci-Fi & Supernatural Worlds',
    items: [['Doctor Who', 'r'], ['Misfits'], ["The Handmaid's Tale", 'w'], ['The Expanse'], ['Teen Wolf'], ['The Originals'], ['Legacies'], ['The Vampire Diaries'], ['Merlin'], ['Into the Badlands'], ['Iron Fist']],
  },  {
    category: 'War, History & Political Conflict',
    items: [['Chernobyl', 'w'], ['The Last Kingdom', 'w'], ['Lioness']],
  },
  {
    category: 'Action, Adventure & Survival',
    items: [['Outer Banks'], ['Army of Thieves'], ['Road House'], ['Reacher']],
  },
  {
    category: 'Dark Heroes, Vigilantes & Comic Crime',
    items: [['Gotham'], ['The Penguin']],
  },
  {
    category: 'Reality, Entertainment & Motoring',
    items: [['Top Gear', 's1']],
  },
  {
    category: 'Procedural, Detective & Legal Cases',
    items: [['Blue Bloods'], ['Bates Motel'], ['White Collar'], ['Castle'], ['Lie to Me'], ['Mindhunter'], ['True Detective']],
  },
  {
    category: 'Power, Business & Institutional Drama',
    items: [['Succession', 'r'], ['The Good Doctor', 'w']],
  },
  {
    category: 'International Mystery & Espionage',
    items: [['Berlin', 'w']],
  },
] satisfies Array<{ category: string; items: ItemSeed[] }>;

const rawEntries = [...buildEntries('movie', movieSections), ...buildEntries('series', seriesSections)];
const categoryNames = Array.from(new Set(rawEntries.map((entry) => entry.category)));
const categorySeeds = categoryNames.map((name, index) => ({ name, color: palette[index % palette.length], group: null }));

const normalizeTitle = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

const consolidatedMedia = Array.from(
  rawEntries.reduce((map, entry) => {
    const key = `${entry.type}:${normalizeTitle(entry.title)}`;
    const existing = map.get(key) as ConsolidatedEntry | undefined;

    if (existing) {
      existing.categoryNames = Array.from(new Set([...existing.categoryNames, entry.category]));
      existing.selectionCount = Math.max(existing.selectionCount, entry.selectionCount);

      if (existing.status === 'planned' && entry.status !== 'planned') {
        existing.status = entry.status;
        existing.liked = entry.liked;
      }

      return map;
    }

    map.set(key, {
      ...entry,
      rating: null,
      categoryNames: [entry.category],
      notes: null,
      releaseYear: null,
      posterUrl: null,
      totalSeasons: null,
      totalEpisodes: null,
      currentSeason: null,
      currentEpisode: null,
    } satisfies ConsolidatedEntry);

    return map;
  }, new Map<string, ConsolidatedEntry>()).values()
);

const summarize = (entries: ConsolidatedEntry[]) => ({
  totalCategories: categorySeeds.length,
  totalMedia: entries.length,
  movies: entries.filter((entry) => entry.type === 'movie').length,
  series: entries.filter((entry) => entry.type === 'series').length,
  watched: entries.filter((entry) => entry.status === 'completed' && entry.liked === true).length,
  reviewedButNotWatched: entries.filter((entry) => entry.status === 'reviewed').length,
  selectedOnce: entries.filter((entry) => entry.status === 'planned' && entry.selectionCount === 1).length,
  selectedTwice: entries.filter((entry) => entry.status === 'planned' && entry.selectionCount === 2).length,
  waitingList: entries.filter((entry) => entry.status === 'planned' && entry.selectionCount === 0).length,
});

const run = async () => {
  await connectToDatabase();

  await MediaItemModel.deleteMany({});
  await CategoryModel.deleteMany({});
  await CategoryGroupModel.deleteMany({});

  const categories = await CategoryModel.insertMany(categorySeeds);
  const categoryMap = new Map(categories.map((category) => [category.name, category._id]));

  await MediaItemModel.insertMany(
    consolidatedMedia.map((item) => ({
      title: item.title,
      type: item.type,
      status: item.status,
      rating: item.rating,
      liked: item.liked,
      selectionCount: item.status === 'planned' ? item.selectionCount : 0,
      notes: item.notes,
      releaseYear: item.releaseYear,
      posterUrl: item.posterUrl,
      totalSeasons: item.totalSeasons,
      totalEpisodes: item.totalEpisodes,
      currentSeason: item.currentSeason,
      currentEpisode: item.currentEpisode,
      categories: item.categoryNames.map((name) => categoryMap.get(name)).filter((value): value is NonNullable<typeof value> => Boolean(value)),
    }))
  );

  const summary = summarize(consolidatedMedia);
  console.log(`Seeded ${summary.totalCategories} categories, ${summary.movies} movies, and ${summary.series} series.`);
  console.log(`Watched: ${summary.watched}`);
  console.log(`Reviewed: ${summary.reviewedButNotWatched}`);
  console.log(`Selected once: ${summary.selectedOnce}`);
  console.log(`Selected twice: ${summary.selectedTwice}`);
  console.log(`Waiting list: ${summary.waitingList}`);
  process.exit(0);
};

void run();