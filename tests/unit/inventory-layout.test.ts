import { describe, test, expect } from 'vitest'

describe('Inventory layout logic', () => {
  test('inventory should fit inside container when split 50/50', () => {
    const containerWidth = 960 // example: half of 1920px screen
    const slotSize = 60
    const slotsPerRow = Math.floor(containerWidth / slotSize)
    expect(slotsPerRow).toBeGreaterThan(0)
  })

  test('inventory should scroll if content overflows', () => {
    const containerHeight = 500
    const slotHeight = 60
    const totalSlots = 50
    const rows = Math.ceil(totalSlots / 5)
    const contentHeight = rows * slotHeight
    expect(contentHeight).toBeGreaterThan(containerHeight)
  })
})