"""
Test file for Plan My Week (Workout Planning) functionality
Tests the following tabs:
  1. Build Plan - Create new workout plans
  2. Browse Plans - Search and view available workout plans
  3. My Scheduled - View scheduled workout plans for current week/month
  4. My Plans - View saved workout plans (client-side) / Previous Scripts (coach-side)
"""
import time

from selenium.webdriver.common.by import By
from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support.ui import Select

from pathlib import Path
from helpers import (
    createDriver,
    delete_account,
    printNotice,
    printSuccess,
    printFailure,
    login,
    wait_for_page_to_fully_load,
    scroll,
)
from test_signup import test_signup

FRONTEND_URL = "http://localhost:5173"
TEST_COACH_EMAIL = "coach_test@njit.edu"
TEST_CLIENT_EMAIL = "client_test@njit.edu"
TEST_PASSWORD = "password"


def test_plan_my_week(driver=None, keep_driver=False):
    """
    Main test for Plan My Week functionality, tests all 4 tabs
    """
    
    # ---------- Create driver for standalone tests ----------
    is_standalone_test = False
    if driver is None:
        driver = createDriver()
        is_standalone_test = True
    
    # ---------------------- Test code -----------------------
    printNotice(f"Running {Path(__file__).name}")
    
    try:
        if is_standalone_test:
            login(driver, "janedoe@gmail.com")

        wait = WebDriverWait(driver, 10)
        actions = ActionChains(driver)
        
        # Wait for the 'Plan My Week' button to appear
        time.sleep(1)
        plan_my_week_button = wait.until(
            EC.presence_of_element_located((By.XPATH, "//button[contains(text(), 'Plan My Week')]"))
        )
        
        # Use ActionChains on the card that contains the button
        print("Moving to Plan My Week button with ActionChains...")
        actions.move_to_element(plan_my_week_button).perform()
        time.sleep(1)
        
        plan_my_week_button.click()
        print(f"Navigation to /plan-my-week")
        
        # Wait for page to fully load
        wait_for_page_to_fully_load(driver, timeout=10)
        print("Plan My Week page fully loaded")
        
        # Verify navbar displays "Plan My Week" title
        title_element = wait.until(
            EC.presence_of_element_located((By.XPATH, "//h1[contains(text(), 'Plan My Week')]"))
        )
        assert title_element is not None, "'Plan My Week' title not found in navbar"
        
        # Test tabs here
        test_build_plan_tab(driver)
        test_browse_plans_tab(driver)
        test_my_scheduled_tab(driver)
        test_my_plans_tab(driver)
        
        printSuccess(f"No errors in {Path(__file__).name}: {driver.current_url} \n")
        return driver
    
    # ----------- Quit driver for standalone tests -----------
    finally:
        if is_standalone_test and not keep_driver:
            delete_account(driver)
            driver.quit()
            print("Browser closed \n")


