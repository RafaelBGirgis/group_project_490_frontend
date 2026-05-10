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
            test_signup(driver)

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
        
        # --------------- TEST BUILD PLAN TAB ----------------
        test_build_plan_tab(driver)
        
        # -------------- TEST BROWSE PLANS TAB ---------------
        test_browse_plans_tab(driver)
        
        # -------------- TEST MY SCHEDULED TAB ---------------
        test_my_scheduled_tab(driver)
        
        # ---------------- TEST MY PLANS TAB -----------------
        test_my_plans_tab(driver)
        
        # ------------------ CLEANUP PHASE -------------------
        printSuccess(f"No errors in {Path(__file__).name}: {driver.current_url} \n")
        return driver
    
    # ----------- Quit driver for standalone tests -----------
    finally:
        if is_standalone_test and not keep_driver:
            delete_account(driver)
            driver.quit()
            print("Browser closed \n")


def test_build_plan_tab(driver):
    """
    Test the BUILD PLAN tab functionality
    
    This tab allows users to:
    - Create a new workout plan
    - Name the plan
    - Add workout activities (exercises)
    - Configure activity details (sets, reps, duration)
    - Set public/private visibility
    - Schedule the plan
    """
    
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
        print("Waiting for Plan Name input field...")
        plan_name_input = wait.until(
            EC.presence_of_element_located((By.XPATH, "//input[@placeholder='Enter plan name' or contains(@placeholder, 'name')]"))
        )
        print("Plan Name input field found")
        
        # Enter a test plan name
        print("Entering test plan name...")
        plan_name_input.clear()
        plan_name_input.send_keys("My Custom Workout")
        print(" Plan name entered: 'My Custom Workout'")
        
        # ---- Test Adding Workout Activities ----
        # Find and click "+ Add activity" button
        print("\nFinding and clicking '+ Add activity' button...")
        add_activity_button = wait.until(
            EC.element_to_be_clickable((By.XPATH, "//button[contains(text(), 'Add activity') or contains(text(), 'Add Activity') or contains(text(), '+')]"))
        )
        add_activity_button.click()
        print("[✓] Add activity button clicked")
        
        # Wait for exercise grid/modal to load
        print("Waiting for exercise grid to load...")
        time.sleep(0.5)
        wait.until(
            EC.presence_of_element_located((By.XPATH, "//input[@placeholder='Search workouts' or contains(@placeholder, 'search')]"))
        )
        print("[✓] Exercise selection modal loaded")
        
        # Test search bar: write 'Pu', wait, then clear it
        print("\nTesting search bar with 'Pu'...")
        search_input = driver.find_element(By.XPATH, "//input[@placeholder='Search workouts' or contains(@placeholder, 'search')]")
        search_input.send_keys("Pu")
        print("[✓] Typed 'Pu' in search")
        
        time.sleep(1)
        print("Waiting 1 second for results...")
        
        search_input.clear()
        print("[✓] Cleared search input")
        
        # Filters: select rep-based
        print("\nSelecting rep-based filter...")
        rep_based_filter = wait.until(
            EC.element_to_be_clickable((By.XPATH, "//button[contains(text(), 'rep') or contains(@value, 'rep')]"))
        )
        rep_based_filter.click()
        print("[✓] Rep-based filter selected")
        
        # Filters: select duration-based
        print("Selecting duration-based filter...")
        duration_filter = wait.until(
            EC.element_to_be_clickable((By.XPATH, "//button[contains(text(), 'duration') or contains(@value, 'duration')]"))
        )
        duration_filter.click()
        print("[✓] Duration-based filter selected")
        
        # Search for "Back Squat"
        print("\nSearching for 'Back Squat'...")
        search_input = driver.find_element(By.XPATH, "//input[@placeholder='Search workouts' or contains(@placeholder, 'search')]")
        search_input.send_keys("Back Squat")
        print("[✓] Typed 'Back Squat' in search")
        
        # Wait and click Back Squat card
        print("Waiting for Back Squat workout card...")
        back_squat_card = wait.until(
            EC.element_to_be_clickable((By.XPATH, "//div[contains(text(), 'Back Squat')]"))
        )
        back_squat_card.click()
        print("[✓] Back Squat card clicked")
        
        # Wait for intensity field and enter value
        print("Waiting for intensity input field...")
        intensity_input = wait.until(
            EC.presence_of_element_located((By.XPATH, "//input[@type='number' and (@placeholder='intensity' or @placeholder='lbs' or @placeholder='kg')]"))
        )
        intensity_input.clear()
        intensity_input.send_keys("95")
        print("[✓] Intensity set to 95")
        
        # Wait for reps field and enter value
        print("Waiting for reps input field...")
        reps_input = wait.until(
            EC.presence_of_element_located((By.XPATH, "//input[@placeholder='reps' or @placeholder='Reps']"))
        )
        reps_input.clear()
        reps_input.send_keys("12")
        print("[✓] Reps set to 12")
        
        # Wait for sets field and enter value
        print("Waiting for sets input field...")
        sets_input = wait.until(
            EC.presence_of_element_located((By.XPATH, "//input[@placeholder='sets' or @placeholder='Sets']"))
        )
        sets_input.clear()
        sets_input.send_keys("3")
        print("[✓] Sets set to 3")
        
        # Click 'Add to plan' button
        print("Clicking 'Add to plan' button...")
        add_to_plan_button = wait.until(
            EC.element_to_be_clickable((By.XPATH, "//button[contains(text(), 'Add to plan') or contains(text(), 'Add Activity')]"))
        )
        add_to_plan_button.click()
        print("[✓] Activity added to plan")
        
        time.sleep(1)
        
        # Add second workout: Goblet Squat
        print("\nAdding second workout...")
        add_activity_button = wait.until(
            EC.element_to_be_clickable((By.XPATH, "//button[contains(text(), 'Add activity') or contains(text(), 'Add Activity') or contains(text(), '+')]"))
        )
        add_activity_button.click()
        print("[✓] Add activity button clicked again")
        
        # Wait for search to appear
        print("Waiting for exercise selection modal...")
        search_input = wait.until(
            EC.presence_of_element_located((By.XPATH, "//input[@placeholder='Search workouts' or contains(@placeholder, 'search')]"))
        )
        
        # Search for "Goblet Squat"
        print("Searching for 'Goblet Squat'...")
        search_input.send_keys("Goblet Squat")
        print("[✓] Typed 'Goblet Squat' in search")
        
        # Wait and click Goblet Squat card
        print("Waiting for Goblet Squat workout card...")
        goblet_squat_card = wait.until(
            EC.element_to_be_clickable((By.XPATH, "//div[contains(text(), 'Goblet Squat')]"))
        )
        goblet_squat_card.click()
        print("[✓] Goblet Squat card clicked")
        
        # Wait for intensity field and enter value
        print("Waiting for intensity input field...")
        intensity_input = wait.until(
            EC.presence_of_element_located((By.XPATH, "//input[@type='number' and (@placeholder='intensity' or @placeholder='lbs' or @placeholder='kg')]"))
        )
        intensity_input.clear()
        intensity_input.send_keys("2")
        print("[✓] Intensity set to 2")
        
        # Wait for reps field and enter value
        print("Waiting for reps input field...")
        reps_input = wait.until(
            EC.presence_of_element_located((By.XPATH, "//input[@placeholder='reps' or @placeholder='Reps']"))
        )
        reps_input.clear()
        reps_input.send_keys("6")
        print("[✓] Reps set to 6")
        
        # Wait for sets field and enter value
        print("Waiting for sets input field...")
        sets_input = wait.until(
            EC.presence_of_element_located((By.XPATH, "//input[@placeholder='sets' or @placeholder='Sets']"))
        )
        sets_input.clear()
        sets_input.send_keys("4")
        print("[✓] Sets set to 4")
        
        # Click 'Add to plan' button
        print("Clicking 'Add to plan' button...")
        add_to_plan_button = wait.until(
            EC.element_to_be_clickable((By.XPATH, "//button[contains(text(), 'Add to plan') or contains(text(), 'Add Activity')]"))
        )
        add_to_plan_button.click()
        print("[✓] Second activity added to plan")
        
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
    """
    Test the BROWSE PLANS tab functionality
    
    This tab allows users to:
    - Search for public workout plans
    - Filter by workout type/category
    - View plan details (exercises, calories, difficulty)
    - Save/bookmark plans
    - Copy plans to their own library
    """
    
    printNotice("Testing BROWSE PLANS tab...")
    
    try:
        # TODO: Click on "Browse Plans" tab button
        
        # TODO: Verify tab is now active
        
        # ---- Test Search Functionality ----
        # TODO: Find the search input field
        
        # TODO: Type a search query (e.g., "cardio", "strength")
        
        # TODO: Wait for search results to load
        
        # TODO: Verify search results are displayed in a grid/list
        
        # TODO: Verify each result card shows:
        #       - Plan name
        #       - Total calories
        #       - Number of activities
        #       - Author/Coach name (if applicable)
        #       - Difficulty level
        
        # ---- Test Pagination/Scrolling ----
        # TODO: Verify initial results are shown (default limit)
        
        # TODO: Scroll down to trigger pagination or "Load More" button
        
        # TODO: Verify more results are loaded
        
        # ---- Test Plan Preview ----
        # TODO: Click on a plan card to view details
        
        # TODO: Verify plan detail overlay/modal opens
        
        # TODO: Verify details show:
        #       - Full plan name
        #       - List of all activities with details
        #       - Total duration and calories
        #       - Creator information
        
        # TODO: Close the detail view and verify tab content is still visible
        
        # ---- Test Save/Copy Plan ----
        # TODO: Find a plan and click "Save" or "Add to My Plans" button
        
        # TODO: Verify confirmation message appears
        
        # TODO: Verify plan now appears in "My Plans" tab
        
        # TODO: (Optional) Test "Copy" button if available
        # TODO: Verify copied plan allows customization
        
        # ---- Test Filtering ----
        # TODO: Find and click filter options (if available)
        # TODO: Filter by difficulty level
        # TODO: Verify results are filtered accordingly
        # TODO: Clear filters and verify all results return
        
        printSuccess("BROWSE PLANS tab test passed")
        
    except Exception as e:
        printFailure(f"BROWSE PLANS tab test failed: {str(e)}")
        raise


