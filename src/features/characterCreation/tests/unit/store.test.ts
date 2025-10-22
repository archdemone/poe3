import { describe, it, expect } from 'vitest'
import { CreatorStore } from '../../state'
import type { ClassDef, AscendancyDef } from '../../types'

const classes: ClassDef[] = [
  {
    id: 'sentinel', displayName: 'Sentinel',
    affinity: { str: 32, dex: 14, int: 14 },
    startingStats: { strength: 20, dexterity: 10, intelligence: 10, hp: 100, maxHp: 100, mp: 50, maxMp: 50, armor: 10, evasion: 5 },
    allowedAscendancies: ['warden'], saveClass: 'warrior'
  }
]
const ascendancies: AscendancyDef[] = [
  { id: 'warden', classId: 'sentinel', displayName: 'Warden', shortDescription: 'defense', creationBonuses: { hp_flat: 30, str: 4 } }
]

describe('CreatorStore', () => {
  it('filters ascendancies by selected class and derives stats', () => {
    const store = new CreatorStore(classes, ascendancies)
    store.setClass('sentinel')
    const list = store.getFilteredAscendancies()
    expect(list.map(a => a.id)).toEqual(['warden'])
    store.setAscendancy('warden')
    const stats = store.getDerivedStats()!
    expect(stats.maxHp).toBe(130)
    expect(stats.strength).toBe(24)
  })

  it('validates required selections', () => {
    const store = new CreatorStore(classes, ascendancies)
    expect(store.isValid().valid).toBe(false)
    store.setName('A')
    expect(store.isValid().valid).toBe(false)
    store.setClass('sentinel')
    expect(store.isValid().valid).toBe(false)
    store.setAscendancy('warden')
    expect(store.isValid().valid).toBe(true)
  })
})
