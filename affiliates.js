// ================================================================
// AFFILIATE CONFIG — slwtravel.com
// All affiliate IDs live here. Swap an ID, every link updates.
// ================================================================

const AFFILIATES = {

  flights: {
    skyscanner: {
      name: 'Skyscanner',
      affiliateId: '',  // AFFILIATE_SKYSCANNER_ID
      buildUrl: (orig, dest, month) => {
        const base = 'https://www.skyscanner.net/transport/flights';
        const d = month ? month.replace('-','') : 'anytime';
        return `${base}/${orig.toLowerCase()}/${dest.toLowerCase()}/${d}/`;
      }
    },
    kayak: {
      name: 'Kayak',
      affiliateId: '',  // AFFILIATE_KAYAK_ID
      buildUrl: (orig, dest, month) => {
        const d = month ? month.replace('-','-01') : '';
        return `https://www.kayak.com/flights/${orig}-${dest}/${d}`;
      }
    },
    googleFlights: {
      name: 'Google Flights',
      affiliateId: '',  // AFFILIATE_GOOGLE_FLIGHTS
      buildUrl: (orig, dest, month) => {
        return `https://www.google.com/travel/flights?q=Flights+from+${encodeURIComponent(orig)}+to+${encodeURIComponent(dest)}`;
      }
    },
    momondo: {
      name: 'Momondo',
      affiliateId: '',  // AFFILIATE_MOMONDO_AID
      buildUrl: (orig, dest, month) => {
        return `https://www.momondo.com/flight-search/${encodeURIComponent(orig)}-${encodeURIComponent(dest)}`;
      }
    }
  },

  buses: {
    busbud: {
      name: 'Busbud',
      affiliateId: '',  // AFFILIATE_BUSBUD_ID
      buildUrl: (orig, dest) => {
        return `https://www.busbud.com/en/bus-${encodeURIComponent(orig.toLowerCase())}-${encodeURIComponent(dest.toLowerCase())}`;
      }
    },
    bookaway: {
      name: 'Bookaway',
      affiliateId: '',  // AFFILIATE_BOOKAWAY_ID
      buildUrl: (orig, dest) => {
        return `https://www.bookaway.com/search?srcName=${encodeURIComponent(orig)}&dstName=${encodeURIComponent(dest)}`;
      }
    },
    '12go': {
      name: '12Go Asia',
      affiliateId: '',  // AFFILIATE_12GO_ID
      buildUrl: (orig, dest) => {
        return `https://12go.asia/en/travel/${encodeURIComponent(orig.toLowerCase())}/${encodeURIComponent(dest.toLowerCase())}`;
      }
    },
    omio: {
      name: 'Omio',
      affiliateId: '',  // AFFILIATE_OMIO_ID
      buildUrl: (orig, dest) => {
        return `https://www.omio.com/app/search-results?origin=${encodeURIComponent(orig)}&destination=${encodeURIComponent(dest)}`;
      }
    }
  },

  trains: {
    omio: {
      name: 'Omio',
      affiliateId: '',  // AFFILIATE_OMIO_ID (shared with buses)
      buildUrl: (orig, dest) => {
        return `https://www.omio.com/app/search-results?origin=${encodeURIComponent(orig)}&destination=${encodeURIComponent(dest)}&transportType=train`;
      }
    },
    raileurope: {
      name: 'Rail Europe',
      affiliateId: '',  // AFFILIATE_RAILEUROPE_ID
      buildUrl: (orig, dest) => {
        return `https://www.raileurope.com/en/search#from=${encodeURIComponent(orig)}&to=${encodeURIComponent(dest)}`;
      }
    }
  },

  ferries: {
    directferries: {
      name: 'Direct Ferries',
      affiliateId: '',  // AFFILIATE_DIRECTFERRIES_ID
      buildUrl: (orig, dest) => {
        return `https://www.directferries.com/ferry_${encodeURIComponent(orig.toLowerCase())}_${encodeURIComponent(dest.toLowerCase())}.htm`;
      }
    }
  },

  accommodation: {
    hostelworld: {
      name: 'Hostelworld',
      affiliateId: '',  // AFFILIATE_HOSTELWORLD_ID
      buildUrl: (city) => {
        return `https://www.hostelworld.com/findabed.php/ChosenCity.${encodeURIComponent(city)}`;
      }
    },
    booking: {
      name: 'Booking.com',
      affiliateId: '',  // AFFILIATE_BOOKING_AID
      buildUrl: (city) => {
        return `https://www.booking.com/search.html?ss=${encodeURIComponent(city)}`;
      }
    }
  },

  insurance: {
    worldnomads: {
      name: 'World Nomads',
      affiliateId: '',  // AFFILIATE_WORLDNOMADS_ID
      buildUrl: () => {
        return `https://www.worldnomads.com/travel-insurance`;
      }
    }
  }
};

// Helper — build search links for a transport leg
function getTransportLinks(mode, orig, dest) {
  const links = [];
  if (mode === 'flight') {
    Object.values(AFFILIATES.flights).forEach(s => links.push({ name: s.name, url: s.buildUrl(orig, dest) }));
  } else if (mode === 'bus' || mode === 'shared taxi') {
    Object.values(AFFILIATES.buses).forEach(s => links.push({ name: s.name, url: s.buildUrl(orig, dest) }));
  } else if (mode === 'train') {
    Object.values(AFFILIATES.trains).forEach(s => links.push({ name: s.name, url: s.buildUrl(orig, dest) }));
  } else if (mode === 'ferry') {
    Object.values(AFFILIATES.ferries).forEach(s => links.push({ name: s.name, url: s.buildUrl(orig, dest) }));
  }
  return links;
}

function getAccommodationLinks(city) {
  return Object.values(AFFILIATES.accommodation).map(s => ({ name: s.name, url: s.buildUrl(city) }));
}

function getFlightLinks(orig, dest, month) {
  return Object.values(AFFILIATES.flights).map(s => ({ name: s.name, url: s.buildUrl(orig, dest, month) }));
}

export { AFFILIATES, getTransportLinks, getAccommodationLinks, getFlightLinks };