def test_my_scheduled_tab(driver):
    """
    Test the MY SCHEDULED tab functionality
    
    This tab shows:
    - Calendar/week view of scheduled workouts
    - Scheduled plan instances for current/upcoming weeks
    - Ability to log completed workouts
    - Ability to remove scheduled plans
    """
    
    printNotice("Testing MY SCHEDULED tab...")
    
    try:
        # TODO: Click on "My Scheduled" tab button
        
        # TODO: Verify tab is now active
        
        # ---- Test Calendar/Week Display ----
        # TODO: Verify calendar or week view is displayed
        
        # TODO: Verify current date is highlighted/visible
        
        # TODO: Navigate to next week (if navigation available)
        
        # TODO: Verify date range updates correctly
        
        # ---- Test Scheduled Plans Display ----
        # TODO: Verify scheduled workout plans are shown
        
        # TODO: For each scheduled plan, verify display of:
        #       - Plan name
        #       - Scheduled date/time
        #       - Activities in the plan
        
        # ---- Test Plan Interaction ----
        # TODO: Click on a scheduled plan
        
        # TODO: Verify plan detail panel/overlay opens
        
        # TODO: Verify all activities are listed
        
        # ---- Test Workout Logging ----
        # TODO: Find "Log Activity" or "Mark Complete" button/icon
        
        # TODO: Click to log a workout activity
        
        # TODO: Verify activity logging modal appears
        
        # TODO: Enter actual completed values (reps, sets, duration)
        
        # TODO: Enter estimated calories (if applicable)
        
        # TODO: Click submit to log the activity
        
        # TODO: Verify confirmation appears
        
        # TODO: Verify logged activity shows in history/analytics
        
        # ---- Test Plan Deletion ----
        # TODO: Find and click "Remove" or "Delete" button on a scheduled plan
        
        # TODO: Verify confirmation dialog appears
        
        # TODO: Confirm deletion
        
        # TODO: Verify plan is removed from calendar
        
        printSuccess("MY SCHEDULED tab test passed")
        
    except Exception as e:
        printFailure(f"MY SCHEDULED tab test failed: {str(e)}")
        raise


