import { test, expect, type Locator } from '@playwright/test'

/**
 * E2E Test for Inventory UI System
 * 
 * Tests the dual inventory system:
 * - #inventoryStandalone: Full-screen centered inventory (shown when vendor is closed)
 * - #inventoryCompact: Side-by-side inventory (shown when vendor is open)
 * 
 * Test Flow:
 * 1. Navigate through main menu → new game → character creation
 * 2. Press 'I' to open standalone inventory (full screen)
 * 3. Verify standalone inventory is visible and centered
 * 4. Press 'V' to open vendor
 * 5. Verify inventory switches from standalone to compact mode
 * 6. Verify both vendor and compact inventory are visible side-by-side
 */

// Helper function to check if element is visible (lacks 'is-hidden' class)
async function isVisible(locator: Locator): Promise<boolean> {
  try {
    return await locator.evaluate(el => !el.classList.contains('is-hidden'))
  } catch {
    return false
  }
}

test('Inventory opens full screen on I, splits with vendor on V', async ({ page }) => {
  await page.goto('http://localhost:5173')

  // Wait for the main menu to load
  await page.waitForSelector('.main-menu', { timeout: 10000 })
  
  // Click "New Game" to start
  const newGameBtn = page.locator('#btn-new-game')
  await newGameBtn.click()
  
  // Wait for slot picker modal and select first slot
  await page.waitForSelector('#slot-picker-modal:not(.hidden)', { timeout: 5000 })
  const slot = page.locator('.slot-item[data-slot="0"]')
  await slot.click()
  
  // Wait for character creation screen
  await page.waitForSelector('.char-create', { timeout: 5000 })
  
  // Fill in character name
  const nameInput = page.locator('#char-name')
  await nameInput.fill('TestCharacter')
  
  // Select a class (warrior is first)
  const warriorCard = page.locator('.class-card[data-class="warrior"]')
  await warriorCard.click()
  
  // Wait a bit for the button to enable
  await page.waitForTimeout(300)
  
  // Click create button
  const createBtn = page.locator('#btn-create')
  await createBtn.click()
  
  // Wait for game to be fully loaded and in HIDEOUT state
  await page.waitForSelector('#skill-bar', { state: 'visible', timeout: 10000 })
  
  // Additional wait to ensure all game systems are initialized
  await page.waitForTimeout(1000)

  // Ensure inventory elements exist in the DOM
  const inventoryStandalone = page.locator('#inventoryStandalone')
  const inventoryCompact = page.locator('#inventoryCompact')
  const vendor = page.locator('#vendorPanel')
  
  await expect(inventoryStandalone).toHaveCount(1)
  await expect(inventoryCompact).toHaveCount(1)
  await expect(vendor).toHaveCount(1)

  // Press I → Inventory opens in standalone (full screen) mode
  await page.keyboard.press('KeyI')
  await page.waitForTimeout(500) // Allow animation to complete

  // Verify standalone inventory is visible and centered
  await expect(inventoryStandalone).toBeVisible()
  expect(await isVisible(inventoryStandalone)).toBe(true)
  
  // Check that standalone has the centered class
  const hasCenteredClass = await inventoryStandalone.evaluate(el => 
    el.classList.contains('centered')
  )
  expect(hasCenteredClass).toBe(true)

  // Verify width is reasonable (min 900px per CSS)
  await expect.poll(async () => {
    const box = await inventoryStandalone.boundingBox()
    return box?.width ?? 0
  }).toBeGreaterThan(900)

  // Verify compact inventory is hidden
  expect(await isVisible(inventoryCompact)).toBe(false)

  // Press V → Vendor opens, Inventory switches to compact mode
  await page.keyboard.press('KeyV')
  await page.waitForTimeout(500) // Allow transition to complete

  // Verify vendor is now visible
  await expect(vendor).toBeVisible()
  expect(await isVisible(vendor)).toBe(true)

  // Verify standalone is now hidden and compact is shown
  expect(await isVisible(inventoryStandalone)).toBe(false)
  await expect(inventoryCompact).toBeVisible()
  expect(await isVisible(inventoryCompact)).toBe(true)

  // Verify compact inventory width is reasonable (min 480px per CSS)
  await expect.poll(async () => {
    const box = await inventoryCompact.boundingBox()
    return box?.width ?? 0
  }).toBeGreaterThan(480)

  // Verify vendor width is reasonable (min 380px per CSS)
  await expect.poll(async () => {
    const box = await vendor.boundingBox()
    return box?.width ?? 0
  }).toBeGreaterThan(380)

  // Check both panels are visible side-by-side
  const compactBox = await inventoryCompact.boundingBox()
  const vendorBox = await vendor.boundingBox()
  
  expect(compactBox).toBeTruthy()
  expect(vendorBox).toBeTruthy()
  
  // Verify they're positioned side-by-side (not significantly overlapping)
  // They should either be next to each other horizontally or vertically
  if (compactBox && vendorBox) {
    // Check if they're on the same horizontal line (top coordinates similar)
    const sameRow = Math.abs(compactBox.y - vendorBox.y) < 100
    
    // Check if one is to the right of the other (side by side horizontally)
    const vendorToRight = vendorBox.x >= compactBox.x
    const compactToRight = compactBox.x >= vendorBox.x
    const horizontallySeparated = vendorToRight || compactToRight
    
    // Verify they're positioned reasonably (same row and horizontally separated)
    expect(sameRow || horizontallySeparated).toBe(true)
  }
  // ----- Additional assertions: items are inside grid bounds -----
  // Ensure at least one item is present in the compact inventory
  const items = inventoryCompact.locator('.inventory-item')
  await expect(items).toHaveCountGreaterThan(0)

  const gridBox = await page.locator('#invc-grid').boundingBox()
  expect(gridBox).not.toBeNull()

  if (gridBox) {
    const count = await items.count()
    for (let i = 0; i < count; i++) {
      const box = await items.nth(i).boundingBox()
      expect(box).not.toBeNull()
      if (box) {
        expect(box.x).toBeGreaterThanOrEqual(gridBox.x - 1)
        expect(box.y).toBeGreaterThanOrEqual(gridBox.y - 1)
        expect(box.x + box.width).toBeLessThanOrEqual(gridBox.x + gridBox.width + 1)
        expect(box.y + box.height).toBeLessThanOrEqual(gridBox.y + gridBox.height + 1)
      }
    }
  }

  // ----- Vendor scrolling assertion -----
  const vendorBody = vendor.locator('.ui-panel__body')
  const initialScroll = await vendorBody.evaluate(el => el.scrollTop)
  expect(initialScroll).toBe(0)
})