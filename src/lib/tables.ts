export interface Table {
  id: string;
  name: string;
  url: string;
  tier: 'classic' | 'legendary';
  previewColor: string;
  glowColor?: string;
}

export const TABLES: Table[] = [
  {
    id: 'oak',
    name: 'Classic Oak',
    url: 'https://images.pexels.com/photos/172289/pexels-photo-172289.jpeg?auto=compress&cs=tinysrgb&w=800',
    tier: 'classic',
    previewColor: '#c8a97e',
  },
  {
    id: 'walnut',
    name: 'Dark Walnut',
    url: 'https://images.pexels.com/photos/4709011/pexels-photo-4709011.jpeg?auto=compress&cs=tinysrgb&w=800',
    tier: 'classic',
    previewColor: '#5c3d2e',
  },
  {
    id: 'barnwood',
    name: 'Rustic Barnwood',
    url: 'https://images.pexels.com/photos/129733/pexels-photo-129733.jpeg?auto=compress&cs=tinysrgb&w=800',
    tier: 'classic',
    previewColor: '#8d7b6a',
  },
  {
    id: 'cherry',
    name: 'Cherry Wood',
    url: 'https://images.pexels.com/photos/168442/pexels-photo-168442.jpeg?auto=compress&cs=tinysrgb&w=800',
    tier: 'classic',
    previewColor: '#a0522d',
  },
  {
    id: 'blackwood',
    name: 'Black Stained',
    url: 'https://images.pexels.com/photos/326311/pexels-photo-326311.jpeg?auto=compress&cs=tinysrgb&w=800',
    tier: 'classic',
    previewColor: '#2c2c2c',
  },
  {
    id: 'lava',
    name: 'Lava Obsidian',
    url: 'https://images.pexels.com/photos/7267852/pexels-photo-7267852.jpeg?auto=compress&cs=tinysrgb&w=800',
    tier: 'legendary',
    previewColor: '#1a0a00',
    glowColor: '#ff4500',
  },
  {
    id: 'galaxy',
    name: 'Galaxy Resin',
    url: 'https://images.pexels.com/photos/9904249/pexels-photo-9904249.jpeg?auto=compress&cs=tinysrgb&w=800',
    tier: 'legendary',
    previewColor: '#0d0820',
    glowColor: '#7c3aed',
  },
  {
    id: 'crystal',
    name: 'Crystal Epoxy',
    url: 'https://images.pexels.com/photos/4558572/pexels-photo-4558572.jpeg?auto=compress&cs=tinysrgb&w=800',
    tier: 'legendary',
    previewColor: '#b8d8e8',
    glowColor: '#60c8f0',
  },
  {
    id: 'frost',
    name: 'Frost Enchanted',
    url: 'https://images.pexels.com/photos/12166061/pexels-photo-12166061.jpeg?auto=compress&cs=tinysrgb&w=800',
    tier: 'legendary',
    previewColor: '#1c2e40',
    glowColor: '#a8e0ff',
  },
  {
    id: 'arcane',
    name: 'Arcane Runes',
    url: 'https://images.pexels.com/photos/3607542/pexels-photo-3607542.jpeg?auto=compress&cs=tinysrgb&w=800',
    tier: 'legendary',
    previewColor: '#1a0d2e',
    glowColor: '#8b5cf6',
  },
  {
    id: 'living',
    name: 'Living Wood',
    url: 'https://images.pexels.com/photos/113848/pexels-photo-113848.jpeg?auto=compress&cs=tinysrgb&w=800',
    tier: 'legendary',
    previewColor: '#0d1f0d',
    glowColor: '#22c55e',
  },
];

export const CLASSIC_TABLES = TABLES.filter(t => t.tier === 'classic');
export const LEGENDARY_TABLES = TABLES.filter(t => t.tier === 'legendary');

export const DEFAULT_TABLE_ID = 'oak';

export function getTable(id: string): Table {
  return TABLES.find(t => t.id === id) ?? TABLES[0];
}
