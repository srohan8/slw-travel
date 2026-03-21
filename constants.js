// ================================================================
// CONSTANTS — slwtravel.com
// ================================================================

const SUPABASE_URL  = 'https://xhbgplwahgdmqomgyjuo.supabase.co';   // replace after creating project
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhoYmdwbHdhaGdkbXFvbWd5anVvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwNzQwMjIsImV4cCI6MjA4OTY1MDAyMn0.7K5_k7iKiUMuHB9Dl60TKxp21J0c4MygYbekAqCfHTw';

const PROXY_URL = 'YOUR_RAILWAY_PROXY_URL';   // replace after deploying proxy

const ADMIN_PASSWORD = 'YOUR_ADMIN_PASSWORD'; // replace with something strong

const PLANS = {
  free: {
    routePlans:     3,
    flightSearches: 3,
    savedTrips:     1,
    shareTrip:      false,
  },
  pro: {
    routePlans:     Infinity,
    flightSearches: Infinity,
    savedTrips:     Infinity,
    shareTrip:      true,
  }
};

// Transport modes used across the app
const MODES = ['bus','train','hitchhike','ferry','walk','cycle','taxi','flight','shared taxi'];
const MODE_LABELS = {
  bus:'Bus', train:'Train', hitchhike:'Hitch', ferry:'Ferry',
  walk:'Walk', cycle:'Cycle', taxi:'Taxi', flight:'Flight', 'shared taxi':'S.Taxi'
};

// Quick-avoid regions shown as pills in the flights tab
const AVOID_REGIONS = [
  'Middle East',
  'Russia / Belarus airspace',
  'Ukraine airspace',
  'Iran',
  'Pakistan',
  'Afghanistan',
  'Sudan / Horn of Africa',
  'Myanmar',
];

export {
  SUPABASE_URL, SUPABASE_ANON, PROXY_URL, ADMIN_PASSWORD,
  PLANS, MODES, MODE_LABELS, AVOID_REGIONS
};
