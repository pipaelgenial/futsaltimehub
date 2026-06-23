// Mock data for futsal load hub - player time monitoring

export const INITIAL_PLAYERS = [
  { id: 1, number: 1, name: 'Bernardo Silva', position: 'GR' },
  { id: 2, number: 4, name: 'André Coelho', position: 'FIXO' },
  { id: 3, number: 7, name: 'Pany Varela', position: 'ALA' },
  { id: 4, number: 9, name: 'Zicky Té', position: 'PIVOT' },
  { id: 5, number: 10, name: 'Tiago Brito', position: 'ALA' },
  { id: 6, number: 5, name: 'Tomás Paçó', position: 'FIXO' },
  { id: 7, number: 8, name: 'Erick Mendonça', position: 'ALA' },
  { id: 8, number: 11, name: 'Afonso Jesus', position: 'PIVOT' },
  { id: 9, number: 14, name: 'Rocha', position: 'ALA' },
  { id: 10, number: 17, name: 'Miguel Ângelo', position: 'GR' },
  { id: 11, number: 6, name: 'Robinho', position: 'ALA' },
  { id: 12, number: 13, name: 'Diogo Santos', position: 'FIXO' },
];

// First 5 are starters (on court), rest are on bench
export const STARTING_LINEUP_IDS = [1, 2, 3, 4, 5];

export const TEAM_INFO = {
  homeTeam: 'SPORTING CP',
  awayTeam: 'BENFICA',
  matchday: 'JORNADA 14',
  competition: 'LIGA PLACARD',
  venue: 'PAVILHÃO JOÃO ROCHA',
  date: '23/06/2026',
};

export const MATCH_DURATION = 20 * 60; // 20 minutes per half in seconds
