import { Sign } from './types';

export interface PrecinctInfo {
  id: string;
  code: string;
  name: string;
  pollingPlace: string;
  pollingAddress: string;
  registeredVoters: number;
  historicTurnoutPct: number;      // Municipal election average %
  presidentialTurnoutPct: number;  // General presidential cycle %
  historicalVotesCast: number;     // Recent municipal votes cast
  earlyVotingRatio: number;        // % of votes cast early / absentee
  center: [number, number];        // [lng, lat]
  color: string;
  priority: 'High Impact' | 'Stronghold' | 'Swing Zone' | 'Mobilization Target';
  corridorFocus: string;
  description: string;
}

export const BRISTOL_PRECINCTS: PrecinctInfo[] = [
  {
    id: 'precinct-2b',
    code: '2B',
    name: 'Precinct 2B – Holston View',
    pollingPlace: 'Holston View School',
    pollingAddress: '1840 King College Rd, Bristol, TN 37620',
    registeredVoters: 4180,
    historicTurnoutPct: 38.2,
    presidentialTurnoutPct: 71.8,
    historicalVotesCast: 1597,
    earlyVotingRatio: 62.4,
    center: [-82.1550, 36.5910],
    color: '#10b981', // Emerald (Highest Municipal Turnout)
    priority: 'Stronghold',
    corridorFocus: 'King College Rd & US-11/19',
    description: 'Highest historical voting rate in municipal races. King University, Holston View, and Country Club residential core.',
  },
  {
    id: 'precinct-2c',
    code: '2C',
    name: 'Precinct 2C – Avoca',
    pollingPlace: 'Avoca School',
    pollingAddress: '2440 Volunteer Pkwy, Bristol, TN 37620',
    registeredVoters: 4650,
    historicTurnoutPct: 34.5,
    presidentialTurnoutPct: 68.9,
    historicalVotesCast: 1604,
    earlyVotingRatio: 58.1,
    center: [-82.1950, 36.5660],
    color: '#059669', // Emerald
    priority: 'High Impact',
    corridorFocus: 'Volunteer Pkwy (US-11W) & Bluff City Hwy',
    description: 'Largest active voter pool in Bristol TN. Key commercial and suburban density along the Volunteer Parkway corridor.',
  },
  {
    id: 'precinct-1a',
    code: '1A',
    name: 'Precinct 1A – South Holston',
    pollingPlace: 'South Holston Ruritan',
    pollingAddress: '415 Meadow Creek Rd, Bristol, TN 37620',
    registeredVoters: 3110,
    historicTurnoutPct: 31.4,
    presidentialTurnoutPct: 65.2,
    historicalVotesCast: 976,
    earlyVotingRatio: 54.0,
    center: [-82.1380, 36.5500],
    color: '#38bdf8', // Sky
    priority: 'Swing Zone',
    corridorFocus: 'Weaver Pike & South Holston Lake Approach',
    description: 'Southeast Bristol commuter artery with active civic participation and high sign visibility along two-lane arterials.',
  },
  {
    id: 'precinct-4a',
    code: '4A',
    name: 'Precinct 4A – Blountville / West',
    pollingPlace: 'Sullivan County Offices',
    pollingAddress: '3258 Hwy 126, Blountville, TN 37617',
    registeredVoters: 3850,
    historicTurnoutPct: 29.8,
    presidentialTurnoutPct: 64.0,
    historicalVotesCast: 1147,
    earlyVotingRatio: 52.8,
    center: [-82.2450, 36.5600],
    color: '#8b5cf6', // Purple
    priority: 'Swing Zone',
    corridorFocus: 'Highway 126 & Airport Bypass',
    description: 'Southwestern connector corridor joining Bristol with county offices, commercial logistics, and Tri-Cities commuters.',
  },
  {
    id: 'precinct-2a',
    code: '2A',
    name: 'Precinct 2A – Slater Center',
    pollingPlace: 'Slater Community Center',
    pollingAddress: '325 McDowell St, Bristol, TN 37620',
    registeredVoters: 3420,
    historicTurnoutPct: 28.6,
    presidentialTurnoutPct: 61.4,
    historicalVotesCast: 978,
    earlyVotingRatio: 49.3,
    center: [-82.1850, 36.5910],
    color: '#0284c7', // Sky blue
    priority: 'High Impact',
    corridorFocus: 'State Street Historic Core & MLK Jr Blvd',
    description: 'Downtown commercial corridor and central historic neighborhoods. Crucial foot-traffic and small business visibility.',
  },
  {
    id: 'precinct-3a',
    code: '3A',
    name: 'Precinct 3A – Anderson',
    pollingPlace: 'Anderson School',
    pollingAddress: '901 9th St, Bristol, TN 37620',
    registeredVoters: 2940,
    historicTurnoutPct: 24.1,
    presidentialTurnoutPct: 56.3,
    historicalVotesCast: 708,
    earlyVotingRatio: 46.5,
    center: [-82.2220, 36.5855],
    color: '#f59e0b', // Amber (Mobilization target)
    priority: 'Mobilization Target',
    corridorFocus: '9th & 11th Street / West State Street',
    description: 'Western commercial gateway and neighborhood grid around Anderson Elementary. Highest upside for targeted turnout mobilization and yard sign presence.',
  },
];

