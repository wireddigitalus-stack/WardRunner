export interface CityFactData {
  name: string;
  shortName: string;
  state: string;
  county: string;
  slogan: string;
  established: number;
  population: number;
  registeredVoters: number;
  landAreaSqMi: number;
  elevationFt: number;
  governmentType: string;
  councilStructure: string;
  historicTurnoutPct: number;
  presidentialTurnoutPct: number;
  cityHall: {
    address: string;
    phone: string;
    hours: string;
    lat: number;
    lng: number;
  };
  electionCommission: {
    name: string;
    address: string;
    phone: string;
    hours: string;
    lat: number;
    lng: number;
  };
  earlyVotingLocations: Array<{
    name: string;
    address: string;
  }>;
  keyCorridors: Array<{
    name: string;
    aadt: string;
    focus: string;
  }>;
  ordinances: Array<{
    title: string;
    rule: string;
    citation: string;
  }>;
  landmarks: string[];
}

export const BRISTOL_CITY_FACTS: CityFactData = {
  name: 'City of Bristol, Tennessee',
  shortName: 'Bristol, TN',
  state: 'Tennessee',
  county: 'Sullivan County',
  slogan: 'A Good Place to Live',
  established: 1856,
  population: 27147,
  registeredVoters: 22150,
  landAreaSqMi: 32.44,
  elevationFt: 1680,
  governmentType: 'Council-Manager',
  councilStructure: '5 City Council Members (Staggered 4-year terms; Council appoints Mayor)',
  historicTurnoutPct: 28.5,
  presidentialTurnoutPct: 67.2,
  cityHall: {
    address: '801 Anderson St, Bristol, TN 37620',
    phone: '(423) 989-5500',
    hours: 'Monday – Friday, 8:00 AM – 5:00 PM',
    lat: 36.5947,
    lng: -82.1843,
  },
  electionCommission: {
    name: 'Sullivan County Election Commission',
    address: '3258 Highway 126, Suite 108, Blountville, TN 37617',
    phone: '(423) 323-6440',
    hours: 'Monday – Friday, 8:00 AM – 4:30 PM',
    lat: 36.5361,
    lng: -82.3275,
  },
  earlyVotingLocations: [
    {
      name: 'Slater Community Center',
      address: '325 McDowell St, Bristol, TN 37620',
    },
    {
      name: 'Sullivan County Election Commission Office',
      address: '3258 Highway 126, Suite 108, Blountville, TN 37617',
    },
  ],
  keyCorridors: [
    {
      name: 'Volunteer Parkway (US-11W)',
      aadt: '28,400 daily vehicles',
      focus: 'Primary high-volume retail corridor & commuter spine.',
    },
    {
      name: 'West State Street (US-11E / US-19)',
      aadt: '22,100 daily vehicles',
      focus: 'Historic twin-city boundary dividing Tennessee and Virginia.',
    },
    {
      name: 'Lee Highway (US-11 / US-19)',
      aadt: '16,800 daily vehicles',
      focus: 'Northeastern commercial artery and automotive corridor.',
    },
    {
      name: 'Bluff City Highway',
      aadt: '14,200 daily vehicles',
      focus: 'Southern corridor linking Bristol to Bluff City and Johnson City.',
    },
  ],
  ordinances: [
    {
      title: 'Private Property Placement',
      rule: 'Campaign lawn signs and banners are permitted on private residential and commercial property with the express consent of the property owner. Recommended setback: 10 ft from the curb line.',
      citation: 'City of Bristol Code § 13-104',
    },
    {
      title: 'Public Right-of-Way Prohibition',
      rule: 'Signs are strictly prohibited on state and municipal rights-of-way, road medians, utility poles, traffic signal masts, and highway overpasses. Unauthorized signs are subject to removal.',
      citation: 'TDOT Policy & City Ord. § 13-105',
    },
    {
      title: '100-Foot Polling Place Buffer',
      rule: 'Tennessee state election code strictly bans all campaign signs, promotional wear, banners, and active voter solicitation within 100 feet of any polling place entrance on Election Day and during early voting.',
      citation: 'Tennessee Code Ann. § 2-7-111',
    },
    {
      title: 'Post-Election Removal Deadline',
      rule: 'All political campaign signage and supporting stakes/frames must be fully retrieved within 10 calendar days following the official certification of election results.',
      citation: 'Sullivan County / Bristol Municipal Code',
    },
  ],
  landmarks: [
    'Historic State Street Slogan Sign ("Bristol VA-TN — A Good Place to Live")',
    'Bristol Motor Speedway ("The Last Great Colosseum")',
    'Birthplace of Country Music Museum (1927 Bristol Sessions)',
    'Steele Creek Park & Nature Center (2,200+ municipal acres)',
    'Paramount Center for the Arts (Historic 1931 Theater)',
  ],
};