def test_my_plans_tab(driver):
    """
    Test the MY PLANS tab functionality (CLIENT-SIDE)
    
    This tab shows:
    - All plans created/saved by the client
    - Option to view, edit, duplicate, or delete plans
    - Public/private status
    - Schedule plans from this view
    """
    
    printNotice("Testing MY PLANS tab...")
    
    try:
        # TODO: Click on "My Plans" tab button
        
        # TODO: Verify tab is now active
        
        # ---- Test Plans Display ----
        # TODO: Verify list/grid of user's plans is displayed
        
        # TODO: For each plan card, verify:
        #       - Plan name
        #       - Date created/modified
        #       - Public/private indicator
        #       - Number of activities
        
        # ---- Test Plan Viewing ----
        # TODO: Click on a plan to view details
        
        # TODO: Verify detail overlay shows all activities
        
        # TODO: Verify all activity details are visible
        
        # ---- Test Plan Actions ----
        # TODO: Find "Edit" button for a plan
        
        # TODO: Click edit and verify edit mode opens
        
        # TODO: Modify a plan detail (e.g., change name or add activity)
        
        # TODO: Save changes and verify plan is updated
        
        # ---- Test Plan Duplication ----
        # TODO: Find "Duplicate" or "Clone" button
        
        # TODO: Click to duplicate a plan
        
        # TODO: Verify duplicate appears in the list with modified name
        
        # ---- Test Plan Deletion ----
        # TODO: Find "Delete" button for a plan
        
        # TODO: Verify confirmation dialog appears
        
        # TODO: Confirm deletion
        
        # TODO: Verify plan is removed from list
        
        # ---- Test Visibility Toggle ----
        # TODO: Find a plan and its visibility indicator (public/private)
        
        # TODO: Click to toggle visibility
        
        # TODO: Verify visibility state changes
        
        # ---- Test Scheduling from My Plans ----
        # TODO: Click "Schedule" or "Assign" button on a plan
        
        # TODO: Verify schedule selection appears
        
        # TODO: Select date range
        
        # TODO: Confirm scheduling
        
        # TODO: Verify plan appears in "My Scheduled" tab
        
        printSuccess("MY PLANS tab test passed")
        
    except Exception as e:
        printFailure(f"MY PLANS tab test failed: {str(e)}")
        raise


