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
        login(driver)

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
    
    # Click on the "Mood & Wellbeing" section to expand it
    mood_section_button = wait.until(
        EC.element_to_be_clickable(
            (By.XPATH, "//button[contains(., 'Mood') and contains(., 'Wellbeing')]")
        )
    )
    mood_section_button.click()
    print("[✓] Expanded Mood & Wellbeing section")
    
    time.sleep(0.5)
    
    # Find and interact with the three range sliders (Happiness, Alertness, Healthiness)
    # Get all range inputs for the sliders
    sliders = wait.until(
        lambda d: d.find_elements(By.XPATH, "//input[@type='range']")
    )
    
    if len(sliders) < 3:
        raise AssertionError(f"Expected at least 3 sliders, found {len(sliders)}")
    
    # Set Happiness slider to 8
    sliders[0].send_keys("\t")  # Focus
    driver.execute_script("arguments[0].value = 8; arguments[0].dispatchEvent(new Event('input', { bubbles: true }));", sliders[0])
    print("[✓] Set Happiness to 8")
    
    # Set Alertness slider to 7
    driver.execute_script("arguments[0].value = 7; arguments[0].dispatchEvent(new Event('input', { bubbles: true }));", sliders[1])
    print("[✓] Set Alertness to 7")
    
    # Set Healthiness slider to 8
    driver.execute_script("arguments[0].value = 8; arguments[0].dispatchEvent(new Event('input', { bubbles: true }));", sliders[2])
    print("[✓] Set Healthiness to 8")
    
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
    
    # Submit Mood Check-in
    mood_submit_button = wait.until(
        EC.element_to_be_clickable(
            (By.XPATH, "//button[contains(., 'Submit Mood Check-in')]")
        )
    )
    mood_submit_button.click()
    print("[✓] Submitted Mood Check-in")
    
    # Wait for submission to complete
    time.sleep(1)
    
    # ===== BODY METRICS SECTION =====
    print("Testing Body Metrics section...")
    
    # Click on the "Body Metrics" section to expand it
    body_section_button = wait.until(
        EC.element_to_be_clickable(
            (By.XPATH, "//button[contains(., 'Body Metrics')]")
        )
    )
    body_section_button.click()
    print("[✓] Expanded Body Metrics section")
    
    time.sleep(0.5)
    
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
    print("[✓] Submitted Body Metrics")
    
    # Wait for submission to complete
    time.sleep(1)
    
    printSuccess("Daily check-in test completed successfully")


if __name__ == "__main__":
    test_client_dashboard()
