import { test, expect } from '@playwright/test'

// Runs only when the feature flag is on
const url = 'http://localhost:5173/?poeCreator=1'

test('PoE-style creator happy path', async ({ page }) => {
  await page.goto(url)

  // Main menu -> New Game
  await page.waitForSelector('.main-menu')
  await page.getByRole('button', { name: 'New Game' }).click()

  await page.waitForSelector('#slot-picker-modal:not(.hidden)')
  await page.locator('.slot-item[data-slot="0"]').click()

  // Creator overlay visible
  await page.waitForSelector('#poe-creator', { timeout: 10000 })

  // Select class and ascendancy
  const classTiles = page.locator('#class-grid .tile')
  await classTiles.first().click()
  const ascTiles = page.locator('#asc-grid .tile')
  await ascTiles.first().click()

  // Enter name
  await page.fill('#creator-name', 'Tester')

  // Confirm enabled
  const confirm = page.locator('#creator-confirm')
  await expect(confirm).toBeEnabled()
  await confirm.click()

  // Arrives in hideout (skill bar exists) and canvas present
  await page.waitForSelector('#skill-bar', { timeout: 10000 })
  const canvas = await page.$('#renderCanvas')
  expect(canvas).toBeTruthy()
})