def test_coach_mode(driver=None, keep_driver=False):
    """
    Additional test suite for COACH mode
    Tests coach-specific functionality:
    - Coach can prescribe plans to clients
    - Coach can view previous scripts/templates
    - Coach can select which client to plan for
    """
    
    # ---------- Create driver for standalone tests ----------
    is_standalone_test = False
    if driver is None:
        driver = createDriver()
        is_standalone_test = True
    
    # ---------------------- Test code -----------------------
    printNotice(f"Running Coach Mode Tests from {Path(__file__).name}")
    
    try:
        # ========== COACH SETUP ==========
        # TODO: Log in as a coach user
        # TODO: Navigate to /plan-my-week?role=coach
        # TODO: Verify coach role is active
        
        # ========== TEST CLIENT PICKER ==========
        # TODO: Verify "Select a client" modal appears
        # TODO: Search for a test client by name
        # TODO: Click on a client to select them
        # TODO: Verify client selector shows selected client name
        
        # ========== TEST COACH BUILD PLAN ==========
        # TODO: Click "Build Plan" tab
        # TODO: Create a workout plan following same steps as test_build_plan_tab()
        # TODO: When scheduling, verify option to "Prescribe to Client" appears
        # TODO: Select target client
        # TODO: Complete prescription
        # TODO: Verify client sees the prescribed plan in their account
        
        # ========== TEST BROWSE PLANS ==========
        # TODO: Click "Browse Plans" tab
        # TODO: Verify search works for coach
        
        # ========== TEST PREVIOUS SCRIPTS ==========
        # TODO: Click "Previous Scripts" tab (coach-specific, not "My Plans")
        # TODO: Verify list of previously created/used plans appears
        # TODO: Verify ability to reuse/adapt previous scripts
        
        # ========== TEST CLIENT SWITCHING ==========
        # TODO: Click "change" button next to client name
        # TODO: Verify client picker re-appears
        # TODO: Select a different client
        # TODO: Verify tab content updates for new client
        
        printSuccess(f"Coach Mode tests passed")
        return driver
        
    finally:
        if is_standalone_test and not keep_driver:
            delete_account(driver)
            driver.quit()
            print("Browser closed \n")


