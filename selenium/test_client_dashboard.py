"""
Simple Selenium script to navigate from landing page to login page.
Browser: Microsoft Edge
Frontend: http://localhost:5173
"""

import time

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.edge.options import Options

from helpers import createDriver
from helpers import login
from helpers import scroll
from helpers import delete_account

from helpers import printSuccess
from helpers import printFailure


def test_client_dashboard():
    """Navigate from login page to client dashboard"""

    driver = None

    try:
        driver = createDriver()
        login(driver, "johndoe_1778120878@email.com")

        time.sleep(2)

        # Scroll down slowly
        print("Scrolling down slowly...")
        scroll(driver, "down", 0.01, 10)

        # Scroll back up
        print("Scrolling up...")
        scroll(driver, "up", 0.01, 10)

        printSuccess(f"Successfully logged in: {driver.current_url}")

        # Add individual tests here
        test_daily_check_in(driver)

        delete_account(driver)
    
    except Exception as e:
        printFailure(f"There was an error: {e} \n")
        printFailure("Execution is paused so you can inspect the browser.")
        printFailure("Close the browser manually, then press Enter to end the script.\n")
        if driver is not None:
            input()
        return

def test_daily_check_in(driver):
    """Test the daily check-in workflow: Mood & Wellbeing and Body Metrics"""

    wait = WebDriverWait(driver, 10)
    
    # Locate and click 'Open Check-in' button (could be "Open Check-in", "Continue", "Review", or "View")
    print("Looking for Daily Check-in button...")
    check_in_button = wait.until(
        EC.element_to_be_clickable(
            (By.XPATH, "//button[contains(., 'Check-in') or contains(., 'Continue') or contains(., 'Review') or contains(., 'View')]")
        )
    )
    check_in_button.click()
    print("Clicked Daily Check-in button")
    
    # Wait for the overlay to appear
    time.sleep(1)
    
    # ===== MOOD & WELLBEING SECTION =====
    print("Testing Mood & Wellbeing section...")

    # Find and interact with the three range sliders (Happiness, Alertness, Healthiness)
    # Get all range inputs for the sliders
    sliders = wait.until(
        lambda d: d.find_elements(By.XPATH, "//input[@type='range']")
    )
    
    if len(sliders) < 3:
        raise AssertionError(f"Expected at least 3 sliders, found {len(sliders)}")
    
    # Set Happiness slider to 4
    sliders[0].send_keys("\t")  # Focus
    driver.execute_script("arguments[0].value = 4; arguments[0].dispatchEvent(new Event('input', { bubbles: true }));", sliders[0])
    print("[✓] Set Happiness to 4")
    time.sleep(1)

    # Set Alertness slider to 7
    driver.execute_script("arguments[0].value = 7; arguments[0].dispatchEvent(new Event('input', { bubbles: true }));", sliders[1])
    print("[✓] Set Alertness to 7")
    time.sleep(1)

    # Set Healthiness slider to 3
    driver.execute_script("arguments[0].value = 3; arguments[0].dispatchEvent(new Event('input', { bubbles: true }));", sliders[2])
    print("[✓] Set Healthiness to 3")
    time.sleep(1)

    # Fill in "Today's goal" textarea
    today_goal_textarea = wait.until(
        EC.presence_of_element_located(
            (By.XPATH, "//textarea[@placeholder='What do you want to accomplish?']")
        )
    )
    today_goal_textarea.clear()
    today_goal_textarea.send_keys("Testing the Daily Survey.")
    print("[✓] Filled Today's goal")
    
    # Fill in "Something you're grateful for" textarea
    gratitude_textarea = wait.until(
        EC.presence_of_element_located(
            (By.XPATH, "//textarea[@placeholder='A win, a person, an idea...']")
        )
    )
    gratitude_textarea.clear()
    gratitude_textarea.send_keys("I am grateful")
    print("[✓] Filled gratitude field")
    time.sleep(1)
    
    # Submit Mood Check-in
    mood_submit_button = wait.until(
        EC.element_to_be_clickable(
            (By.XPATH, "//button[contains(., 'Submit Mood Check-in')]")
        )
    )
    mood_submit_button.click()
    
    wait.until(
        EC.visibility_of_element_located(
            (
                By.XPATH,
                f"//button[.//h3[contains(normalize-space(), 'Mood & Wellbeing')] "
                f"and .//span[contains(normalize-space(), 'Done') and contains(@class, 'text-green-400')]]",
            )
        )
    )
    print("[✓] Submitted Mood Check-in")
    # ===== BODY METRICS SECTION =====
    print("Testing Body Metrics section...")
    
    # Fill in weight input
    weight_input = wait.until(
        EC.presence_of_element_located(
            (By.XPATH, "//input[@type='number' and @placeholder='e.g. 175']")
        )
    )
    weight_input.clear()
    weight_input.send_keys("175")
    print("[✓] Entered weight: 175 lbs")
    
    # Submit Body Metrics
    body_submit_button = wait.until(
        EC.element_to_be_clickable(
            (By.XPATH, "//button[contains(., 'Submit Body Metrics')]")
        )
    )
    body_submit_button.click()
    
    wait.until(
        EC.visibility_of_element_located(
            (
                By.XPATH,
                f"//button[.//h3[contains(normalize-space(), 'Body Metrics')] "
                f"and .//span[contains(normalize-space(), 'Done') and contains(@class, 'text-green-400')]]",
            )
        )
    )
    print("[✓] Submitted Body Metrics")

    close_daily_check_in_button = wait.until(
        EC.element_to_be_clickable(
            (
                By.XPATH,
                "//h2[normalize-space()='Daily Check-in']/following-sibling::button[1]",
            )
        )
    )
    close_daily_check_in_button.click()

    wait.until(
        EC.invisibility_of_element_located(
            (By.XPATH, "//h2[normalize-space()='Daily Check-in']")
        )
    )
    
    printSuccess("Daily check-in test completed successfully")


if __name__ == "__main__":
    test_client_dashboard()