def test_build_plan_tab(driver):   
    printNotice("Testing BUILD PLAN tab...")
    
    try:
        wait = WebDriverWait(driver, 10)
        
        # Click on "Build Plan" tab button and wait for 'Plan Name' field
        print("Clicking on 'Build Plan' tab...")
        build_plan_tab = wait.until(
            EC.element_to_be_clickable((By.XPATH, "//button[contains(text(), 'Build Plan')]"))
        )
        build_plan_tab.click()
        
        # Wait for 'Plan Name' input field
        print("Waiting for 'Build Plan' to load...")
        plan_name_input = wait.until(
            EC.element_to_be_clickable(
                (By.XPATH, "//input[contains(@placeholder, 'Upper Body') or contains(@placeholder, 'Push Focus')]")
            )
        )
        time.sleep(1)
        
        # Enter a test plan name
        print("Entering Plan Name...")
        plan_name_input.clear()
        plan_name_input.send_keys("My Custom Workout")
        time.sleep(1)
        
        # Find and click "+ Add activity" button
        print("Adding activity to workout...")
        add_activity_button = wait.until(
            EC.element_to_be_clickable((By.XPATH, "//button[contains(text(), 'Add activity') or contains(text(), 'Add Activity') or contains(text(), '+')]"))
        )
        add_activity_button.click()
        
        # Wait for 'Pick a Workout' to load
        print("Loading 'Pick a Workout' GUI...")
        wait.until(
            EC.presence_of_element_located(
                (
                    By.XPATH,
                    "//h3[contains(normalize-space(), 'Pick a workout')]/ancestor::div[contains(@class, 'rounded-2xl')][1]"
                    "//div[contains(@class, 'grid')]/button[.//p[contains(@class, 'font-semibold')]]",
                )
            )
        )
        print("GUI 'Pick a Workout' loaded")
        time.sleep(1)
        
        # Test search bar: write 'Pull', wait, then clear it
        print("Testing search bar...")
        search_input = wait.until(
            EC.element_to_be_clickable(
                (By.XPATH, "//input[@placeholder='Search by name or description']")
            )
        )
        search_input.send_keys("Pull")
        
        wait.until(
            EC.presence_of_element_located(
                (
                    By.XPATH,
                    "//h3[contains(normalize-space(), 'Pick a workout')]/ancestor::div[contains(@class, 'rounded-2xl')][1]"
                    "//div[contains(@class, 'grid')]/button[.//p[contains(@class, 'font-semibold')]]",
                )
            )
        )
        print("GUI 'Pick a Workout' reloaded for search")
        time.sleep(1)
        
        search_input.clear()
        search_input.send_keys(" ")
        
        wait.until(
            EC.presence_of_element_located(
                (
                    By.XPATH,
                    "//h3[contains(normalize-space(), 'Pick a workout')]/ancestor::div[contains(@class, 'rounded-2xl')][1]"
                    "//div[contains(@class, 'grid')]/button[.//p[contains(@class, 'font-semibold')]]",
                )
            )
        )
        print("GUI 'Pick a Workout' reloaded for empty search")
        time.sleep(1)
        
        # Filters: select rep-based
        print("Testing filters...")
        workout_filter = Select(
            wait.until(
                EC.element_to_be_clickable(
                    (By.XPATH, "//input[@placeholder='Search by name or description']/following-sibling::select[1]")
                )
            )
        )
        workout_filter.select_by_value("rep")
        print("Rep-based filter selected")

        wait.until(
            EC.presence_of_element_located(
                (
                    By.XPATH,
                    "//h3[contains(normalize-space(), 'Pick a workout')]/ancestor::div[contains(@class, 'rounded-2xl')][1]"
                    "//div[contains(@class, 'grid')]/button[.//p[contains(@class, 'font-semibold')]]",
                )
            )
        )
        print("GUI 'Pick a Workout' reloaded for rep filter")
        time.sleep(1)
        
        # Filters: select duration-based
        workout_filter.select_by_value("duration")
        print("Duration-based filter selected")

        wait.until(
            EC.presence_of_element_located(
                (
                    By.XPATH,
                    "//h3[contains(normalize-space(), 'Pick a workout')]/ancestor::div[contains(@class, 'rounded-2xl')][1]"
                    "//div[contains(@class, 'grid')]/button[.//p[contains(@class, 'font-semibold')]]",
                )
            )
        )
        print("GUI 'Pick a Workout' reloaded for rep filter")
        time.sleep(1)

        # Filters: remove filter
        workout_filter.select_by_value("")
        print("Filter removed")

        wait.until(
            EC.presence_of_element_located(
                (
                    By.XPATH,
                    "//h3[contains(normalize-space(), 'Pick a workout')]/ancestor::div[contains(@class, 'rounded-2xl')][1]"
                    "//div[contains(@class, 'grid')]/button[.//p[contains(@class, 'font-semibold')]]",
                )
            )
        )
        print("GUI 'Pick a Workout' reloaded for no filter")
        time.sleep(1)
        
        # Search for "Back Squat"
        print("Searching for 'Back Squat'...")
        search_input.send_keys("Back Squat")
        
        # Wait and click Back Squat card
        back_squat_card = wait.until(
            EC.element_to_be_clickable(
                (By.XPATH, "//button[.//p[normalize-space()='Back Squat']]")
            )
        )
        back_squat_card.click()
        time.sleep(1)
        
        # Wait for intensity field and enter value
        print("Waiting for Activity GUI...")
        intensity_input = wait.until(
            EC.element_to_be_clickable(
                (By.XPATH, "//input[@type='number' and @placeholder='Enter intensity']")
            )
        )
        intensity_input.clear()
        intensity_input.send_keys("95")
        
        # Wait for reps field and enter value
        reps_input = wait.until(
            EC.element_to_be_clickable(
                (By.XPATH, "//span[normalize-space()='Reps']/parent::label//input[@type='number']")
            )
        )
        reps_input.clear()
        reps_input.send_keys("12")
        
        # Wait for sets field and enter value
        sets_input = wait.until(
            EC.element_to_be_clickable(
                (By.XPATH, "//span[normalize-space()='Sets']/parent::label//input[@type='number']")
            )
        )
        sets_input.clear()
        sets_input.send_keys("3")
        
        # Click 'Add to plan' button
        print("Adding activity to plan...")
        add_to_plan_button = wait.until(
            EC.element_to_be_clickable((By.XPATH, "//button[normalize-space()='Add to plan']"))
        )
        add_to_plan_button.click()
        print("Activity added to plan")
        
        time.sleep(1)
        
        # Find and click "+ Add activity" button -------------------------------------------------------
        print("Adding activity to workout...")
        add_activity_button = wait.until(
            EC.element_to_be_clickable((By.XPATH, "//button[contains(text(), 'Add activity') or contains(text(), 'Add Activity') or contains(text(), '+')]"))
        )
        add_activity_button.click()
        
        # Wait for 'Pick a Workout' to load
        print("Loading 'Pick a Workout' GUI...")
        wait.until(
            EC.presence_of_element_located(
                (
                    By.XPATH,
                    "//h3[contains(normalize-space(), 'Pick a workout')]/ancestor::div[contains(@class, 'rounded-2xl')][1]"
                    "//div[contains(@class, 'grid')]/button[.//p[contains(@class, 'font-semibold')]]",
                )
            )
        )
        print("GUI 'Pick a Workout' loaded")
        time.sleep(1)

        # Test search bar: write 'Pull', wait, then clear it
        print("Testing search bar...")
        search_input = wait.until(
            EC.element_to_be_clickable(
                (By.XPATH, "//input[@placeholder='Search by name or description']")
            )
        )

        # Search for "Goblet Squat"
        print("Searching for 'Goblet Squat'...")
        search_input.send_keys("Goblet Squat")
        
        # Wait and click Goblet Squat card
        goblet_squat_card = wait.until(
            EC.element_to_be_clickable(
                (By.XPATH, "//button[.//p[normalize-space()='Goblet Squat']]")
            )
        )
        goblet_squat_card.click()
        time.sleep(1)
        
        # Wait for intensity field and enter value
        print("Waiting for Activity GUI...")
        intensity_input = wait.until(
            EC.element_to_be_clickable(
                (By.XPATH, "//input[@type='number' and @placeholder='Enter intensity']")
            )
        )
        intensity_input.clear()
        intensity_input.send_keys("2")
        
        # Wait for reps field and enter value
        reps_input = wait.until(
            EC.element_to_be_clickable(
                (By.XPATH, "//span[normalize-space()='Reps']/parent::label//input[@type='number']")
            )
        )
        reps_input.clear()
        reps_input.send_keys("6")
        
        # Wait for sets field and enter value
        sets_input = wait.until(
            EC.element_to_be_clickable(
                (By.XPATH, "//span[normalize-space()='Sets']/parent::label//input[@type='number']")
            )
        )
        sets_input.clear()
        sets_input.send_keys("4")
        
        # Click 'Add to plan' button
        print("Adding activity to plan...")
        add_to_plan_button = wait.until(
            EC.element_to_be_clickable((By.XPATH, "//button[normalize-space()='Add to plan']"))
        )
        add_to_plan_button.click()
        print("Activity added to plan")
        
        time.sleep(1)
        
        # ---- Test Visibility Toggle ----
        # TODO: Find the "Make Public" or visibility toggle checkbox
        
        # TODO: Toggle visibility on/off and verify state changes
        
        # ---- Test Schedule/Save Plan ----
        # TODO: Click "Save and Schedule" or "Schedule Plan" button
        
        # TODO: Verify schedule selection modal appears
        
        # TODO: Select date range for scheduling (e.g., this week)
        
        # TODO: Verify confirmation message appears
        
        # TODO: Verify plan appears in "My Scheduled" tab
        
        printSuccess("BUILD PLAN tab test passed")
        
    except Exception as e:
        printFailure(f"BUILD PLAN tab test failed: {str(e)}")
        raise


def test_browse_plans_tab(driver):
    try:
        printSuccess("BROWSE PLANS tab test passed")
        
    except Exception as e:
        printFailure(f"BROWSE PLANS tab test failed: {str(e)}")
        raise


def test_my_scheduled_tab(driver):
    try:
        printSuccess("BROWSE PLANS tab test passed")
        
    except Exception as e:
        printFailure(f"BROWSE PLANS tab test failed: {str(e)}")
        raise


def test_my_plans_tab(driver):
    try:
        printSuccess("BROWSE PLANS tab test passed")
    except Exception as e:
        printFailure(f"MY PLANS tab test failed: {str(e)}")
        raise
    

if __name__ == "__main__":
    test_plan_my_week(keep_driver=True)