def test_edge_cases(driver=None, keep_driver=False):
    """
    Test edge cases and error handling
    """
    
    is_standalone_test = False
    if driver is None:
        driver = createDriver()
        is_standalone_test = True
    
    printNotice("Testing edge cases...")
    
    try:
        # ========== EMPTY STATE TESTS ==========
        # TODO: Test browsing when no plans exist
        # TODO: Verify appropriate empty state message appears
        
        # ========== VALIDATION TESTS ==========
        # TODO: Try to create plan with empty name
        # TODO: Verify error message appears
        # TODO: Try to save plan with no activities
        # TODO: Verify error message appears
        
        # ========== SEARCH TESTS ==========
        # TODO: Search with special characters
        # TODO: Search with very long query string
        # TODO: Search with empty string
        # TODO: Verify graceful handling in all cases
        
        # ========== CONCURRENCY TESTS ==========
        # TODO: Open multiple tabs/windows showing same plan
        # TODO: Edit plan in one window
        # TODO: Verify refresh in other window shows updates
        
        # ========== NETWORK ERROR TESTS ==========
        # TODO: Simulate slow network (if possible)
        # TODO: Verify loading states appear
        # TODO: Verify retry mechanisms work
        
        printSuccess("Edge case tests passed")
        return driver
        
    finally:
        if is_standalone_test and not keep_driver:
            delete_account(driver)
            driver.quit()
            print("Browser closed \n")


# =================== HELPER FUNCTIONS ===================

def scroll_to_plan(driver, plan_name):
    """
    Scroll through plan list until a specific plan is found
    Useful for paginated or infinite-scroll lists
    
    TODO: Implement scroll logic
    """
    pass


def create_test_plan(driver, plan_config):
    """
    Helper to create a workout plan with given configuration
    
    plan_config format:
    {
        "name": "Test Plan",
        "activities": [
            {
                "workout_name": "Running",
                "intensity": "intermediate",
                "duration": 30
            }
        ],
        "is_public": False,
        "schedule": {
            "start_date": "2024-01-15",
            "end_date": "2024-01-21"
        }
    }
    
    TODO: Implement plan creation logic
    """
    pass


def verify_plan_details(driver, expected_plan):
    """
    Verify all details of a plan match expected values
    
    TODO: Implement verification logic
    """
    pass


def log_workout_activity(driver, activity_details):
    """
    Helper to log a completed workout activity
    
    activity_details format:
    {
        "completed_reps": 12,
        "completed_sets": 3,
        "completed_duration": 25,
        "estimated_calories": 150
    }
    
    TODO: Implement activity logging logic
    """
    pass


# =================== MAIN EXECUTION ===================

if __name__ == "__main__":
    # Run all test functions
    try:
        print("\n" + "="*60)
        print("STARTING PLAN MY WEEK TEST SUITE")
        print("="*60 + "\n")
        
        # Test client functionality
        driver = test_plan_my_week(keep_driver=True)
        
        # Test coach functionality
        driver = test_coach_mode(driver=driver, keep_driver=True)
        
        # Test edge cases
        driver = test_edge_cases(driver=driver, keep_driver=False)
        
        print("\n" + "="*60)
        print("ALL TESTS PASSED!")
        print("="*60 + "\n")
        
    except Exception as e:
        printFailure(f"Test suite failed: {str(e)}")
        raise