// GeoJSON FeatureCollection defining Bristol precinct polygon boundaries
export const BRISTOL_PRECINCTS_GEOJSON = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      id: '2B',
      properties: {
        id: 'precinct-2b',
        code: '2B',
        name: 'Precinct 2B – Holston View',
        pollingPlace: 'Holston View School',
        turnout: 38.2,
        presTurnout: 71.8,
        registered: 4180,
        color: '#10b981',
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [-82.1760, 36.5970],
            [-82.1380, 36.6040],
            [-82.1350, 36.5820],
            [-82.1650, 36.5780],
            [-82.1760, 36.5860],
            [-82.1760, 36.5970],
          ],
        ],
      },
    },
    {
      type: 'Feature',
      id: '2C',
      properties: {
        id: 'precinct-2c',
        code: '2C',
        name: 'Precinct 2C – Avoca',
        pollingPlace: 'Avoca School',
        turnout: 34.5,
        presTurnout: 68.9,
        registered: 4650,
        color: '#059669',
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [-82.2150, 36.5820],
            [-82.1950, 36.5850],
            [-82.1650, 36.5780],
            [-82.1650, 36.5500],
            [-82.2050, 36.5450],
            [-82.2300, 36.5600],
            [-82.2150, 36.5820],
          ],
        ],
      },
    },
    {
      type: 'Feature',
      id: '1A',
      properties: {
        id: 'precinct-1a',
        code: '1A',
        name: 'Precinct 1A – South Holston',
        pollingPlace: 'South Holston Ruritan',
        turnout: 31.4,
        presTurnout: 65.2,
        registered: 3110,
        color: '#38bdf8',
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [-82.1650, 36.5780],
            [-82.1350, 36.5820],
            [-82.1000, 36.5350],
            [-82.1350, 36.5200],
            [-82.1650, 36.5500],
            [-82.1650, 36.5780],
          ],
        ],
      },
    },
    {
      type: 'Feature',
      id: '4A',
      properties: {
        id: 'precinct-4a',
        code: '4A',
        name: 'Precinct 4A – Blountville / West',
        pollingPlace: 'Sullivan County Offices',
        turnout: 29.8,
        presTurnout: 64.0,
        registered: 3850,
        color: '#8b5cf6',
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [-82.2500, 36.5850],
            [-82.2380, 36.5750],
            [-82.2300, 36.5600],
            [-82.2050, 36.5450],
            [-82.2450, 36.5300],
            [-82.2750, 36.5550],
            [-82.2500, 36.5850],
          ],
        ],
      },
    },
    {
      type: 'Feature',
      id: '2A',
      properties: {
        id: 'precinct-2a',
        code: '2A',
        name: 'Precinct 2A – Slater Center',
        pollingPlace: 'Slater Community Center',
        turnout: 28.6,
        presTurnout: 61.4,
        registered: 3420,
        color: '#0284c7',
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [-82.1940, 36.5910],
            [-82.1920, 36.5960],
            [-82.1760, 36.5970],
            [-82.1760, 36.5860],
            [-82.1850, 36.5850],
            [-82.1940, 36.5850],
            [-82.1940, 36.5910],
          ],
        ],
      },
    },
    {
      type: 'Feature',
      id: '3A',
      properties: {
        id: 'precinct-3a',
        code: '3A',
        name: 'Precinct 3A – Anderson',
        pollingPlace: 'Anderson School',
        turnout: 24.1,
        presTurnout: 56.3,
        registered: 2940,
        color: '#f59e0b',
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [-82.2500, 36.5920],
            [-82.1920, 36.5960],
            [-82.1940, 36.5910],
            [-82.1940, 36.5850],
            [-82.2050, 36.5820],
            [-82.2380, 36.5750],
            [-82.2500, 36.5850],
            [-82.2500, 36.5920],
          ],
        ],
      },
    },
  ],
};

// Bounding box encompassing all 6 Bristol precincts (1A, 2A, 2B, 2C, 3A, 4A)
export const BRISTOL_ALL_PRECINCTS_BOUNDS: [[number, number], [number, number]] = [
  [-82.285, 36.515], // Southwest [lng, lat]
  [-82.090, 36.610], // Northeast [lng, lat]
];

// Geographic center covering all 6 Bristol precincts
export const BRISTOL_ALL_PRECINCTS_CENTER: [number, number] = [-82.1875, 36.5625];

/**
 * Standard ray-casting algorithm to test if [lng, lat] point is inside polygon
 */
export function isPointInPolygon(point: [number, number], polygonCoords: [number, number][]): boolean {
  const [x, y] = point;
  let inside = false;
  for (let i = 0, j = polygonCoords.length - 1; i < polygonCoords.length; j = i++) {
    const [xi, yi] = polygonCoords[i];
    const [xj, yj] = polygonCoords[j];
    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Compute campaign sign counts and coverage density for each precinct
 */
export function calculatePrecinctStats(precinct: PrecinctInfo, signs: Sign[]) {
  const feature = BRISTOL_PRECINCTS_GEOJSON.features.find((f) => f.properties.code === precinct.code);
  const polygon = feature?.geometry.coordinates[0] as [number, number][] | undefined;

  let totalSigns = 0;
  let ourSigns = 0;
  let theirSigns = 0;

  if (polygon) {
    signs.forEach((s) => {
      const isInside = isPointInPolygon([Number(s.longitude), Number(s.latitude)], polygon);
      if (isInside) {
        totalSigns++;
        if (s.is_competitor) theirSigns++;
        else ourSigns++;
      }
    });
  }

  const signsPer1kVoters = precinct.registeredVoters > 0
    ? Number(((ourSigns / precinct.registeredVoters) * 1000).toFixed(2))
    : 0;

  return {
    totalSigns,
    ourSigns,
    theirSigns,
    signsPer1kVoters,
  };
}
